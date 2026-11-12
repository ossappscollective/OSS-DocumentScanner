<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Img } from '@nativescript-community/ui-image';
    import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { confirm } from '@nativescript-community/ui-dialogs';
    import { MenuItem } from '@nativescript-community/ui-menu';
    import { Pager } from '@nativescript-community/ui-pager';
    import type { PersistentBottomSheet } from '@nativescript-community/ui-persistent-bottomsheet';
    import { AndroidActivityBackPressedEventData, Application, EventData, Frame, ObservableArray, Page, Utils, View } from '@nativescript/core';
    import { debounce, throttle } from '@nativescript/core/utils';
    import { showError } from '@shared/utils/showError';
    import { goBack, showModal } from '@shared/utils/svelte/ui';
    import { allowSwipeBack } from '~/utils/swipeBack';
    import { OCRData, QRCodeData, Quad, getImageSize } from 'plugin-nativeprocessor';
    import { onDestroy, onMount } from 'svelte';
    import { Writable } from 'svelte/store';
    import PageCounter from '~/components/common/PageCounter.svelte';
    import PersistentSheetFrame, { SHEET_GRABBER_HEIGHT } from '~/components/common/PersistentSheetFrame.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import AdjustSheet from '~/components/widgets/ImageProcessingSettingsBottomSheet.svelte';
    import { lc } from '~/helpers/locale';
    import { onThemeChanged } from '~/helpers/theme';
    import { ImportImageData, OCRDocument, OCRPage } from '~/models/OCRDocument';
    import { DocumentDeletedEventData, DocumentPageUpdatedEventData, DocumentUpdatedEventData, documentsService } from '~/services/documents';
    import { qrcodeService } from '~/services/qrcode';
    import { shortcutService } from '~/services/shortcuts';
    import { appIcon } from '~/utils/appIcons';
    import type { MatricesTypes, Matrix } from '~/utils/color_matrix';
    import { DEFAULT_BRIGHTNESS, DEFAULT_COLORTYPE, DEFAULT_CONTRAST, EVENT_DOCUMENT_DELETED, EVENT_DOCUMENT_PAGE_UPDATED, EVENT_DOCUMENT_UPDATED, TRANSFORMS_SPLIT } from '~/utils/constants';
    import { hasOriginalImage } from '~/utils/originals';
    import { createPageSheetTranslation, getPageFit, setPageFit } from '~/utils/pageSheet';
    import { getIOSBottomInset, getIOSViewBottomInset, measureWidth } from '~/utils/safeArea';
    import {
        detectOCROnPage,
        hideLoading,
        onBackButton,
        getExportMenu,
        showLoading,
        showOCRData,
        showSnack
    } from '~/utils/ui';
    import { colors, screenHeightDips, windowInset } from '~/variables';

    // technique for only specific properties to get updated on store change
    $: ({ colorOnBackground } = $colors);

    export let startPageIndex: number = 0;
    DEV_LOG && console.log('startPageIndex', startPageIndex);
    export let document: OCRDocument;
    export let transitionOnBack = true;
    let pager: NativeViewElementNode<Pager>;
    let page: NativeViewElementNode<Page>;

    const items: ObservableArray<OCRPage> = document.getObservablePages();
    let currentIndex = startPageIndex;
    let currentItem: OCRPage;
    let currentItemOCRData: OCRData;
    let currentItemQRCodeData: QRCodeData;
    let currentSelectedImagePath: string;
    let currentSelectedImageRotation: number;
    let transforms: string[];
    updateCurrentItem(items.getItem(currentIndex));
    let updatingTransform = false;
    const FLOATING_TOOLBAR_OFFSET = 80;
    let adjusting = false;
    // the adjust sheet is a persistent sheet of the page: a grabber, a header, the list of the adjustments, and the room of the bottom toolbar under them.
    // The pager keeps its width: each page scales and moves with the sheet (so the neighbors stay seen), and the pages stay interactive
    const SHEET_HEADER_HEIGHT = 64;
    const ADJUST_LIST_HEIGHT = Math.round(screenHeightDips * 0.4);
    let sheet: NativeViewElementNode<PersistentBottomSheet>;
    // the sheet goes down to the bottom of the screen, over the place of the toolbar: the list scrolls under the safe area
    const sheetHeight = SHEET_GRABBER_HEIGHT + SHEET_HEADER_HEIGHT + ADJUST_LIST_HEIGHT;
    const steps = [0, sheetHeight];
    // iOS: the sheet stops at the safe area, and goes under it: it is taller and its list scrolls above the home indicator
    let bottomInset = getIOSBottomInset();
    // the width of the sheet is the one of the page: a percentage in the layout of the sheet made it wider than the screen
    let sheetWidth: number;
    // iOS: the bottom toolbar comes and goes after the layout of the sheet
    // the toolbar is not there while the sheet is open: its room is kept
    function updateBottomInset() {
        if (!adjusting && !toolbarHidden) {
            bottomInset = getIOSViewBottomInset(sheet?.nativeView) || bottomInset;
        }
    }
    function onSheetLayout() {
        updateBottomInset();
        sheetWidth = measureWidth(sheet?.nativeView, sheetWidth);
    }
    // the sizes of the views do not change with the transformations: they are measured when the sheet opens
    let pageArea: { containerHeight: number; areaHeight: number; areaWidth: number };
    function measurePageArea() {
        const container = sheet?.nativeView;
        const area = pager?.nativeView;
        if (!container || !area) {
            return undefined;
        }
        return {
            containerHeight: Utils.layout.toDeviceIndependentPixels(container.getMeasuredHeight()),
            areaHeight: Utils.layout.toDeviceIndependentPixels(area.getMeasuredHeight()),
            areaWidth: Utils.layout.toDeviceIndependentPixels(area.getMeasuredWidth())
        };
    }
    // the page is fitted in the pager: its height is the one which is scaled, and each page has its own
    function getFitFor(item: OCRPage) {
        if (!pageArea || !item) {
            return undefined;
        }
        const turned = (item.rotation ?? 0) % 180 !== 0;
        const ratio = item.width && item.height ? (turned ? item.width / item.height : item.height / item.width) : 1.41;
        const { areaHeight, areaWidth, containerHeight } = pageArea;
        return getPageFit({ containerHeight, pageCenter: areaHeight / 2, pageHeight: Math.min(areaHeight, areaWidth * ratio), roomTop: 0, sheetHeight, viewCenter: areaHeight / 2 });
    }
    // the views which hold the pages: the current one and its neighbors
    function getPageViews() {
        const result: { item: OCRPage; view: View }[] = [];
        for (let index = Math.max(0, currentIndex - 2); index <= Math.min(items.length - 1, currentIndex + 2); index++) {
            const view = pager?.nativeView?.getChildView(index)?.getViewById<View>('fit');
            if (view) {
                result.push({ item: items.getItem(index), view });
            }
        }
        return result;
    }
    const translationFunction = createPageSheetTranslation(() =>
        getPageViews()
            .map(({ item, view }) => ({ target: view, fit: getFitFor(item) }))
            .filter((current) => !!current.fit)
    );
    // a page which is shown after the sheet opened, or which the pager reuses: it is at the fit of the sheet, or as it is
    function syncPageViews() {
        getPageViews().forEach(({ item, view }) => setPageFit(view, adjusting ? getFitFor(item) : undefined));
    }
    function onPageViewLoaded(item: OCRPage, event: EventData) {
        if (event.object instanceof View) {
            setPageFit(event.object, adjusting ? getFitFor(item) : undefined);
        }
    }
    // the sheet follows its steps: the gesture too, so this is where it opens and closes
    function onSheetStep(event: { value: number }) {
        adjusting = event.value > 0;
        if (!adjusting) {
            toolbarHidden = false;
        }
    }
    function closeAdjustments() {
        sheet?.nativeView?.animateStepIndex(0);
    }

    // the popovers still need a view to be anchored to
    function getAnchor() {
        return page?.nativeView;
    }
    async function detectOCR() {
        // let ocrImage;
        try {
            const ocrData = await detectOCROnPage(document, currentIndex);
            if (ocrData) {
                currentItemOCRData = ocrData;
            } else {
                showSnack({ message: lc('no_text_found_in_page') });
            }
        } catch (err) {
            showError(err);
        }
    }

    async function showOCRSettings() {
        try {
            const OCRSettingsBottomSheet = (await import('~/components/ocr/OCRSettingsBottomSheet.svelte')).default;
            const shouldStart = await showBottomSheet({
                parent: page,
                skipCollapsedState: true,
                view: OCRSettingsBottomSheet,
                props: {}
            });
            if (shouldStart) {
                detectOCR();
            }
        } catch (error) {
            showError(error);
        }
    }
    async function detectQRCode() {
        if (CARD_APP) {
            try {
                const qrcode = await qrcodeService.detectQRcode(document, currentIndex);
                if (!qrcode?.length) {
                    showSnack({ message: lc('no_qrcode_found') });
                } else {
                    currentItemQRCodeData = qrcode;
                    showSnack({ message: lc('qrcode_found') });
                }
            } catch (error) {
                showError(error);
            }
        }
    }
    function updateCurrentItem(item) {
        currentItem = item;
        currentSelectedImagePath = currentItem?.imagePath;
        currentSelectedImageRotation = currentItem?.rotation || 0;
        currentItemOCRData = currentItem?.ocrData;
        currentItemQRCodeData = currentItem?.qrcode;
        transforms = currentItem?.transforms?.split(TRANSFORMS_SPLIT) || [];
    }
    function onSelectedIndex(event) {
        currentIndex = event.object.selectedIndex;
        // the pager creates the next pages while it moves: they get their fit once they are there
        if (adjusting) {
            setTimeout(syncPageViews, 50);
        }

        updateCurrentItem(items.getItem(currentIndex));
    }

    async function onImageRotated(item, event) {
        try {
            const newRotation = event.newRotation;
            if (newRotation === undefined) {
                return;
            }
            DEV_LOG && console.log('onImageRotated', newRotation);
            await document.updatePage(
                currentIndex,
                {
                    rotation: newRotation % 360
                },
                false
            );
            if (CARD_APP) {
                shortcutService.updateShortcuts(document);
            }

            currentSelectedImageRotation = item.rotation;
        } catch (error) {
            showError(error);
        }
    }

    function getCurrentImageView() {
        return pager?.nativeView.getChildView(currentIndex)?.getViewById<Img>('imageView');
    }

    function applyRotation(newRotation) {
        getCurrentImageView()?.notify({ eventName: 'rotateAnimated', rotation: newRotation });
    }
    function getCurrentRotation() {
        const current = items.getItem(currentIndex);
        return current.rotation && !isNaN(current.rotation) ? current.rotation : 0;
    }
    async function rotateImageLeft() {
        try {
            applyRotation(getCurrentRotation() - 90);
        } catch (error) {
            showError(error);
        }
    }
    async function rotateImageRight() {
        try {
            applyRotation(getCurrentRotation() + 90);
        } catch (error) {
            showError(error);
        }
    }

    async function showCurrentOCRData() {
        try {
            await showOCRData(document, currentIndex);
        } catch (error) {
            showError(error);
        }
    }

    const saveColor = debounce(function (index: number, colorType: MatricesTypes, colorMatrix: Matrix) {
        document.updatePage(index, { colorType, colorMatrix }).catch(showError);
        if (CARD_APP) {
            shortcutService.updateShortcuts(document);
        }
    }, 500);
    function onColorChange(colorType: MatricesTypes, colorMatrix: Matrix) {
        const current = items.getItem(currentIndex);
        current.colorType = colorType;
        current.colorMatrix = colorMatrix;
        items.setItem(currentIndex, current);
        saveColor(currentIndex, colorType, colorMatrix);
    }

    async function deleteCurrentPage() {
        try {
            DEV_LOG && console.log('deleteCurrentPage', currentIndex, document.pages.length);
            let result;
            const deleteDocument = document.pages.length === 1;
            if (deleteDocument) {
                result = await confirm({
                    title: lc('delete'),
                    message: lc('confirm_delete_document'),
                    okButtonText: lc('delete'),
                    cancelButtonText: lc('cancel')
                });
            } else {
                result = await confirm({
                    title: lc('delete_page', currentIndex),
                    message: lc('confirm_delete_page', currentIndex + 1),
                    okButtonText: lc('delete'),
                    cancelButtonText: lc('cancel')
                });
            }
            if (result) {
                if (deleteDocument) {
                    await documentsService.deleteDocuments([document]);
                } else {
                    await document.deletePage(currentIndex);
                    currentIndex = Math.min(currentIndex, items.length - 1);
                    pager.nativeView.scrollToIndexAnimated(currentIndex, true);
                }
            }
        } catch (err) {
            showError(err);
        }
    }

    const saveBrightnessContrast = debounce(
        (brightness: number, contrast: number) => {
            document.updatePage(currentIndex, {
                brightness,
                contrast
            });
        },
        500,
        { leading: false }
    );
    async function applyBrightnessContrast(brightness: number, contrast: number) {
        try {
            const current = items.getItem(currentIndex);
            current.colorMatrix = null;
            current.brightness = brightness;
            current.contrast = contrast;
            items.setItem(currentIndex, current);
            saveBrightnessContrast(brightness, contrast);
        } catch (error) {
            showError(error);
        }
    }

    function showAdjustments() {
        if (adjusting) {
            closeAdjustments();
            return;
        }
        toolbarHidden = true;
        // the pager is measured once the toolbar has left, the sheet opens then
        setTimeout(() => {
            pageArea = measurePageArea();
            sheet?.nativeView?.animateStepIndex(1);
        }, 100);
    }

    async function updateImageUris() {
        await getCurrentImageView()?.updateImageUri();
    }

    async function updateTransform(value: boolean, store: Writable<boolean>, type: string) {
        if (updatingTransform) {
            store?.set(!value);
            return;
        }
        updatingTransform = true;
        try {
            const page = items.getItem(currentIndex);
            const currentTransforms = (page.transforms?.split(TRANSFORMS_SPLIT) || []).filter((s) => s?.length);
            if (value) {
                if (currentTransforms.indexOf(type) === -1) {
                    await showLoading(lc('computing'));
                    currentTransforms.push(type);
                    await document.updatePageTransforms(currentIndex, currentTransforms.join(TRANSFORMS_SPLIT));
                }
            } else {
                const index = currentTransforms.indexOf(type);
                if (index !== -1) {
                    await showLoading(lc('computing'));
                    currentTransforms.splice(index, 1);
                    await document.updatePageTransforms(currentIndex, currentTransforms.join(TRANSFORMS_SPLIT));
                }
            }
            transforms = currentTransforms;
        } catch (error) {
            showError(error);
        } finally {
            updatingTransform = false;
            hideLoading();
        }
    }

    async function onDocumentPageUpdated(event: DocumentPageUpdatedEventData) {
        if (event.doc !== document) {
            return;
        }
        const index = event.pageIndex;
        if (index === currentIndex) {
            DEV_LOG && console.log('edit onDocumentPageUpdated', index, event.imageUpdated);
            const item = items.getItem(index);
            updateCurrentItem(item);
            // TODO: fix the pager something is wrong if we
            items.setItem(index, item);
            if (!!event.imageUpdated) {
                await updateImageUris();
            }
        }
    }

    function onDocumentUpdated(event: DocumentUpdatedEventData) {
        if (document === event.doc) {
            document = event.doc;
        }
    }
    function onDocumentsDeleted(event: DocumentDeletedEventData) {
        if (event.documents.indexOf(document) !== -1) {
            const frame = Frame.topmost();
            goBack({
                frame,
                backStackEntry: frame.backStack[0],
                // null is important to say no transition! (override enter transition)
                transition: null
            });
        }
    }
    onMount(() => {
        if (__ANDROID__) {
            Application.android.on(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
        documentsService.on(EVENT_DOCUMENT_UPDATED, onDocumentUpdated);
        documentsService.on(EVENT_DOCUMENT_DELETED, onDocumentsDeleted);
        documentsService.on(EVENT_DOCUMENT_PAGE_UPDATED, onDocumentPageUpdated);
    });
    onDestroy(() => {
        DEV_LOG && console.log('DocumentEdit onDestroy');
        if (__ANDROID__) {
            Application.android.off(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
        documentsService.off(EVENT_DOCUMENT_UPDATED, onDocumentUpdated);
        documentsService.off(EVENT_DOCUMENT_DELETED, onDocumentsDeleted);
        documentsService.off(EVENT_DOCUMENT_PAGE_UPDATED, onDocumentPageUpdated);
    });

    let cropItem: ImportImageData = {};
    async function cropEdit() {
        //TODO: recrop into modal window
        try {
            const item = items.getItem(currentIndex);
            if (!item) {
                return;
            }
            if (!item.sourceImageWidth) {
                const size = await getImageSize(item.sourceImagePath);
                item.sourceImageWidth = size.width;
                item.sourceImageHeight = size.height;
                item.sourceImageRotation = 0;
            }
            cropItem = {
                imagePath: item.sourceImagePath,
                imageWidth: item.sourceImageWidth,
                imageHeight: item.sourceImageHeight,
                imageRotation: item.sourceImageRotation,
                undos: [],
                redos: []
            };
            const quad = JSON.parse(JSON.stringify(item.crop));
            const component = (await import('~/components/edit/CropEditView.svelte')).default;
            const result: Quad = await showModal({
                page: component,
                fullscreen: true,
                props: {
                    cropItem,
                    quad
                }
            });
            if (result) {
                showLoading(lc('computing'));
                await document.updatePageCrop(currentIndex, result);
            }
        } catch (error) {
            showError(error);
        } finally {
            hideLoading();
        }
    }
    function refreshPager() {
        pager?.nativeView?.refresh();
    }
    onThemeChanged(refreshPager);

    const onAndroidBackButton = (data: AndroidActivityBackPressedEventData) =>
        onBackButton(page?.nativeView, () => {
            data.cancel = true;
            if (adjusting) {
                closeAdjustments();
            } else {
                goBack();
            }
        });

    function getMoreMenu(): MenuItem[] {
        return [{ title: lc('delete_page'), icon: appIcon('delete'), destructive: true, onSelect: deleteCurrentPage }];
    }
    function getBottomItems(canCrop: boolean, hasOCRData: boolean) {
        return [
            { spacer: true },
            ...(canCrop ? [{ text: lc('crop'), icon: appIcon('crop'), onTap: cropEdit }, { spacer: true }] : []),
            { text: lc('rotate_left'), icon: appIcon('rotate_left'), onTap: rotateImageLeft },
            { text: lc('rotate_right'), icon: appIcon('rotate_right'), onTap: rotateImageRight },
            { spacer: true },
            { text: lc('adjust'), icon: appIcon('tune'), onTap: showAdjustments },
            // the text found in the page
            ...(hasOCRData ? [{ text: lc('ocr'), icon: appIcon('ocr'), onTap: showCurrentOCRData }] : []),
            // what to look for in the page
            ...(CARD_APP
                ? [
                      {
                          text: lc('detect'),
                          icon: appIcon('search'),
                          menu: [
                              { title: lc('ocr_document'), icon: appIcon('ocr'), onSelect: showOCRSettings },
                              { title: lc('detect_qrcode'), icon: appIcon('qrcode'), onSelect: detectQRCode }
                          ]
                      }
                  ]
                : [{ text: lc('ocr_document'), icon: appIcon('search'), onTap: showOCRSettings }]),
            { spacer: true }
        ];
    }
    // the current page only: no PDF
    $: exportMenu = getExportMenu({ document, pages: [{ page: currentItem, document }], pdf: false });
    $: moreMenu = getMoreMenu();
    // the toolbar leaves its place to the sheet
    let toolbarHidden = false;
    $: bottomItems = toolbarHidden ? [] : getBottomItems(!!currentItem?.sourceImagePath, !!currentItemOCRData);
</script>

<appPage bind:this={page} id="pdfEdit">
    <appBar {bottomItems} color={colorOnBackground} iosIconRenderingMode="alwaysTemplate" ios:translucent={true} size="small" subtitle={document.name} title={lc('edit')}>
        {#if __ANDROID__}
            <navigationButton {...{ 'android.systemIcon': 'ic_menu_back' }} on:tap={() => goBack()} />
        {/if}
        <appBarItem icon={appIcon('export')} ios.position="right" menu={exportMenu} text={lc('export')} />
        <appBarItem icon={appIcon('more')} ios.position="right" menu={moreMenu} />
    </appBar>
    <bottomsheet bind:this={sheet} {steps} scrollViewId="adjustList" {translationFunction} on:animated={updateBottomInset} on:layoutChanged={onSheetLayout} on:stepIndexChange={onSheetStep}>
        <!-- an absolute layout measures its children by their content: the page fills it -->
        <gridlayout android:paddingBottom={FLOATING_TOOLBAR_OFFSET + $windowInset.bottom} height="100%" rows="*,auto" width="100%">
            <pager bind:this={pager} {items} rowSpan={2} selectedIndex={startPageIndex} transformers="zoomOut" on:loaded={allowSwipeBack} on:selectedIndexChange={onSelectedIndex}>
                <Template let:item>
                    <gridlayout width="100%">
                        <!-- the page scales and moves in this one: the pager transformer owns the scale of the page view -->
                        <gridlayout id="fit" on:loaded={(event) => onPageViewLoaded(item, event)}>
                            <RotableImageView id="imageView" {item} sharedTransitionTag={`document_${document.id}_${item.id}`} zoomable={true} on:rotated={(e) => onImageRotated(item, e)} />
                        </gridlayout>
                    </gridlayout>
                </Template>
            </pager>
            {#if items.length > 1 && !adjusting}
                <PageCounter marginBottom={12} row={1} text={`${currentIndex + 1} / ${items.length}`} />
            {/if}
        </gridlayout>
        <PersistentSheetFrame height={sheetHeight + bottomInset} rows="auto,auto" shadow={adjusting} width={sheetWidth}>
            <!-- the quick way to close it: the sheet is not modal, the page stays in use -->
            <SheetHeader doneText={lc('done')} onDone={closeAdjustments} row={1} showCancel={false} title={lc('adjust')} />
            <AdjustSheet
                brightness={typeof currentItem?.brightness === 'number' ? currentItem.brightness : DEFAULT_BRIGHTNESS}
                cameraOptionsStore={null}
                colorMatrix={currentItem?.colorMatrix}
                colorType={currentItem?.colorType ?? DEFAULT_COLORTYPE}
                contrast={typeof currentItem?.contrast === 'number' ? currentItem.contrast : DEFAULT_CONTRAST}
                inline={true}
                listId="adjustList"
                onAdjustmentChange={applyBrightnessContrast}
                {onColorChange}
                onTransformChange={(type, value) => updateTransform(value, null, type)}
                pageMode={true}
                previewSrc={currentItem?.imagePath}
                row={2}
                {bottomInset}
                sheetHeight={ADJUST_LIST_HEIGHT + bottomInset}
                showTransforms={hasOriginalImage(currentItem)}
                transforms={[...(transforms ?? [])]} />
        </PersistentSheetFrame>
    </bottomsheet>
</appPage>
