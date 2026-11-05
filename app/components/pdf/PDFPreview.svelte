<script context="module" lang="ts">
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { share } from '@akylas/nativescript-app-utils/share';
    import { MenuItem } from '@nativescript-community/ui-menu';
    import { Pager } from '@nativescript-community/ui-pager';
    import type { PersistentBottomSheet } from '@nativescript-community/ui-persistent-bottomsheet';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { ApplicationSettings, EventData, GridLayout, ObservableArray, Page, StackLayout, Utils, View, knownFolders } from '@nativescript/core';
    import { openFile } from '@nativescript/core/utils';
    import { closeModal, goBack } from '@shared/utils/svelte/ui';
    import { showError } from '@shared/utils/showError';
    import { printPDF } from 'plugin-nativeprocessor';
    import { tick } from 'svelte';
    import { writable } from 'svelte/store';
    import { getFileNameForDocument, lc, lcp } from '~/helpers/locale';
    import { isDarkTheme } from '~/helpers/theme';
    import PDFLayoutSheet from '~/components/pdf/PDFLayoutSheet.svelte';
    import { OCRDocument, OCRPage } from '~/models/OCRDocument';
    import PDFCanvas, { PDFCanvasItem, PDFExportBaseOptions } from '~/services/pdf/PDFCanvas';
    import { getTransformedImage } from '~/services/pdf/PDFExportCanvas.common';
    import { exportPDFAsync } from '~/services/pdf/PDFExporter';
    import { appIcon } from '~/utils/appIcons';
    import { ANDROID_CONTENT, DEFAULT_PDF_OPTIONS, IMAGE_CONTEXT_OPTIONS, PDF_EXT, PDF_LAYOUT_KEYS, SEPARATOR } from '~/utils/constants';
    import { PDF_OPTIONS } from '~/utils/localized_constant';
    import { getPageColorMatrix } from '~/utils/matrix';
    import { createPageSheetTranslation, getPageFit, setPageFit } from '~/utils/pageSheet';
    import { askPDFExportOptions, hideLoading, requestStoragePermission, showLoading, showSettings, showSnack } from '~/utils/ui';
    import { colors, screenHeightDips, screenWidthDips, windowInset } from '~/variables';

    // the neighbors peek by 16 with a gap of 8: the sheet is the screen width minus 48
    const PAGER_PEAKING = 20;
    const PAGER_PAGE_PADDING = 4;
    const SHEET_SIDE_MARGIN = 2 * (PAGER_PEAKING + PAGER_PAGE_PADDING);
    const SHEET_RADIUS = 6;
    const SHEET_TOP_MARGIN = 16;
    // iOS: the bars are around the content. Android: the content goes under the navigation bar and the FABs float over it
    const CONTROL_HEIGHT = 56;
    const COUNTER_HEIGHT = 28;
    const COUNTER_GAP = 12;
    // the paper in points: the margins are points too
    const PAPERS = {
        a3: { width: 842, height: 1191 },
        a4: { width: 595, height: 842 },
        a5: { width: 420, height: 595 },
        letter: { width: 612, height: 792 }
    };
    const DEFAULT_PAGE_RATIO = PAPERS.a4.width / PAPERS.a4.height;
    // the layout sheet: a grabber and the list of the options
    const SHEET_GRABBER_HEIGHT = 28;
    const LAYOUT_LIST_HEIGHT = Math.round(screenHeightDips * 0.4);
    const LAYOUT_SHEET_HEIGHT = SHEET_GRABBER_HEIGHT + LAYOUT_LIST_HEIGHT;
    const LAYOUT_SHEET_STEPS = [0, LAYOUT_SHEET_HEIGHT];
    // the page keeps this much room between its bottom and the sheet
    const SHEET_PAGE_MARGIN = 32;
</script>

