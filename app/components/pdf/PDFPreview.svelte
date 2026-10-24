<script context="module" lang="ts">
    import { Paint } from '@nativescript-community/ui-canvas';
    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import DrawerElement from '@nativescript-community/ui-drawer/svelte';
    import { prompt } from '@nativescript-community/ui-dialogs';
    import { Pager } from '@nativescript-community/ui-pager';
    import { VerticalPosition } from '@nativescript-community/ui-popover';
    import { ApplicationSettings, ObservableArray, Utils, View, knownFolders } from '@nativescript/core';
    import { openFile } from '@nativescript/core/utils';
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import { printPDF } from 'plugin-nativeprocessor';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { writable } from 'svelte/store';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import { getFileNameForDocument, l, lc } from '~/helpers/locale';
    import { OCRDocument, OCRPage } from '~/models/OCRDocument';
    import PDFCanvas, { PDFCanvasItem, PDFExportBaseOptions } from '~/services/pdf/PDFCanvas';
    import { exportPDFAsync } from '~/services/pdf/PDFExporter';
    import { ANDROID_CONTENT, IMAGE_CONTEXT_OPTIONS, SEPARATOR } from '~/utils/constants';
    import { PDF_OPTIONS } from '~/utils/localized_constant';
    import { getPageColorMatrix } from '~/utils/matrix';
    import { hideLoading, showLoading, showPopoverMenu, showSettings, showSliderPopover, showSnack } from '~/utils/ui';
    import { colors, fontScale, fonts, screenHeightDips, screenRatio, screenWidthDips, windowInset } from '~/variables';
    import PageIndicator from '../common/PageIndicator.svelte';
    import { getTransformedImage } from '~/services/pdf/PDFExportCanvas.common';
    // let bitmapPaint: Paint;
    // const textPaint = new Paint();
    const bgPaint = new Paint();
    bgPaint.color = 'white';
    bgPaint.setShadowLayer(6, 0, 2, '#00000088');
    const PAGER_PEAKING = 30;
    const PAGER_PAGE_PADDING = 16;
</script>

