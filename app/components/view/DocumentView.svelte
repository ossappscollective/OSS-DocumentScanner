<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { confirm } from '@nativescript-community/ui-dialogs';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { Img } from '@nativescript-community/ui-image';
    import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { type MenuItem, showMenu } from '@nativescript-community/ui-menu';
    import { AnimationDefinition, Application, ApplicationSettings, EventData, ObservableArray, Page, PageTransition, SharedTransition, StackLayout, View } from '@nativescript/core';
    import { AndroidActivityBackPressedEventData } from '@nativescript/core/application';
    import { showError } from '@shared/utils/showError';
    import { goBack, navigate, showModal } from '@shared/utils/svelte/ui';
    import { prefs } from '@shared/services/preferences';
    import dayjs from 'dayjs';
    import { onDestroy, onMount } from 'svelte';
    import PdfEdit from '~/components/edit/DocumentEdit.svelte';
    import DocumentPageTile from '~/components/view/DocumentPageTile.svelte';
    import RenameDocumentBar from '~/components/view/RenameDocumentBar.svelte';
    import { lc, lcp } from '~/helpers/locale';
    import { onThemeChanged } from '~/helpers/theme';
    import { OCRDocument, OCRPage } from '~/models/OCRDocument';
    import {
        DocumentDeletedEventData,
        DocumentPageDeletedEventData,
        DocumentPageUpdatedEventData,
        DocumentPagesAddedEventData,
        DocumentUpdatedEventData,
        documentsService
    } from '~/services/documents';
    import { syncServicesStore } from '~/services/sync';
    import { SERVICES_SYNC_COLOR, SERVICES_SYNC_MASK } from '~/services/sync/types';
    import { SERVICES_SYNC_TITLES } from '~/services/sync/ui';
    import { appIcon } from '~/utils/appIcons';
    import { optionsToMenuItems } from '~/utils/appMenu';
    import {
        DEFAULT_NB_COLUMNS_VIEW,
        DEFAULT_NB_COLUMNS_VIEW_LANDSCAPE,
        DOCUMENT_TILE_RATIO,
        EVENT_DOCUMENT_DELETED,
        EVENT_DOCUMENT_PAGES_ADDED,
        EVENT_DOCUMENT_PAGE_DELETED,
        EVENT_DOCUMENT_PAGE_UPDATED,
        EVENT_DOCUMENT_UPDATED,
        SETTINGS_NB_COLUMNS_VIEW,
        SETTINGS_NB_COLUMNS_VIEW_LANDSCAPE,
        SHEET_PAN_SOFT_INPUT_MODE
    } from '~/utils/constants';
    import { getSyncedServices, getTileRadius, isAutoName } from '~/utils/documentCell';
    import { computeStorageSizes } from '~/utils/originals';
    import {
        deleteOriginalImages,
        detectOCR,
        formatStorageSizes,
        hideLoading,
        importAndScanImage,
        importImageFromCamera,
        onBackButton,
        showImagePopoverMenu,
        showLoading,
        showPDFPopoverMenu,
        transformPages,
        tryCatchFunction
    } from '~/utils/ui';
    import { colors, hasCamera, isLandscape, screenHeightDips, screenWidthDips, windowInset } from '~/variables';

    // 16 from the screen edge to a tile, 12 between two tiles
    const rowMargin = 6;
    const columnsPadding = 10;
    interface Item {
        page: OCRPage;
        selected: boolean;
        index: number;
    }
</script>

