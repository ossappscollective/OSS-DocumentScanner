<script context="module" lang="ts">
    export const SHEET_GRABBER_HEIGHT = 28;
</script>

<script lang="ts">
    import { colors } from '~/variables';

    $: ({ colorBackground, colorOutlineVariant, colorSurfaceContainerLow } = $colors);

    export let height: number | string;
    export let width: number | string;
    /** the rows under the grabber */
    export let rows: string;
    export let shadow = true;
    export let opacity = 1;
    /** landscape: a panel on the side of the page, not a sheet from the bottom */
    export let panel = false;
</script>

<!-- the root is the bottom sheet of the persistent sheet it is put in -->
<gridlayout
    prop:bottomSheet
    backgroundColor={__IOS__ ? colorBackground : colorSurfaceContainerLow}
    borderTopLeftRadius={panel ? 0 : __IOS__ ? 26 : 28}
    borderTopRightRadius={panel ? 0 : __IOS__ ? 26 : 28}
    boxShadow={__IOS__ && shadow && !panel ? '0 -3 10 #00000072' : undefined}
    {height}
    horizontalAlignment="left"
    {opacity}
    rows={`${panel ? 0 : SHEET_GRABBER_HEIGHT},${rows}`}
    {width}>
    <absolutelayout backgroundColor={colorOutlineVariant} borderRadius={2.5} height={5} horizontalAlignment="center" marginTop={10} visibility={panel ? 'collapsed' : 'visible'} width={36} />
    <slot />
</gridlayout>
