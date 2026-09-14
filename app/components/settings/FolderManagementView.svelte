<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { confirm } from '@nativescript-community/ui-material-dialogs';
    import { VerticalPosition } from '@nativescript-community/ui-popover';
    import { ApplicationSettings, ObservableArray } from '@nativescript/core';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import { OptionType } from '@shared/components/OptionSelect.svelte';
    import { showError } from '@shared/utils/showError';
    import { showSnack } from '@shared/utils/ui';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import SelectedIndicator from '~/components/common/SelectedIndicator.svelte';
    import SelectionToolbar from '~/components/common/SelectionToolbar.svelte';
    import { lc, lcp } from '~/helpers/locale';
    import { isEInk, onThemeChanged } from '~/helpers/theme';
    import { DocFolder } from '~/models/OCRDocument';
    import { documentsService } from '~/services/documents';
    import { collectFoldersToDelete, filterEmptyFolders } from '~/services/folderUtils';
    import { DEFAULT_TRASH_ENABLED, SETTINGS_TRASH_ENABLED } from '~/utils/constants';
    import { showPopoverMenu } from '~/utils/ui';
    import { colors, fonts, windowInset } from '~/variables';

    interface Item {
        folder: DocFolder;
        selected: boolean;
    }
</script>

<script lang="ts">
    let { colorError, colorOutline } = $colors;
    $: ({ colorError, colorOutline } = $colors);

    let collectionView: NativeViewElementNode<CollectionView>;
    let items: ObservableArray<Item> = new ObservableArray([]);
    let nbSelected: number = 0;

    async function refresh() {
        try {
            const folders = await documentsService.folderRepository.findAllFolders();
            nbSelected = 0;
            items = new ObservableArray(folders.map((folder) => ({ folder, selected: false })));
        } catch (error) {
            showError(error);
        }
    }

    function getAllFolders() {
        const folders: DocFolder[] = [];
        items.forEach((item) => folders.push(item.folder));
        return folders;
    }
    function getSelectedFolders() {
        const folders: DocFolder[] = [];
        items.forEach((item) => {
            if (item.selected) {
                folders.push(item.folder);
            }
        });
        return folders;
    }
    function setSelected(item: Item, selected: boolean) {
        if (item.selected === selected) {
            return;
        }
        item.selected = selected;
        nbSelected += selected ? 1 : -1;
        items.setItem(items.indexOf(item), item);
    }
    function unselectAll() {
        items.forEach((item) => setSelected(item, false));
    }
    function selectAll() {
        items.forEach((item) => setSelected(item, true));
    }

    async function getDocumentsInFolders(folders: DocFolder[]) {
        const documents = [];
        const ids = new Set<string>();
        for (let index = 0; index < folders.length; index++) {
            const folderDocuments = await documentsService.documentRepository.findDocuments({ folder: folders[index] });
            folderDocuments.forEach((document) => {
                if (!ids.has(document.id)) {
                    ids.add(document.id);
                    documents.push(document);
                }
            });
        }
        return documents;
    }

    async function deleteFolders(folders: DocFolder[]) {
        if (!folders.length) {
            return;
        }
        // subfolders only exist through their name so they must go with their parent
        const toDelete = collectFoldersToDelete(getAllFolders(), folders);
        const nbDocuments = toDelete.reduce((acc, folder) => acc + (folder.count || 0), 0);
        if (nbDocuments === 0) {
            const confirmed = await confirm({
                cancelButtonText: lc('cancel'),
                message: lcp('confirm_delete_folders', toDelete.length),
                okButtonText: lc('delete'),
                title: lc('delete_folders')
            });
            if (!confirmed) {
                return;
            }
        } else {
            const trashEnabled = ApplicationSettings.getBoolean(SETTINGS_TRASH_ENABLED, DEFAULT_TRASH_ENABLED);
            const result = await confirm({
                cancelButtonText: trashEnabled ? lc('move_to_trash') : lc('delete_permanently'),
                message: lcp('confirm_delete_folders_with_documents', nbDocuments),
                neutralButtonText: lc('cancel'),
                okButtonText: lc('keep_documents'),
                title: lc('delete_folders')
            } as any);
            if (result !== true && result !== false) {
                return;
            }
            if (result === false) {
                const documents = await getDocumentsInFolders(toDelete);
                if (trashEnabled) {
                    await documentsService.trashDocuments(documents);
                } else {
                    await documentsService.deleteDocuments(documents);
                }
            }
        }
        await documentsService.deleteFolders(toDelete);
        await refresh();
        showSnack({ message: lcp('folders_deleted', toDelete.length) });
    }

    function onItemTap(item: Item) {
        setSelected(item, !item.selected);
    }

    function getSelectionToolbarOptions(): OptionType[] {
        return [
            { id: 'select_all', name: lc('select_all'), icon: 'mdi-select-all' },
            { id: 'delete', name: lc('delete'), icon: 'mdi-delete', color: colorError }
        ];
    }
    async function handleSelectionAction(event, option: OptionType) {
        try {
            switch (option.id) {
                case 'select_all':
                    if (nbSelected === items.length) {
                        unselectAll();
                    } else {
                        selectAll();
                    }
                    break;
                case 'delete':
                    await deleteFolders(getSelectedFolders());
                    break;
            }
        } catch (error) {
            showError(error);
        }
    }

    async function showOptions(event) {
        try {
            const options = new ObservableArray([{ id: 'delete_empty_folders', name: lc('delete_empty_folders'), icon: 'mdi-folder-remove' }] as any);
            await showPopoverMenu({
                options,
                anchor: event.object,
                vertPos: VerticalPosition.BELOW,
                onClose: async (option) => {
                    try {
                        if (option.id === 'delete_empty_folders') {
                            const emptyFolders = filterEmptyFolders(getAllFolders());
                            if (!emptyFolders.length) {
                                showSnack({ message: lc('no_empty_folder') });
                                return;
                            }
                            await deleteFolders(emptyFolders);
                        }
                    } catch (error) {
                        showError(error);
                    }
                }
            });
        } catch (error) {
            showError(error);
        }
    }

    function refreshCollectionView() {
        collectionView?.nativeView?.refresh();
    }
    onThemeChanged(refreshCollectionView);

    refresh();