<script lang="ts">
    $: ({ colorBackground, colorError, colorOnBackground, colorOnPrimary, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSecondaryContainer, colorSurfaceContainerLow } = $colors);

    export let pages: { page: OCRPage; document: OCRDocument }[];
    export let document: OCRDocument = null;
    export let saveFunction: (options: PDFExportBaseOptions) => void = null;

    let page: NativeViewElementNode<Page>;
    let pager: NativeViewElementNode<Pager>;
    // the body of the page: its height is the room of the sheets
    let pageContent: NativeViewElementNode<GridLayout>;
    let items: ObservableArray<PDFCanvasItem>;
    let currentPagerIndex = 0;
    let error: string = null;
    // the layout is what this screen is about: its sheet is open from the start, without an animation
    let adjusting = true;
    let snackVisible = false;
    const pdfCanvas = new PDFCanvas();
    const optionsStore = writable(pdfCanvas.options);
    let { color, items_per_page, orientation, page_padding, paper_size } = pdfCanvas.options;
    $: ({ color, items_per_page, orientation, page_padding, paper_size } = $optionsStore);
    const hasOCRText = pages.some((item) => !!item.page?.ocrData);

    optionsStore.subscribe((newValue) => {
        Object.assign(pdfCanvas.options, newValue);
        if (!saveFunction) {
            // in this case this is the scanner activity we dont want to persist options
            ApplicationSettings.setString('default_export_options', JSON.stringify(pdfCanvas.options));
        }
    });

    function refresh() {
        try {
            error = null;
            pdfCanvas.updatePages(pages.map((item) => item.page));
            items = new ObservableArray(pdfCanvas.items);
        } catch (err) {
            error = err?.message || lc('pdf_preview_error');
            items = new ObservableArray([]);
        }
    }
    refresh();

    function onPageIndexChanged(event) {
        currentPagerIndex = event.object.selectedIndex;
    }

    function close() {
        if (saveFunction) {
            goBack();
        } else {
            closeModal(undefined);
        }
    }

    // the height of the page body, between the bars: updated by the first layout
    let contentHeight = screenHeightDips - (__IOS__ ? 202 : 160);
    function onContentLayout() {
        const height = Utils.layout.toDeviceIndependentPixels(pageContent?.nativeView?.getMeasuredHeight() ?? 0);
        if (height && Math.abs(height - contentHeight) > 1) {
            contentHeight = height;
        }
    }
    // the room of the sheets: below the bar and above the counter and the controls
    $: controlsRoom = __IOS__ ? 0 : $windowInset.bottom + 16 + CONTROL_HEIGHT;
    $: counterBottom = controlsRoom + COUNTER_GAP;
    $: roomHeight = contentHeight - SHEET_TOP_MARGIN - counterBottom - COUNTER_HEIGHT - 8;

    function getSheetRatio(item: PDFCanvasItem) {
        if (paper_size === 'full') {
            const first = item.pages[0];
            if (!first?.width || !first?.height) {
                return DEFAULT_PAGE_RATIO;
            }
            return (first.rotation ?? 0) % 180 !== 0 ? first.height / first.width : first.width / first.height;
        }
        const paper = PAPERS[paper_size] ?? PAPERS.a4;
        const ratio = paper.width / paper.height;
        return orientation === 'landscape' ? 1 / ratio : ratio;
    }
    function getSheetSize(item: PDFCanvasItem, availableHeight: number) {
        const ratio = getSheetRatio(item);
        const width = Math.min(screenWidthDips - SHEET_SIDE_MARGIN, availableHeight * ratio);
        return { width, height: width / ratio };
    }
    // the margin is in points on the paper: it scales with the sheet
    function getMargin(sheetWidth: number) {
        if (paper_size === 'full') {
            return 0;
        }
        const paper = PAPERS[paper_size] ?? PAPERS.a4;
        return (page_padding * sheetWidth) / (orientation === 'landscape' ? paper.height : paper.width);
    }
    function getPageLayoutProps(item: PDFCanvasItem, templatePagesCount: number, availableHeight: number): Partial<svelteNative.JSX.GridLayoutAttributes> {
        const { height, width } = getSheetSize(item, availableHeight);
        const props = { horizontalAlignment: 'center', verticalAlignment: 'middle', width, height } as Partial<svelteNative.JSX.GridLayoutAttributes>;
        if (paper_size === 'full') {
            return { ...props, rows: '*', columns: '*' };
        }
        const count = templatePagesCount > 2 ? Math.floor((templatePagesCount + 1) / 2) : templatePagesCount;
        const stacked = new Array(count).fill('*').join(',');
        const double = templatePagesCount >= 3 ? '*,*' : '*';
        return orientation === 'landscape' ? { ...props, columns: stacked, rows: double } : { ...props, rows: stacked, columns: double };
    }
    function getPageImageOptions(templatePagesCount: number, item: PDFCanvasItem, pageIndex: number, availableHeight: number) {
        const grouped = templatePagesCount > 2;
        const doubleCell = grouped && pageIndex === item.pages.length - 1 && pageIndex % 2 === 0 && templatePagesCount % 2 === 1 ? 2 : 1;
        const result =
            orientation === 'landscape'
                ? { row: grouped ? pageIndex % 2 : 0, col: grouped ? Math.floor(pageIndex / 2) : pageIndex, rowSpan: doubleCell }
                : { row: grouped ? Math.floor(pageIndex / 2) : pageIndex, col: grouped ? pageIndex % 2 : 0, colSpan: doubleCell };
        const pdfPage = item.pages[pageIndex];
        if (!pdfPage) {
            return result;
        }
        return Object.assign(result, {
            margin: getMargin(getSheetSize(item, availableHeight).width),
            src: async () => {
                if (pdfPage.pkpass) {
                    return getTransformedImage({ page: pdfPage });
                }
                return pdfPage.imagePath;
            },
            imageRotation: pdfPage.rotation,
            colorMatrix: getPageColorMatrix(pdfPage, color === 'black_white' ? 'grayscale' : undefined)
        });
    }
    function itemTemplateSelector(item: PDFCanvasItem) {
        return (paper_size === 'full' ? 1 : items_per_page) + '';
    }

    $: subtitle =
        paper_size === 'full'
            ? PDF_OPTIONS.paper_size.full.name
            : [
                  PDF_OPTIONS.paper_size[paper_size].name,
                  orientation === 'landscape' ? PDF_OPTIONS.orientation.landscape.name : null,
                  items_per_page > 1 ? lcp('pages_per_sheet_summary', items_per_page) : null
              ]
                  .filter(Boolean)
                  .join(' · ');

    // the templates are drawn from the state: the visible ones are redrawn once it is updated
    async function redrawPager() {
        await tick();
        pager?.nativeElement?.refreshVisibleItems();
    }
    function updateOption(key: string, value: string | number | boolean) {
        try {
            optionsStore.update((state) => ({ ...state, [key]: value }));
            if (key === 'page_padding' || key === 'draw_ocr_text') {
                redrawPager();
            } else {
                refresh();
            }
        } catch (err) {
            showError(err);
        }
    }
    function toggleBlackWhite() {
        updateOption('color', color === 'black_white' ? 'color' : 'black_white');
    }
    function resetLayout() {
        optionsStore.update((state) => ({ ...state, ...Object.fromEntries(PDF_LAYOUT_KEYS.map((key) => [key, DEFAULT_PDF_OPTIONS[key]])) }));
        refresh();
    }

    // the layout sheet is a persistent sheet of the page: the pager keeps its width, each page scales and moves with the sheet (the neighbors stay seen), and the pages stay interactive
    let sheet: NativeViewElementNode<PersistentBottomSheet>;
    // the width of the sheet is the one of the page: a percentage in the layout of the sheet made it wider than the screen
    let sheetWidth: number;
    function onSheetLayout() {
        const width = Utils.layout.toDeviceIndependentPixels(sheet?.nativeView?.getMeasuredWidth() ?? 0);
        if (width && Math.abs(width - (sheetWidth ?? 0)) > 1) {
            sheetWidth = width;
        }
    }
    // how a page fits above the sheet: from the sizes of the layout, not from the views. The paper is centered in the room of the pages
    function getFitFor(item: PDFCanvasItem) {
        const center = SHEET_TOP_MARGIN + roomHeight / 2;
        return getPageFit({
            containerHeight: contentHeight,
            margin: SHEET_PAGE_MARGIN,
            pageCenter: center,
            pageHeight: item ? getSheetSize(item, roomHeight).height : roomHeight,
            roomTop: SHEET_TOP_MARGIN,
            sheetHeight: LAYOUT_SHEET_HEIGHT,
            viewCenter: center
        });
    }
    // the papers of the current page and of its neighbors
    function getPaperViews() {
        const result: { item: PDFCanvasItem; view: View }[] = [];
        for (let index = Math.max(0, currentPagerIndex - 2); index <= Math.min((items?.length ?? 0) - 1, currentPagerIndex + 2); index++) {
            const view = pager?.nativeView?.getChildView(index)?.getViewById<View>('fit');
            if (view) {
                result.push({ item: items.getItem(index), view });
            }
        }
        return result;
    }
    // the buttons float over the page: they go up with the sheet
    let fabHolder: NativeViewElementNode<StackLayout>;
    const translationFunction = createPageSheetTranslation(
        () => getPaperViews().map(({ item, view }) => ({ target: view, fit: getFitFor(item) })),
        () => (fabHolder?.nativeView ? [fabHolder.nativeView] : [])
    );
    // the button is created extended and `expanded` only starts a (later) animation: with the sheet open at the start it is an icon at once
    function onEditFabLoaded(event: EventData) {
        if (adjusting && event.object instanceof View) {
            event.object.nativeViewProtected?.setExtended?.(false);
        }
    }
    function onFabHolderLoaded(event: EventData) {
        if (event.object instanceof View) {
            event.object.translateY = adjusting ? -LAYOUT_SHEET_HEIGHT : 0;
        }
    }
    // a paper which is shown after the sheet opened, or which the layout changed: it is at the fit of the sheet, or as it is
    function syncPaperViews() {
        getPaperViews().forEach(({ item, view }) => setPageFit(view, adjusting ? getFitFor(item) : undefined));
    }
    function onPaperLoaded(item: PDFCanvasItem, event: EventData) {
        if (event.object instanceof View) {
            setPageFit(event.object, adjusting ? getFitFor(item) : undefined);
        }
    }
    // the sheet follows its steps: the gesture too, so this is where it opens and closes
    function onSheetStep(event: { value: number }) {
        adjusting = event.value > 0;
    }
    function closeLayout() {
        sheet?.nativeView?.animateStepIndex(0);
    }
    function showLayout() {
        if (adjusting) {
            closeLayout();
            return;
        }
        sheet?.nativeView?.animateStepIndex(1);
    }
    // nothing to lay out: the sheet leaves
    $: if (error) {
        closeLayout();
    }
    // the papers change of size with the layout and the pager makes new ones: they follow
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function updatePaperViews(..._deps: unknown[]) {
        if (adjusting) {
            setTimeout(syncPaperViews, 50);
        }
    }
    $: if (adjusting) {
        updatePaperViews(paper_size, orientation, items_per_page, currentPagerIndex, roomHeight, contentHeight);
    }

    async function exportPDF() {
        try {
            if (saveFunction) {
                saveFunction(pdfCanvas.options);
                return;
            }
            const exportDirectory = ApplicationSettings.getString(
                'pdf_export_directory',
                __ANDROID__ ? android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS).getAbsolutePath() : knownFolders.externalDocuments().path
            );
            const exportOptions = await askPDFExportOptions({ filename: getFileNameForDocument(document) + PDF_EXT, folder: exportDirectory, showFilename: true });
            if (!exportOptions?.filename?.length) {
                return;
            }
            const { folder, jpegQuality, password } = exportOptions;
            showLoading(lc('exporting'));
            if (__ANDROID__) {
                await requestStoragePermission();
            }
            const filePath = await exportPDFAsync({ pages, document, folder, filename: exportOptions.filename, options: { jpegQuality, password } });
            hideLoading();
            if (!filePath) {
                return;
            }
            let filename: string;
            if (__ANDROID__ && filePath.startsWith(ANDROID_CONTENT)) {
                filename = com.nativescript.documentpicker.FilePath.getPath(Utils.android.getApplicationContext(), android.net.Uri.parse(filePath))?.split(SEPARATOR).pop();
            } else {
                filename = filePath.split(SEPARATOR).pop();
            }
            snackVisible = true;
            const onSnack = await showSnack({ message: lc('pdf_saved', filename || filePath), actionText: lc('open') });
            snackVisible = false;
            if (onSnack?.reason === 'action') {
                openFile(filePath);
            }
        } catch (err) {
            showError(err);
        } finally {
            snackVisible = false;
            hideLoading();
        }
    }
    async function exportToTemp() {
        showLoading(lc('exporting'));
        try {
            const filePath = await exportPDFAsync({ pages, document });
            if (!filePath) {
                throw new SilentError(lc('no_pages_in_pdf'));
            }
            return filePath;
        } finally {
            hideLoading();
        }
    }
    async function sharePDF() {
        try {
            share({ file: await exportToTemp() }, { mimetype: 'application/pdf' });
        } catch (err) {
            showError(err);
        }
    }
    async function openPDF() {
        try {
            openFile(await exportToTemp());
        } catch (err) {
            showError(err);
        }
    }
    async function printCurrentPDF() {
        try {
            printPDF(await exportToTemp(), document?.name || 'PDF');
        } catch (err) {
            showError(err);
        }
    }

    const moreMenu: MenuItem[] = [
        { title: lc('share'), icon: appIcon('share'), onSelect: sharePDF },
        { title: lc('open_in_another_app'), icon: appIcon('open'), onSelect: openPDF },
        { title: lc('print'), icon: appIcon('print'), onSelect: printCurrentPDF }
    ];
    $: hasSheets = !error && items.length > 0;
    $: bottomItems =
        __IOS__ && hasSheets
            ? [{ icon: appIcon('tune'), onTap: showLayout }, { spacer: true }, { text: lc(saveFunction ? 'save' : 'export'), prominent: true, color: colorPrimary, onTap: exportPDF }]
            : [];
    // not pure white at night; the theme colors change with the theme
    $: sheetBackground = colorBackground && isDarkTheme() ? '#E8E8EA' : '#FFFFFF';
