<script lang="ts">
    import { showError } from '@shared/utils/showError';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import { lc } from '~/helpers/locale';
    import type { DocFolder } from '~/models/OCRDocument';
    import { documentsService } from '~/services/documents';
    import { ALERT_OPTION_MAX_HEIGHT } from '~/utils/constants';
    import { showAlertOptionSelect } from '~/utils/ui';
    import Chip from '~/components/widgets/Chip.svelte';
    import type { BaseSyncServiceOptions } from '~/services/sync/BaseSyncService';
    import type { Writable } from 'svelte/store';

    export let store: Writable<BaseSyncServiceOptions>;

    let allFolders: DocFolder[] = [];

    async function loadFolders() {
        try {
            allFolders = await documentsService.folderRepository.search();
        } catch (error) {
            showError(error);
        }
    }
    loadFolders();

    $: syncFolders = ($store.syncFolders as number[]) || [];
    $: selectedFolders = allFolders.filter((f) => syncFolders.includes(f.id));
    $: availableFolders = allFolders.filter((f) => !syncFolders.includes(f.id));

    async function addFolder(event) {
        try {
            if (!availableFolders.length) {
                return;
            }
            const result = await showAlertOptionSelect(
                {
                    height: Math.min(availableFolders.length * 56, ALERT_OPTION_MAX_HEIGHT),
                    rowHeight: 56,
                    options: availableFolders.map((f) => ({
                        name: f.name,
                        data: f.id,
                        boxType: 'circle',
                        type: 'checkbox',
                        value: false
                    }))
                },
                {
                    title: lc('add_sync_folder')
                }
            );
            if (result?.data !== undefined) {
                $store.syncFolders = [...syncFolders, result.data];
            }
        } catch (error) {
            showError(error);
        }
    }

    function removeFolder(folderId: number) {
        $store.syncFolders = syncFolders.filter((id) => id !== folderId);
    }
</script>

<ListItemAutoSize item={{ title: lc('sync_folders'), subtitle: lc('sync_folders_desc'), titleProps: { verticalAlignment: 'top' } }} paddingRight={0} rows="auto,auto">
    <uibutton
        class="icon-btn"
        col={1}
        marginTop={6}
        text="mdi-folder-plus-outline"
        variant="text"
        verticalAlignment="center"
        visibility={availableFolders.length > 0 ? 'visible' : 'hidden'}
        on:tap={addFolder}
    />
    <wraplayout row={1}>
        {#each selectedFolders as folder (folder.id)}
            <Chip text={folder.name} on:tap={() => removeFolder(folder.id)} />
        {/each}
    </wraplayout>
</ListItemAutoSize>