<script lang="ts">
    // technique for only specific properties to get updated on store change
    $: ({ colorBackground, colorError, colorOnBackground, colorOnPrimaryContainer, colorOnSurfaceVariant, colorPrimaryContainer } = $colors);

    export let document: OCRDocument;
    export let transitionOnBack = true;
    let collectionView: NativeViewElementNode<CollectionView>;
    let fabHolder: NativeViewElementNode<StackLayout>;
    let page: NativeViewElementNode<Page>;
    let nbSelected = 0;
    let editingTitle = false;

    let nbColumns = updateColumns($isLandscape);

    function updateColumns(isLandscape) {
        return isLandscape
            ? ApplicationSettings.getNumber(SETTINGS_NB_COLUMNS_VIEW_LANDSCAPE, DEFAULT_NB_COLUMNS_VIEW_LANDSCAPE)
            : ApplicationSettings.getNumber(SETTINGS_NB_COLUMNS_VIEW, DEFAULT_NB_COLUMNS_VIEW);
    }
    $: nbColumns = updateColumns($isLandscape);
    $: colWidth = 100 / nbColumns + '%';
    $: itemWidth = (($isLandscape ? screenHeightDips : screenWidthDips) - $windowInset.left - $windowInset.right - 2 * columnsPadding) / nbColumns - 2 * rowMargin;
    $: tileHeight = itemWidth * DOCUMENT_TILE_RATIO + 2 * rowMargin;
    $: tileRadius = getTileRadius(itemWidth, itemWidth * DOCUMENT_TILE_RATIO);

    prefs.on(`key:${SETTINGS_NB_COLUMNS_VIEW}`, () => (nbColumns = updateColumns($isLandscape)));
    prefs.on(`key:${SETTINGS_NB_COLUMNS_VIEW_LANDSCAPE}`, () => (nbColumns = updateColumns($isLandscape)));

    const pages = document.getObservablePages();
    let items = pages.map((page, index) => ({ selected: false, page, index })) as any as ObservableArray<Item>;

    $: favorite = document.favorite === 1;
    $: hasOriginals = document.pages.some((current) => current.sourceImagePath);
    $: services = getSyncedServices(document._synced, $syncServicesStore, SERVICES_SYNC_MASK, SERVICES_SYNC_COLOR);
    // an auto named document is titled by its date and time, a named one has its date in the subtitle
    $: autoName = isAutoName(document.name);
    $: title = autoName ? dayjs(document.createdDate).format('lll') : document.name;
    $: subtitle = [...(autoName ? [] : [dayjs(document.createdDate).format('ll')]), lcp('nb_pages', document.pages.length), formatStorageSizes(computeStorageSizes(document.pages))].join(' · ');

    function getSyncedServiceTitle(type: string) {
        return SERVICES_SYNC_TITLES[type] + ' · ' + type.split('_')[1].toUpperCase();
    }

    // the pdf and the image export are one menu of the export button
    function getExportMenu(): MenuItem[] {
        return [
            { title: 'PDF', icon: appIcon('pdf'), onSelect: () => showPDFPopover() },
            {
                title: lc('share_images'),
                icon: appIcon('image'),
                onSelect: () => showImageExportPopover(nbSelected > 0 ? getSelectedPages() : document.pages.map((current) => ({ page: current, document })))
            }
        ];
    }
    function getDocumentMenu(withOriginals: boolean): MenuItem[] {
        return optionsToMenuItems(
            [
                { id: 'rename', name: lc('rename') },
                { id: 'select', name: lc('select_pages') },
                { id: 'reorder', name: lc('reorder_pages') },
                { id: 'move_folder', name: lc('move_folder') },
                { id: 'ocr', name: lc('ocr_document') },
                { id: 'transform', name: lc('transform_images') },
                ...(withOriginals ? [{ id: 'delete_originals', name: lc('delete_original_images') }] : []),
                { id: 'delete', name: lc('delete') }
            ],
            (option) => runDocumentOption(option.id)
        );
    }
    function getSelectionMenu(withOriginals: boolean): MenuItem[] {
        return optionsToMenuItems(
            [
                { id: 'select_all', name: lc('select_all') },
                { id: 'transform', name: lc('transform_images') },
                ...(withOriginals ? [{ id: 'delete_originals', name: lc('delete_original_images') }] : [])
            ],
            (option) => runSelectionOption(option.id)
        );
    }
    // the pages come from the camera, a file, the gallery or another document
    function getAddMenu(camera: boolean): MenuItem[] {
        return [
            ...(camera ? [{ id: 'camera', title: lc('add_from_camera'), icon: appIcon('camera') }] : []),
            { id: 'files', title: lc('import_from_file'), icon: appIcon('import_file') },
            { id: 'import_image', title: lc('import_from_image'), icon: appIcon('import_image') },
            { id: 'import_document', title: lc('import_from_other_document'), icon: appIcon('batch') }
        ].map((item) => ({ ...item, onSelect: () => runAddOption(item.id) }));
    }
    // iOS: the bottom toolbar, the main action at its trailing end. Android has the FABs, and the bar of the selection
    function getBottomItems(selected: number, withOriginals: boolean, camera: boolean) {
        if (!__IOS__) {
            return [];
        }
        if (selected > 0) {
            return [
                { spacer: true },
                { text: lc('share'), icon: appIcon('share'), menu: getExportMenu() },
                { spacer: true },
                { text: lc('ocr_document'), icon: appIcon('ocr'), onTap: () => runSelectionOption('ocr') },
                { spacer: true },
                { text: lc('more_options'), icon: appIcon('more'), menu: getSelectionMenu(withOriginals) },
                { spacer: true },
                { text: lc('delete'), icon: appIcon('delete'), color: colorError, onTap: () => runSelectionOption('delete') },
                { spacer: true }
            ];
        }
        return [
            { text: lc('export'), icon: appIcon('export'), menu: getExportMenu() },
            { spacer: true },
            ...(camera
                ? [{ text: lc('add'), icon: appIcon('camera'), prominent: true, onTap: () => addPages() }]
                : [{ text: lc('add'), icon: appIcon('add'), prominent: true, menu: getAddMenu(false) }])
        ];
    }
    $: documentMenu = getDocumentMenu(hasOriginals);
    $: selectionMenu = getSelectionMenu(hasOriginals);
    $: addMenu = getAddMenu($hasCamera);
    $: bottomItems = getBottomItems(nbSelected, hasOriginals, $hasCamera);

    async function showPDFPopover() {
        try {
            const selected = nbSelected > 0 ? getSelectedPages() : document.pages.map((current) => ({ page: current, document }));
            await showPDFPopoverMenu({ pages: selected, document, anchor: page?.nativeView, documents: [document] });
        } catch (err) {
            showError(err);
        }
    }
    async function showImageExportPopover(selected: { page: OCRPage; document: OCRDocument }[]) {
        try {
            await showImagePopoverMenu(selected, page?.nativeView);
        } catch (err) {
            showError(err);
        }
    }

    async function showMenuAbove(event: EventData, items: MenuItem[]) {
        try {
            if (event.object instanceof View) {
                await showMenu({ anchor: event.object, placement: { horizontal: 'end', vertical: 'above' }, items });
            }
        } catch (error) {
            showError(error);
        }
    }

    async function addPages(inverseUseSystemCamera = false) {
        try {
            await importImageFromCamera({ document, inverseUseSystemCamera });
        } catch (error) {
            showError(error);
        }
    }

    async function toggleFavorite() {
        try {
            await document.save({ favorite: favorite ? 0 : 1 }, false, true);
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

    function selectItem(item: Item) {
        if (!item.selected) {
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
    // the first selection starts from a long press, the next ones from a tap
    function startSelection(item: Item) {
        if (nbSelected === 0) {
            selectItem(item);
        }
    }

    function getSelectedPages() {
        const selected: { page: OCRPage; document: OCRDocument }[] = [];
        items.forEach((d) => {
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

    function toggleSelection(item: Item) {
        if (item.selected) {
            unselectItem(item);
        } else {
            selectItem(item);
        }
    }
    function onItemLongPress(item: Item) {
        if (nbSelected > 0) {
            toggleSelection(item);
        } else {
            startSelection(item);
        }
    }
    async function onItemTap(item: Item) {
        try {
            if (nbSelected > 0) {
                toggleSelection(item);
            } else {
                const index = items.findIndex((p) => p.page === item.page);
                navigate({
                    page: PdfEdit,
                    transition:
                        __ANDROID__ && !CARD_APP
                            ? SharedTransition.custom(new PageTransition(300, undefined, 10), {
                                  pageStart: {
                                      sharedTransitionTags: {
                                          [`document_${document.id}_${item.page.id}`]: {}
                                      }
                                  }
                              })
                            : undefined,
                    props: {
                        document,
                        startPageIndex: index
                    }
                });
            }
        } catch (error) {
            showError(error);
        }
    }
    function onGoBack() {
        if (editingTitle) {
            editingTitle = false;
        } else {
            goBack(
                transitionOnBack
                    ? undefined
                    : {
                          transition: null
                      }
            );
        }
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
                    for (let index = indexes.length - 1; index >= 0; index--) {
                        await document.deletePage(indexes[index]);
                    }
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
            if (!!event.imageUpdated) {
                const imageView = getImageView(index);
                if (imageView) {
                    imageView?.updateImageUri();
                } else if (__IOS__) {
                    collectionView?.nativeElement?.refreshVisibleItems();
                }
            }
            items.setItem(index, { ...current, page });
        }
    }
    function onDocumentPageDeleted(event: DocumentPageDeletedEventData) {
        if (event.doc.id !== document.id) {
            return;
        }
        document = event.doc;
        const index = event.pageIndex;
        items.splice(index, 1);
        for (let i = index; i < items.length; i++) {
            const item = items.getItem(i);
            item.index -= 1;
            items.setItem(i, item);
        }
    }
    function onDocumentUpdated(event: DocumentUpdatedEventData) {
        if (document.id === event.doc.id) {
            document = event.doc;
        }
    }
    function onDocumentsDeleted(event: DocumentDeletedEventData) {
        if (event.documents.findIndex((d) => d.id === document.id) !== -1) {
            goBack({
                // null is important to say no transition! (override enter transition)
                transition: null
            });
        }
    }

    function onSnackMessageAnimation({ animationArgs }: EventData & { animationArgs: AnimationDefinition[] }) {
        if (fabHolder) {
            const snackAnimation = animationArgs[0];
            animationArgs.push({
                target: fabHolder.nativeView,
                translate: { x: 0, y: snackAnimation.translate.y === 0 ? -70 : 0 },
                duration: snackAnimation.duration
            });
        }
    }

    onMount(() => {
        Application.on('snackMessageAnimation', onSnackMessageAnimation);
        if (__ANDROID__) {
            Application.android.on(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
        documentsService.on(EVENT_DOCUMENT_UPDATED, onDocumentUpdated);
        documentsService.on(EVENT_DOCUMENT_DELETED, onDocumentsDeleted);
        documentsService.on(EVENT_DOCUMENT_PAGE_DELETED, onDocumentPageDeleted);
        documentsService.on(EVENT_DOCUMENT_PAGE_UPDATED, onDocumentPageUpdated);
        documentsService.on(EVENT_DOCUMENT_PAGES_ADDED, onPagesAdded);
        documentsService.documentRepository.incrementUsage(document).catch(() => {});
    });
    onDestroy(() => {
        items = null;
        Application.off('snackMessageAnimation', onSnackMessageAnimation);
        if (__ANDROID__) {
            Application.android.off(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
        documentsService.off(EVENT_DOCUMENT_UPDATED, onDocumentUpdated);
        documentsService.off(EVENT_DOCUMENT_DELETED, onDocumentsDeleted);
        documentsService.off(EVENT_DOCUMENT_PAGE_DELETED, onDocumentPageDeleted);
        documentsService.off(EVENT_DOCUMENT_PAGE_UPDATED, onDocumentPageUpdated);
        documentsService.off(EVENT_DOCUMENT_PAGES_ADDED, onPagesAdded);
    });

    function refreshCollectionView() {
        collectionView?.nativeView?.refresh();
    }
    onThemeChanged(refreshCollectionView);

    async function reorderPages() {
        try {
            const ReorderPagesSheet = (await import('~/components/view/ReorderPagesSheet.svelte')).default;
            const order: string[] = await showBottomSheet({
                parent: page,
                view: ReorderPagesSheet,
                ignoreTopSafeArea: true,
                props: { pages: document.pages }
            });
            if (order) {
                await document.save({ pagesOrder: order }, true);
                items.splice(0, items.length, ...document.pages.map((current, index) => ({ selected: false, page: current, index })));
            }
        } catch (error) {
            showError(error);
        }
    }
    async function moveToFolder() {
        try {
            const MoveToFolderSheet = (await import('~/components/common/MoveToFolderSheet.svelte')).default;
            const folderName = await showBottomSheet({
                view: MoveToFolderSheet,
                windowSoftInputMode: SHEET_PAN_SOFT_INPUT_MODE,
                ignoreTopSafeArea: true,
                props: {
                    folders: (await documentsService.folderRepository.findAllFolders()).filter((f) => f.name !== 'none'),
                    currentFolder: undefined
                }
            });
            if (typeof folderName === 'string') {
                await document.setFolder({ folderName: folderName || undefined });
            }
        } catch (error) {
            showError(error);
        }
    }

    async function runDocumentOption(id: string) {
        try {
            switch (id) {
                case 'rename':
                    editingTitle = true;
                    break;
                case 'select':
                    selectAll();
                    break;
                case 'reorder':
                    await reorderPages();
                    break;
                case 'move_folder':
                    await moveToFolder();
                    break;
                case 'ocr':
                    await detectOCR({ documents: [document] });
                    break;
                case 'transform':
                    await transformPages({ documents: [document] });
                    break;
                case 'delete_originals':
                    await deleteOriginalImages({ documents: [document] });
                    break;
                case 'delete':
                    await deleteDoc();
                    break;
            }
        } catch (error) {
            showError(error);
        }
    }
    async function runSelectionOption(id: string) {
        try {
            let result;
            switch (id) {
                case 'select_all':
                    selectAll();
                    break;
                case 'ocr':
                    result = await detectOCR({ pages: getSelectedPagesWithData() });
                    break;
                case 'transform':
                    result = await transformPages({ pages: getSelectedPagesWithData() });
                    break;
                case 'delete_originals':
                    result = await deleteOriginalImages({ pages: getSelectedPagesWithData() });
                    break;
                case 'delete':
                    result = await deleteSelectedPages();
                    break;
            }
            if (result) {
                unselectAll();
            }
        } catch (error) {
            showError(error);
        }
    }

    const runAddOption = tryCatchFunction(
        async (id: string) => {
            switch (id) {
                case 'camera':
                    await addPages();
                    break;
                case 'files':
                    await importAndScanImage({ document, importPDFs: true, canGoToView: false });
                    break;
                case 'import_image':
                    await importAndScanImage({ canGoToView: false, forceGalleryPick: true, document, importPDFs: false });
                    break;
                case 'import_document': {
                    const component = (await import('~/components/common/DocumentPicker.svelte')).default;
                    const result: OCRDocument[] = await showModal({
                        page: component,
                        fullscreen: true,
                        props: {}
                    });
                    if (result?.length) {
                        await showLoading(lc('importing'));
                        const imported = result
                            .reduce((acc, v) => acc.concat(v.pages), [])
                            .map((current: OCRPage) => {
                                const { id, ...others } = current.toJSON();
                                return { ...others };
                            });
                        await document.addPages(imported);
                    }
                    break;
                }
            }
        },
        null,
        hideLoading
    );
</script>

<appPage bind:this={page} id="documentView">
    <appBar
        {bottomItems}
        android:backgroundColor={nbSelected > 0 ? colorPrimaryContainer : colorBackground}
        color={colorOnBackground}
        iosIconRenderingMode="alwaysTemplate"
        scrollBehavior="lift"
        scrollTargetId="documentPages"
        size="small"
        title={nbSelected > 0 ? lcp('selected', nbSelected) : ''}
        titleAlignment="leading"
        ios:translucent={true}>
        {#if __ANDROID__}
            <navigationButton {...{ 'android.systemIcon': nbSelected > 0 ? 'ic_menu_close_clear_cancel' : 'ic_menu_back' }} on:tap={nbSelected > 0 ? unselectAll : onGoBack} />
        {/if}
        {#if nbSelected > 0}
            {#if __IOS__}
                <appBarItem ios.position="right" prominent={true} text={lc('cancel')} on:tap={unselectAll} />
            {:else}
                <appBarItem icon={appIcon('export')} menu={getExportMenu()} text={lc('share')} />
                <appBarItem icon={appIcon('delete')} text={lc('delete')} on:tap={() => runSelectionOption('delete')} />
                <appBarItem icon={appIcon('more')} menu={selectionMenu} />
            {/if}
        {:else}
            <appBarItem icon={appIcon(favorite ? 'favorite_on' : 'favorite_off')} ios.position="right" text={lc('toggle_favorite')} on:tap={toggleFavorite} />
            <appBarItem icon={appIcon('add')} ios.position="right" menu={addMenu} text={lc('add')} />
            <appBarItem icon={appIcon('more')} ios.position="right" menu={documentMenu} />
        {/if}
    </appBar>
    <gridlayout class="pageContent" rows="auto,auto,*">
        <!-- the title zone is under the bar, like the card view: bold name, then the date and the details -->
        <label margin="4 16 8 16" textWrap={true} visibility={nbSelected > 0 ? 'collapsed' : 'visible'}>
            <span color={colorOnBackground} fontSize={__IOS__ ? 32 : 28} fontWeight="bold" text={title} />
            <span color={colorOnSurfaceVariant} fontSize={13} text={'\n' + subtitle} />
        </label>
        <wraplayout margin="0 16 4 16" row={1} visibility={nbSelected === 0 && services.length ? 'visible' : 'collapsed'}>
            {#each services as service (service.type)}
                <uisurface class="cardChip" height={24} margin="0 6 6 0">
                    <stacklayout orientation="horizontal" padding="0 10" verticalAlignment="center">
                        <gridlayout backgroundColor={service.color} borderRadius={4.5} height={9} marginRight={5} verticalAlignment="center" width={9} />
                        <label fontSize={12} fontWeight="600" text={getSyncedServiceTitle(service.type)} verticalAlignment="center" />
                    </stacklayout>
                </uisurface>
            {/each}
        </wraplayout>
        <collectionview
            bind:this={collectionView}
            id="documentPages"
            {colWidth}
            {items}
            ios:autoReloadItemOnLayout={true}
            paddingBottom={Math.max($windowInset.bottom, 88)}
            paddingLeft={columnsPadding}
            paddingRight={columnsPadding}
            row={2}
            rowHeight={tileHeight}>
            <Template let:item>
                <DocumentPageTile
                    documentId={document.id}
                    height={tileHeight}
                    index={item.index}
                    page={item.page}
                    radius={tileRadius}
                    selected={item.selected}
                    width={itemWidth}
                    on:tap={() => onItemTap(item)}
                    on:longPress={() => onItemLongPress(item)} />
            </Template>
        </collectionview>
        {#if __ANDROID__ && nbSelected === 0}
            <stacklayout bind:this={fabHolder} class="fabHolder" marginBottom={Math.min(60, $windowInset.bottom)} orientation="horizontal" row={2}>
                <uibutton class="addFab" {...{ src: appIcon('export') }} variant="contained" verticalAlignment="center" on:tap={(event) => showMenuAbove(event, getExportMenu())} />
                <uifloatingactionbutton
                    class="scanFab"
                    backgroundColor={colorPrimaryContainer}
                    color={colorOnPrimaryContainer}
                    shrinkOnScroll={collectionView?.nativeView}
                    src={appIcon($hasCamera ? 'camera' : 'add')}
                    text={lc('add')}
                    on:tap={(event) => ($hasCamera ? addPages() : showMenuAbove(event, addMenu))}
                    on:longPress={() => addPages(true)} />
            </stacklayout>
        {/if}
        {#if editingTitle}
            <RenameDocumentBar {document} onClose={() => (editingTitle = false)} rowSpan={3} />
        {/if}
    </gridlayout>
</appPage>
