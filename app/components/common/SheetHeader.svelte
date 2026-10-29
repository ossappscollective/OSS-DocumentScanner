<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let title: string;
    export let doneText: string;
    export let doneEnabled = true;
    export let onCancel: () => void;
    export let onDone: () => void;
    let { colorOnSurface } = $colors;
    $: ({ colorOnSurface } = $colors);
</script>

<!-- iOS: a glass Cancel pill, the title centered and a prominent Done. Android: a close icon, the title and a Save text button -->
<gridlayout columns="auto,*,auto" padding="12 16 8 16" {...$$restProps}>
    {#if __IOS__}
        <uibutton accessibilityLabel={lc('cancel')} text={lc('cancel')} variant="glass" on:tap={onCancel} />
        <label col={1} color={colorOnSurface} fontSize={17} fontWeight="bold" text={title} textAlignment="center" verticalAlignment="center" />
        <uibutton col={2} isEnabled={doneEnabled} text={doneText} variant="prominentGlass" on:tap={onDone} />
    {:else}
        <uibutton accessibilityLabel={lc('cancel')} variant="text" {...{ src: appIcon('close') }} on:tap={onCancel} />
        <label col={1} color={colorOnSurface} fontSize={22} marginLeft={8} text={title} verticalAlignment="center" />
        <uibutton col={2} isEnabled={doneEnabled} text={doneText} variant="text" on:tap={onDone} />
    {/if}
</gridlayout>