<script lang="ts">
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOnSurfaceVariant2, colorPrimary, colorSurface, colorSurfaceContainer, colorSurfaceContainerHigh } = $colors);

    export let pages: { page: OCRPage; document: OCRDocument }[];
    export let document: OCRDocument = null;
    export let saveFunction: (options: PDFExportBaseOptions) => void = null;

    let pager: NativeViewElementNode<Pager>;
    let drawer: DrawerElement;
    let items: ObservableArray<PDFCanvasItem>;
    let currentPagerIndex = 0;
    const pdfCanvas = new PDFCanvas();
    const optionsStore = writable(pdfCanvas.options);
    let { color, draw_ocr_text, items_per_page, orientation, page_padding, paper_size } = pdfCanvas.options;
    $: ({ color, draw_ocr_text, items_per_page, orientation, page_padding, paper_size } = $optionsStore);

    optionsStore.subscribe((newValue) => {
        DEV_LOG && console.log('saving options', newValue);
        Object.assign(pdfCanvas.options, newValue);
        if (!saveFunction) {
            // in this case this is the scanner activity we dont want to persist options
            ApplicationSettings.setString('default_export_options', JSON.stringify(pdfCanvas.options));
        }
    });

    function refresh() {
        pdfCanvas.updatePages(pages.map((p) => p.page));
        items = new ObservableArray(pdfCanvas.items);
    }
    function requestPagesRedraw() {
        pager?.nativeElement?.refreshVisibleItems();
        // pager?.nativeElement?.eachChild((view) => {
        //     if (view instanceof ContentView) {
        //         view = view.content;
        //     }
        //     (view as CanvasView)?.requestLayout();
        //     return true;
        // });
    }

    function onPageIndexChanged(event) {
        // DEV_LOG && console.log('onPageIndexChanged', event.object.selectedIndex, new Error().stack);
        currentPagerIndex = event.object.selectedIndex;
    }
    refresh();

    async function exportPDF() {
        try {
            const result = await prompt({
                okButtonText: lc('ok'),
                cancelButtonText: lc('cancel'),
                defaultText: getFileNameForDocument(document) + '.pdf',
                hintText: lc('pdf_filename')
            });
            if (result?.result && result?.text?.length) {
                showLoading(lc('exporting'));
                const exportDirectory = ApplicationSettings.getString(
                    'pdf_export_directory',
                    __ANDROID__ ? android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS).getAbsolutePath() : knownFolders.externalDocuments().path
                );
                const filePath = await exportPDFAsync({ pages, document, folder: exportDirectory, filename: result.text });
                hideLoading();
                if (!filePath) {
                    return;
                }
                let filename;
                if (__ANDROID__ && filePath.startsWith(ANDROID_CONTENT)) {
                    filename = com.nativescript.documentpicker.FilePath.getPath(Utils.android.getApplicationContext(), android.net.Uri.parse(filePath))?.split(SEPARATOR).pop();
                } else {
                    filename = filePath.split(SEPARATOR).pop();
                }
                const onSnack = await showSnack({ message: lc('pdf_saved', filename || filePath), actionText: lc('open') });
                if (onSnack?.reason === 'action') {
                    openFile(filePath);
                }
            }
        } catch (error) {
            showError(error);
        }
    }
    async function openPDF() {
        try {
            showLoading(lc('exporting'));
            const filePath = await exportPDFAsync({ pages, document });
            hideLoading();
            if (filePath) {
                openFile(filePath);
            } else {
                throw new SilentError(lc('no_pages_in_pdf'));
            }
        } catch (error) {
            showError(error);
        }
    }
    async function onPrintPDF() {
        try {
            showLoading(lc('exporting'));
            const filePath = await exportPDFAsync({ pages, document });
            hideLoading();
            DEV_LOG && console.log('print pdf', filePath);
            printPDF(filePath, document?.name || 'PDF');
        } catch (error) {
            showError(error);
        }
    }

    async function selectOption(option: string, event, valueTransformer?, fullRefresh = true) {
        try {
            // const OptionSelect = (await import('~/components/OptionSelect.svelte')).default;
            const options = Object.keys(PDF_OPTIONS[option]).map((k) => ({ ...PDF_OPTIONS[option][k], id: k }));
            await showPopoverMenu({
                options,
                anchor: event.object,
                onClose: (item) => {
                    updateOption(option, valueTransformer ? valueTransformer(item.id) : item.id, fullRefresh);
                }
            });
        } catch (error) {
            showError(error);
        }
    }

    function updateOption(option: string, value, fullRefresh = false) {
        try {
            clearCheckboxTimer();
            // DEV_LOG && console.log('updateOption', option, value, fullRefresh);
            optionsStore.update((state) => {
                state[option] = value;
                return state;
            });
            if (fullRefresh) {
                refresh();
            } else {
                requestPagesRedraw();
            }
        } catch (error) {
            showError(error);
        }
    }
    async function selectSilderOption(option: string, event, fullRefresh = false) {
        try {
            await showSliderPopover({
                debounceDuration: 0,
                anchor: event.object,
                vertPos: VerticalPosition.BELOW,
                value: pdfCanvas.options[option],
                onChange(value) {
                    updateOption(option, Math.round(value), fullRefresh);
                }
            });
        } catch (error) {
            showError(error);
        }
    }

    const tMargin = '4 10 4 10';
    const tPadding = __ANDROID__ ? '10 20 10 20' : '0 10 0 10';
    const tWidth = (screenWidthDips - 41) / 2;
    const tHeight = 'auto';

    function getPageImageOptions(templatePagesCount: number, item: PDFCanvasItem, pageIndex: number, index?: number) {
        const page = item.pages[pageIndex];
        const result =
            orientation === 'landscape'
                ? {
                      row: pageIndex % 2,
                      col: templatePagesCount > 2 ? Math.floor(pageIndex / 2) : pageIndex % 2,
                      rowSpan: pageIndex === item.pages.length - 1 && pageIndex % 2 === 0 && templatePagesCount % 2 === 1 ? 2 : 1
                  }
                : {
                      row: templatePagesCount > 2 ? Math.floor(pageIndex / 2) : pageIndex % 2,
                      col: pageIndex % 2,
                      colSpan: pageIndex === item.pages.length - 1 && pageIndex % 2 === 0 && templatePagesCount % 2 === 1 ? 2 : 1
                  };
        if (!page) {
            return result;
        }
        Object.assign(result, {
            margin: paper_size === 'full' ? 0 : Utils.layout.toDeviceIndependentPixels(page_padding),
            src: async () => {
                if (page.pkpass) {
                    return getTransformedImage({
                        page
                    });
                }
                return page.imagePath;
            },
            imageRotation: page.rotation,
            colorMatrix: getPageColorMatrix(page, color === 'black_white' ? 'grayscale' : undefined)
        });
        // DEV_LOG && console.log('getPageImageOptions', templatePagesCount, pageIndex, index, orientation, paper_size, result);
        return result;
    }
    function itemTemplateSelector(item: PDFCanvasItem) {
        // DEV_LOG && console.log('itemTemplateSelector', items_per_page, paper_size, item.pages.length);
        return (paper_size === 'full' ? 1 : items_per_page) + '';
    }
    function getPageLayoutProps(item: PDFCanvasItem, templatePagesCount: number): Partial<svelteNative.JSX.GridLayoutAttributes> {
        if (paper_size === 'full') {
            return {
                rows: '*',
                columns: '*',
                horizontalAlignment: 'center',
                verticalAlignment: 'middle'
            };
        }
        let pageRatio = 1;
        switch (paper_size) {
            case 'letter':
                pageRatio = 612 / 792;
                break;
            case 'a5':
            case 'a3':
            case 'a4':
            default:
                pageRatio = 595 / 842;
                break;
        }
        if (orientation === 'landscape') {
            pageRatio = 1 / pageRatio;
        }
        const count = templatePagesCount > 2 ? Math.floor((templatePagesCount + 1) / 2) : templatePagesCount;
        const result =
            orientation === 'landscape'
                ? { columns: new Array(count).fill('*').join(','), rows: templatePagesCount >= 3 ? '*,*' : '*' }
                : { rows: new Array(count).fill('*').join(','), columns: templatePagesCount >= 3 ? '*,*' : '*' };
        if (pageRatio > screenRatio || pageRatio > 1) {
            const width = screenWidthDips - 2 * PAGER_PEAKING - 2 * PAGER_PAGE_PADDING;
            Object.assign(result, {
                horizontalAlignment: 'center',
                verticalAlignment: 'middle',
                width,
                height: width / pageRatio
                // height: Math.round(pageRatio > 1 ? 100 / pageRatio : 100 * pageRatio) + '%'
            });
        } else {
            const height = screenHeightDips - 2 * PAGER_PAGE_PADDING;
            Object.assign(result, {
                width: height * pageRatio,
                verticalAlignment: 'middle',
                height,
                horizontalAlignment: 'center'
            });
        }
        // DEV_LOG && console.log('getPageLayoutProps', templatePagesCount, orientation, paper_size, result);
        return result;
    }
    async function showPDFSettings() {
        showSettings({
            subSettingsOptions: 'pdf'
        });
    }

    let checkboxTapTimer;
    function clearCheckboxTimer() {
        if (checkboxTapTimer) {
            clearTimeout(checkboxTapTimer);
            checkboxTapTimer = null;
        }
    }
    function tapForCheckBox(event) {
        const checkboxView: CheckBox = ((event.object as View).parent as View).getViewById('checkbox');
        clearCheckboxTimer();
        checkboxTapTimer = setTimeout(() => {
            checkboxView.checked = !checkboxView.checked;
        }, 10);
    }
