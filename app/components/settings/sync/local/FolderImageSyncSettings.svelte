<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { showError } from '@shared/utils/showError';
    import { Writable, get } from 'svelte/store';
    import ImageSyncSettings from '~/components/settings/sync/ImageSyncSettings.svelte';
    import { lc } from '~/helpers/locale';
    import { LocalFolderImageSyncServiceOptions } from '~/services/sync/local/LocalFolderImageSyncService';
    import FolderTextView from '~/components/common/FolderTextView.svelte';
</script>

<script lang="ts">
    export let data: LocalFolderImageSyncServiceOptions = {} as any;

    let updateItem;
    let store: Writable<LocalFolderImageSyncServiceOptions>;

    const topItems = (st: Writable<LocalFolderImageSyncServiceOptions>) => [
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

<ImageSyncSettings {data} {onSaveError} serviceType="folder_image" {topItems} {validateSave} bind:updateItem bind:store>
    <Template key="selectFolder" let:item>
        <FolderTextView text={item.text} on:folder={(e) => onFolderSelect(item, e)} />
    </Template>
</ImageSyncSettings>
