<script lang="ts">
    import type { View } from '@nativescript/core';
    import { Writable } from 'svelte/store';
    import FormTextField from '~/components/common/FormTextField.svelte';
    import { lc } from '~/helpers/locale';
    import { appIcon } from '~/utils/appIcons';

    export let store: Writable<{ remoteFolder?: string }>;
    export let onTrailingTap: (view: View) => void = undefined;
</script>

<label class="settingsSectionHeader" text={lc('remote_folder')} />
<FormTextField
    autocapitalizationType="none"
    autocorrect={false}
    hint={lc('remote_folder_desc')}
    label={lc('remote_folder')}
    margin="4 16 8 16"
    returnKeyType="done"
    showLabel={false}
    text={$store.remoteFolder}
    trailingIcon={appIcon('folder')}
    onChange={(event) => ($store.remoteFolder = event.value)}
    {onTrailingTap}
    on:returnPress />