</script>

<page id="folderManagementView" actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,*">
        <collectionview bind:this={collectionView} {items} row={1} android:paddingBottom={$windowInset.bottom}>
            <Template let:item>
                <ListItemAutoSize
                    class="card"
                    borderWidth={isEInk ? 1 : 0}
                    columns="auto,*"
                    fontSize={17}
                    fontWeight="600"
                    item={{ ...item, title: item.folder.name, subtitle: lcp('documents_count', item.folder.count) }}
                    mainCol={1}
                    margin="4 8 4 8"
                    padding="0 10 0 10"
                    subtitleFontSize={12}
                    useExtraPadding={false}
                    on:tap={() => onItemTap(item)}>
                    <label col={0} color={item.folder.color || colorOutline} fontFamily={$fonts.mdi} fontSize={24} padding="0 10 0 0" text="mdi-folder " verticalAlignment="center" />
                    <SelectedIndicator col={0} horizontalAlignment="left" margin="10 0 10 0" selected={item.selected} verticalAlignment="top" />
                </ListItemAutoSize>
            </Template>
        </collectionview>
        <label horizontalAlignment="center" row={1} text={lc('no_folder')} verticalAlignment="middle" visibility={items.length ? 'collapse' : 'visible'} />
        {#if nbSelected > 0}
            <SelectionToolbar onAction={handleSelectionAction} options={getSelectionToolbarOptions()} row={1} />
        {/if}
        <CActionBar canGoBack onGoBack={nbSelected ? unselectAll : null} title={nbSelected ? lcp('selected', nbSelected) : lc('manage_folders')}>
            <mdbutton class="actionBarButton" text="mdi-dots-vertical" variant="text" on:tap={showOptions} />
        </CActionBar>
    </gridlayout>
</page>
