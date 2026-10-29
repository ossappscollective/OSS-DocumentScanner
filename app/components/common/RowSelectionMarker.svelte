<script lang="ts">
    import type { Readable } from 'svelte/store';
    import { colors, fonts } from '~/variables';
    export let selected: boolean = false;
    export let selectionMode: Readable<boolean>;
    // technique for only specific properties to get updated on store change
    $: ({ colorBackground, colorOnPrimary, colorOutline, colorPrimary, colorSurfaceContainerLow } = $colors);
</script>

<gridlayout
    backgroundColor={selected ? colorPrimary : colorSurfaceContainerLow}
    borderColor={selected ? colorBackground : colorOutline}
    borderRadius={12}
    borderWidth={2}
    height={24}
    horizontalAlignment="left"
    marginLeft={6}
    verticalAlignment="center"
    visibility={$selectionMode ? 'visible' : 'hidden'}
    width={24}
    {...$$restProps}
>
    <label color={colorOnPrimary} fontFamily={$fonts.mdi} fontSize={14} text="mdi-check" textAlignment="center" verticalAlignment="center" visibility={selected ? 'visible' : 'hidden'} />
</gridlayout>