</script>

<!-- we use a frame to be able to navigate to settings from the modal-->
<page id="pdfpreview" actionBarHidden={true} backgroundColor={colorSurfaceContainerHigh} screenOrientation="all" statusBarColor={colorSurface}>
    <gridlayout class="pageContent" rows="auto,*">
        <drawer bind:this={drawer} row={1}>
            <gridlayout rows="auto,*,auto" prop:mainContent android:paddingBottom={$windowInset.bottom}>
                <gridlayout backgroundColor={colorSurface} columns="*,*" padding={5} rows="auto,auto" on:tap={() => drawer?.open()}>
                    <label color={colorOnSurface} fontSize={15}>
                        <span text={lc('orientation') + ': '} />
                        <span color={colorOnSurfaceVariant2} fontWeight="bold" text={PDF_OPTIONS['orientation'][orientation].name} />
                    </label>
                    <label col={1} color={colorOnSurface} fontSize={15}>
                        <span text={lc('paper_size') + ': '} />
                        <span color={colorOnSurfaceVariant2} fontWeight="bold" text={PDF_OPTIONS['paper_size'][paper_size].name} />
                    </label>
                    <label colSpan={2} color={colorOnSurface} fontFamily={$fonts.mdi} fontSize={32} row={1} text="mdi-chevron-down" textAlignment="center" />
                </gridlayout>
                <pager
                    bind:this={pager}
                    id="pager"
                    {itemTemplateSelector}
                    {items}
                    orientation="horizontal"
                    pagesCount={1}
                    peaking={PAGER_PEAKING}
                    preserveIndexOnItemsChange={true}
                    row={1}
                    selectedIndex={currentPagerIndex}
                    on:selectedIndexChange={onPageIndexChanged}
                >
                    {#each { length: 6 } as _, i (i)}
                        <Template key={`${i + 1}`} let:index let:item>
                            <gridlayout padding={PAGER_PAGE_PADDING - 10}>
                                <gridlayout backgroundColor="white" boxShadow="0 0 6 rgba(0, 0, 0, 0.8)" {...getPageLayoutProps(item, i + 1)} margin={10}>
                                    {#each { length: i + 1 } as _, j (j)}
                                        <image
                                            ios:contextOptions={IMAGE_CONTEXT_OPTIONS}
                                            {...getPageImageOptions(i + 1, item, j, index)}
                                            horizontalAlignment="center"
                                            stretch="aspectFit"
                                            verticalAlignment="middle"
                                        />
                                    {/each}
                                </gridlayout>
                            </gridlayout>
                        </Template>
                    {/each}
                </pager>
                <PageIndicator horizontalAlignment="right" margin={10} row={1} scale={$fontScale} text={`${currentPagerIndex + 1}/${items.length}`} verticalAlignment="bottom" />

                <gridlayout columns="*,*" row={2}>
                    {#if saveFunction}
                        <uibutton text={lc('save')} on:tap={() => saveFunction(pdfCanvas.options)} />
                    {:else}
                        <uibutton text={lc('export')} on:tap={exportPDF} />
                        <uibutton col={1} text={lc('open')} on:tap={openPDF} />
                    {/if}
                </gridlayout>
            </gridlayout>

            <wraplayout prop:topDrawer backgroundColor={colorSurface}>
                <textfield
                    editable={false}
                    height={tHeight}
                    hint={lc('orientation')}
                    margin={tMargin}
                    padding={tPadding}
                    text={PDF_OPTIONS['orientation'][orientation].name}
                    variant="outline"
                    width={tWidth}
                    on:tap={(e) => selectOption('orientation', e)}
                />
                <textfield
                    editable={false}
                    height={tHeight}
                    hint={lc('paper_size')}
                    margin={tMargin}
                    padding={tPadding}
                    text={PDF_OPTIONS['paper_size'][paper_size].name}
                    variant="outline"
                    width={tWidth}
                    on:tap={(e) => selectOption('paper_size', e)}
                />

                <textfield
                    editable={false}
                    height={tHeight}
                    hint={lc('color')}
                    margin={tMargin}
                    padding={tPadding}
                    text={PDF_OPTIONS['color'][color].name}
                    variant="outline"
                    width={tWidth}
                    on:tap={(e) => selectOption('color', e)}
                />
                <textfield
                    editable={false}
                    height={tHeight}
                    hint={lc('items_per_page')}
                    margin={tMargin}
                    padding={tPadding}
                    text={PDF_OPTIONS['items_per_page'][items_per_page].name}
                    variant="outline"
                    width={tWidth}
                    on:tap={(e) => selectOption('items_per_page', e, parseInt)}
                />
                <textfield
                    editable={false}
                    height={tHeight}
                    hint={lc('page_padding')}
                    margin={tMargin}
                    padding={tPadding}
                    text={page_padding}
                    variant="outline"
                    width={tWidth}
                    on:tap={(e) => selectSilderOption('page_padding', e)}
                />
                <stacklayout orientation="horizontal" width={tWidth}>
                    <checkbox
                        id="checkbox"
                        checked={draw_ocr_text}
                        height={tHeight}
                        margin={tMargin}
                        verticalAlignment="center"
                        on:checkedChange={(e) => updateOption('draw_ocr_text', e.value)}
                        ios:margin={14}
                    />
                    <label fontSize={14} text={lc('draw_ocr_text')} textWrap={true} verticalAlignment="center" on:tap={tapForCheckBox} />
                </stacklayout>

                <label color={colorOnSurface} fontFamily={$fonts.mdi} fontSize={32} text="mdi-chevron-up" textAlignment="center" width="100%" on:tap={() => drawer?.close()} />
            </wraplayout>
        </drawer>

        <CActionBar modalWindow={true} title={lc('pdf_preview')}>
            {#if __ANDROID__}
                <uibutton class="actionBarButton" text="mdi-printer" variant="text" on:tap={onPrintPDF} />
            {/if}
            <uibutton class="actionBarButton" text="mdi-cog" variant="text" on:tap={showPDFSettings} />
        </CActionBar>
    </gridlayout>
</page>
