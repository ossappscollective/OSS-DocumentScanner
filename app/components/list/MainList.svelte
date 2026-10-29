<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Canvas, CanvasView, LayoutAlignment, Paint, StaticLayout } from '@nativescript-community/ui-canvas';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { Img } from '@nativescript-community/ui-image';
    import { createNativeAttributedString } from '@nativescript-community/ui-label';
    import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { confirm } from '@nativescript-community/ui-dialogs';
    import { VerticalPosition } from '@nativescript-community/ui-popover';
    import { isCatalyst, windowCommandEvent } from '@shared/utils/window';
    import { setContextMenu } from '@nativescript-community/ui-menu';
    import {
        AnimationDefinition,
        Application,
        ApplicationSettings,
        Color,
        EventData,
        Frame,
        NavigatedData,
        ObservableArray,
        Page,
        ProxyViewContainer,
        Screen,
        StackLayout,
        View
    } from '@nativescript/core';
    import { AndroidActivityBackPressedEventData } from '@nativescript/core/application/application-interfaces';
    import { debounce, throttle } from '@nativescript/core/utils';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import { OptionType } from '@shared/components/OptionSelect.svelte';
    import { prefs } from '@shared/services/preferences';
    import { showError } from '@shared/utils/showError';
    import { closeModal, fade, goBack, navigate } from '@shared/utils/svelte/ui';
    import { onDestroy, onMount } from 'svelte';
    import { type Writable, writable } from 'svelte/store';
    import type { AppBar } from '@nativescript-community/ui-appbar';
    import type { MenuItem } from '@nativescript-community/ui-menu';
    import { appIcon } from '~/utils/appIcons';
    import { type RowPosition, updateRowPositions } from '~/utils/groupedRows';
    import CardsEmpty from '~/components/list/CardsEmpty.svelte';
    import FolderCell from '~/components/list/FolderCell.svelte';
    import { optionsToMenuItems } from '~/utils/appMenu';
    import EditNameActionBar from '~/components/common/EditNameActionBar.svelte';
    import SelectedIndicator from '~/components/common/SelectedIndicator.svelte';
    import { l, lc, lcp, lp } from '~/helpers/locale';
    import { getRealTheme, isEInk, onThemeChanged } from '~/helpers/theme';
    import { DocFolder, OCRDocument, OCRPage } from '~/models/OCRDocument';
    import {
        DocumentAddedEventData,
        DocumentDeletedEventData,
        DocumentFolderAddedEventData,
        DocumentMovedFolderEventData,
        DocumentPageUpdatedEventData,
        DocumentUpdatedEventData,
        FolderDeletedEventData,
        FolderUpdatedEventData,
        documentsService
    } from '~/services/documents';
    import { syncService, syncServicesStore } from '~/services/sync';
    import { SERVICES_SYNC_COLOR, SERVICES_SYNC_MASK } from '~/services/sync/types';
    import {
        BOTTOM_BUTTON_OFFSET,
        DEFAULT_FOLDER_VIEW_STYLE,
        DEFAULT_NB_COLUMNS,
        DEFAULT_NB_COLUMNS_LANDSCAPE,
        DEFAULT_SORT_ORDER,
        DEFAULT_TRASH_ENABLED,
        DEFAULT_VIEW_STYLE,
        EVENT_DOCUMENT_ADDED,
        EVENT_DOCUMENT_DELETED,
        EVENT_DOCUMENT_MOVED_FOLDER,
        EVENT_DOCUMENT_PAGE_DELETED,
        EVENT_DOCUMENT_PAGE_UPDATED,
        EVENT_DOCUMENT_RESTORED,
        EVENT_DOCUMENT_TRASHED,
        EVENT_DOCUMENT_UPDATED,
        EVENT_FOLDER_ADDED,
        EVENT_FOLDER_DELETED,
        EVENT_FOLDER_UPDATED,
        EVENT_STATE,
        EVENT_SYNC_STATE,
        SETTINGS_FOLDER_VIEW_STYLE,
        SETTINGS_NB_COLUMNS,
        SETTINGS_NB_COLUMNS_LANDSCAPE,
        SETTINGS_SORT_ORDER,
        SETTINGS_TRASH_ENABLED,
        SETTINGS_VIEW_STYLE,
        SHEET_SOFT_INPUT_MODE
    } from '~/utils/constants';
    import {
        deleteDocumentsWithConfirm,
        deleteOriginalImages,
        detectOCR,
        goToDocumentView,
        goToFolderView,
        hideLoading,
        importAndScanImage,
        onAndroidNewItent,
        onBackButton,
        pickFolderColor,
        promptForText,
        showImagePopoverMenu,
        showPDFPopoverMenu,
        showPopoverMenu,
        showSettings,
        transformPages,
        tryCatchFunction
    } from '~/utils/ui';
    import { sortByKey } from '~/utils/utils.common';
    import { actionBarHeight, colors, folderBackgroundColor, fontScale, fonts, isLandscape, onFolderBackgroundColorChanged, onFontScaleChanged, startOnCam, windowInset } from '~/variables';

    const textPaint = new Paint();

    export interface Item {
        type?: string;
        doc?: OCRDocument;
        folder?: DocFolder;
        selected: boolean;
        startingSide?: string;
        position?: RowPosition;
    }
</script>