</script>

<appPage bind:this={page} id="pdfpreview" backgroundColor={colorBackground} screenOrientation="all">
    <appBar {bottomItems} color={colorOnBackground} iosIconRenderingMode="alwaysTemplate" ios:translucent={true} size="small" subtitle={hasSheets ? subtitle : undefined} title={lc('pdf_preview')}>
        {#if __ANDROID__}
            <navigationButton {...{ 'android.systemIcon': 'ic_menu_close_clear_cancel' }} on:tap={close} />
        {:else}
            <appBarItem icon={appIcon('close')} ios.position="left" text={lc('close')} on:tap={close} />
        {/if}
        {#if hasSheets}
            <appBarItem
                android:badge={color === 'black_white'}
                icon={appIcon('black_white')}
                ios.position="right"
                prominent={color === 'black_white'}
                text={lc('black_white')}
                on:tap={toggleBlackWhite} />
            {#if !saveFunction}
                <appBarItem icon={appIcon('more')} ios.position="right" menu={moreMenu} text={lc('more_options')} />
            {/if}
        {/if}
    </appBar>
    <bottomsheet bind:this={sheet} scrollViewId="layoutScroll" stepIndex={1} steps={LAYOUT_SHEET_STEPS} {translationFunction} on:layoutChanged={onSheetLayout} on:stepIndexChange={onSheetStep}>
        <!-- an absolute layout measures its children by their content: the page body fills it -->
        <gridlayout bind:this={pageContent} height="100%" rows="*" width="100%" on:layoutChanged={onContentLayout}>
            {#if hasSheets}
                <pager
                    bind:this={pager}
                    id="pager"
                    {itemTemplateSelector}
                    {items}
                    orientation="horizontal"
                    pagesCount={1}
                    peaking={PAGER_PEAKING}
                    preserveIndexOnItemsChange={true}
                    selectedIndex={currentPagerIndex}
                    on:selectedIndexChange={onPageIndexChanged}>
                    {#each { length: 6 } as _, i (i)}
                        <Template key={`${i + 1}`} let:item>
                            <gridlayout padding="{SHEET_TOP_MARGIN} {PAGER_PAGE_PADDING} {contentHeight - SHEET_TOP_MARGIN - roomHeight} {PAGER_PAGE_PADDING}">
                                <gridlayout
                                    id="fit"
                                    backgroundColor={sheetBackground}
                                    borderColor={__ANDROID__ ? colorOutlineVariant : undefined}
                                    borderRadius={SHEET_RADIUS}
                                    borderWidth={__ANDROID__ ? 1 : 0}
                                    boxShadow={__IOS__ ? '0 2 10 #0000002e' : undefined}
                                    {...getPageLayoutProps(item, i + 1, roomHeight)}
                                    on:loaded={(event) => onPaperLoaded(item, event)}>
                                    {#each { length: i + 1 } as _, j (j)}
                                        <image
                                            fadeDuration={150}
                                            ios:contextOptions={IMAGE_CONTEXT_OPTIONS}
                                            {...getPageImageOptions(i + 1, item, j, roomHeight)}
                                            horizontalAlignment="center"
                                            stretch="aspectFit"
                                            verticalAlignment="middle" />
                                    {/each}
                                </gridlayout>
                            </gridlayout>
                        </Template>
                    {/each}
                </pager>
            {:else}
                <!-- no pages, or a preview which could not be built -->
                <stacklayout horizontalAlignment="center" verticalAlignment="middle" width={280}>
                    <gridlayout backgroundColor={error ? undefined : colorSecondaryContainer} borderRadius={44} height={88} horizontalAlignment="center" width={88}>
                        <uibutton
                            color={error ? colorError : colorOnBackground}
                            height={40}
                            horizontalAlignment="center"
                            isUserInteractionEnabled={false}
                            padding={0}
                            variant="text"
                            verticalAlignment="center"
                            width={40}
                            {...{ src: appIcon(error ? 'error' : 'pdf') }} />
                    </gridlayout>
                    <label color={colorOnBackground} fontSize={22} fontWeight="bold" marginTop={24} text={lc(error ? 'pdf_preview_error' : 'pdf_preview_empty')} textAlignment="center" textWrap={true} />
                    <label color={colorOnSurfaceVariant} fontSize={15} marginTop={8} text={error || lc('pdf_preview_empty_desc')} textAlignment="center" textWrap={true} />
                    {#if error}
                        <uibutton marginTop={24} text={lc('retry')} variant="contained" on:tap={refresh} />
                        <uibutton text={lc('close')} variant="text" on:tap={close} />
                    {:else}
                        <uibutton marginTop={24} text={lc('close')} variant="contained" on:tap={close} />
                    {/if}
                </stacklayout>
            {/if}
            {#if hasSheets && items.length > 1 && !adjusting && !snackVisible}
                <label
                    backgroundColor={__IOS__ ? '#7676801F' : colorSecondaryContainer}
                    borderRadius={14}
                    color={colorOnBackground}
                    fontSize={13}
                    height={COUNTER_HEIGHT}
                    horizontalAlignment="center"
                    isUserInteractionEnabled={false}
                    marginBottom={counterBottom}
                    padding="0 12"
                    text={`${currentPagerIndex + 1} / ${items.length}`}
                    verticalAlignment="bottom"
                    verticalTextAlignment="center" />
            {/if}
        </gridlayout>
        <gridlayout
            prop:bottomSheet
            backgroundColor={__IOS__ ? colorBackground : colorSurfaceContainerLow}
            borderTopLeftRadius={__IOS__ ? 26 : 28}
            borderTopRightRadius={__IOS__ ? 26 : 28}
            boxShadow={__IOS__ ? '0 -3 10 #00000072' : undefined}
            height={LAYOUT_SHEET_HEIGHT}
            horizontalAlignment="left"
            rows="28,auto"
            width={sheetWidth}>
            <absolutelayout backgroundColor={colorOutlineVariant} borderRadius={2.5} height={5} horizontalAlignment="center" marginTop={10} width={36} />
            <PDFLayoutSheet
                hasOCRText={hasOCRText}
                inline={true}
                onChange={updateOption}
                onClose={closeLayout}
                onOpenSettings={() => showSettings({ subSettingsOptions: 'pdf_export' })}
                onReset={resetLayout}
                {optionsStore}
                row={1}
                scrollId="layoutScroll"
                sheetHeight={LAYOUT_LIST_HEIGHT} />
        </gridlayout>
    </bottomsheet>
    <appPageOverlay>
        {#if __ANDROID__ && hasSheets}
            <stacklayout bind:this={fabHolder} class="fabHolder" marginBottom={Math.min(60, $windowInset.bottom)} orientation="horizontal" on:loaded={onFabHolderLoaded}>
                <uibutton class="addFab" {...{ src: appIcon('tune') }} variant="contained" visibility={adjusting ? 'collapsed' : 'visible'} on:tap={showLayout} />
                <uifloatingactionbutton
                    class="editFab"
                    backgroundColor={colorPrimary}
                    color={colorOnPrimary}
                    expanded={!adjusting}
                    src={appIcon(saveFunction ? 'check' : 'export')}
                    text={lc(saveFunction ? 'save' : 'export')}
                    on:loaded={onEditFabLoaded}
                    on:tap={exportPDF} />
            </stacklayout>
        {/if}
    </appPageOverlay>
</appPage>
