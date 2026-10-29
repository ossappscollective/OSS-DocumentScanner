<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { Img } from '@nativescript-community/ui-image';
    import { SVGView } from '@nativescript-community/ui-svg';
    import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { confirm } from '@nativescript-community/ui-dialogs';
    import { Pager } from '@nativescript-community/ui-pager';
    import { MenuItem, setContextMenu } from '@nativescript-community/ui-menu';
    import {
        AnimationDefinition,
        Application,
        ApplicationSettings,
        Color,
        ContentView,
        EventData,
        ImageSource,
        ObservableArray,
        Page,
        PageTransition,
        SharedTransition,
        Utils,
        View
    } from '@nativescript/core';
    import { AndroidActivityBackPressedEventData } from '@nativescript/core/application';
    import { debounce, throttle } from '@nativescript/core/utils';
    import { create as createImagePicker } from '@nativescript/imagepicker';
    import { showError } from '@shared/utils/showError';
    import { goBack, navigate, showModal } from '@shared/utils/svelte/ui';
    import dayjs from 'dayjs';
    import { QRCodeData, QRCodeSingleData, detectQRCodeFromFile } from 'plugin-nativeprocessor';
    import { onDestroy, onMount } from 'svelte';
    import PageIndicator from '~/components/common/PageIndicator.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import PdfEdit from '~/components/edit/DocumentEdit.svelte';
    import { lc, lcp } from '~/helpers/locale';
    import { colorTheme, isDarkTheme, isEInk, onThemeChanged } from '~/helpers/theme';
    import { Document, ExtraFieldType, OCRDocument, OCRPage } from '~/models/OCRDocument';
    import {
        DocumentDeletedEventData,
        DocumentPageDeletedEventData,
        DocumentPageUpdatedEventData,
        DocumentPagesAddedEventData,
        DocumentUpdatedEventData,
        documentsService
    } from '~/services/documents';
    import { getBarcodeFallbackString, qrcodeService } from '~/services/qrcode';
    import { shortcutService } from '~/services/shortcuts';
    import {
        DEFAULT_FORCE_WHITE_BACKGROUND_QRCODE,
        DOCUMENT_NAME_FORMAT,
        EVENT_DOCUMENT_DELETED,
        EVENT_DOCUMENT_PAGES_ADDED,
        EVENT_DOCUMENT_PAGE_DELETED,
        EVENT_DOCUMENT_PAGE_UPDATED,
        EVENT_DOCUMENT_UPDATED,
        QRCODE_RESIZE_THRESHOLD,
        SETTINGS_DOCUMENT_NAME_FORMAT,
        SETTINGS_FORCE_WHITE_BACKGROUND_QRCODE,
        SHEET_SOFT_INPUT_MODE
    } from '~/utils/constants';
    import { appIcon } from '~/utils/appIcons';
    import { optionsToMenuItems } from '~/utils/appMenu';
    import { getCardAccent, pickCardColor } from '~/utils/cardColors';
    import { recycleImages } from '~/utils/images';
    import { documentHasPKPassData } from '~/utils/pkpass';
    import { getFormatedDateForFilename } from '~/utils/utils.common';
    import {
        detectOCR,
        importAndScanImage,
        importImageFromCamera,
        onBackButton,
        pickColor,
        requestCameraPermission,
        showImagePopoverMenu,
        showPDFPopoverMenu,
        showSnack,
        transformPages
    } from '~/utils/ui';
    import { colors, fontScale, fonts, hasCamera, isLandscape, onFontScaleChanged, screenHeightDips, screenWidthDips, windowInset } from '~/variables';
    import EditNameActionBar from '~/components/common/EditNameActionBar.svelte';
    import IconButton from '@shared/components/IconButton.svelte';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import PKPassView from '~/components/pkpass/PKPassView.svelte';

    const PEEK_WIDTH = 44;
    // Android: the zones overlap the bottom edge of the plate of the name
    const PLATE_OVERLAP = 44;
    // Android: the 64 dp floating toolbar and its 16 dp margin (the app bar pads the bottom of the scroll view by this and the navigation bar)
    const FLOATING_TOOLBAR_OFFSET = 80;
    const CODE_ZONE_HEIGHT = 270;
    const FILMSTRIP_HEIGHT = 60;
    const FILMSTRIP_COL_WIDTH = 48;
    interface Item {
        page: OCRPage;
        selected: boolean;
        index: number;
    }
    const QRCODES_TYPE = 'qrcodes';

    type QRCodeItem = QRCodeSingleData & { svg: string; pageIndex: number; pageQRCodeIndex: number; color: string; id: string; error?: string };
</script>

