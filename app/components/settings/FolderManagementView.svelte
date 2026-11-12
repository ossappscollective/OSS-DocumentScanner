<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { confirm } from '@nativescript-community/ui-dialogs';
    import { ApplicationSettings, ObservableArray } from '@nativescript/core';
    import { readable } from 'svelte/store';
    import type { MenuItem } from '@nativescript-community/ui-menu';
    import { OptionType } from '@shared/components/OptionSelect.svelte';
    import { showError } from '@shared/utils/showError';
    import { showSnack } from '@shared/utils/ui';
    import { goBack } from '@shared/utils/svelte/ui';
    import FolderCell from '~/components/list/FolderCell.svelte';
    import type { Item } from '~/components/list/MainList.svelte';
    import { lc, lcp } from '~/helpers/locale';
    import { onThemeChanged } from '~/helpers/theme';
    import { DocFolder } from '~/models/OCRDocument';
    import { documentsService } from '~/services/documents';
    import { collectFoldersToDelete, filterEmptyFolders } from '~/services/folderUtils';
    import { appIcon } from '~/utils/appIcons';
    import { DEFAULT_TRASH_ENABLED, SETTINGS_TRASH_ENABLED } from '~/utils/constants';
    import { updateRowPositions } from '~/utils/groupedRows';
    import { colors, windowInset } from '~/variables';

    // every row shows its marker: a tap selects
    const selectionMode = readable(true);
</script>

<script lang="ts">
    $: ({ colorError, colorOnBackground, colorPrimaryContainer } = $colors);

    let collectionView: NativeViewElementNode<CollectionView>;
    let items: ObservableArray<Item> = new ObservableArray([]);
    let nbSelected: number = 0;

    async function refresh() {
        try {
            const folders = await documentsService.folderRepository.findAllFolders();
            nbSelected = 0;
            const newItems: Item[] = folders.map((folder) => ({ folder, selected: false }));
            updateRowPositions((index) => newItems[index], newItems.length);
            items = new ObservableArray(newItems);
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
            { id: 'select_all', name: lc('select_all') },
            { id: 'delete', name: lc('delete'), color: colorError }
        ];
    }
    async function handleSelectionAction(option: OptionType) {
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

    async function deleteEmptyFolders() {
        try {
            const emptyFolders = filterEmptyFolders(getAllFolders());
            if (!emptyFolders.length) {
                showSnack({ message: lc('no_empty_folder') });
                return;
            }
            await deleteFolders(emptyFolders);
        } catch (error) {
            showError(error);
        }
    }
    const optionsMenu: MenuItem[] = [{ title: lc('delete_empty_folders'), icon: appIcon('delete'), onSelect: deleteEmptyFolders }];
    // Android: the actions are in the top bar while selecting, iOS: in the bottom toolbar
    $: selectionOptions = nbSelected > 0 ? getSelectionToolbarOptions() : [];
    $: bottomItems = __IOS__ ? selectionOptions.flatMap((option) => [{ spacer: true }, { text: option.name, icon: appIcon(option.id), color: option.color, onTap: () => handleSelectionAction(option) }]) : [];

    function refreshCollectionView() {
        collectionView?.nativeView?.refresh();
    }
    onThemeChanged(refreshCollectionView);

    refresh();
</script>

<appPage id="folderManagementView">
    <appBar
        android:backgroundColor={nbSelected > 0 ? colorPrimaryContainer : undefined}
        {bottomItems}
        color={colorOnBackground}
        iosIconRenderingMode="alwaysTemplate"
        scrollBehavior="lift"
        scrollTargetId="folderCollectionView"
        size="small"
        title={nbSelected > 0 ? lcp('selected', nbSelected) : lc('manage_folders')}
        titleAlignment="leading"
        ios:translucent={true}>
        {#if __ANDROID__}
            <navigationButton {...{ 'android.systemIcon': nbSelected > 0 ? 'ic_menu_close_clear_cancel' : 'ic_menu_back' }} on:tap={nbSelected > 0 ? unselectAll : () => goBack()} />
        {/if}
        {#if nbSelected === 0}
            <appBarItem icon={appIcon('more')} ios.position="right" menu={optionsMenu} />
        {:else if __IOS__}
            <appBarItem ios.position="right" prominent={true} text={lc('cancel')} on:tap={unselectAll} />
        {:else}
            {#each selectionOptions as option (option.id)}
                <appBarItem icon={appIcon(option.id)} text={option.name} on:tap={() => handleSelectionAction(option)} />
            {/each}
        {/if}
    </appBar>
    <gridlayout class="pageContent" rows="*">
        <collectionview id="folderCollectionView" bind:this={collectionView} {items} android:paddingBottom={$windowInset.bottom}>
            <Template let:item>
                <FolderCell {selectionMode} {item} marginLeft={16} marginRight={16} name={item.folder.name} tile={false} on:tap={() => onItemTap(item)} />
            </Template>
        </collectionview>
        <label horizontalAlignment="center" text={lc('no_folder')} verticalAlignment="middle" visibility={items.length ? 'collapse' : 'visible'} />
    </gridlayout>
</appPage>
