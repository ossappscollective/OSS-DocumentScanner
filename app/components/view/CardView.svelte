<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { Img } from '@nativescript-community/ui-image';
    import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { confirm } from '@nativescript-community/ui-dialogs';
    import { Pager } from '@nativescript-community/ui-pager';
    import { MenuItem, setContextMenu, showMenu } from '@nativescript-community/ui-menu';
    import { Application, ApplicationSettings, Color, EventData, Page, Utils, View } from '@nativescript/core';
    import { AndroidActivityBackPressedEventData } from '@nativescript/core/application';
    import { create as createImagePicker } from '@nativescript/imagepicker';
    import { showError } from '@shared/utils/showError';
    import { goBack, navigate, showModal } from '@shared/utils/svelte/ui';
    import dayjs from 'dayjs';
    import { QRCodeData, QRCodeSingleData, detectQRCodeFromFile } from 'plugin-nativeprocessor';
    import { onDestroy, onMount } from 'svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import PdfEdit from '~/components/edit/DocumentEdit.svelte';
    import { lc, lcp } from '~/helpers/locale';
    import { isDarkTheme, isEInk, onThemeChanged } from '~/helpers/theme';
    import { OCRDocument, OCRPage } from '~/models/OCRDocument';
    import {
        DocumentDeletedEventData,
        DocumentPageDeletedEventData,
        DocumentPageUpdatedEventData,
        DocumentPagesAddedEventData,
        DocumentUpdatedEventData,
        documentsService
    } from '~/services/documents';
    import { qrcodeService } from '~/services/qrcode';
    import { shortcutService } from '~/services/shortcuts';
    import {
        CARD_RATIO,
        DOCUMENT_NAME_FORMAT,
        QRCODE_RESIZE_THRESHOLD,
        SETTINGS_DOCUMENT_NAME_FORMAT,
        SHEET_PAN_SOFT_INPUT_MODE
    } from '~/utils/constants';
    import { appIcon } from '~/utils/appIcons';
    import { optionsToMenuItems } from '~/utils/appMenu';
    import { getCardAccent, pickCardColor } from '~/utils/cardColors';
    import { getSelectedPages, subscribeDocumentEvents } from '~/utils/documentView';
    import { formatExtraValue, getExtraFields } from '~/utils/extraFields';
    import { getTopBrightness } from '~/utils/images';
    import { documentHasPKPassData, getPKPassColors } from '~/utils/pkpass';
    import { getFormatedDateForFilename } from '~/utils/utils.common';
    import { detectOCR, getExportMenu, importAndScanImage, importImageFromCamera, onBackButton, requestCameraPermission, showImagePopoverMenu, showOCRData, showSnack, transformPages } from '~/utils/ui';
    import { colors, fonts, hasCamera, onFontScaleChanged, screenWidthDips, windowInset } from '~/variables';
    import PKPassView from '~/components/pkpass/PKPassView.svelte';

    const PEEK_WIDTH = 44;
    // Android: the zones overlap the bottom edge of the plate of the name
    const PLATE_OVERLAP = 44;
    // Android: the 64 dp floating toolbar and its 16 dp margin (the app bar pads the bottom of the scroll view by this and the navigation bar)
    const FLOATING_TOOLBAR_OFFSET = 80;
    // glass over the photo on iOS 26 (it adapts to the photo), a dark disc before (no glass), tonal on Android
    const legacyPhotoEdit = __IOS__ && Utils.SDK_VERSION < 26;
    const photoEditVariant = __IOS__ ? (legacyPhotoEdit ? 'plain' : 'glass') : 'contained';
    // before iOS 26 the bar has no subtitle: the date is under the large title
    const showDateUnderTitle = __IOS__ && Utils.SDK_VERSION < 26;
    const CODE_ZONE_HEIGHT = 270;
    const FILMSTRIP_HEIGHT = 60;
    const FILMSTRIP_COL_WIDTH = 48;
    // what the pager keeps on both sides of a photo with several photos (the peek of the neighbors and the gap), measured on each platform
    const PHOTO_INSET = __IOS__ ? 110 : 88;
    // room under the photo for its shadow
    const PHOTO_SHADOW_ROOM = 12;
    interface Item {
        page: OCRPage;
        selected: boolean;
        /** the photo shown by the pager: its thumbnail is the one at full size */
        current?: boolean;
    }
    const QRCODES_TYPE = 'qrcodes';

    type QRCodeItem = QRCodeSingleData & { svg: string; pageIndex: number; pageQRCodeIndex: number; color: string; id: string; error?: string };
</script>

