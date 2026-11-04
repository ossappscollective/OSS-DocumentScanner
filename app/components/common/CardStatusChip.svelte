<script lang="ts">
    import { getChipColors, getChipWash } from '~/utils/cardColors';
    import { colors } from '~/variables';

    export let text: string = null;
    export let tone: 'warning' | 'alert' = 'warning';
    export let tint: string = null;
    /** the color of the card under a tinted chip: the chip is then solid, so it can cover data */
    export let background: string = null;
    let { colorError, colorOnError } = $colors;
    $: ({ colorError, colorOnError } = $colors);
    $: alert = tone === 'alert';
    $: tinted = tint ? (background ? getChipColors(tint, background, alert ? 96 : 56) : { backgroundColor: getChipWash(tint, alert ? 96 : 56), color: tint }) : null;
</script>

<!-- on a tile the chip is a wash of the tile text color: it fades into its card. Otherwise a solid chip: it must be seen on any image -->
<label
    backgroundColor={tinted ? tinted.backgroundColor : alert ? colorError : '#F5B700'}
    borderRadius={tint ? 12 : 11}
    color={tinted ? tinted.color : alert ? colorOnError : '#2B2000'}
    fontSize={tint ? 12 : 11}
    fontWeight="600"
    height={tint ? 24 : 22}
    lineBreak="end"
    maxLines={1}
    padding={tint ? '0 10' : '0 8'}
    {text}
    verticalTextAlignment="middle"
    {...$$restProps}
/>
