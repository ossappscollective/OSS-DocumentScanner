<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { colors } from '~/variables';
</script>

<script lang="ts">
    export let variant = 'outline';
    export let text;
    $: ({ colorOnSurfaceVariant } = $colors);
</script>

<gridlayout margin="5 0 5 0" rows="auto" {...$$restProps}>
    <textfield
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('remote_folder_desc')}
        paddingRight={60}
        placeholder={lc('remote_folder')}
        returnKeyType="done"
        {text}
        {variant}
        on:returnPress
        on:textChange
    />
    <uibutton class="icon-btn" color={colorOnSurfaceVariant} horizontalAlignment="right" text="mdi-folder-open" variant="text" verticalAlignment="middle" />
</gridlayout>