<script lang="ts">
    import CardViewEmpty from '~/components/view/CardViewEmpty.svelte';

    $: ({ colorBackground, colorError, colorOnBackground, colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurface, colorSurfaceContainerLow } = $colors);

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
    // the bars take the color of the pass shown, so it fills the screen
    $: currentPass = isPKPassDocument ? (document.pages[currentQRCodeIndex]?.pkpass ?? document.pages.find((p) => p.pkpass)?.pkpass) : null;
    $: passColors = getPKPassColors(currentPass?.passData ?? {}, colorBackground);

    // the color set on the card, else the color extracted from its first photo when it is colorful, else the app seed
    $: firstPhoto = document.pages.find((p) => p.imagePath);
    $: cardColor = isEInk ? null : pickCardColor(document.extra?.color, [firstPhoto?.extra?.color, ...(firstPhoto?.colors ?? [])]);
    $: accent = getCardAccent(cardColor, isDarkTheme(), colorPrimary);
    $: photoEditProps = legacyPhotoEdit ? { backgroundColor: '#00000066', borderRadius: 18, color: '#FFFFFF' } : __ANDROID__ ? { backgroundColor: accent.container, color: accent.accent } : {};
    $: hasCustomName = document.name !== getFormatedDateForFilename(document.createdDate, ApplicationSettings.getString(SETTINGS_DOCUMENT_NAME_FORMAT, DOCUMENT_NAME_FORMAT), false);
    $: details = getExtraFields(document.extra);
    $: nbImages = document.pages.filter((p) => p.imagePath).length;
    $: multiplePhotos = nbImages > 1;
    $: multipleQR = qrcodes?.length > 1;
    $: qrSideMargin = __ANDROID__ && qrcodes?.length <= 1 ? 16 : 0;
    $: qrZoneMargin = `${__ANDROID__ ? -PLATE_OVERLAP : 8} ${qrSideMargin} 8 ${qrSideMargin}`;
    $: qrCardMargin = multipleQR ? '4 4 8 4' : __ANDROID__ ? '4 0 8 0' : '4 16 8 16';
    $: photosMargin = `${__ANDROID__ && !hasQRCodes ? -PLATE_OVERLAP : 8} ${multiplePhotos ? 0 : 16} 0 ${multiplePhotos ? 0 : 16}`;
    // the strip is as wide as the screen and its ends can reach the center, like the thumbnails of the iOS Photos viewer
    // the pager is as tall as the photo (constant card ratio): the strip is always just under it
    $: photoPagerHeight = Math.round((screenWidthDips - (multiplePhotos ? PHOTO_INSET : 32)) * CARD_RATIO) + PHOTO_SHADOW_ROOM;
    $: filmstripPadding = Math.max(0, (screenWidthDips - FILMSTRIP_COL_WIDTH) / 2);
    $: hasHero = hasQRCodes || hasImages;
    $: isEmptyCard = !hasHero && !details.length && !isPKPassDocument;
    // no photo: the card color is the backdrop
    $: heroGradient = __IOS__ && !backdropImage && cardColor ? getBackdropGradient(accent.accent, isDarkTheme()) : null;
    function getBackdropGradient(color: string, dark: boolean) {
        const value = parseInt(color.slice(1), 16);
        const rgb = `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
        return `linear-gradient(180deg, rgba(${rgb}, ${dark ? 0.7 : 0.85}) 0%, rgba(${rgb}, 0) 42%, rgba(${rgb}, 0) 70%, rgba(${rgb}, 0.35) 100%)`;
    }
    // the color of the photo, behind it while it loads and where it does not cover
    function getPhotoBackground(photo: OCRPage) {
        return isEInk ? null : (photo.extra?.color ?? photo.colors?.[1] ?? colorBackground);
    }
    let backdropImage = document.pages.find((p) => p.imagePath)?.imagePath;
    // iOS: the status bar, the bars and the title are drawn over the top of the blurred photo: they follow its brightness
    let backdropBrightness: number = null;
    async function updateBackdropBrightness(imagePath: string) {
        const brightness = await getTopBrightness(imagePath);
        // the photo changed meanwhile
        if (imagePath === backdropImage) {
            backdropBrightness = brightness;
        }
    }
    $: backdropIsDark =
        backdropBrightness === null ? isDarkTheme() : (isDarkTheme() ? 0.7 : 1) * backdropBrightness + (isDarkTheme() ? 0.3 : 0) * new Color(colorBackground).getBrightness() < 145;
    $: backdropTextColor = __IOS__ && backdropImage && !isEInk ? (backdropIsDark ? '#FFFFFF' : '#000000') : colorOnBackground;
    $: statusBarStyle = isPKPassDocument ? (passColors.isDark ? 'dark' : 'light') : __IOS__ && backdropImage && !isEInk ? (backdropIsDark ? 'dark' : 'light') : null;
    $: pageProps = { keepScreenAwake: hasQRCodes, screenBrightness: hasQRCodes ? 1 : -1, ...(statusBarStyle ? { statusBarStyle } : {}) };
    // iOS: the photo behind the page fades in, the bars change color at the pace of the status bar
    const TRANSITION_DURATION = __IOS__ ? (typeof UINavigationControllerHideShowBarDuration === 'number' ? UINavigationControllerHideShowBarDuration : 0.35) * 1000 : 0;
    function updateBackdrop() {
        const photo = items.getItem(currentImageIndex)?.page?.imagePath ? items.getItem(currentImageIndex).page : document.pages.find((p) => p.imagePath);
        backdropImage = photo?.imagePath;
        updateBackdropBrightness(backdropImage);
    }
    if (__IOS__) {
        updateBackdropBrightness(backdropImage);
    }

    const pages = document.getObservablePages();
    let items = pages.map<Item>((page, index) => ({ selected: false, page, document, current: index === 0 }));
    $: detailsContainerProps = __ANDROID__ ? {} : { backgroundColor: colorSurface, borderRadius: 16 };
    $: getDetailRowProps = (index: number, count: number) =>
        __ANDROID__
            ? {
                  backgroundColor: colorSurfaceContainerLow,
                  borderRadius: count === 1 ? 28 : index === 0 ? '28 28 6 6' : index === count - 1 ? '6 6 28 28' : 6,
                  marginTop: index > 0 ? 2 : 0,
                  padding: '12 20 12 20'
              }
            : { borderTopColor: colorOutlineVariant, borderTopWidth: index > 0 ? 0.5 : 0, padding: '10 16 10 16' };

    async function updateQRCodes(updateList = true) {
        try {
            const color = 'black';
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
        } catch (error) {
            showError(error);
        }
    }

    async function getQRCodeImage(qrcode, color) {
        return qrcodeService.getQRCodeSVG(qrcode, screenWidthDips, color);
    }
    function onSelectedIndex(event) {
        currentQRCodeIndex = event.object.selectedIndex;
    }
    // the popovers still need a view to be anchored to
    function getAnchor() {
        return page?.nativeView;
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
    function setSelected(item: Item, selected: boolean) {
        if (item.selected !== selected) {
            ignorePagerIndexUntil = Date.now() + 300;
            items.some((d, index) => {
                if (d === item) {
                    nbSelected += selected ? 1 : -1;
                    d.selected = selected;
                    items.setItem(index, d);
                    return true;
                }
            });
        }
    }
    function unselectAll() {
        // nothing selected: nothing to reload (the pager would report its index again)
        if (items && nbSelected > 0) {
            ignorePagerIndexUntil = Date.now() + 600;
            nbSelected = 0;
            items.splice(0, items.length, ...items.map((i) => ({ ...i, selected: false })));
        }
    }
    function selectAll() {
        if (items) {
            ignorePagerIndexUntil = Date.now() + 600;
            items.splice(0, items.length, ...items.map((i) => ({ ...i, selected: true })));
            nbSelected = items.length;
        }
    }
    function toggleSelection(item: Item) {
        setSelected(item, !item.selected);
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
                props: {
                    document,
                    startPageIndex: items.findIndex((item) => item.page === page)
                }
            });
        } catch (error) {
            showError(error);
        }
    }
    // the actions of a photo: the context menu on iOS, a modal bottom sheet (the Material pattern) on Android
    function getPhotoActions(item: Item) {
        const index = items.findIndex((i) => i.page === item.page);
        const select = () => setSelected(items.getItem(index), true);
        return [
            { id: 'fullscreen', title: lc('show_fullscreen_images'), icon: 'fullscreen', mdiIcon: 'mdi-fullscreen', run: () => showFullscreen(index) },
            { id: 'edit', title: lc('edit'), icon: 'tune', mdiIcon: 'mdi-tune', run: () => editPage(item.page) },
            { id: 'select', title: lc('select'), icon: 'select', mdiIcon: 'mdi-check-circle-outline', run: select },
            {
                id: 'delete',
                title: lc('delete'),
                icon: 'delete',
                mdiIcon: 'mdi-delete',
                destructive: true,
                run: async () => {
                    select();
                    await runSelectionOption('delete');
                }
            }
        ];
    }
    async function onImageLongPress(item: Item) {
        if (!__ANDROID__) {
            return;
        }
        try {
            const OptionSelect = (await import('@shared/components/OptionSelect.svelte')).default;
            const actions = getPhotoActions(item);
            const options = actions.map((action) => ({ id: action.id, name: action.title, icon: action.mdiIcon, ...(action.destructive ? { color: colorError } : {}) }));
            const rowHeight = 58;
            const height = rowHeight * options.length;
            const option = await showBottomSheet({
                parent: page,
                view: OptionSelect,
                peekHeight: height,
                ignoreTopSafeArea: true,
                props: { rowHeight, height, options }
            });
            await actions.find((action) => action.id === option?.id)?.run();
        } catch (error) {
            showError(error);
        }
    }
    // a photo next to the current one is selected first, only the current one opens the fullscreen viewer
    function onPhotoTap(item: Item) {
        const index = items.findIndex((i) => i.page === item.page);
        if (index !== currentImageIndex && pager?.nativeElement) {
            pager.nativeElement.scrollToIndexAnimated(index, true);
        } else {
            showFullscreen(index);
        }
    }
    // the thumbnail at full size is the one of the current photo: the cells are styled from `current` (see the classes of the template).
    // The items are changed in place: setItem would reload the pager, which then reports the first visible photo instead of the current one
    function setCurrentImage(index: number) {
        items.forEach((item, position) => (item.current = position === index));
        collectionView?.nativeElement?.refreshVisibleItems();
    }
    // the strip has half a screen of padding at both ends: the offset of a thumbnail from the start is the offset which centers it
    function centerStrip(strip: CollectionView, index: number) {
        const native = strip.nativeViewProtected;
        const offset = index * FILMSTRIP_COL_WIDTH;
        if (__IOS__) {
            native.setContentOffsetAnimated(CGPointMake(offset, 0), true);
        } else {
            native.smoothScrollBy(Utils.layout.toDevicePixels(offset) - native.computeHorizontalScrollOffset(), 0);
        }
    }
    function onImagesPagerIndex(event) {
        if (Date.now() < ignorePagerIndexUntil) {
            return;
        }
        currentImageIndex = event.object.selectedIndex;
        setCurrentImage(currentImageIndex);
        updateBackdrop();
        // UIKit aborts when a collection view that has not been laid out is scrolled
        const strip = collectionView?.nativeView;
        if (strip?.isLoaded && strip.getMeasuredHeight() > 0) {
            centerStrip(strip, currentImageIndex);
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
                items: () =>
                    getPhotoActions(item).flatMap((action) => [
                        { title: action.title, icon: appIcon(action.icon), ...(action.destructive ? { destructive: true } : {}), onSelect: action.run },
                        ...(action.id === 'edit' ? [{ separator: true }] : [])
                    ])
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
            if (nbSelected > 0) {
                unselectAll();
            } else {
                onGoBack();
            }
        });
    async function openFullscreen(images: { image: string }[], props: Record<string, unknown> = {}) {
        const component = (await import('~/components/FullScreenImageViewer.svelte')).default;
        navigate({ page: component, props: { images, startPageIndex: 0, ...props } });
    }
    function fullscreenSelectedPages() {
        return openFullscreen(
            getSelectedPages(items, document)
                .filter((p) => p.page.imagePath)
                .map((p) => ({ name: document.name, image: p.page.imagePath, ...p }))
        );
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
                    // from the end: deleting a page shifts the following indexes. `items` is updated by onDocumentPageDeleted
                    for (let index = indexes.length - 1; index >= 0; index--) {
                        await document.deletePage(indexes[index]);
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
                items.push(...event.pages.map((page) => ({ page, selected: false })));
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
        if (current) {
            const page = document.getObservablePages().getItem(index);
            DEV_LOG && console.log('view onDocumentPageUpdated', index, event.imageUpdated);
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
            // the pages were reordered (reorder, reverse): the pager and the strip follow the new order from the first photo
            if (event.changedProps?.has('pagesOrder')) {
                // the pager goes back to its first page by itself with the new items: its events are ignored meanwhile
                ignorePagerIndexUntil = Date.now() + 600;
                items.splice(0, items.length, ...document.pages.map((photo, index) => ({ selected: false, page: photo, document, current: index === 0 })));
                setTimeout(() => {
                    pager?.nativeElement?.scrollToIndexAnimated(0, false);
                    currentImageIndex = 0;
                    updateBackdrop();
                    // the strip follows the new first photo
                    const strip = collectionView?.nativeView;
                    if (strip) {
                        centerStrip(strip, 0);
                    }
                }, 200);
            }
        }
    }

    onMount(() => {
        updateQRCodes();
        if (__ANDROID__) {
            Application.android.on(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }

        shortcutService.updateShortcuts(document);
        documentsService.documentRepository.incrementUsage(document).catch(() => {});
        // refresh();
        return subscribeDocumentEvents({
            updated: onDocumentUpdated,
            deleted: onDocumentsDeleted,
            pageDeleted: onDocumentPageDeleted,
            pageUpdated: onDocumentPageUpdated,
            pagesAdded: onPagesAdded
        });
    });
    onDestroy(() => {
        if (__ANDROID__) {
            Application.android.off(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
    });

    function refreshCollectionView() {
        collectionView?.nativeView?.refresh();
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
                    result = await showImagePopoverMenu(getSelectedPages(items, document), getAnchor());
                    break;
                case 'fullscreen':
                    await fullscreenSelectedPages();
                    result = true;
                    break;
                case 'show_ocr':
                    await showOCRData(document, getSelectedPages(items, document)[0]?.pageIndex);
                    break;
                case 'ocr':
                    result = await detectOCR({ pages: getSelectedPages(items, document) });
                    break;
                case 'qrcode': {
                    let found = false;
                    await Promise.all(
                        getSelectedPages(items, document).map((page) =>
                            qrcodeService.detectQRcode(document, page.pageIndex).then((r) => {
                                found = found || r?.length > 0;
                            })
                        )
                    );
                    if (!found) {
                        showSnack({ message: lc('no_qrcode_found') });
                    }
                    result = true;
                    break;
                }
                case 'delete':
                    result = await deleteSelectedPages();
                    break;
                case 'transform':
                    result = await transformPages({ pages: getSelectedPages(items, document) });
                    break;
            }
            if (result) {
                unselectAll();
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
                case 'show_ocr':
                    await showOCRData(document);
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
                    await showReorderPages();
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
                { id: 'ocr', name: lc('ocr_document') },
                { id: 'show_ocr', name: lc('show_ocr_text') }
            );
        }
        return [
            ...optionsToMenuItems(options, (option) => runDocumentOption(option.id)),
            ...(withImages && !pkpass ? [{ title: lc('show_fullscreen_images'), icon: appIcon('fullscreen'), onSelect: () => showFullscreen(currentImageIndex) }] : []),
            { separator: true },
            { title: lc('delete'), icon: appIcon('delete'), destructive: true, onSelect: deleteDoc }
        ];
    }
    function getSelectionMenu(pkpass: boolean): MenuItem[] {
        const withImages = !pkpass && getSelectedPages(items, document).some((p) => p.page.imagePath);
        const menuOptions: { id: string; name: string }[] = [{ id: 'fullscreen', name: lc('show_fullscreen_images') }];
        if (withImages) {
            menuOptions.push({ id: 'transform', name: lc('transform_images') }, { id: 'ocr', name: lc('ocr_document') }, { id: 'show_ocr', name: lc('show_ocr_text') }, { id: 'qrcode', name: lc('detect_qrcode') });
        }
        return optionsToMenuItems(menuOptions, (option) => runSelectionOption(option.id));
    }
    function getSelectionBottomItems(pkpass: boolean) {
        return [
            { spacer: true },
            { text: lc('share_images'), icon: appIcon('share'), onTap: () => runSelectionOption('share') },
            { spacer: true },
            { text: lc('more_options'), icon: appIcon('more'), menu: getSelectionMenu(pkpass) },
            { spacer: true },
            { text: lc('delete'), icon: appIcon('delete'), color: colorError, onTap: () => runSelectionOption('delete') },
            { spacer: true }
        ];
    }
    // the export menu of the whole card: PDF, images or pass, share
    function getDocumentExportMenu(doc: OCRDocument = document) {
        return getExportMenu({ document: doc, documents: [doc], pages: doc.pages.map((photo) => ({ page: photo, document: doc })) });
    }
    function showExportMenu(event: EventData) {
        showMenu({ anchor: event.object instanceof View ? event.object : null, items: getDocumentExportMenu() });
    }
    function getBottomItems(selected: number, pkpass: boolean, exportable: boolean, doc: OCRDocument) {
        // Android: selecting has its actions in the top bar
        if (selected > 0 && __ANDROID__) {
            return [];
        }
        if (selected > 0) {
            return getSelectionBottomItems(pkpass);
        }
        const share = exportable ? { text: lc('export'), icon: appIcon('export'), color: accent.accent, menu: getDocumentExportMenu(doc) } : null;
        // iOS: the main action is a prominent button at the right of the toolbar. Android: no toolbar, the buttons at the right of the page
        return __IOS__ ? [...(share ? [share] : []), ...(!pkpass ? [{ spacer: true }, { text: lc('edit'), prominent: true, color: accent.accent, onTap: openEdit }] : [])] : [];
    }
    async function showReorderPages() {
        try {
            const ReorderPagesModal = (await import('~/components/view/ReorderPagesModal.svelte')).default;
            await showModal({ page: ReorderPagesModal, fullscreen: true, props: { document } });
        } catch (error) {
            showError(error);
        }
    }
    async function openEdit() {
        try {
            const CardEditSheet = (await import('~/components/view/CardEditSheet.svelte')).default;
            const saved = await showBottomSheet({
                parent: page,
                view: CardEditSheet,
                windowSoftInputMode: SHEET_PAN_SOFT_INPUT_MODE,
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
    $: selectionMenu = __ANDROID__ && nbSelected > 0 ? getSelectionMenu(isPKPassDocument) : [];
    $: documentMenu = getDocumentMenu(hasImages, isPKPassDocument, document.pages.length);
    $: bottomItems = getBottomItems(nbSelected, isPKPassDocument, canBeExportedToPDF, document);
    // the options of the add button: photos and codes in their own section, a menu (system menu on iOS)
    function getAddMenu(kind?: 'code' | 'photo'): MenuItem[] {
        const photos: MenuItem[] = [
            ...($hasCamera ? [{ id: 'camera', title: lc('add_from_camera'), icon: appIcon('camera') }] : []),
            { id: 'import', title: lc('import_from_file'), icon: appIcon('import_file') },
            { id: 'import_image', title: lc('import_from_image'), icon: appIcon('import_image') }
        ];
        const codes: MenuItem[] = [
            { id: 'add_qrcode_camera', title: lc('add_qrcode_camera'), icon: appIcon('camera') },
            { id: 'add_qrcode_file', title: lc('add_qrcode_file'), icon: appIcon('import_image') },
            { id: 'add_qrcode_manual', title: lc('add_qrcode_manual'), icon: appIcon('edit') }
        ];
        const items = kind === 'photo' ? photos : kind === 'code' ? codes : [{ separator: true, title: lc('add_photo') }, ...photos, { separator: true, title: lc('add_code') }, ...codes];
        return items.map((item) => (item.separator ? item : { ...item, onSelect: () => runAddOption(item.id as string) }));
    }
    $: addMenu = getAddMenu();
    function showAddMenu(kind: 'code' | 'photo', anchor: View) {
        return showMenu({ anchor, items: getAddMenu(kind) });
    }
    async function runAddOption(id: string) {
        try {
            let found = false;
            switch (id) {
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
                    const scanned: QRCodeData = await showModal({
                        page: Camera,
                        fullscreen: true,
                        props: {
                            QRCodeOnly: true
                        }
                    });
                    if (scanned?.length) {
                        //we add the qrcode to the first page (less risk of it being removed with the page)
                        await addQRCodes(scanned);
                        found = true;
                    } else {
                        showSnack({ message: lc('no_qrcode_found') });
                    }
                    DEV_LOG && console.log('qrcodes', scanned);
                    break;
                case 'add_qrcode_file':
                    try {
                        const data = await createImagePicker({
                            mediaType: 1,
                            mode: 'multiple'
                        }).present();
                        const detected = (
                            await Promise.all(
                                data.map((d) =>
                                    detectQRCodeFromFile(d.path, {
                                        resizeThreshold: QRCODE_RESIZE_THRESHOLD
                                    })
                                )
                            )
                        ).filter((q) => !!q);
                        if (detected?.length) {
                            //we add the qrcode to the first page (less risk of it being removed with the page)
                            await addQRCodes(detected.flat());
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

    function showFullscreen(startPageIndex = 0) {
        return openFullscreen(
            document.pages.map((page) => ({
                sharedTransitionTag: `document_${document.id}_${page.id}`,
                name: document.name,
                image: page.imagePath,
                ...page
            })),
            {
                keepScreenAwake: true,
                onEdit: (index: number) => editPage(document.pages[index]),
                onOCR: (index: number) => showOCRData(document, index),
                screenBrightness: 1,
                startPageIndex
            }
        );
    }

    function getItemBackgroundColor(item) {
        return isEInk ? null : (item.page?.extra?.color ?? item.page.colors?.[0] ?? document.extra?.color);
    }
</script>

<appPage bind:this={page} id="cardview" {...pageProps}>
    <appBar
        {bottomItems}
        android:backgroundColor={isPKPassDocument ? passColors.backgroundColor : accent.container}
        android:scrollBehavior="hide"
        color={isPKPassDocument ? passColors.foregroundColor : backdropTextColor}
        transitionDuration={TRANSITION_DURATION}
        iosIconRenderingMode="alwaysTemplate"
        ios:translucent={!isPKPassDocument}
        scrollBehavior="lift"
        scrollTargetId="cardScroll"
        size={__IOS__ && !isPKPassDocument ? 'large' : 'small'}
        subtitle={__IOS__ && !isPKPassDocument && nbSelected === 0 ? dayjs(document.createdDate).format('LL') : null}
        title={nbSelected > 0 ? lcp('selected', nbSelected) : __IOS__ && !isPKPassDocument ? document.name : ''}>
        {#if __ANDROID__}
            <navigationButton {...{ 'android.systemIcon': nbSelected > 0 ? 'ic_menu_close_clear_cancel' : 'ic_menu_back' }} on:tap={nbSelected > 0 ? unselectAll : onGoBack} />
        {/if}
        {#if nbSelected > 0}
            {#if __IOS__}
                <appBarItem ios.position="right" prominent={true} text={lc('cancel')} on:tap={unselectAll} />
            {:else}
                <appBarItem icon={appIcon('share')} text={lc('share_images')} on:tap={() => runSelectionOption('share')} />
                <appBarItem color={colorError} icon={appIcon('delete')} text={lc('delete')} on:tap={() => runSelectionOption('delete')} />
                <appBarItem icon={appIcon('more')} menu={selectionMenu} text={lc('more_options')} />
            {/if}
        {:else}
            <appBarItem icon={appIcon(document.favorite === 1 ? 'favorite_on' : 'favorite_off')} ios.position="right" text={lc('toggle_favorite')} on:tap={toggleFavorite} />
            {#if !isPKPassDocument}
                <appBarItem icon={appIcon('add')} ios.position="right" menu={addMenu} text={lc('add')} />
            {/if}
            <appBarItem icon={appIcon('more')} ios.position="right" menu={documentMenu} />
        {/if}
    </appBar>
    <gridlayout class="pageContent" backgroundColor={isPKPassDocument ? passColors.backgroundColor : __IOS__ && cardColor ? accent.container : colorBackground} backgroundImage={heroGradient}>
        {#if __IOS__ && backdropImage}
            <image
                alwaysFade={true}
                blurRadius={12}
                decodeWidth={160}
                fadeDuration={TRANSITION_DURATION}
                {...{ iosOverflowSafeArea: true }}
                isUserInteractionEnabled={false}
                opacity={isDarkTheme() ? 0.7 : 1}
                src={backdropImage}
                stretch="aspectFill" />
        {/if}
        {#if CARD_APP && isPKPassDocument}
            <!-- the app bar pads its scroll target for the bottom toolbar: this empty one keeps it off the pager, so the pages go under the toolbar -->
            <scrollview id="cardScroll" height={0} />
            <pager bind:this={pager} items={document.pages} transformers="zoomOut" on:selectedIndexChange={onSelectedIndex}>
                <Template let:item>
                    <stacklayout padding="0">
                        <PKPassView bottomPadding={$windowInset.bottom + FLOATING_TOOLBAR_OFFSET} {document} fullscreen={true} pkpass={item.pkpass} />
                    </stacklayout>
                </Template>
            </pager>
        {:else}
            <scrollview id="cardScroll">
                <gridlayout paddingBottom={details.length ? 32 : 0} rows="auto,auto,auto,auto,auto">
                    <label color={backdropTextColor} fontSize={15} margin="0 16 8 16" text={dayjs(document.createdDate).format('LL')} visibility={showDateUnderTitle ? 'visible' : 'collapsed'} />
                    {#if __ANDROID__}
                        <gridlayout backgroundColor={accent.container} borderRadius="0 0 40 12" columns="*,auto" padding="0 20 {hasHero ? PLATE_OVERLAP + 20 : 24} 20" rows="auto">
                            <label margin="8 0 0 0" maxLines={4} textWrap={true}>
                                <span color={colorOnBackground} fontSize={34} fontWeight="bold" text={document.name} />
                                <span color={colorOnSurfaceVariant} fontSize={15} text={'\n' + dayjs(document.createdDate).format('LL')} />
                            </label>
                            <label
                                backgroundColor={accent.accent}
                                borderRadius={24}
                                col={1}
                                color={accent.onAccent}
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
                    {/if}
                    {#if hasQRCodes}
                        <gridlayout {...{ iosOverflowSafeArea: false }} height={CODE_ZONE_HEIGHT + (multipleQR ? 32 : 0)} margin={qrZoneMargin} row={1} rows="*,auto">
                            <pager
                                bind:this={qrPager}
                                id="qrPager"
                                items={qrcodes}
                                peaking={multipleQR ? PEEK_WIDTH : 0}
                                selectedIndex={currentQRCodeIndex}
                                spacing={12}
                                on:selectedIndexChange={onSelectedIndex}>
                                <Template let:item>
                                    <gridlayout
                                        backgroundColor="white"
                                        borderRadius={28}
                                        elevation={isEInk || __ANDROID__ ? 0 : 6}
                                        margin={qrCardMargin}
                                        padding="20"
                                        rows="*,auto"
                                        on:tap={onQRCodeTap}>
                                        <svgview src={item.svg} stretch="aspectFit" />
                                        <label
                                            color="black"
                                            fontSize={17}
                                            fontWeight="bold"
                                            linkColor="black"
                                            {...{ linkUnderline: false }}
                                            lineBreak="end"
                                            marginTop={8}
                                            maxLines={2}
                                            row={1}
                                            selectable={true}
                                            text={item.text}
                                            textAlignment="center"
                                            textWrap={true} />
                                    </gridlayout>
                                </Template>
                            </pager>
                            {#if multipleQR}
                                <pagerindicator color="#80808066" height={16} horizontalAlignment="center" marginBottom={8} pagerViewId="qrPager" row={1} selectedColor={colorOnSurface} type="worm" />
                            {/if}
                        </gridlayout>
                    {/if}
                    {#if hasImages}
                        <pager
                            bind:this={pager}
                            id="imagesPager"
                            height={photoPagerHeight}
                            {items}
                            margin={photosMargin}
                            peaking={multiplePhotos ? PEEK_WIDTH : 0}
                            preserveIndexOnItemsChange={true}
                            row={2}
                            spacing={12}
                            on:selectedIndexChange={onImagesPagerIndex}>
                            <Template let:item>
                                <gridlayout
                                    backgroundColor={getPhotoBackground(item.page)}
                                    borderRadius={20}
                                    boxShadow={__IOS__ ? '0 4 12 #00000040' : undefined}
                                    verticalAlignment="top"
                                    visibility={item.page.imagePath ? 'visible' : 'collapsed'}
                                    on:loaded={(e) => registerImageMenu(e, item)}
                                    on:longPress={() => onImageLongPress(item)}
                                    on:tap={() => onPhotoTap(item)}>
                                    <RotableImageView
                                        id="imageView"
                                        aspectRatio={1 / CARD_RATIO}
                                        borderRadius={20}
                                        decodeWidth={screenWidthDips}
                                        item={item.page}
                                        sharedTransitionTag={`document_${document.id}_${item.page.id}`}
                                        stretch="aspectFill" />
                                    <!-- the light edge of a card, at the top only -->
                                    <gridlayout backgroundColor="#FFFFFF66" height={1} isUserInteractionEnabled={false} margin="0 14" verticalAlignment="top" />
                                    <uibutton
                                        class="photoEditButton"
                                        accessibilityLabel={lc('adjust')}
                                        height={36}
                                        horizontalAlignment="right"
                                        margin="0 12 12 0"
                                        variant={photoEditVariant}
                                        {...photoEditProps}
                                        verticalAlignment="bottom"
                                        width={36}
                                        {...{ src: appIcon('edit') }}
                                        on:tap={() => editPage(item.page)} />
                                </gridlayout>
                            </Template>
                        </pager>
                        <collectionview
                            bind:this={collectionView}
                            id="view"
                            ios:autoReloadItemOnLayout={true}
                            colWidth={FILMSTRIP_COL_WIDTH}
                            height={FILMSTRIP_HEIGHT}
                            {items}
                            margin="8 0 8 0"
                            orientation="horizontal"
                            paddingLeft={filmstripPadding}
                            paddingRight={filmstripPadding}
                            row={3}
                            rowHeight={FILMSTRIP_HEIGHT}
                            visibility={multiplePhotos ? 'visible' : 'collapsed'}>
                            <Template let:index let:item>
                                <gridlayout class="cardItemTemplate" elevation={0} margin={4} rippleColor={colorSurface} on:tap={() => onItemTap(item)} on:longPress={() => toggleSelection(item)}>
                                    <!-- the content is what is scaled: the cell itself keeps its size and its touch handlers -->
                                    <gridlayout class={item.current ? 'thumbnailCurrent' : 'thumbnail'} backgroundColor={getItemBackgroundColor(item)} borderRadius={6}>
                                        <RotableImageView id="imageView" borderRadius={6} decodeWidth={FILMSTRIP_COL_WIDTH} item={item.page} stretch="aspectFill" width="100%" />
                                        <gridlayout class="thumbnailScrim" backgroundColor="#00000066" borderRadius={6} isUserInteractionEnabled={false} />
                                        <gridlayout backgroundColor="#0000004D" borderRadius={6} isUserInteractionEnabled={false} visibility={item.selected ? 'visible' : 'hidden'}>
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
                                    </gridlayout>
                                </gridlayout>
                            </Template>
                        </collectionview>
                    {/if}

                    {#if details.length}
                        <stacklayout margin="16 16 0 16" row={4} {...detailsContainerProps}>
                            {#each details as detail, index (detail.name)}
                                <label linkColor={colorOnSurface} {...{ linkUnderline: false }} selectable={true} textWrap={true} {...getDetailRowProps(index, details.length)}>
                                    <span color={colorOnSurfaceVariant} fontSize={13} text={detail.name} />
                                    <span color={colorOnSurface} fontSize={17} text={'\n' + formatExtraValue(detail.extra)} />
                                </label>
                            {/each}
                        </stacklayout>
                    {/if}
                </gridlayout>
            </scrollview>
            {#if isEmptyCard}
                <CardViewEmpty {accent} onAddCode={(anchor) => showAddMenu('code', anchor)} onAddDetail={openEdit} onAddPhoto={(anchor) => showAddMenu('photo', anchor)} verticalAlignment="center" />
            {/if}
        {/if}
    </gridlayout>
    <appPageOverlay>
        {#if __ANDROID__ && nbSelected === 0}
            <stacklayout class="fabHolder" marginBottom={Math.min(60, $windowInset.bottom)} orientation="horizontal">
                {#if isPKPassDocument}
                    <uifloatingactionbutton
                        class="editFab"
                        backgroundColor={passColors.foregroundColor}
                        color={passColors.backgroundColor}
                        src={appIcon('export')}
                        text={lc('export')}
                        on:tap={showExportMenu} />
                {:else}
                    {#if canBeExportedToPDF}
                        <uibutton class="addFab" backgroundColor={accent.container} color={accent.accent} {...{ src: appIcon('export') }} variant="contained" on:tap={showExportMenu} />
                    {/if}
                    <uifloatingactionbutton class="editFab" backgroundColor={accent.accent} color={accent.onAccent} src={appIcon('edit')} text={lc('edit')} on:tap={openEdit} />
                {/if}
            </stacklayout>
        {/if}
    </appPageOverlay>
</appPage>
