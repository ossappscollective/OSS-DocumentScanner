<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { pickFolder } from '@nativescript-community/ui-document-picker';
    import { colors } from '~/variables';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';
    import { getDirectoryName } from '~/utils/ui';
</script>

<script lang="ts">
    export let variant = 'outline';
    export let text;
    $: ({ colorOnSurfaceVariant } = $colors);
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

<gridlayout margin="5 10 5 10" rows="auto" {...$$restProps} on:tap={selectFolder}>
    <textfield
        autocapitalizationType="none"
        autocorrect={false}
        editable={false}
        hint={lc('folder_sync_desc')}
        isUserInteractionEnabled={false}
        paddingRight={60}
        placeholder={lc('folder')}
        returnKeyType="done"
        text={getDirectoryActualName(text)}
        {variant}
    />
    <uibutton class="icon-btn" color={colorOnSurfaceVariant} horizontalAlignment="right" text="mdi-folder-open" variant="text" verticalAlignment="middle" />
</gridlayout>