<script lang="ts">
    import SliderPopover from '../common/SliderPopover.svelte';
    import CardViewEmpty from '~/components/view/CardViewEmpty.svelte';
    import { TextField } from '@nativescript-community/ui-textfield';
    import { Label } from '@nativescript-community/ui-label';
    import { EXTRA_PAPERLESS_ID_KEY } from '~/services/sync/paperless/PaperlessNgxPDFSyncService';

    let { colorBackground, colorError, colorOnBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorOutlineVariant, colorPrimary, colorSurface, colorSurfaceContainerLow, colorSurfaceContainerHigh, colorTertiary } = $colors;
    $: ({ colorBackground, colorError, colorOnBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorOutlineVariant, colorPrimary, colorSurface, colorSurfaceContainerLow, colorSurfaceContainerHigh, colorTertiary } = $colors);

    const forceWhiteBackgroundForQRCode = ApplicationSettings.getBoolean(SETTINGS_FORCE_WHITE_BACKGROUND_QRCODE, DEFAULT_FORCE_WHITE_BACKGROUND_QRCODE);

    export let document: OCRDocument;
    export let transitionOnBack = true;
    let qrcodes: QRCodeItem[];
    let currentQRCodeIndex = 0;
    let currentImageIndex = 0;
    let page: NativeViewElementNode<Page>;
    let collectionView: NativeViewElementNode<CollectionView>;
    let pager: NativeViewElementNode<Pager>;
    let qrPager: NativeViewElementNode<Pager>;
    // set hasQRCodes as soon as possible to ensure the layout is correct and does not "jump"
    let hasQRCodes = document.pages.some((p) => p.qrcode?.length > 0);
    $: canBeExportedToPDF = document.pages.some((p) => p.pkpass || p.imagePath);
    $: hasImages = document.pages.some((p) => p.imagePath);
    // Check if any page in the document has PKPass data
    $: isPKPassDocument = documentHasPKPassData(document);

    // the color set on the card, else the color extracted from its first photo when it is colorful, else the app seed
    $: firstPhoto = document.pages.find((p) => p.imagePath);
    $: cardColor = isEInk ? null : pickCardColor(document.extra?.color, [firstPhoto?.extra?.color, ...(firstPhoto?.colors ?? [])]);
    $: accent = getCardAccent(cardColor, isDarkTheme(), colorPrimary);
    $: hasCustomName = document.name !== getFormatedDateForFilename(document.createdDate, ApplicationSettings.getString(SETTINGS_DOCUMENT_NAME_FORMAT, DOCUMENT_NAME_FORMAT), false);
    $: details = getDetails(document);
    $: nbImages = document.pages.filter((p) => p.imagePath).length;
    // iOS: the content goes under the translucent bars, UIKit insets it: the insets give the visible height and let the backdrop reach under the bars
    let scrollHeight = 0;
    let insetTop = 0;
    let insetBottom = 0;
    function readInsets(view: View) {
        const inset = view.ios?.adjustedContentInset;
        if (inset) {
            insetTop = inset.top;
            insetBottom = inset.bottom;
        }
    }
    let layoutTimer: ReturnType<typeof setTimeout>;
    function onScrollLayout(event: EventData) {
        const view = event.object;
        if (view instanceof View) {
            // the page is measured again while it is shown: the zones are created once the height is stable
            const measuredHeight = Utils.layout.toDeviceIndependentPixels(view.getMeasuredHeight());
            clearTimeout(layoutTimer);
            layoutTimer = setTimeout(() => {
                scrollHeight = measuredHeight;
                readInsets(view);
            }, 150);
        }
    }
    $: viewportHeight = scrollHeight ? scrollHeight - (__ANDROID__ ? FLOATING_TOOLBAR_OFFSET + $windowInset.bottom : insetTop + insetBottom) : screenHeightDips - $windowInset.top - $windowInset.bottom - 130;
    // the zones fill the screen, the details peek under them
    $: heroHeight = viewportHeight - (details.length ? 56 : 0);
    $: hasHero = hasQRCodes || hasImages;
    $: isEmptyCard = !hasHero && !details.length && !isPKPassDocument;
    // no photo: the card color is the backdrop
    $: heroGradient = __IOS__ && !backdropImage && cardColor ? getBackdropGradient(accent.accent, isDarkTheme()) : null;
    function getBackdropGradient(color: string, dark: boolean) {
        const value = parseInt(color.slice(1), 16);
        const rgb = `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
        return `linear-gradient(180deg, rgba(${rgb}, ${dark ? 0.7 : 0.85}) 0%, rgba(${rgb}, 0) 42%, rgba(${rgb}, 0) 70%, rgba(${rgb}, 0.35) 100%)`;
    }
    // the image sizes itself in its slot from this ratio (Android swaps it by itself for a rotated image)
    function getAspectRatio({ height, rotation, width }: OCRPage) {
        return width && height ? (__IOS__ && rotation % 180 === 90 ? height / width : width / height) : undefined;
    }
    let backdropImage = document.pages.find((p) => p.imagePath)?.imagePath;
    function updateBackdrop() {
        backdropImage = items.getItem(currentImageIndex)?.page?.imagePath ?? document.pages.find((p) => p.imagePath)?.imagePath;
    }
    onThemeChanged(() => {
        DEV_LOG && console.log('onThemeChanged', $colors.colorOnBackground);
        updateQRCodes();
    });

    function getDetails(doc: OCRDocument) {
        const extra = doc.extra || {};
        return Object.keys(extra)
            .filter((key) => key !== 'color' && key !== 'pkpass' && key !== EXTRA_PAPERLESS_ID_KEY && typeof extra[key] === 'object')
            .map((key) => ({ name: key, extra: extra[key] as any }));
    }
    // $: {
    const pages = document.getObservablePages();
    let items = pages.map((page, index) => ({ selected: false, page, index, document })) as ObservableArray<Item>;
    // pages.on('change', (event)=>{
    //     switch(event.action) {
    //         case ChangeType.Splice:
    //         items.splice(event.index, event.removed.length, event.added)
    //     }
    // });
    // }
    // function onImageUpdated (event: any)  {
    //         const index = event.data.index;
    //         const current = document.pages.getItem(index)
    //         current.config =
    //         const data = {
    //             image: document.images.getItem(index).page,
    //             config: document.imagesConfig[index],
    //         };
    //         console.log('onImageUpdated', event.data.index, document, data);
    //         document.pages.setItem(index, data);
    //     }

    let qrcodeImages: { [k: string]: ImageSource } = {};
    function clearQRCodeImages(timeout = 0) {
        const toClear = Object.values(qrcodeImages);
        qrcodeImages = {};
        setTimeout(() => {
            recycleImages(toClear);
        }, timeout);
    }
    let qrcodeColor;
    let qrcodeBackgroundColor;

    function updateQRCodeColors() {
        qrcodeColor = 'black';
        // qrcodeBackgroundColor = 'red';
        qrcodeBackgroundColor = 'white';
    }

    async function updateQRCodes(updateList = true) {
        try {
            updateQRCodeColors();
            const color = qrcodeColor;
            const newQrCodes = [];
            for (let index = 0; index < document.pages.length; index++) {
                const page = document.pages[index];
                if (page.qrcode?.length) {
                    for (let j = 0; j < page.qrcode.length; j++) {
                        const qr = page.qrcode[j];
                        newQrCodes.push({
                            ...qr,
                            color,
                            svg: await getQRCodeImage(qr, color),
                            pageQRCodeIndex: j,
                            pageIndex: index,
                            id: Date.now().toString(36) + Math.random().toString(36).substring(2)
                        });
                    }
                }
            }
            qrcodes = newQrCodes;
            hasQRCodes = qrcodes?.length > 0;
            // qrcodes = document.pages.reduce((acc, page) => acc.concat(page.qrcode?.map((qr) => ({ ...qr, color, svg: await getQRCodeImage(qr, color) })) || []), []);
            //we dont recycle images, it will be done in onDestroy
        } catch (error) {
            showError(error);
        }
    }
    // updateQRCodes();

    async function getQRCodeImage(qrcode, color) {
        try {
            return qrcodeService.getQRCodeSVG(qrcode, screenWidthDips, color);
        } catch (error) {
            console.error(error);
        }
    }
    function onSelectedIndex(event) {
        currentQRCodeIndex = event.object.selectedIndex;
    }
    function geAllPages() {
        const selected: { page: OCRPage; document: OCRDocument }[] = [];
        items.forEach((d, index) => {
            selected.push({ page: d.page, document });
        });
        return selected;
    }
    function getSelectedPages() {
        const selected: { page: OCRPage; document: OCRDocument }[] = [];
        items.forEach((d, index) => {
            if (d.selected) {
                selected.push({ page: d.page, document });
            }
        });
        return selected;
    }
    function getSelectedPagesWithData() {
        const selected: { page: OCRPage; pageIndex: number; document: OCRDocument }[] = [];
        items.forEach((d, index) => {
            if (d.selected) {
                selected.push({ page: d.page, document, pageIndex: index });
            }
        });
        return selected;
    }
    // the popovers still need a view to be anchored to
    function getAnchor() {
        return page?.nativeView;
    }
    async function showPDFPopover() {
        try {
            const pages = nbSelected > 0 ? getSelectedPages() : document.pages.map((p) => ({ page: p, document }));
            await showPDFPopoverMenu({ pages, document, anchor: getAnchor(), documents: [document] });
        } catch (err) {
            showError(err);
        }
    }

    async function importDocument(importPDFs = true) {
        try {
            await importAndScanImage({ document, importPDFs, canGoToView: false });
        } catch (error) {
            showError(error);
        }
    }
    async function deleteDoc() {
        try {
            const result = await confirm({
                title: lc('delete'),
                message: lc('confirm_delete'),
                okButtonText: lc('delete'),
                cancelButtonText: lc('cancel')
            });
            if (result) {
                try {
                    await documentsService.deleteDocuments([document]);
                    items = null;
                    goBack({
                        // null is important to say no transition! (override enter transition)
                        transition: null
                    });
                } catch (err) {
                    console.error(err, err.stack);
                }
            }
        } catch (err) {
            showError(err);
        }
    }

    let nbSelected = 0;
    // updating an item reloads the pager, which reports its selected index again as if it was swiped
    let ignorePagerIndexUntil = 0;
    function selectItem(item: Item) {
        if (!item.selected) {
            ignorePagerIndexUntil = Date.now() + 300;
            items.some((d, index) => {
                if (d === item) {
                    nbSelected++;
                    d.selected = true;
                    items.setItem(index, d);
                    return true;
                }
            });
        }
    }
    function unselectItem(item: Item) {
        if (item.selected) {
            ignorePagerIndexUntil = Date.now() + 300;
            items.some((d, index) => {
                if (d === item) {
                    nbSelected--;
                    d.selected = false;
                    items.setItem(index, d);
                    return true;
                }
            });
        }
    }
    function unselectAll() {
        if (items) {
            nbSelected = 0;
            items.splice(0, items.length, ...items.map((i) => ({ ...i, selected: false })));
        }
    }
    function selectAll() {
        if (items) {
            items.splice(0, items.length, ...items.map((i) => ({ ...i, selected: true })));
            nbSelected = items.length;
        }
    }
    function toggleSelection(item: Item) {
        if (item.selected) {
            unselectItem(item);
        } else {
            selectItem(item);
        }
    }
    let inEditMode = false;
    function switchEditMode() {
        inEditMode = !inEditMode;
        collectionView?.nativeElement?.refreshVisibleItems();
    }
    let longPressTimer: NodeJS.Timeout;
    let currentLongPressItem: Item;
    let dragStarted = false;
    function onItemLongPress(item: Item, event?) {
        if (inEditMode) {
            startDragging(item, event);
            return;
        }
        if (dragStarted) {
            return;
        }
        if (nbSelected > 0) {
            toggleSelection(item);
            return;
        }

        if (longPressTimer) {
            clearTimeout(longPressTimer);
        }

        currentLongPressItem = item;
        dragStarted = false;

        longPressTimer = setTimeout(() => {
            if (!dragStarted && currentLongPressItem) {
                toggleSelection(item);
            }
            currentLongPressItem = null;
        }, 200);
    }
    async function onPan(item: Item, event) {
        if (!currentLongPressItem) {
            return;
        }

        if (event.state === 2 && !dragStarted) {
            dragStarted = true;

            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            startDragging(item, event);

            currentLongPressItem = null;
        } else if (event.state === 5 || event.state === 3) {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            dragStarted = false;
            currentLongPressItem = null;
        }
    }
    async function onTouch(item: Item, event?) {
        if (!inEditMode) {
            return;
        }
        switch (event.action) {
            case 'down': {
                startDragging(item, event);
                break;
            }
        }
    }
    async function onItemTap(item: Item) {
        try {
            if (nbSelected > 0) {
                toggleSelection(item);
            } else if (item.page.imagePath) {
                pager?.nativeElement?.scrollToIndexAnimated(
                    items.findIndex((i) => i.page === item.page),
                    true
                );
            }
        } catch (error) {
            showError(error);
        }
    }
    function editPage(page: OCRPage) {
        try {
            if (!page?.imagePath) {
                return;
            }
            navigate({
                page: PdfEdit,
                transition:
                    __ANDROID__ && !CARD_APP
                        ? SharedTransition.custom(new PageTransition(300, undefined, 10), {
                              pageStart: {
                                  sharedTransitionTags: {
                                      [`document_${document.id}_${page.id}`]: {}
                                  }
                              }
                          })
                        : undefined,
                props: {
                    document,
                    startPageIndex: items.findIndex((item) => item.page === page)
                }
            });
        } catch (error) {
            showError(error);
        }
    }
    function editCurrentPage() {
        editPage(items.getItem(currentImageIndex)?.page ?? document.pages.find((p) => p.imagePath));
    }
    // a modal bottom sheet is the Material pattern for the actions of an item (the iOS context menu is registered above)
    async function onImageLongPress(item: Item) {
        if (!__ANDROID__) {
            return;
        }
        try {
            const OptionSelect = (await import('@shared/components/OptionSelect.svelte')).default;
            const index = items.findIndex((i) => i.page === item.page);
            const options = [
                { id: 'fullscreen', name: lc('show_fullscreen_images'), icon: 'mdi-fullscreen' },
                { id: 'edit', name: lc('edit'), icon: 'mdi-tune' },
                { id: 'select', name: lc('select'), icon: 'mdi-check-circle-outline' },
                { id: 'delete', name: lc('delete'), icon: 'mdi-delete', color: colorError }
            ];
            const rowHeight = 58;
            const height = rowHeight * options.length;
            const option = await showBottomSheet({
                parent: page,
                view: OptionSelect,
                peekHeight: height,
                ignoreTopSafeArea: true,
                props: { rowHeight, height, options }
            });
            switch (option?.id) {
                case 'fullscreen':
                    showFullscreen(index);
                    break;
                case 'edit':
                    editPage(item.page);
                    break;
                case 'select':
                    selectItem(items.getItem(index));
                    break;
                case 'delete':
                    selectItem(items.getItem(index));
                    await runSelectionOption('delete');
                    break;
            }
        } catch (error) {
            showError(error);
        }
    }
    function onImagesPagerIndex(event) {
        if (Date.now() < ignorePagerIndexUntil) {
            return;
        }
        currentImageIndex = event.object.selectedIndex;
        updateBackdrop();
        // UIKit aborts when a collection view that has not been laid out is scrolled
        const strip = collectionView?.nativeView;
        if (strip?.isLoaded && strip.getMeasuredHeight() > 0) {
            strip.refreshVisibleItems();
            strip.scrollToIndex(currentImageIndex, true);
        }
    }
    const imageMenuRemovers = new WeakMap<View, () => void>();
    function registerImageMenu(event: EventData, item: Item) {
        const view = event.object;
        if (!__IOS__ || !(view instanceof View)) {
            return;
        }
        imageMenuRemovers.get(view)?.();
        imageMenuRemovers.set(
            view,
            setContextMenu(view, {
                items: () => {
                    const index = items.findIndex((i) => i.page === item.page);
                    return [
                        { title: lc('show_fullscreen_images'), icon: appIcon('fullscreen'), onSelect: () => showFullscreen(index) },
                        { title: lc('edit'), icon: appIcon('tune'), onSelect: () => editPage(item.page) },
                        { separator: true },
                        { title: lc('select'), icon: appIcon('select'), onSelect: () => selectItem(items.getItem(index)) },
                        {
                            title: lc('delete'),
                            icon: appIcon('delete'),
                            destructive: true,
                            onSelect: async () => {
                                selectItem(items.getItem(index));
                                await runSelectionOption('delete');
                            }
                        }
                    ];
                }
            })
        );
    }
    function onGoBack() {
        goBack(
            transitionOnBack
                ? undefined
                : {
                      transition: null
                  }
        );
    }
    const onAndroidBackButton = (data: AndroidActivityBackPressedEventData) =>
        onBackButton(page?.nativeView, () => {
            data.cancel = true;
            if (inEditMode) {
                switchEditMode();
            } else if (nbSelected > 0) {
                unselectAll();
            } else {
                onGoBack();
            }
        });
    async function fullscreenSelectedPages() {
        const component = (await import('~/components/FullScreenImageViewer.svelte')).default;
        navigate({
            page: component,
            // transition: __ANDROID__ ? SharedTransition.custom(new PageTransition(300, undefined, 10), {}) : undefined,
            props: {
                images: getSelectedPages()
                    .filter((p) => p.page.imagePath)
                    .map((p) => ({
                        // sharedTransitionTag: `document_${doc.id}_${page.id}`,
                        name: document.name,
                        image: p.page.imagePath,
                        ...p
                    })),
                startPageIndex: 0
            }
        });
    }
    async function deleteSelectedPages() {
        if (nbSelected > 0) {
            try {
                const result = await confirm({
                    title: lc('delete'),
                    message: lcp('confirm_delete_pages', nbSelected),
                    okButtonText: lc('delete'),
                    cancelButtonText: lc('cancel')
                });
                if (result) {
                    const indexes = [];
                    items.forEach((d, index) => {
                        if (d.selected) {
                            indexes.push(index);
                        }
                    });
                    let minDeleteIndex = Number.MAX_SAFE_INTEGER;
                    for (let index = 0; index < indexes.length; index++) {
                        const toRemoveIndex = indexes[index];
                        minDeleteIndex = Math.min(minDeleteIndex, toRemoveIndex);
                        await document.deletePage(toRemoveIndex);

                        items.splice(toRemoveIndex, 1);
                    }
                    refreshCollectionView();
                    nbSelected = 0;
                    return true;
                }
            } catch (error) {
                showError(error);
            }
        }
    }

    function getImageView(index: number) {
        return collectionView?.nativeView?.getViewForItemAtIndex(index)?.getViewById<Img>('imageView');
    }

    function onPagesAdded(event: DocumentPagesAddedEventData) {
        if (event.doc.id !== document.id) {
            return;
        }
        document = event.doc;
        try {
            if (items) {
                const length = items.length;
                items.push(...event.pages.map((page, index) => ({ page, selected: false, index: length })));
            }
            updateQRCodes();
        } catch (error) {
            showError(error, { silent: true });
        }
    }
    function onDocumentPageUpdated(event: DocumentPageUpdatedEventData) {
        if (event.doc.id !== document.id) {
            return;
        }
        document = event.doc;
        const index = event.pageIndex;
        const current = items.getItem(index);
        if (index === 0) {
        }
        if (current) {
            const page = document.getObservablePages().getItem(index);
            DEV_LOG && console.log('view onDocumentPageUpdated', index, event.imageUpdated, current.index);
            items.setItem(index, { ...current, page });
            if (!!event.imageUpdated) {
                updateBackdrop();
                const imageView = getImageView(index);
                DEV_LOG && console.log('view onDocumentPageUpdated update image', imageView);
                if (imageView) {
                    imageView?.updateImageUri();
                } else if (__IOS__) {
                    collectionView?.nativeElement?.refreshVisibleItems();
                }
            }
        }
    }
    function onDocumentPageDeleted(event: DocumentPageDeletedEventData) {
        if (event.doc.id !== document.id) {
            return;
        }
        document = event.doc;
        const index = event.pageIndex;
        items.splice(index, 1);
        items.forEach((item, index) => (item.index = index + 1));
        updateQRCodes();
    }
    function onDocumentsDeleted(event: DocumentDeletedEventData) {
        if (event.documents.indexOf(document) !== -1) {
            goBack({
                // null is important to say no transition! (override enter transition)
                transition: null
            });
        }
    }
    function onDocumentUpdated(event: DocumentUpdatedEventData) {
        if (document.id === event.doc.id) {
            document = event.doc;
        }
    }

    // function onOrientationChanged(event: OrientationChangedEventData) {
    //     orientation = event.newValue;
    //     refreshCollectionView();
    //     // }, 1000);
    // }
    onMount(() => {
        updateQRCodes();
        // Application.on('orientationChanged', onOrientationChanged);
        if (__ANDROID__) {
            Application.android.on(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
        documentsService.on(EVENT_DOCUMENT_UPDATED, onDocumentUpdated);
        documentsService.on(EVENT_DOCUMENT_DELETED, onDocumentsDeleted);
        documentsService.on(EVENT_DOCUMENT_PAGE_DELETED, onDocumentPageDeleted);
        documentsService.on(EVENT_DOCUMENT_PAGE_UPDATED, onDocumentPageUpdated);
        documentsService.on(EVENT_DOCUMENT_PAGES_ADDED, onPagesAdded);

        shortcutService.updateShortcuts(document);
        documentsService.documentRepository.incrementUsage(document).catch(() => {});
        // refresh();
    });
    onDestroy(() => {
        clearQRCodeImages();
        // Application.off('orientationChanged', onOrientationChanged);
        if (__ANDROID__) {
            Application.android.off(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
        documentsService.off(EVENT_DOCUMENT_UPDATED, onDocumentUpdated);
        documentsService.off(EVENT_DOCUMENT_DELETED, onDocumentsDeleted);
        documentsService.off(EVENT_DOCUMENT_PAGE_DELETED, onDocumentPageDeleted);
        documentsService.off(EVENT_DOCUMENT_PAGE_UPDATED, onDocumentPageUpdated);
        documentsService.off(EVENT_DOCUMENT_PAGES_ADDED, onPagesAdded);
    });

    function startDragging(item: Item, event) {
        const index = items.findIndex((p) => p.page === item.page);
        collectionView?.nativeElement.startDragging(index, event.getActivePointers()[0]);
    }
    async function onItemReordered(e) {
        DEV_LOG && console.log('onItemReordered');
        (e.view as ContentView).content.opacity = 1;
        try {
            if (e.index !== e.data.targetIndex) {
                await document.movePage(e.index, e.data.targetIndex);
            }
            updateQRCodes();
        } catch (error) {
            showError(error);
        }
    }
    async function onItemReorderStarting(e) {
        (e.view as ContentView).content.opacity = 0.6;
    }

    function refreshCollectionView() {
        collectionView?.nativeView?.refresh();
    }
    function refreshQRCodePager() {
        // pager?.nativeView.refresh();
    }
    onThemeChanged(refreshCollectionView);
    onFontScaleChanged(refreshCollectionView);

    async function onQRCodeTap() {
        try {
            await qrcodeService.showQRCode([...pages], document, currentQRCodeIndex);
        } catch (error) {
            showError(error);
        }
    }
    async function runSelectionOption(id: string) {
        try {
            let result;
            DEV_LOG && console.log('runSelectionOption', id);
            switch (id) {
                case 'share':
                    result = await showImagePopoverMenu(getSelectedPages(), getAnchor());
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'fullscreen':
                    await fullscreenSelectedPages();
                    unselectAll();
                    break;
                case 'ocr':
                    result = await detectOCR({ pages: getSelectedPagesWithData() });
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'qrcode': {
                    let found = false;
                    await Promise.all(
                        getSelectedPagesWithData().map((page) =>
                            qrcodeService.detectQRcode(document, page.pageIndex).then((r) => {
                                found = found || r?.length > 0;
                            })
                        )
                    );
                    if (!found) {
                        showSnack({ message: lc('no_qrcode_found') });
                    }
                    unselectAll();
                    break;
                }
                case 'delete':
                    result = await deleteSelectedPages();
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'transform':
                    result = await transformPages({ pages: getSelectedPagesWithData() });
                    if (result) {
                        unselectAll();
                    }
                    break;
            }
        } catch (error) {
            showError(error);
        }
    }
    async function runDocumentOption(id: string) {
        try {
            switch (id) {
                case 'rename':
                    await openEdit();
                    break;
                case 'select_all':
                    selectAll();
                    break;
                case 'ocr':
                    await detectOCR({ documents: [document] });
                    unselectAll();
                    break;
                case 'transform':
                    await transformPages({ documents: [document] });
                    unselectAll();
                    break;
                case 'reorder':
                    unselectAll();
                    switchEditMode();
                    break;
                case 'reverse_pages':
                    await document.reversePages();
                    unselectAll();
                    break;
            }
        } catch (error) {
            showError(error);
        }
    }
    async function toggleFavorite() {
        try {
            await document.save({ favorite: document.favorite === 1 ? 0 : 1 }, false, true);
        } catch (error) {
            showError(error);
        }
    }
    function getDocumentMenu(withImages: boolean, pkpass: boolean, nbPages: number): MenuItem[] {
        const options: { id: string; name: string }[] = [{ id: 'rename', name: lc('rename') }];
        if (withImages && !pkpass) {
            options.push(
                { id: 'select_all', name: lc('select_all') },
                { id: 'reorder', name: lc('reorder_pages') },
                ...(nbPages > 1 ? [{ id: 'reverse_pages', name: lc('reverse_pages') }] : []),
                { id: 'transform', name: lc('transform_images') },
                { id: 'ocr', name: lc('ocr_document') }
            );
        }
        return optionsToMenuItems(options, (option) => runDocumentOption(option.id));
    }
    function getSelectionBottomItems(pkpass: boolean) {
        const withImages = !pkpass && getSelectedPagesWithData().some((p) => p.page.imagePath);
        const menuOptions: { id: string; name: string }[] = [{ id: 'fullscreen', name: lc('show_fullscreen_images') }];
        if (withImages) {
            menuOptions.push({ id: 'transform', name: lc('transform_images') }, { id: 'ocr', name: lc('ocr_document') }, { id: 'qrcode', name: lc('detect_qrcode') });
        }
        return [
            { spacer: true },
            { text: lc('share_images'), icon: appIcon('share'), onTap: () => runSelectionOption('share') },
            { spacer: true },
            { text: lc('more_options'), icon: appIcon('more'), menu: optionsToMenuItems(menuOptions, (option) => runSelectionOption(option.id)) },
            { spacer: true },
            { text: lc('delete'), icon: appIcon('delete'), onTap: () => runSelectionOption('delete') },
            { spacer: true }
        ];
    }
    function getBottomItems(selected: number, pkpass: boolean, favorite: boolean, withImages: boolean, exportable: boolean, reordering: boolean) {
        if (selected > 0) {
            return getSelectionBottomItems(pkpass);
        }
        if (reordering) {
            return [];
        }
        const moreMenu: MenuItem[] = [
            ...(withImages && !pkpass ? [{ title: lc('show_fullscreen_images'), icon: appIcon('fullscreen'), onSelect: () => showFullscreen(currentImageIndex) }] : []),
            { title: lc('delete'), icon: appIcon('delete'), destructive: true, onSelect: deleteDoc }
        ];
        return [
            { spacer: true },
            ...(exportable ? [{ text: lc('share'), icon: appIcon('share'), onTap: () => (pkpass ? showImagePopoverMenu(geAllPages(), getAnchor()) : showPDFPopover()) }, { spacer: true }] : []),
            { text: lc('toggle_favorite'), icon: appIcon(favorite ? 'favorite_on' : 'favorite_off'), onTap: toggleFavorite },
            ...(withImages && !pkpass ? [{ text: lc('adjust'), icon: appIcon('tune'), onTap: editCurrentPage }] : []),
            ...(pkpass ? [] : [{ text: lc('edit'), icon: appIcon('edit'), onTap: openEdit }]),
            { spacer: true },
            // a menu with a single entry (delete) is the button of that entry
            moreMenu.length > 1
                ? { text: lc('more_options'), icon: appIcon('more'), menu: moreMenu }
                : { text: moreMenu[0].title, icon: moreMenu[0].icon, color: colorError, onTap: () => moreMenu[0].onSelect(moreMenu[0]) },
            { spacer: true }
        ];
    }
    async function openEdit() {
        try {
            const CardEditSheet = (await import('~/components/view/CardEditSheet.svelte')).default;
            const saved = await showBottomSheet({
                parent: page,
                view: CardEditSheet,
                windowSoftInputMode: SHEET_SOFT_INPUT_MODE,
                detents: [{ fraction: 0.65 }, 'large'],
                grabber: true,
                props: { document }
            });
            if (saved) {
                await updateQRCodes();
            }
        } catch (error) {
            showError(error);
        }
    }
    $: documentMenu = getDocumentMenu(hasImages, isPKPassDocument, document.pages.length);
    $: bottomItems = getBottomItems(nbSelected, isPKPassDocument, document.favorite === 1, hasImages, canBeExportedToPDF, inEditMode);
    async function onAddButton(kind?: 'code' | 'photo') {
        try {
            const OptionSelect = (await import('@shared/components/OptionSelect.svelte')).default;
            const rowHeight = 58;
            const options = (
                $hasCamera
                    ? [
                          {
                              id: 'camera',
                              name: lc('add_from_camera'),
                              icon: 'mdi-camera'
                          }
                      ]
                    : []
            )
                .concat([
                    {
                        id: 'import',
                        name: lc('import_from_file'),
                        icon: 'mdi-file-document-plus-outline'
                    },
                    {
                        id: 'import_image',
                        name: lc('import_from_image'),
                        icon: 'mdi-image-plus-outline'
                    }
                ])
                .concat([
                    {
                        id: 'add_qrcode_camera',
                        name: lc('add_qrcode_camera'),
                        icon: 'mdi-qrcode-scan'
                    },
                    {
                        id: 'add_qrcode_file',
                        name: lc('add_qrcode_file'),
                        icon: 'mdi-qrcode-plus'
                    },
                    {
                        id: 'add_qrcode_manual',
                        name: lc('add_qrcode_manual'),
                        icon: 'mdi-qrcode-plus'
                    }
                ])
                .filter((option) => !kind || (kind === 'code') === option.id.startsWith('add_qrcode'));
            const height = Math.min(rowHeight * options.length, 400);
            const option = await showBottomSheet({
                parent: this,
                view: OptionSelect,
                peekHeight: height,
                ignoreTopSafeArea: true,
                props: {
                    rowHeight,
                    height,
                    options
                }
            });
            DEV_LOG && console.log('on add option', option);
            let found = false;
            if (option) {
                switch (option.id) {
                    case 'camera':
                        await importImageFromCamera({ document, inverseUseSystemCamera: false });
                        break;
                    case 'import':
                        await importDocument();
                        break;
                    case 'import_image':
                        await importAndScanImage({ canGoToView: false, forceGalleryPick: true, document, importPDFs: false });
                        break;
                    case 'add_qrcode_camera':
                        await requestCameraPermission();
                        const Camera = (await import('~/components/camera/Camera.svelte')).default;
                        const qrcodes: QRCodeData = await showModal({
                            page: Camera,
                            fullscreen: true,
                            props: {
                                QRCodeOnly: true
                            }
                        });
                        if (qrcodes?.length) {
                            //we add the qrcode to the first page (less risk of it being removed with the page)
                            await addQRCodes(qrcodes);
                            found = true;
                        } else {
                            showSnack({ message: lc('no_qrcode_found') });
                        }
                        DEV_LOG && console.log('qrcodes', qrcodes);
                        break;
                    case 'add_qrcode_file':
                        try {
                            const data = await createImagePicker({
                                mediaType: 1,
                                mode: 'multiple'
                            }).present();
                            const qrcodes = (
                                await Promise.all(
                                    data.map((d) =>
                                        detectQRCodeFromFile(d.path, {
                                            resizeThreshold: QRCODE_RESIZE_THRESHOLD
                                        })
                                    )
                                )
                            ).filter((q) => !!q);
                            if (qrcodes?.length) {
                                //we add the qrcode to the first page (less risk of it being removed with the page)
                                await addQRCodes(qrcodes.flat());
                                found = true;
                            } else {
                                showSnack({ message: lc('no_qrcode_found') });
                            }
                        } catch (error) {
                            //cancel will throw, we want to ignore it!
                        }
                        break;
                    case 'add_qrcode_manual': {
                        const result = await qrcodeService.createQRCode();
                        if (result?.text?.length) {
                            await addQRCodes([result]);
                        }
                        break;
                    }
                }
                await updateQRCodes();
                if (found) {
                    setTimeout(() => {
                        qrPager?.nativeElement?.scrollToIndexAnimated(qrcodes?.length - 1, true);
                    }, 10);
                }
            }
        } catch (error) {
            showError(error);
        }
    }

    function addQRCodes(qrcodes: QRCodeData, pageIndex = 0) {
        //we add the qrcode to the first page (less risk of it being removed with the page)
        return document.updatePage(pageIndex, {
            qrcode: (document.pages[pageIndex].qrcode || []).concat(
                qrcodes.map((q) => ({
                    text: q.text,
                    format: q.format,
                    position: q.position
                }))
            )
        });
    }

    async function showFullscreen(startPageIndex = 0) {
        const component = (await import('~/components/FullScreenImageViewer.svelte')).default;
        navigate({
            page: component,
            // transition: __ANDROID__ ? SharedTransition.custom(new PageTransition(300, undefined, 10), {}) : undefined,
            props: {
                images: document.pages.map((page, index) => ({
                    sharedTransitionTag: `document_${document.id}_${page.id}`,
                    name: document.name,
                    image: page.imagePath,
                    ...page
                })),
                keepScreenAwake: true,
                onEdit: (index: number) => editPage(document.pages[index]),
                screenBrightness: 1,
                startPageIndex
            }
        });
    }


    function formatItemValue(item) {
        if (item.extra) {
            switch (item.extra.type) {
                case ExtraFieldType.Date:
                    return dayjs(item.extra.value).format(item.extra.format || 'LL');
                default:
                    return item.extra.value;
            }
        }
    }
    function getItemBackgroundColor(item) {
        return isEInk ? null : (item.page?.extra?.color ?? item.page.colors?.[0] ?? document.extra?.color);
    }
    function getItemLabelColor(item) {
        return isEInk ? null : new Color(item.page.colors?.[0] || document.extra?.color).getBrightness() < 145 ? 'white' : 'black';
    }

</script>

<appPage bind:this={page} id="cardview" {...{ keepScreenAwake: hasQRCodes, screenBrightness: hasQRCodes ? 1 : -1 }}>
    <appBar {bottomItems} {...(__ANDROID__ ? { backgroundColor: accent.container } : {})} color={colorOnBackground} iosIconRenderingMode="alwaysTemplate" scrollBehavior="lift" scrollTargetId="cardScroll" size="small" title={nbSelected > 0 ? lcp('selected', nbSelected) : inEditMode ? lc('reorder_pages') : hasCustomName || __ANDROID__ ? '' : document.name}>
        {#if __ANDROID__}
            <navigationButton {...{ 'android.systemIcon': nbSelected > 0 || inEditMode ? 'ic_menu_close_clear_cancel' : 'ic_menu_back' }} on:tap={nbSelected > 0 ? unselectAll : inEditMode ? switchEditMode : onGoBack} />
        {/if}
        {#if nbSelected > 0}
            {#if __IOS__}
                <appBarItem ios.position="right" prominent={true} text={lc('cancel')} on:tap={unselectAll} />
            {/if}
        {:else if inEditMode}
            <appBarItem icon={appIcon('check')} ios.position="right" text={lc('ok')} on:tap={switchEditMode} />
        {:else}
            {#if !isPKPassDocument}
                <appBarItem icon={appIcon('add')} ios.position="right" text={lc('add')} on:tap={() => onAddButton()} />
            {/if}
            <appBarItem icon={appIcon('more')} ios.position="right" menu={documentMenu} />
        {/if}
    </appBar>
    <gridlayout class="pageContent" backgroundColor={__IOS__ && cardColor ? accent.container : colorBackground}>
        {#if heroGradient}
            <gridlayout backgroundImage={heroGradient} isUserInteractionEnabled={false} />
        {/if}
        {#if __IOS__ && backdropImage}
            <image blurRadius={12} decodeWidth={160} {...{ iosOverflowSafeArea: true }} isUserInteractionEnabled={false} opacity={isDarkTheme() ? 0.7 : 1} src={backdropImage} stretch="aspectFill" />
        {/if}
        {#if CARD_APP && isPKPassDocument}
            <pager bind:this={pager} items={document.pages} transformers="zoomOut" on:selectedIndexChange={onSelectedIndex}>
                <Template let:item>
                    <stacklayout padding="0">
                        <PKPassView {document} pkpass={item.pkpass} />
                    </stacklayout>
                </Template>
            </pager>
        {:else}
            <scrollview id="cardScroll" on:layoutChanged={onScrollLayout}>
            {#key scrollHeight}
            {#if scrollHeight > 0}
            <stacklayout>
                <gridlayout height={hasHero || isEmptyCard ? heroHeight : undefined} rows="auto,auto,*,auto">
                {#if __ANDROID__}
                    <gridlayout backgroundColor={accent.container} borderRadius="0 0 40 12" columns="*,auto" rows="auto" padding="0 20 {hasHero ? PLATE_OVERLAP + 20 : 24} 20">
                        <stacklayout margin="8 0 0 0">
                            <label color={colorOnBackground} fontSize={hasCustomName ? 34 : 22} fontWeight="bold" maxLines={3} text={document.name} textWrap={true} />
                            <label color={colorOnSurfaceVariant} fontSize={15} text={dayjs(document.createdDate).format('LL')} visibility={hasCustomName ? 'visible' : 'collapsed'} />
                        </stacklayout>
                        <label
                            backgroundColor={accent.accent}
                            borderRadius={24}
                            color={accent.onAccent}
                            col={1}
                            fontSize={22}
                            fontWeight="bold"
                            height={48}
                            margin="8 0 0 12"
                            text={(document.name || '?').charAt(0).toUpperCase()}
                            textAlignment="center"
                            verticalAlignment="top"
                            verticalTextAlignment="center"
                            visibility={hasCustomName ? 'visible' : 'collapsed'}
                            width={48} />
                    </gridlayout>
                {:else if hasCustomName}
                    <stacklayout margin="4 20 8 20">
                        <label color={heroGradient ? accent.onBackdrop : colorOnBackground} fontSize={34} fontWeight="bold" maxLines={3} text={document.name} textWrap={true} />
                        <label color={heroGradient ? accent.onBackdrop : colorOnSurfaceVariant} fontSize={15} opacity={heroGradient ? 0.8 : 1} text={dayjs(document.createdDate).format('LL')} />
                    </stacklayout>
                {/if}
                {#if isEmptyCard}
                    <CardViewEmpty onAddCode={() => onAddButton('code')} onAddDetail={openEdit} onAddPhoto={() => onAddButton('photo')} row={2} verticalAlignment="center" />
                {/if}
                {#if hasQRCodes}
                    <gridlayout height={CODE_ZONE_HEIGHT + (qrcodes?.length > 1 ? 28 : 0)} margin="{__ANDROID__ ? -PLATE_OVERLAP : 8} {__ANDROID__ && qrcodes?.length <= 1 ? 16 : 0} 8 {__ANDROID__ && qrcodes?.length <= 1 ? 16 : 0}" row={1} rows="*,auto">
                        <pager bind:this={qrPager} id="qrPager" items={qrcodes} peaking={qrcodes?.length > 1 ? PEEK_WIDTH : 0} selectedIndex={currentQRCodeIndex} spacing={12} on:selectedIndexChange={onSelectedIndex}>
                            <Template let:item>
                                <gridlayout backgroundColor="white" borderRadius={28} elevation={isEInk || __ANDROID__ ? 0 : 6} margin={qrcodes?.length > 1 ? '4 4 8 4' : __ANDROID__ ? '4 0 8 0' : '4 16 8 16'} padding="20" rows="*,auto" on:tap={onQRCodeTap}>
                                    <svgview src={item.svg} stretch="aspectFit" />
                                    <label color="black" fontSize={17} fontWeight="bold" marginTop={8} maxLines={1} row={1} selectable={true} text={item.text} textAlignment="center" />
                                </gridlayout>
                            </Template>
                        </pager>
                        {#if qrcodes?.length > 1}
                            <pagerindicator
                                color="rgba(128, 128, 128, 0.4)"
                                height={10}
                                horizontalAlignment="center"
                                marginBottom={8}
                                pagerViewId="qrPager"
                                row={1}
                                selectedColor={colorOnSurface}
                                type="worm"
                                width={qrcodes.length * 16} />
                        {/if}
                    </gridlayout>
                {/if}
                {#if hasImages}
                <pager bind:this={pager} id="imagesPager" margin="{__ANDROID__ && !hasQRCodes ? -PLATE_OVERLAP : 8} 0 0 0" peaking={nbImages > 1 ? PEEK_WIDTH : 0} row={2} spacing={12} {items} on:selectedIndexChange={onImagesPagerIndex}>
                    <Template let:item>
                        <gridlayout
                            visibility={item.page.imagePath ? 'visible' : 'collapsed'}
                            on:loaded={(e) => registerImageMenu(e, item)}
                            on:longPress={() => onImageLongPress(item)}
                            on:tap={() => showFullscreen(items.findIndex((i) => i.page === item.page))}
                        >
                            <RotableImageView
                                id="imageView"
                                aspectRatio={getAspectRatio(item.page)}
                                borderRadius={20}
                                decodeWidth={screenWidthDips}
                                horizontalAlignment="center"
                                item={item.page}
                                sharedTransitionTag={`document_${document.id}_${item.page.id}`}
                                stretch="aspectFit"
                                verticalAlignment="center"
                            />
                        </gridlayout>
                    </Template>
                </pager>
                <collectionview
                    bind:this={collectionView}
                    id="view"
                    ios:autoReloadItemOnLayout={true}
                    colWidth={FILMSTRIP_COL_WIDTH}
                    height={FILMSTRIP_HEIGHT}
                    horizontalAlignment="center"
                    {items}
                    margin="8 0 8 0"
                    orientation="horizontal"
                    reorderEnabled={true}
                    row={3}
                    rowHeight={FILMSTRIP_HEIGHT}
                    visibility={nbImages > 1 ? 'visible' : 'collapsed'}
                    width={Math.min(nbImages * FILMSTRIP_COL_WIDTH, screenWidthDips - 32)}
                    on:itemReordered={onItemReordered}
                    on:itemReorderStarting={onItemReorderStarting}
                >
                    <Template let:index let:item>
                        <gridlayout
                            class="cardItemTemplate"
                            backgroundColor={getItemBackgroundColor(item)}
                            borderRadius={6}
                            elevation={0}
                            longPressGestureOptions={(view, tag, rootTag) => ({
                                simultaneousHandlers: [rootTag, view['PAN_HANDLER_TAG']],
                                minDurationMs: 300
                            })}
                            margin={4}
                            panGestureOptions={(view, tag, rootTag) => ({
                                simultaneousHandlers: [rootTag, view['LONGPRESS_HANDLER_TAG']],
                                minDist: 20
                            })}
                            rippleColor={colorSurface}
                            scaleX={index === currentImageIndex ? 1 : 0.85}
                            scaleY={index === currentImageIndex ? 1 : 0.85}
                            on:tap={() => onItemTap(item)}
                            on:touch={(e) => onTouch(item, e)}
                            on:longPress={(e) => onItemLongPress(item, e)}
                            on:pan={(e) => onPan(item, e)}
                        >
                            <gridlayout opacity={index === currentImageIndex ? 1 : 0.55}>
                                <RotableImageView
                                    id="imageView"
                                    borderRadius={6}
                                    decodeWidth={FILMSTRIP_COL_WIDTH}
                                    item={item.page}
                                    sharedTransitionTag={`document_${document.id}_${item.page.id}`}
                                    stretch="aspectFill"
                                    width="100%"
                                />
                            </gridlayout>
                            <gridlayout backgroundColor="rgba(0, 0, 0, 0.3)" borderRadius={6} isUserInteractionEnabled={false} visibility={item.selected ? 'visible' : 'hidden'}>
                                <label
                                    backgroundColor={colorPrimary}
                                    borderColor="white"
                                    borderRadius={10}
                                    borderWidth={1.5}
                                    color="white"
                                    fontFamily={$fonts.mdi}
                                    fontSize={13}
                                    height={20}
                                    horizontalAlignment="right"
                                    margin={3}
                                    text="mdi-check"
                                    textAlignment="center"
                                    verticalAlignment="bottom"
                                    verticalTextAlignment="center"
                                    width={20} />
                            </gridlayout>
                            <label fontFamily={$fonts.mdi} fontSize={20} padding={4} text="mdi-reorder-horizontal" verticalAlignment="bottom" visibility={inEditMode ? 'visible' : 'hidden'} />
                        </gridlayout>
                    </Template>
                </collectionview>
                {/if}
                </gridlayout>
                {#if details.length}
                    {#if __ANDROID__}
                        <stacklayout margin="16 16 0 16">
                            {#each details as detail, index (detail.name)}
                                <stacklayout
                                    backgroundColor={colorSurfaceContainerLow}
                                    borderRadius={details.length === 1 ? 28 : index === 0 ? '28 28 6 6' : index === details.length - 1 ? '6 6 28 28' : 6}
                                    marginTop={index > 0 ? 2 : 0}
                                    padding="12 20 12 20">
                                    <label color={colorOnSurfaceVariant} fontSize={13} text={detail.name} />
                                    <label color={colorOnSurface} fontSize={17} selectable={true} text={formatItemValue(detail)} textWrap={true} />
                                </stacklayout>
                            {/each}
                        </stacklayout>
                    {:else}
                        <stacklayout backgroundColor={colorSurface} borderRadius={16} margin="16 16 0 16">
                            {#each details as detail, index (detail.name)}
                                <stacklayout borderTopColor={colorOutlineVariant} borderTopWidth={index > 0 ? 0.5 : 0} padding="10 16 10 16">
                                    <label color={colorOnSurfaceVariant} fontSize={13} text={detail.name} />
                                    <label color={colorOnSurface} fontSize={17} selectable={true} text={formatItemValue(detail)} textWrap={true} />
                                </stacklayout>
                            {/each}
                        </stacklayout>
                    {/if}
                {/if}
            </stacklayout>
            {/if}
            {/key}
            </scrollview>
        {/if}
    </gridlayout>
</appPage>