<script lang="ts">
    // technique for only specific properties to get updated on store change
    let {
        colorError,
        colorOnBackground,
        colorOnSurfaceVariant,
        colorOutline,
        colorPrimary,
        colorPrimaryContainer,
        colorSurface,
        colorSurfaceContainerHigh,
        colorSurfaceContainerLow,
        colorSurfaceContainerLowest
    } = $colors;
    $: ({
        colorError,
        colorOnBackground,
        colorOnSurfaceVariant,
        colorOutline,
        colorPrimary,
        colorPrimaryContainer,
        colorSurface,
        colorSurfaceContainerHigh,
        colorSurfaceContainerLow,
        colorSurfaceContainerLowest
    } = $colors);

    let folders: DocFolder[] = [];
    export let collectionViewOptions = {};
    export let contentPadding = 0;
    $: folderMargin = Math.max(0, 16 - contentPadding);
    export let documents: ObservableArray<Item> = null;
    export let folderItems: ObservableArray<Item> = null;
    let nbDocuments: number = 0;
    let showNoDocument = false;
    let mounted = false;
    let page: NativeViewElementNode<Page>;
    export let collectionView: NativeViewElementNode<CollectionView>;
    let foldersCollectionView: NativeViewElementNode<CollectionView>;
    // let lottieView: NativeViewElementNode<LottieView>;
    export let fabHolder: NativeViewElementNode<StackLayout> = null;
    let searchTimer: ReturnType<typeof setTimeout>;
    let appBar: NativeViewElementNode<AppBar>;

    export let folder: DocFolder = null;
    export let title: string;
    export let modal: boolean = false;
    // iOS has no FAB: `primary` goes to the bottom toolbar, the others to the "+" menu of the bar
    export let actions: { text: string; icon: string; primary?: boolean; onTap: () => void }[] = [];
    export let itemTemplateSelector = (viewStyle, item?: Item) => item?.type || 'default';
    export let viewStyles: { [k: string]: { name: string; icon?: string; type?: string; boxType?: string } };
    export let folderViewStyles: { [k: string]: { name: string; icon?: string; type?: string; boxType?: string } } = {};
    export let sortKeys: { [k: string]: { name: string; icon?: string; type?: string; key?: string } } = {
        name: { name: lc('name') },
        createdDate: { name: lc('date') },
        useCount: { name: lc('most_used') }
    };
    export let onlyForImport = false;
    export let isTrash = false;
    export let viewStyleChanged = (oldValue, newValue) => newValue !== oldValue;
    export let folderViewStyleChanged = (oldValue, newValue) => newValue !== oldValue;
    export let sortOrder = ApplicationSettings.getString(SETTINGS_SORT_ORDER, DEFAULT_SORT_ORDER);
    export let syncEnabled = syncService.enabled;
    export let viewStyle: string = ApplicationSettings.getString(SETTINGS_VIEW_STYLE, DEFAULT_VIEW_STYLE);
    export let folderViewStyle: string = ApplicationSettings.getString(SETTINGS_FOLDER_VIEW_STYLE, DEFAULT_FOLDER_VIEW_STYLE);

    export const getSyncColors = (item: Item) => {
        const synced = item.doc._synced;
        const result = [];
        $syncServicesStore.forEach((d) => {
            const mask = SERVICES_SYNC_MASK[d.type];
            const color = d.color || SERVICES_SYNC_COLOR[d.type];
            if (synced === 1 || (synced & mask) !== 0) {
                result.push(color);
            }
        });
        return result;
    };

    $: if ($syncServicesStore) {
        syncEnabled = syncService.enabled;
    }
    $: updateTitle(folder);

    export let updateTitle = (folder) => {
        if (folder && __IOS__) {
            title = folder.name;
        } else if (folder) {
            // DEV_LOG && console.log('updateTitle', $fontScale, folder);
            title = createNativeAttributedString(
                {
                    spans: [
                        {
                            fontFamily: $fonts.mdi,
                            color: folder.color || colorOutline,
                            fontSize: 24 * $fontScale,
                            text: 'mdi-folder'
                        },
                        {
                            text: '  ' + folder.name
                        }
                    ]
                },
                undefined,
                undefined,
                undefined,
                undefined,
                1,
                true // needed as will be used in a label
            );
            // DEV_LOG && console.log('updating folder title', folder, $fonts.mdi, title);
        }
    };

    let syncRunning = false;
    $: DEV_LOG && console.log('syncEnabled', syncEnabled);
    const trashEnabled = ApplicationSettings.getBoolean(SETTINGS_TRASH_ENABLED, DEFAULT_TRASH_ENABLED);

    let lastRefreshFilter = null;
    let showSearch = false;
    let loading = false;
    export let nbSelected = 0;
    // read by the cells, which are not children of this component: the list of the current page, not a global
    export let selectionMode: Writable<boolean> = writable(false);
    $: selectionMode.set(nbSelected > 0);
    // iOS cells do not lay out again when their content changes: the visible ones are bound again to leave or enter selection mode
    let wasSelecting = false;
    $: if (__IOS__ && wasSelecting !== nbSelected > 0) {
        wasSelecting = nbSelected > 0;
        setTimeout(() => refreshVisibleItems());
    }
    let editingTitle = false;
    export let nbColumns = writable(1);
    export let updateColumns = function (isLandscape, orientationChanged: boolean = false) {
        $nbColumns = isLandscape ? ApplicationSettings.getNumber(SETTINGS_NB_COLUMNS_LANDSCAPE, DEFAULT_NB_COLUMNS_LANDSCAPE) : ApplicationSettings.getNumber(SETTINGS_NB_COLUMNS, DEFAULT_NB_COLUMNS);
    };
    $: if (mounted) updateColumns($isLandscape, true);
    $: colWidth = 100 / $nbColumns + '%';
    // $: DEV_LOG && console.log('nbColumns', nbColumns);
    // $: DEV_LOG && console.log('colWidth', colWidth);

    prefs.on(`key:${SETTINGS_NB_COLUMNS}`, () => updateColumns($isLandscape));
    prefs.on(`key:${SETTINGS_NB_COLUMNS_LANDSCAPE}`, () => updateColumns($isLandscape));

    // Animate FAB visibility when selection changes
    $: if (fabHolder?.nativeView) {
        fabHolder.nativeView.animate({
            opacity: nbSelected > 0 ? 0 : 1,
            duration: 200
        });
    }

    // rows are grouped: the first and last of a run have the outer corners. After an item is inserted or removed in place at `index`,
    // only the rows next to it can change place: those are bound again, the others are left alone
    function updatePositions(index?: number) {
        if (documents) {
            const getItem = (position: number) => documents.getItem(position);
            const changed = index === undefined ? updateRowPositions(getItem, documents.length) : updateRowPositions(getItem, documents.length, index - 1, index + 1);
            changed.forEach((position) => documents.setItem(position, documents.getItem(position)));
        }
    }

    export async function refresh(force = true, filter?: string) {
        // if (!shown) {
        //     needsRefreshOnBack = true;
        //     return;
        // }
        // DEV_LOG && console.log('refresh', force, filter);
        if (loading || (!force && lastRefreshFilter === filter) || !documentsService.started) {
            return;
        }
        // DEV_LOG && console.log('refresh1', force, filter);
        lastRefreshFilter = filter;
        nbSelected = 0;
        loading = true;
        try {
            // DEV_LOG && console.log('MainList', 'refresh', folder, filter, sortOrder);
            let r;
            if (isTrash) {
                r = await documentsService.documentRepository.findTrashedDocuments();
            } else {
                r = await documentsService.documentRepository.findDocuments({ filter, folder, omitThoseWithFolders: true, order: sortOrder });
                await refreshFolders(filter);
            }
            const items: Item[] = (!isTrash && folderItems.length ? (folderViewStyle === 'vertical' ? [...folderItems] : [{ type: 'folders', selected: false }]) : []).concat(
                r.map((doc) => ({ doc, selected: false }) as Item)
            );
            updateRowPositions((index) => items[index], items.length);
            documents = new ObservableArray(items);
            // DEV_LOG &&
            //     console.log(
            //         'documents',
            //         documents.map((d) => d.doc?.id)
            //     );
            updateNoDocument();
        } catch (error) {
            showError(error);
        } finally {
            loading = false;
        }
    }

    const refreshFolders = tryCatchFunction(async (filter: string = lastRefreshFilter) => {
        try {
            folders = filter?.length ? [] : await documentsService.folderRepository.findFolders(folder);
            // DEV_LOG && console.log('folders', JSON.stringify(folders));
            folderItems = new ObservableArray(
                folders
                    .filter((f) => f.count > 0)
                    .map(
                        (folder) =>
                            ({
                                folder,
                                type: 'folder',
                                selected: false
                            }) as any
                    )
            );
            if (documents) {
                if (folderViewStyle === 'horizontal') {
                    if (folderItems.length) {
                        if (documents.getItem(0)?.type !== 'folders') {
                            documents.splice(0, 0, { type: 'folders', selected: false });
                        } else {
                            documents.splice(0, 1, { type: 'folders', selected: false });
                        }
                    } else {
                        if (documents.getItem(0)?.type === 'folders') {
                            documents.splice(0, 1);
                        }
                    }
                } else {
                    const firstDocIndex = documents.findIndex((d) => !!d.doc);
                    if (firstDocIndex !== -1) {
                        documents.splice(0, firstDocIndex, ...folderItems);
                    } else {
                        documents.splice(0, documents.length, ...folderItems);
                    }
                }
                updatePositions();
            }
        } catch (error) {
            showError(error);
        }
    });
    const refreshSimple = () => refresh();
    const refreshThrottle = debounce(refresh, 300);

    function updateNoDocument() {
        nbDocuments = documents?.length ?? 0;
        showNoDocument = nbDocuments === 0;
    }
    async function insertDocumentAtSortedIndex(event: DocumentAddedEventData) {
        try {
            if (!documents) {
                await refresh();
                return;
            }

            // Keep same query shape as refresh, but try to request only ids
            const ordered = await documentsService.documentRepository.findDocuments({
                filter: lastRefreshFilter,
                folder,
                omitThoseWithFolders: true,
                order: sortOrder,
                fields: ['id'] // ignored if repository does not support projection
            } as any);

            const orderedIds = ordered.map((d) => d.id);
            const sortedDocIndex = orderedIds.indexOf(event.doc.id);

            // Not in current filtered/sorted view => do not insert
            if (sortedDocIndex === -1) {
                updateNoDocument();
                return;
            }

            // Remove duplicate if already present
            const existingIndex = documents.findIndex((d) => d.doc?.id === event.doc.id);
            if (existingIndex !== -1) {
                documents.splice(existingIndex, 1);
                updatePositions(existingIndex);
            }

            // Find where documents start (works for both vertical/horizontal folder styles)
            const firstDocIndex = documents.findIndex((d) => !!d.doc);
            const docsStartIndex = firstDocIndex === -1 ? documents.length : firstDocIndex;

            const insertIndex = docsStartIndex + sortedDocIndex;
            documents.splice(insertIndex, 0, {
                doc: event.doc,
                selected: false
            } as Item);
            updatePositions(insertIndex);

            if (event.shouldFocus) {
                collectionView?.nativeElement?.scrollToIndex(insertIndex, false);
            }

            updateNoDocument();
        } catch (error) {
            showError(error);
            // fallback to full refresh if anything goes wrong
            refresh();
        }
    }

    function onDocumentAdded(event: DocumentAddedEventData) {
        // DEV_LOG && console.log('onDocumentAdded', event.doc.id, event.doc.folders, event.folder);
        if ((!event.folder && !folder) || folder?.name === event.folder?.name) {
            void insertDocumentAtSortedIndex(event);
        } else if (!folder && event.folder) {
            refreshFolders();
        }
    }

    function onDocumentMovedFolder(event: DocumentMovedFolderEventData) {
        // TODO: for now we refresh otherwise the order might be lost
        // DEV_LOG && console.log('onDocumentMovedFolder', folder?.id, event.folder?.id, event.oldFolderId, !!folder, folder?.id === event.oldFolderId, typeof folder?.id, typeof event.oldFolderId);
        if (!folder && (!event.folder || !event.oldFolderId)) {
            refresh();
        } else if (!!folder && (folder.id === event.folder?.id || folder.id === event.oldFolderId)) {
            refresh();
        }
    }

    function onDocumentUpdated(event: DocumentUpdatedEventData) {
        let index = -1;
        const doc = event.doc;
        documents?.some((d, i) => {
            if (d.doc && d.doc.id === doc.id) {
                index = i;
                return true;
            }
        });
        DEV_LOG && console.log('onDocumentUpdated', doc._synced, doc.id, index, doc.folders, doc.pages.length);
        if (index >= 0) {
            if (folder && doc.folders && doc.folders.indexOf(folder.id) === -1) {
                documents.splice(index, 1);
                updatePositions(index);
            } else {
                const item = documents?.getItem(index);
                if (item) {
                    // DEV_LOG && console.log('onDocumentUpdated1', [...event.changedProps], sortOrder, event.changedProps.has('name'), sortOrder.startsWith('name'));
                    if (event.changedProps.has('favorite') || (event.changedProps.has('name') && sortOrder.startsWith('name'))) {
                        refresh();
                    } else {
                        item.doc = event.doc;
                        documents.setItem(index, item);
                    }
                }
            }
            refreshFolders();
        }
    }
    function onFolderAdded(event: DocumentFolderAddedEventData) {
        // DEV_LOG && console.log('onFolderAdded', event.folder);
        refreshFolders();
    }
    function onFolderUpdated(event: FolderUpdatedEventData) {
        // DEV_LOG && console.log('onFolderUpdated', event.folder);
        refreshFolders();
    }
    function onFolderDeleted(event: FolderDeletedEventData) {
        if (folder && event.folders.some((deletedFolder) => deletedFolder.id === folder.id)) {
            actionBarOnGoBack();
            return;
        }
        // documents kept out of the deleted folders are unfiled now: the whole list must be rebuilt
        refresh();
    }
    async function onDocumentsDeleted(event: DocumentDeletedEventData) {
        // DEV_LOG &&
        //     console.log(
        //         'onDocumentsDeleted',
        //         event.documents.map((d) => d.id),
        //         event.folders
        //     );
        for (let i = 0; i < event.documents.length; i++) {
            const id = event.documents[i].id;
            const index = documents.findIndex((item) => item.doc && item.doc.id === id);
            if (index !== -1) {
                documents.splice(index, 1);
                updatePositions(index);
                if (nbSelected > 0) {
                    nbSelected = Math.max(nbSelected - 1, 0);
                }
            }
        }
        if (!isTrash) {
            refreshFolders();
        }
        updateNoDocument();
    }
    function getImageView(index: number) {
        const view = collectionView?.nativeView?.getViewForItemAtIndex(index);
        return view?.getViewById<Img>('imageView');
    }

    function onDocumentPageUpdated(event: DocumentPageUpdatedEventData) {
        // let index = -1;
        const document = event.doc;
        const index = documents?.findIndex((d) => d.doc && d.doc.id === document.id);
        if (index >= 0) {
            if (event.pageIndex === 0) {
                if (!!event.imageUpdated) {
                    const imageView = getImageView(index);
                    // DEV_LOG && console.log('list onDocumentPageUpdated image clean', index, imageView);
                    // const page = document.pages[event.pageIndex];
                    if (imageView) {
                        imageView?.updateImageUri();
                    } else if (__IOS__) {
                        collectionView?.nativeElement?.refreshVisibleItems();
                    }
                }
            }
            const item = documents?.getItem(index);
            if (item) {
                item.doc = document;
                documents.setItem(index, item);
            }
        }
    }
    function onSyncState(event: EventData & { state: 'running' | 'finished' }) {
        syncRunning = event.state === 'running';
    }

    function onSnackMessageAnimation({ animationArgs }: EventData & { animationArgs: AnimationDefinition[] }) {
        if (fabHolder) {
            const snackAnimation = animationArgs[0];
            animationArgs.push({
                duration: snackAnimation.duration,
                target: fabHolder.nativeView,
                translate: { x: 0, y: snackAnimation.translate.y === 0 ? -70 : 0 }
            });
        }
    }

    function onWindowCommand(event: EventData & { commandId: string }) {
        if (Frame.topmost()?.currentPage !== page?.nativeView) {
            return;
        }
        if (event.commandId === 'search') {
            appBar?.nativeView?.focusSearch();
        } else if (event.commandId === 'preferences') {
            openPreferences();
        }
    }

    onMount(() => {
        mounted = true;
        if (__IOS__) {
            Application.on(windowCommandEvent, onWindowCommand);
        }
        // DEV_LOG && console.log('MainList', 'onMount', documentsService.id, viewStyle);
        updateColumns($isLandscape);
        Application.on('snackMessageAnimation', onSnackMessageAnimation);
        if (__ANDROID__) {
            Application.android.on(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
        if (!isTrash) {
            if (__ANDROID__) {
                Application.android.on(Application.android.activityNewIntentEvent, onAndroidNewItent);
                const intent = Application.android['startIntent'];
                if (intent) {
                    onAndroidNewItent({ intent } as any);
                }
            }
            documentsService.on(EVENT_DOCUMENT_PAGE_UPDATED, onDocumentPageUpdated);
            documentsService.on(EVENT_DOCUMENT_PAGE_DELETED, onDocumentPageUpdated);
            documentsService.on(EVENT_DOCUMENT_ADDED, onDocumentAdded);
            documentsService.on(EVENT_DOCUMENT_UPDATED, onDocumentUpdated);
            documentsService.on(EVENT_DOCUMENT_MOVED_FOLDER, onDocumentMovedFolder);
            documentsService.on(EVENT_DOCUMENT_TRASHED, refreshSimple);
            documentsService.on(EVENT_DOCUMENT_RESTORED, refreshSimple);
            documentsService.on(EVENT_FOLDER_ADDED, onFolderAdded);
            documentsService.on(EVENT_FOLDER_UPDATED, onFolderUpdated);
            documentsService.on(EVENT_FOLDER_DELETED, onFolderDeleted);
            syncService.on(EVENT_SYNC_STATE, onSyncState);
            syncService.on(EVENT_STATE, refreshSimple);
        }
        documentsService.on(EVENT_DOCUMENT_DELETED, onDocumentsDeleted);
    });
    onDestroy(() => {
        DEV_LOG && console.log('MainList', 'onDestroy');
        if (__IOS__) {
            Application.off(windowCommandEvent, onWindowCommand);
        }
        Application.off('snackMessageAnimation', onSnackMessageAnimation);
        if (__ANDROID__) {
            Application.android.off(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
        if (!isTrash) {
            if (__ANDROID__) {
                Application.android.off(Application.android.activityNewIntentEvent, onAndroidNewItent);
            }
            documentsService.off(EVENT_DOCUMENT_PAGE_UPDATED, onDocumentPageUpdated);
            documentsService.off(EVENT_DOCUMENT_PAGE_DELETED, onDocumentPageUpdated);
            documentsService.off(EVENT_DOCUMENT_UPDATED, onDocumentUpdated);
            documentsService.off(EVENT_DOCUMENT_ADDED, onDocumentAdded);
            documentsService.off(EVENT_DOCUMENT_MOVED_FOLDER, onDocumentMovedFolder);
            documentsService.off(EVENT_DOCUMENT_TRASHED, refreshSimple);
            documentsService.off(EVENT_DOCUMENT_RESTORED, refreshSimple);
            documentsService.off(EVENT_FOLDER_ADDED, onFolderAdded);
            documentsService.off(EVENT_FOLDER_UPDATED, onFolderUpdated);
            documentsService.off(EVENT_FOLDER_DELETED, onFolderDeleted);
            syncService.off(EVENT_SYNC_STATE, onSyncState);
            syncService.off(EVENT_STATE, refreshSimple);
        }
        documentsService.off(EVENT_DOCUMENT_DELETED, onDocumentsDeleted);
    });

    export let showActionButton = !startOnCam;

    export async function importDocument(importPDFs = true) {
        DEV_LOG && console.log('importDocument', importPDFs);
        try {
            await importAndScanImage({ folder, importPDFs });
        } catch (error) {
            showError(error);
        }
    }
    export async function importImages() {
        DEV_LOG && console.log('importImages');
        try {
            await importAndScanImage({ folder, importPDFs: false, forceGalleryPick: true });
        } catch (error) {
            showError(error);
        }
    }
    // let shown = false;
    async function onNavigatedTo(e: NavigatedData) {
        // shown = true;
        DEV_LOG && console.log('onNavigatedTo', e.isBackNavigation, sortOrder);
        if (!e.isBackNavigation) {
            if (documentsService.started) {
                refresh();
            } else {
                documentsService.once('started', refreshSimple);
            }
        } else if (sortOrder.startsWith('useCount')) {
            refresh();
        }
    }
    function onNavigatingFrom() {
        // shown = false;
    }
    function selectItem(item: Item) {
        if (!item.selected) {
            if (item.folder) {
                if (folderViewStyle === 'horizontal') {
                    folderItems?.some((d, index) => {
                        if (d.folder === item.folder) {
                            nbSelected += d.folder.count;
                            d.selected = true;
                            folderItems.setItem(index, d);
                            return true;
                        }
                    });
                } else {
                    documents?.some((d, index) => {
                        if (d.folder === item.folder) {
                            nbSelected += 1;
                            d.selected = true;
                            documents.setItem(index, d);
                            return true;
                        }
                    });
                }
            } else {
                documents?.some((d, index) => {
                    if (d === item) {
                        nbSelected += 1;
                        d.selected = true;
                        documents.setItem(index, d);
                        return true;
                    }
                });
            }
        }
    }

    function unselectItem(item: Item) {
        // DEV_LOG && console.log('unselectItem', item);
        if (item.selected) {
            if (item.folder) {
                if (folderViewStyle === 'horizontal') {
                    folderItems?.some((d, index) => {
                        if (d.folder === item.folder) {
                            nbSelected -= d.folder.count;
                            d.selected = false;
                            folderItems.setItem(index, d);
                            return true;
                        }
                    });
                } else {
                    documents?.some((d, index) => {
                        if (d.folder === item.folder) {
                            nbSelected -= 1;
                            d.selected = false;
                            documents.setItem(index, d);
                            return true;
                        }
                    });
                }
            } else {
                documents?.some((d, index) => {
                    if (d === item) {
                        nbSelected -= 1;
                        d.selected = false;
                        documents.setItem(index, d);
                        return true;
                    }
                });
            }
        }
    }

    function getTotalNbDocuments() {
        if (folderViewStyle === 'horizontal') {
            return documents.length - 1; // -1 because the first the first item is actually the folders horizontal collectionview
        }
        return documents.length;
    }
    function getTotalNbDocumentsWithFolders() {
        if (folderViewStyle === 'horizontal') {
            return getTotalNbDocuments() + folderItems.length;
        }
        return getTotalNbDocuments();
    }
    function getDocumentsStartIndex() {
        if (folderViewStyle === 'horizontal') {
            return folderItems?.length > 0 ? 1 : 0; // 1 because the first the first item is actually the folders horizontal collectionview
        }
        return 0;
    }
    function unselectAll() {
        nbSelected = 0;
        const startIndex = getDocumentsStartIndex();
        if (documents) {
            documents.splice(startIndex, documents.length - startIndex, ...documents.slice(startIndex).map((i) => ({ ...i, selected: false })));
        }
        if (folderItems) {
            folderItems.splice(0, folderItems.length, ...folderItems.map((i) => ({ ...i, selected: false })));
        }
    }
    function selectAll() {
        let newCount = getTotalNbDocuments(); // -1 because the first
        const startIndex = getDocumentsStartIndex();
        DEV_LOG && console.log('selectAll', documents.length);
        if (documents) {
            documents.splice(startIndex, documents.length - startIndex, ...documents.slice(startIndex).map((i) => ({ ...i, selected: true })));
        }
        if (folderItems) {
            folderItems.splice(
                0,
                folderItems.length,
                ...folderItems.map((i) => {
                    newCount += i.folder.count;
                    return { ...i, selected: true };
                })
            );
        }
        nbSelected = newCount;
    }
    export function onItemLongPress(item: Item, event?) {
        DEV_LOG && console.log('onItemLongPress', !!item.selected, item.folder);
        if (item.selected) {
            unselectItem(item);
        } else {
            selectItem(item);
        }
    }

    export let handleDocumentTap = async (doc: OCRDocument) => {
        await goToDocumentView(doc);
    };
    export let handleFolderTap = async (folder: DocFolder) => {
        await goToFolderView(folder);
    };
    export const onItemTapFast = async function (item: Item) {
        try {
            if (nbSelected > 0) {
                onItemLongPress(item);
            } else if (item.doc) {
                await handleDocumentTap(item.doc);
            } else if (item.folder) {
                await handleFolderTap(item.folder);
            }
        } catch (error) {
            showError(error);
        }
    };
    export const onItemTapThrottled = throttle(onItemTapFast, 500);

    export const onItemTap = async function (item: Item) {
        if (nbSelected > 0) {
            return onItemTapFast(item);
        }
        return onItemTapThrottled(item);
    };

    function onGoBack(data) {
        if (editingTitle) {
            if (data) {
                data.cancel = true;
            }
            editingTitle = false;
        } else if (appBar?.nativeView?.closeSearch()) {
            if (data) {
                data.cancel = true;
            }
        }
    }
    function actionBarOnGoBack() {
        if (modal) {
            closeModal();
        } else if (Frame.topmost().canGoBack()) {
            goBack();
        }
    }
    const onAndroidBackButton = (data: AndroidActivityBackPressedEventData) =>
        onBackButton(page?.nativeView, () => {
            DEV_LOG && console.log('onBackButton');
            if (nbSelected > 0) {
                data.cancel = true;
                unselectAll();
            } else {
                onGoBack(data);
            }
        });

    async function fullscreenSelectedDocuments() {
        const component = (await import('~/components/FullScreenImageViewer.svelte')).default;
        navigate({
            page: component,
            // transition: __ANDROID__ ? SharedTransition.custom(new PageTransition(300, undefined, 10), {}) : undefined,
            props: {
                images: (await getSelectedDocuments()).reduce((acc, doc) => {
                    doc.pages.forEach((page) =>
                        acc.push({
                            image: page.imagePath,
                            // sharedTransitionTag: `document_${doc.id}_${page.id}`,
                            name: doc.name,
                            ...page
                        })
                    );
                    return acc;
                }, []),
                startPageIndex: 0
            }
        });
    }
    function getSelectedItems() {
        const selected: Item[] = [];
        for (let index = 0; index < folderItems.length; index++) {
            const d = folderItems.getItem(index);
            if (d.selected) {
                selected.push(d);
            }
        }
        for (let index = getDocumentsStartIndex(); index < documents.length; index++) {
            const d = documents.getItem(index);
            if (d.selected) {
                selected.push(d);
            }
        }
        return selected;
    }

    export async function getSelectedDocuments() {
        const selected: OCRDocument[] = [];
        if (!documentsService.started) {
            return selected;
        }
        for (let index = getDocumentsStartIndex(); index < documents.length; index++) {
            const d = documents.getItem(index);
            if (d.doc && d.selected) {
                selected.push(d.doc);
            } else if (d.folder && d.selected) {
                selected.push(...(await documentsService.documentRepository.findDocuments({ folder: d.folder })));
            }
        }
        if (folderItems) {
            for (let index = 0; index < folderItems.length; index++) {
                const d = folderItems.getItem(index);
                if (d.folder && d.selected) {
                    selected.push(...(await documentsService.documentRepository.findDocuments({ folder: d.folder })));
                }
            }
        }
        return sortByKey(selected, sortOrder);
    }
    export async function getAllDocuments() {
        const resut: OCRDocument[] = [];
        if (!documentsService.started) {
            return resut;
        }
        for (let index = getDocumentsStartIndex(); index < documents.length; index++) {
            const d = documents.getItem(index);
            if (d.doc) {
                resut.push(d.doc);
            } else if (d.folder) {
                resut.push(...(await documentsService.documentRepository.findDocuments({ folder: d.folder })));
            }
        }
        if (folderItems) {
            for (let index = 0; index < folderItems.length; index++) {
                const d = folderItems.getItem(index);
                if (d.folder) {
                    resut.push(...(await documentsService.documentRepository.findDocuments({ folder: d.folder })));
                }
            }
        }
        return sortByKey(resut, sortOrder);
    }

    // async function loopSelectedDocuments(callback: (d: OCRDocument) => void) {
    //     if (!documentsService.started) {
    //         return;
    //     }
    //     for (let index = getDocumentsStartIndex(); index < documents.length; index++) {
    //         const d = documents.getItem(index);
    //         if (d.doc && d.selected) {
    //             callback(d.doc);
    //         }
    //     }
    //     for (let index = 0; index < folderItems.length; index++) {
    //         const d = folderItems.getItem(index);
    //         if (d.folder && d.selected) {
    //             const docs = await documentsService.documentRepository.findDocuments({ folder: d.folder });
    //             for (let i = 0; i < docs.length; i++) {
    //                 callback(docs[i]);
    //             }
    //         }
    //     }
    // }
    async function getSelectedPagesAndPossibleSingleDocument(): Promise<[{ page: OCRPage; document: OCRDocument }[], OCRDocument, OCRDocument[]]> {
        const selected: { page: OCRPage; document: OCRDocument }[] = [];
        const docs = await getSelectedDocuments();
        docs.forEach((doc) => {
            selected.push(...doc.pages.map((page) => ({ page, document: doc })));
        });

        return [selected, docs.length === 1 ? docs[0] : undefined, docs];
    }
    async function toggleFavoriteSelectedDocuments() {
        const selectedDocs = await getSelectedDocuments();
        const allFavorite = selectedDocs.every((d) => d.favorite === 1);
        const newFavorite = allFavorite ? 0 : 1;
        for (const doc of selectedDocs) {
            await doc.save({ favorite: newFavorite }, false, false);
        }
        unselectAll();
        refresh();
    }
    async function deleteSelectedDocuments() {
        if (nbSelected > 0) {
            try {
                // the trash list only offers "delete permanently"
                return await deleteDocumentsWithConfirm(await getSelectedDocuments());
            } catch (error) {
                showError(error);
            }
        }
    }

    async function deleteSelectedDocumentsPermanently() {
        if (nbSelected > 0) {
            try {
                const result = await confirm({
                    cancelButtonText: lc('cancel'),
                    message: lcp('confirm_delete_permanently', nbSelected),
                    okButtonText: lc('delete_permanently'),
                    title: lc('delete_permanently')
                });
                if (result) {
                    await documentsService.deleteDocuments(await getSelectedDocuments());
                    return true;
                }
                return false;
            } catch (error) {
                showError(error);
            }
        }
    }

    async function restoreSelectedDocuments() {
        if (nbSelected > 0) {
            try {
                await documentsService.restoreDocuments(await getSelectedDocuments());
                return true;
            } catch (error) {
                showError(error);
            }
        }
    }

    function selectViewStyle(id: string) {
        const changed = viewStyleChanged(id, viewStyle);
        viewStyle = id;
        ApplicationSettings.setString(SETTINGS_VIEW_STYLE, viewStyle);
        updateColumns($isLandscape);
        if (changed) {
            collectionView?.nativeView.refresh();
        }
    }
    function selectFolderViewStyle(id: string) {
        const changed = folderViewStyleChanged(id, folderViewStyle);
        folderViewStyle = id;
        ApplicationSettings.setString(SETTINGS_FOLDER_VIEW_STYLE, folderViewStyle);
        if (changed) {
            refresh();
        }
    }
    function selectSortKey(id: string) {
        if (id === 'useCount') {
            // Most-used is always descending (most used first)
            sortOrder = 'useCount DESC';
        } else {
            const currentAscending = sortOrder.indexOf('ASC') !== -1;
            sortOrder = `${id} ${currentAscending ? 'ASC' : 'DESC'}`;
        }
        ApplicationSettings.setString(SETTINGS_SORT_ORDER, sortOrder);
        refreshThrottle();
    }
    function toggleAscending() {
        const currentKey = sortOrder.split(' ')[0];
        if (currentKey !== 'useCount') {
            sortOrder = `${currentKey} ${sortOrder.indexOf('ASC') !== -1 ? 'DESC' : 'ASC'}`;
            ApplicationSettings.setString(SETTINGS_SORT_ORDER, sortOrder);
            refreshThrottle();
        }
    }
    function getViewOptionsMenu(currentViewStyle: string, currentFolderViewStyle: string, currentSortOrder: string): MenuItem[] {
        const folderViewStyleKeys = Object.keys(folderViewStyles);
        return [
            { title: lc('view_style'), disabled: true },
            ...Object.keys(viewStyles).map((key) => ({ title: viewStyles[key].name, checked: currentViewStyle === key, onSelect: () => selectViewStyle(key) })),
            ...(folderViewStyleKeys.length > 1
                ? [
                      { separator: true },
                      { title: lc('folder_view_style'), disabled: true },
                      ...folderViewStyleKeys.map((key) => ({ title: folderViewStyles[key].name, checked: currentFolderViewStyle === key, onSelect: () => selectFolderViewStyle(key) }))
                  ]
                : []),
            { separator: true },
            { title: lc('sort'), disabled: true },
            ...Object.keys(sortKeys).map((key) => ({ title: sortKeys[key].name, checked: currentSortOrder.includes(key), onSelect: () => selectSortKey(key) })),
            { title: lc('ascending'), checked: currentSortOrder.indexOf('ASC') !== -1, onSelect: toggleAscending }
        ];
    }
    $: viewOptionsMenu = getViewOptionsMenu(viewStyle, folderViewStyle, sortOrder);

    async function syncDocuments() {
        try {
            if (syncEnabled) {
                await syncService.syncDocuments({ bothWays: true, force: true });
            }
        } catch (error) {
            showError(error);
        }
    }
    export const refreshCollectionView = debounce(() => {
        foldersCollectionView?.nativeView?.refresh();
        collectionView?.nativeView?.refresh();
    }, 10);
    export const refreshVisibleItems = () => {
        foldersCollectionView?.nativeView?.refreshVisibleItems();
        collectionView?.nativeView?.refreshVisibleItems();
    };
    onThemeChanged(() => {
        foldersCollectionView?.nativeView?.refresh();
        collectionView?.nativeView?.refresh();
    });
    onFontScaleChanged(refreshVisibleItems);
    onFolderBackgroundColorChanged(refreshCollectionView);
    syncServicesStore.subscribe(refreshVisibleItems);

    let lottieDarkFColor;
    let lottieLightColor;
    $: {
        if (colorPrimaryContainer) {
            lottieDarkFColor = new Color(colorPrimaryContainer);
            const realTheme = getRealTheme();
            if (realTheme === 'light') {
                lottieLightColor = new Color(colorPrimaryContainer).darken(10);
            } else {
                lottieLightColor = new Color(colorPrimaryContainer).lighten(10);
            }
        }
    }

    function onFolderCanvasDraw(item: Item, { canvas, object }: { canvas: Canvas; object: CanvasView }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const dx = 10;
        const { folder: itemFolder } = item;
        textPaint.color = colorOnBackground;
        const topText = createNativeAttributedString({
            spans: [
                {
                    fontFamily: $fonts.mdi,
                    fontSize: 20 * $fontScale,
                    color: !$folderBackgroundColor && itemFolder.color ? itemFolder.color : colorOutline,
                    lineHeight: 20 * $fontScale,
                    text: 'mdi-folder '
                },
                {
                    fontSize: 16 * $fontScale,
                    fontWeight: 'bold',
                    lineBreak: 'end',
                    lineHeight: 16 * $fontScale,
                    text: folder ? itemFolder.name.replace(folder.name + '/', '') : itemFolder.name
                },
                {
                    fontSize: 14 * $fontScale,
                    color: colorOutline,
                    lineHeight: 20 * $fontScale,
                    text: '\n' + lcp('documents_count', itemFolder.count)
                }
            ]
        });
        canvas.save();
        const staticLayout = new StaticLayout(topText, textPaint, Math.max(0, w - dx), LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
        canvas.translate(dx, h / 2 - staticLayout.getHeight() / 2);
        staticLayout.draw(canvas);
        canvas.restore();
    }

    async function showImageExportPopover(event) {
        const selection = await getSelectedPagesAndPossibleSingleDocument();
        return showImagePopoverMenu(selection[0], event.object, { vertPos: VerticalPosition.ABOVE });
    }

    const contextMenuItems = new WeakMap<View, Item>();

    function findCurrentItem(item: Item) {
        const items = item.folder && folderViewStyle === 'horizontal' ? folderItems : documents;
        return items?.slice().find((current) => (item.folder ? current.folder === item.folder : current.doc === item.doc)) ?? item;
    }

    async function handleContextMenuAction(view: View, item: Item, optionId: string) {
        if (optionId === 'open') {
            return onItemTap(item);
        }
        if (optionId === 'select') {
            return onItemLongPress(item);
        }
        if (!item.selected) {
            unselectAll();
            selectItem(findCurrentItem(item));
        }
        return handleSelectionAction({ object: view }, { id: optionId, name: optionId });
    }

    function getContextMenuItems(view: View) {
        const item = contextMenuItems.get(view);
        if (!item?.doc && !item?.folder) {
            return [];
        }
        const options = getSelectionToolbarOptions().filter((option) => option.id !== 'select_all' && option.id !== 'rename');
        if (!isTrash && (nbSelected === 0 || (nbSelected === 1 && item.selected))) {
            options.splice(options.findIndex((option) => option.id === 'delete') + 1, 0, { icon: 'mdi-rename', id: 'rename', name: lc('rename') });
        }
        return [
            ...(isTrash ? [] : [{ id: 'open', title: lc('open'), icon: appIcon('open') }]),
            { id: 'select', title: lc('select'), icon: appIcon('select') },
            { separator: true },
            ...optionsToMenuItems(options)
        ];
    }

    // right click on Mac Catalyst, long press keeps selecting on the other platforms
    function onCollectionViewItemLoading(event: { view: View; bindingContext: Item }) {
        if (!isCatalyst || !event.bindingContext) {
            return;
        }
        const view = event.view instanceof ProxyViewContainer ? event.view.getChildAt(0) : event.view;
        if (!view) {
            return;
        }
        if (!contextMenuItems.has(view)) {
            setContextMenu(view, {
                items: () => getContextMenuItems(view),
                onSelect: (menuItem) => handleContextMenuAction(view, contextMenuItems.get(view), menuItem.id as string)
            });
        }
        contextMenuItems.set(view, event.bindingContext);
    }

    function getSelectionToolbarOptions() {
        if (isTrash) {
            return [
                { id: 'select_all', name: lc('select_all'), icon: 'mdi-select-all' },
                { icon: 'mdi-restore', id: 'restore', name: lc('restore') },
                { color: colorError, icon: 'mdi-delete-forever', id: 'delete_permanently', name: lc('delete_permanently') }
            ];
        }
        // Main actions that appear in the toolbar (configurable, default 4)
        return [
            { icon: 'mdi-file-pdf-box', id: 'pdf', name: lc('export_pdf') },
            { icon: 'mdi-share-variant', id: 'share', name: lc('share_images') },
            { icon: 'mdi-auto-fix', id: 'transform', name: lc('transform_images') },
            { icon: 'mdi-text-recognition', id: 'ocr', name: lc('ocr_document') },
            { id: 'select_all', name: lc('select_all'), icon: 'mdi-select-all' },
            { color: colorError, icon: 'mdi-delete', id: 'delete', name: lc('delete') },
            ...(nbSelected === 1 ? [{ icon: 'mdi-rename', id: 'rename', name: lc('rename') }] : []),
            { icon: 'mdi-star', id: 'favorite', name: lc('toggle_favorite') },
            { icon: 'mdi-folder-swap', id: 'move_folder', name: lc('move_folder') },
            { icon: 'mdi-fullscreen', id: 'fullscreen', name: lc('show_fullscreen_images') },
            { icon: 'mdi-image-remove', id: 'delete_originals', name: lc('delete_original_images') }
        ];
    }

    async function handleSelectionAction(event, option: OptionType) {
        try {
            let result;
            DEV_LOG && console.log('handleSelectionAction', option.id);
            switch (option.id) {
                case 'pdf':
                    const data = await getSelectedPagesAndPossibleSingleDocument();
                    await showPDFPopoverMenu({ pages: data[0], document: data[1], documents: data[2], anchor: event.object, popoverOptions: { vertPos: VerticalPosition.ABOVE } });
                    break;
                case 'select_all':
                    if (nbSelected === getTotalNbDocumentsWithFolders()) {
                        unselectAll();
                    } else {
                        selectAll();
                    }
                    break;
                case 'rename':
                    const item = getSelectedItems()[0];
                    result = await promptForText({
                        title: lc('rename'),
                        defaultText: (item.doc || item.folder).name,
                        hintText: lc('name')
                    });
                    if (result.result && result.text?.length) {
                        await (item.doc || item.folder).save({
                            name: result.text
                        });
                    }
                    break;
                case 'share':
                    const selection = await getSelectedPagesAndPossibleSingleDocument();
                    result = await showImagePopoverMenu(selection[0], event.object, { vertPos: VerticalPosition.ABOVE });
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'fullscreen':
                    await fullscreenSelectedDocuments();
                    unselectAll();
                    break;
                case 'ocr':
                    result = await detectOCR({ documents: await getSelectedDocuments() });
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'transform':
                    result = await transformPages({ documents: await getSelectedDocuments() });
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'delete_originals':
                    result = await deleteOriginalImages({ documents: await getSelectedDocuments() });
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'delete':
                    result = await deleteSelectedDocuments();
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'restore':
                    result = await restoreSelectedDocuments();
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'delete_permanently':
                    result = await deleteSelectedDocumentsPermanently();
                    if (result) {
                        unselectAll();
                    }
                    break;
                case 'favorite':
                    await toggleFavoriteSelectedDocuments();
                    break;
                case 'move_folder':
                    const selected = await getSelectedDocuments();
                    const MoveToFolderSheet = (await import('~/components/common/MoveToFolderSheet.svelte')).default;
                    const folderName = await showBottomSheet({
                        parent: this,
                        view: MoveToFolderSheet,
                        windowSoftInputMode: SHEET_SOFT_INPUT_MODE,
                        ignoreTopSafeArea: true,
                        props: {
                            folders: (await documentsService.folderRepository.findAllFolders()).filter((f) => f.name !== 'none'),
                            currentFolder: folder
                        }
                    });
                    if (typeof folderName === 'string') {
                        for (let index = 0; index < selected.length; index++) {
                            await selected[index].setFolder({ folderName: folderName || undefined });
                        }
                        unselectAll();
                    }
                    break;
            }
        } catch (error) {
            showError(error);
        }
    }

    async function setFolderColor(event) {
        try {
            const color: string = await pickFolderColor(folder, event);
            if (color) {
                folder = folder; //for svelte to pick up change
            }
        } catch (error) {
            showError(error);
        }
    }
    function itemTemplateSpanSize(item?: Item) {
        // the item can be gone already: a layout pass still asks for positions of the previous data
        if (item?.type === 'folders' || item?.type === 'folder') {
            return $nbColumns;
        }
        return 1;
    }
    const openSyncSettings = tryCatchFunction(async () =>
        showSettings({
            subSettingsOptions: 'sync'
        })
    );

    const openPreferences = tryCatchFunction(async () => {
        const Settings = (await import('~/components/settings/Settings.svelte')).default;
        navigate({ page: Settings });
    });
    const openTrash = tryCatchFunction(async () => {
        const TrashList = (await import('~/components/list/TrashList.svelte')).default;
        navigate({ page: TrashList });
    });
    $: primaryAction = actions.find((action) => action.primary);
    $: secondaryActions = actions.filter((action) => !action.primary);
    $: plusMenu = secondaryActions.map((action) => ({ title: action.text, icon: appIcon(action.icon), onSelect: action.onTap }));
    // the main actions of the selection, in order: the rest goes to the more menu
    function getSelectionActionIds() {
        if (isTrash) {
            return ['select_all', 'restore', 'delete_permanently'];
        }
        return CARD_APP ? (__IOS__ ? ['share', 'favorite', 'move_folder', 'delete'] : ['favorite', 'move_folder', 'delete']) : ['pdf', 'share', 'delete'];
    }
    function splitSelectionOptions(options: OptionType[]) {
        const toolbarIds = getSelectionActionIds();
        return {
            main: toolbarIds.map((id) => options.find((option) => option.id === id)).filter(Boolean),
            more: options.filter((option) => !toolbarIds.includes(option.id))
        };
    }
    const onSelectionAction = (option: OptionType) => handleSelectionAction({ object: collectionView?.nativeView }, option);
    // Android: the actions are in the top bar while selecting, iOS: in the bottom toolbar
    $: selectionOptions = nbSelected > 0 ? splitSelectionOptions(getSelectionToolbarOptions()) : { main: [], more: [] };
    $: selectionMoreMenu = optionsToMenuItems(selectionOptions.more, onSelectionAction);
    function getSelectionBottomItems(options: OptionType[]) {
        if (__ANDROID__) {
            return [];
        }
        const { main, more } = splitSelectionOptions(options);
        const items: any[] = main.flatMap((option) => [{ spacer: true }, { text: option.name, icon: appIcon(option.id), color: option.color, onTap: () => onSelectionAction(option) }]);
        if (more.length) {
            items.push(
                { spacer: true },
                {
                    text: lc('more_options'),
                    icon: appIcon('more'),
                    menu: optionsToMenuItems(more, onSelectionAction)
                }
            );
        }
        return items.concat({ spacer: true });
    }
    $: bottomItems =
        nbSelected > 0
            ? getSelectionBottomItems(getSelectionToolbarOptions())
            : __IOS__ && !isTrash && !onlyForImport
              ? primaryAction
                  ? [{ search: true }, { text: primaryAction.text, icon: appIcon(primaryAction.icon), onTap: primaryAction.onTap }]
                  : [{ search: true }]
              : [];
    let iosMenu: MenuItem[];
    $: iosMenu = [
        { title: lc('view_style'), icon: appIcon('view_style'), items: viewOptionsMenu },
        ...(!isTrash && trashEnabled ? [{ title: lc('open_trash'), icon: appIcon('trash'), onSelect: openTrash }] : [])
    ];
    let optionsMenu: MenuItem[];
    $: optionsMenu = [
        ...(!isTrash && trashEnabled ? [{ title: lc('open_trash'), icon: appIcon('trash'), onSelect: openTrash }] : []),
        { title: lc('preferences'), icon: appIcon('settings'), onSelect: openPreferences }
    ];

    function onSearchChange(event: { text: string }) {
        const query = event.text?.toLowerCase();
        showSearch = !!query;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => refresh(false, query?.length > 1 ? query : undefined), 500);
    }
    function onSearchCancel() {
        clearTimeout(searchTimer);
        showSearch = false;
        refresh(false, undefined);
    }
    let canGoBack = false;
    onMount(() => {
        canGoBack = !!folder || isTrash || !!Frame.topmost()?.canGoBack();
    });

    const emptyTrash = tryCatchFunction(async () => {
        const confirmed = await confirm({
            cancelButtonText: lc('cancel'),
            message: lc('confirm_empty_trash'),
            okButtonText: lc('delete_permanently'),
            title: lc('delete_permanently')
        });
        if (confirmed && isTrash) {
            await documentsService.deleteDocuments(await getAllDocuments());
            return true;
        }
    });
</script>

<appPage bind:this={page} id="documentList" on:navigatedTo={onNavigatedTo} on:navigatingFrom={onNavigatingFrom}>
    <appBar
        bind:this={appBar}
        android:backgroundColor={nbSelected > 0 ? colorPrimaryContainer : undefined}
        scrollBehavior="lift"
        searchable={!isTrash && !onlyForImport && nbSelected === 0}
        scrollTargetId="documentsCollectionView"
        searchHint={lc('search')}
        searchMode="inline"
        searchPlacement="integrated"
        {bottomItems}
        size="small"
        titleAlignment="leading"
        class="listAppBar"
        title={nbSelected > 0 ? lp('selected', nbSelected) : __IOS__ || isTrash ? title : folder?.name}
        on:searchChange={onSearchChange}
        on:searchCancel={onSearchCancel}
    >
        {#if __ANDROID__}
            <appBarSearchField><textfield backgroundColor="transparent" floating={false} fontSize={16} hint={lc('search')} returnKeyType="search" variant="none" /></appBarSearchField>
        {/if}
        {#if (__ANDROID__ && nbSelected > 0) || modal || (__ANDROID__ && canGoBack)}
            <navigationButton {...{ 'android.systemIcon': nbSelected > 0 ? 'ic_menu_close_clear_cancel' : 'ic_menu_back' }} on:tap={nbSelected > 0 ? unselectAll : actionBarOnGoBack} />
        {/if}
        {#if nbSelected === 0}
            {#if isTrash}
                <appBarItem icon={appIcon('empty_trash')} ios.position="right" text={lc('empty_trash')} on:tap={emptyTrash} />
            {:else if !onlyForImport}
                {#if folder}
                    {#if __IOS__ && plusMenu.length > 1}
                        <appBarItem icon={appIcon('add')} ios.position="right" menu={plusMenu} text={lc('add')} />
                    {/if}
                    <appBarItem icon={appIcon('color')} ios.position="right" text={lc('color')} on:tap={setFolderColor} />
                {:else}
                    {#if syncEnabled}
                        <appBarItem icon={appIcon('sync')} ios.position="right" text={lc('sync')} on:tap={syncDocuments} />
                    {/if}
                    {#if __IOS__}
                        {#if plusMenu.length > 1}
                            <appBarItem icon={appIcon('add')} ios.position="right" menu={plusMenu} text={lc('add')} />
                        {:else if plusMenu.length === 1}
                            <appBarItem icon={appIcon('add')} ios.position="right" text={lc('add')} on:tap={secondaryActions[0].onTap} />
                        {/if}
                        <appBarItem icon={appIcon('settings')} ios.position="right" text={lc('preferences')} on:tap={openPreferences} />
                        <appBarItem icon={appIcon('more')} ios.position="right" menu={iosMenu} />
                    {:else}
                        <appBarItem icon={appIcon('view_style')} ios.position="right" menu={viewOptionsMenu} text={lc('view_style')} />
                        <appBarItem icon={appIcon('more')} ios.position="right" menu={optionsMenu} />
                    {/if}
                {/if}
            {/if}
        {:else if __IOS__}
            <appBarItem ios.position="right" prominent={true} text={lc('cancel')} on:tap={unselectAll} />
        {:else}
            {#each selectionOptions.main as option (option.id)}
                <appBarItem icon={appIcon(option.id)} text={option.name} on:tap={() => onSelectionAction(option)} />
            {/each}
            {#if selectionMoreMenu.length}
                <appBarItem icon={appIcon('more')} menu={selectionMoreMenu} />
            {/if}
        {/if}
    </appBar>
    <gridlayout class="pageContent" rows="auto,auto,*">
        <slot name="abovecollectionview" />
        <collectionView
            id="documentsCollectionView"
            bind:this={collectionView}
            {colWidth}
            on:itemLoading={onCollectionViewItemLoading}
            ios:autoReloadItemOnLayout={true}
            itemTemplateSelector={(item) => itemTemplateSelector(viewStyle, item)}
            items={documents}
            paddingBottom={Math.max($windowInset.bottom, BOTTOM_BUTTON_OFFSET)}
            paddingLeft={contentPadding}
            paddingRight={contentPadding}
            row={2}
            spanSize={itemTemplateSpanSize}
            {...collectionViewOptions}
        >
            <Template key="folder" let:item>
                {#if CARD_APP}
                    <FolderCell
                        {selectionMode}
                        name={folder ? item.folder.name.replace(folder.name + '/', '') : item.folder.name}
                        {item}
                        marginLeft={folderMargin}
                        marginRight={folderMargin}
                        tile={false}
                        on:longPress={(e) => onItemLongPress(item, e)}
                        on:tap={() => onItemTap(item)}
                    />
                {:else}
                    <ListItemAutoSize
                        class="card"
                        columns="auto,*"
                        fontSize={17}
                        fontWeight="600"
                        item={{ ...item, title: folder ? item.folder.name.replace(folder.name + '/', '') : item.folder.name, subtitle: lcp('documents_count', item.folder.count) }}
                        mainCol={1}
                        margin={__IOS__ ? '4 16' : '4 8 4 8'}
                        padding="0 10 0 10"
                        subtitleFontSize={12}
                        useExtraPadding={false}
                        on:longPress={(e) => onItemLongPress(item, e)}
                        on:tap={() => onItemTap(item)}
                    >
                        <label
                            col={0}
                            color={!$folderBackgroundColor && item.folder.color ? item.folder.color : colorOutline}
                            fontFamily={$fonts.mdi}
                            fontSize={24}
                            padding="0 10 0 0"
                            text="mdi-folder "
                            verticalAlignment="center"
                        />
                        <SelectedIndicator col={0} horizontalAlignment="left" margin="10 0 10 0" selected={item.selected} verticalAlignment="top" />
                    </ListItemAutoSize>
                {/if}
            </Template>
            <Template key="folders" let:item>
                <collectionView
                    bind:this={foldersCollectionView}
                    colWidth={CARD_APP ? 140 : 150}
                    height={CARD_APP ? 62 : 70}
                    items={folderItems}
                    orientation="horizontal"
                    paddingLeft={CARD_APP ? Math.max(0, folderMargin - 4) : 0}
                    row={1}
                    visibility={folders?.length ? 'visible' : 'collapsed'}
                    on:itemLoading={onCollectionViewItemLoading}
                >
                    <Template let:item>
                        {#if CARD_APP}
                            <FolderCell
                                {selectionMode}
                                name={folder ? item.folder.name.replace(folder.name + '/', '') : item.folder.name}
                                {item}
                                margin={4}
                                on:longPress={(e) => onItemLongPress(item, e)}
                                on:tap={() => onItemTap(item)}
                            />
                        {:else}
                            <canvasview
                                backgroundColor={($folderBackgroundColor && item.folder.color) || isEInk ? 'transparent' : colorSurfaceContainerLow}
                                borderColor={colorOutline}
                                borderRadius={12}
                                borderWidth={__IOS__ ? 0 : 1}
                                margin={__IOS__ ? '4 16 0 16' : '4 8 0 8'}
                                rippleColor={colorSurface}
                                on:tap={() => onItemTap(item)}
                                on:longPress={(e) => onItemLongPress(item, e)}
                                on:draw={(e) => onFolderCanvasDraw(item, e)}
                            >
                                <SelectedIndicator horizontalAlignment="right" margin={10} selected={item.selected} verticalAlignment="top" />
                                <!-- <SyncIndicator synced={item.doc._synced} visible={syncEnabled} /> -->
                                <!-- <PageIndicator horizontalAlignment="right" margin={10} text={item.doc.pages.length} /> -->
                            </canvasview>
                        {/if}
                    </Template>
                </collectionView>
            </Template>
            <slot />
        </collectionView>
        <progress backgroundColor="transparent" busy={true} indeterminate={true} row={2} verticalAlignment="top" visibility={loading ? 'visible' : 'hidden'} />
        {#if showNoDocument && CARD_APP && !isTrash && !(lastRefreshFilter && showSearch)}
            <CardsEmpty marginBottom="15%" onScan={() => actions.find((action) => action.primary)?.onTap()} row={2} verticalAlignment="center" />
        {:else if showNoDocument}
            <flexlayout
                flexDirection="column"
                horizontalAlignment="center"
                marginBottom={isTrash ? 0 : '30%'}
                paddingLeft={16}
                paddingRight={16}
                row={2}
                verticalAlignment="center"
                width="80%"
                transition:fade={{ duration: 200 }}
            >
                <lottie
                    async={true}
                    autoPlay={PRODUCTION}
                    flexShrink={2}
                    keyPathColors={{
                        'background|**': lottieDarkFColor,
                        'full|**': lottieLightColor,
                        'lines|**': lottieDarkFColor,
                        'scanner|**': lottieLightColor
                    }}
                    loop={true}
                    src="~/assets/lottie/scanning.lottie"
                    visibility={isTrash ? 'collapsed' : 'visible'}
                />
                <label
                    color={colorOnSurfaceVariant}
                    flexShrink={0}
                    fontSize={19}
                    text={lastRefreshFilter && showSearch ? lc('no_document_found') : isTrash ? lc('no_trashed_document') : lc('no_document_yet')}
                    textAlignment="center"
                    textWrap={true}
                />
            </flexlayout>
        {/if}
        {#if !onlyForImport && editingTitle}
            <EditNameActionBar {folder} onRenameSuccessful={() => (folder = folder)} bind:editingTitle />
        {/if}
    </gridlayout>
    <appPageOverlay>
        {#if showActionButton && !__IOS__}
            <slot name="fab" />
        {/if}
    </appPageOverlay>
</appPage>
