<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { pickFolder } from '@nativescript-community/ui-document-picker';
    import FormTextField from '~/components/common/FormTextField.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';
    import { getDirectoryName } from '~/utils/ui';
</script>

<script lang="ts">
    export let text;
    const dispatch = createEventDispatcher();

    async function selectFolder() {
        const result = await pickFolder({
            multipleSelection: false,
            permissions: { write: true, persistable: true, read: true }
        });
        if (result.folders.length) {
            text = result.folders[0];
            dispatch('folder', { text });
        }
    }

    function getDirectoryActualName(exportDirectory) {
        return exportDirectory ? getDirectoryName(exportDirectory) : lc('please_choose_export_folder');
    }
</script>

<FormTextField editable={false} hint={lc('folder_sync_desc')} label={lc('folder')} margin="4 16 16 16" showLabel={false} {...$$restProps} text={getDirectoryActualName(text)} trailingIcon={appIcon('folder')} onTap={selectFolder} onTrailingTap={selectFolder} />
