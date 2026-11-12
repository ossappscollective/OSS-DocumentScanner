<script context="module" lang="ts">
    export const COUNTER_HEIGHT = 28;
</script>

<script lang="ts">
    import { colors } from '~/variables';

    $: ({ colorOnBackground, colorSecondaryContainer } = $colors);

    export let text: string;
    export let marginBottom: number;
</script>

<label
    backgroundColor={__IOS__ ? '#7676801F' : colorSecondaryContainer}
    borderRadius={14}
    color={colorOnBackground}
    fontSize={13}
    height={COUNTER_HEIGHT}
    horizontalAlignment="center"
    isUserInteractionEnabled={false}
    {marginBottom}
    padding="0 12"
    {text}
    verticalAlignment="bottom"
    verticalTextAlignment="center"
    {...$$restProps} />
