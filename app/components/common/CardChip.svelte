<script lang="ts">
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { colors } from '~/variables';

    export let text: string = null;
    export let icon: string = null;
    export let fontWeight: any = '600';
    let { colorOnPrimaryContainer, colorOnSurface } = $colors;
    $: ({ colorOnPrimaryContainer, colorOnSurface } = $colors);
    $: color = __IOS__ ? colorOnSurface : colorOnPrimaryContainer;
</script>

<!-- glass on iOS, tonal on Android (see the cardChip class): legible on any image -->
<uisurface class="cardChip" android:variant="clear" {...$$restProps}>
    <stacklayout orientation="horizontal">
        {#if icon}
            <CardIcon {color} marginRight={text ? 2 : 0} size={12} src={icon} verticalAlignment="center" />
        {/if}
        {#if text}
            <label {color} fontSize={12} {fontWeight} lineBreak="end" maxLines={1} {text} verticalAlignment="center" />
        {/if}
    </stacklayout>
</uisurface>
