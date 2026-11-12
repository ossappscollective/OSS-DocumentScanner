<script lang="ts">
    import { pickFolder } from '@nativescript-community/ui-document-picker';
    import { closeBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import SettingsSlider from '@shared/components/SettingsSlider.svelte';
    import { showError } from '@shared/utils/showError';
    import FormTextField from '~/components/common/FormTextField.svelte';
    import { lc } from '~/helpers/locale';
    import { appIcon } from '~/utils/appIcons';
    import { getDirectoryName } from '~/utils/ui';
    import { colors } from '~/variables';
    import SheetHeader from './SheetHeader.svelte';

    let { colorOnSurface, colorOnSurfaceVariant } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant } = $colors);

    export let jpegQuality: number;
    export let folder: string;
    export let password: string = null;
    export let filename: string = null;
    export let showFilename = true;

    async function selectFolder() {
        try {
            const result = await pickFolder({ multipleSelection: false, permissions: { write: true, persistable: true, read: true } });
            if (result.folders?.length) {
                folder = result.folders[0];
            }
        } catch (error) {
            showError(error);
        }
    }
    function onPasswordChange(event: { value: string }) {
        password = event.value?.length ? event.value : null;
    }
    function done() {
        closeBottomSheet({ filename, folder, jpegQuality, password });
    }
</script>

<gesturerootview rows="auto,auto">
    <SheetHeader doneEnabled={!showFilename || filename?.length > 0} doneText={lc('export')} onCancel={() => closeBottomSheet(undefined)} onDone={done} title={lc('export_settings')} />
    <stacklayout padding="0 16 24 16" row={1}>
        <!-- the folder is a value which opens the picker, like a select field -->
        <gridlayout class="formRow" columns="*,auto" on:tap={selectFolder}>
            <stacklayout margin="0 4" verticalAlignment="center">
                <label color={colorOnSurfaceVariant} fontSize={13} text={lc('folder')} />
                <label color={colorOnSurface} fontSize={17} lineBreak="middle" maxLines={1} text={folder ? getDirectoryName(folder) : lc('please_choose_export_folder')} />
            </stacklayout>
            <uibutton col={1} color={colorOnSurfaceVariant} height={44} variant="text" verticalAlignment="center" width={44} {...{ src: appIcon('folder') }} on:tap={selectFolder} />
        </gridlayout>
        {#if showFilename}
            <FormTextField autocapitalizationType="none" autocorrect={false} label={lc('filename')} returnKeyType="next" bind:text={filename} />
        {/if}
        <SettingsSlider margin="8 4" max={100} min={0} onChange={(value) => (jpegQuality = value)} step={1} title={lc('jpeg_quality')} value={jpegQuality} />
        <FormTextField autocapitalizationType="none" autocorrect={false} label={lc('optional_pdf_password')} onChange={onPasswordChange} returnKeyType="done" secure={true} text={password} />
    </stacklayout>
</gesturerootview>
