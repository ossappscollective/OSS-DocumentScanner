<script context="module" lang="ts">
    export const SHEET_GRABBER_HEIGHT = 28;
    // iOS: the sides of the sheet float, like the system sheets (not a panel)
    const SHEET_INSET = 8;
</script>

<script lang="ts">
    import { colors } from '~/variables';

    $: ({ colorOutline, colorOutlineVariant, colorSurface, colorSurfaceContainerLow } = $colors);
    $: floating = __IOS__ && !panel;

    export let height: number | string;
    export let width: number | string;
    /** the rows under the grabber */
    export let rows: string;
    export let opacity = 1;
    /** landscape: a panel on the side of the page, not a sheet from the bottom */
    export let panel = false;
</script>

<!-- the root is the bottom sheet of the persistent sheet it is put in -->
<gridlayout
    prop:bottomSheet
    backgroundColor={__IOS__ ? colorSurface : colorSurfaceContainerLow}
    borderColor={floating ? colorOutlineVariant : undefined}
    borderTopLeftRadius={panel ? 0 : __IOS__ ? 38 : 28}
    borderTopRightRadius={panel ? 0 : __IOS__ ? 38 : 28}
    borderWidth={floating ? 0.5 : 0}
    {height}
    horizontalAlignment="left"
    margin={floating ? `0 ${SHEET_INSET}` : 0}
    {opacity}
    rows={`${panel ? 0 : SHEET_GRABBER_HEIGHT},${rows}`}
    width={floating && typeof width === 'number' ? width - 2 * SHEET_INSET : width}>
    <absolutelayout
        backgroundColor={__IOS__ ? colorOutline : colorOutlineVariant}
        borderRadius={2.5}
        height={5}
        horizontalAlignment="center"
        marginTop={__IOS__ ? 6 : 10}
        visibility={panel ? 'collapsed' : 'visible'}
        width={__IOS__ ? 57 : 36} />
    <slot />
</gridlayout>
