<script context="module" lang="ts">
    export const SHEET_GRABBER_HEIGHT = 28;
</script>

<script lang="ts">
    import { colors } from '~/variables';

    $: ({ colorBackground, colorOutlineVariant, colorSurfaceContainerLow } = $colors);

    export let height: number;
    export let width: number | string = undefined;
    /** the rows under the grabber */
    export let rows: string;
    export let shadow = true;
</script>

<!-- the root is the bottom sheet of the persistent sheet it is put in -->
<gridlayout
    prop:bottomSheet
    backgroundColor={__IOS__ ? colorBackground : colorSurfaceContainerLow}
    borderTopLeftRadius={__IOS__ ? 26 : 28}
    borderTopRightRadius={__IOS__ ? 26 : 28}
    boxShadow={__IOS__ && shadow ? '0 -3 10 #00000072' : undefined}
    {height}
    horizontalAlignment="left"
    rows={`${SHEET_GRABBER_HEIGHT},${rows}`}
    {width}>
    <absolutelayout backgroundColor={colorOutlineVariant} borderRadius={2.5} height={5} horizontalAlignment="center" marginTop={10} width={36} />
    <slot />
</gridlayout>
