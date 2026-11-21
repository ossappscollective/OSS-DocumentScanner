<script lang="ts">
    import { colors } from '~/variables';

    export let text: string = null;
    export let tone: 'warning' | 'alert' = 'warning';
    let { colorError, colorOnError } = $colors;
    $: ({ colorError, colorOnError } = $colors);
    $: alert = tone === 'alert';
</script>

<!-- the same solid chip on every card: it must be seen on any image or color, and it is as big as the other chips (see the cardChip class) -->
<label
    backgroundColor={alert ? colorError : '#F5B700'}
    borderRadius={11}
    color={alert ? colorOnError : '#2B2000'}
    fontSize={11}
    fontWeight="600"
    height={22}
    lineBreak="end"
    maxLines={1}
    padding="0 8"
    {text}
    verticalTextAlignment="middle"
    {...$$restProps} />
