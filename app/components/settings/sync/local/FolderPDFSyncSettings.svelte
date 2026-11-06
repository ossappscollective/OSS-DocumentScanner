<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { showError } from '@shared/utils/showError';
    import { Writable, get } from 'svelte/store';
    import FolderTextView from '~/components/common/FolderTextView.svelte';
    import PDFSyncSettings from '~/components/settings/sync/PDFSyncSettings.svelte';
    import { lc } from '~/helpers/locale';
    import { LocalFolderPDFSyncServiceOptions } from '~/services/sync/local/LocalFolderPDFSyncService';
</script>

<script lang="ts">
    export let data: LocalFolderPDFSyncServiceOptions = {} as any;

    let updateItem;
    let store: Writable<LocalFolderPDFSyncServiceOptions>;

    const topItems = (st: Writable<LocalFolderPDFSyncServiceOptions>) => [
        {
            type: 'sectionHeader',
            title: lc('folder')
        },
        {
            id: 'selectFolder',
            type: 'selectFolder',
            text: get(st).localFolderPath
        }
    ];

    async function validateSave() {
        const result = get(store);

        return !!result.localFolderPath;
    }
    async function onSaveError() {
        showError(lc('missing_export_folder'), { showAsSnack: true });
    }

    async function onFolderSelect(item, event) {
        item.text = $store.localFolderPath = event.text;
        updateItem(item);
    }
</script>

<PDFSyncSettings {data} {onSaveError} serviceType="folder_pdf" {topItems} {validateSave} bind:updateItem bind:store>
    <Template key="selectFolder" let:item>
        <FolderTextView text={item.text} on:folder={(e) => onFolderSelect(item, e)} />
    </Template>
</PDFSyncSettings>
