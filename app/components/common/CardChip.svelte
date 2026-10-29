<script lang="ts">
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { colors } from '~/variables';

    export let text: string = null;
    export let icon: string = null;
    export let fontWeight: any = '600';
    let { colorOnPrimaryContainer, colorOnSurface, colorPrimaryContainer } = $colors;
    $: ({ colorOnPrimaryContainer, colorOnSurface, colorPrimaryContainer } = $colors);
    $: color = __IOS__ ? colorOnSurface : colorOnPrimaryContainer;
</script>

<!-- a glass chip on iOS, a tonal one on Android: legible on any image -->
{#if __IOS__}
    <uisurface horizontalAlignment="left" padding="4 8" verticalAlignment="center" {...$$restProps}>
        <stacklayout orientation="horizontal">
            {#if icon}
                <CardIcon {color} marginRight={text ? 2 : 0} size={12} src={icon} verticalAlignment="center" />
            {/if}
            {#if text}
                <label {color} fontSize={12} {fontWeight} lineBreak="end" maxLines={1} {text} verticalAlignment="center" />
            {/if}
        </stacklayout>
    </uisurface>
{:else}
    <stacklayout backgroundColor={colorPrimaryContainer} borderRadius={10} horizontalAlignment="left" orientation="horizontal" padding="3 8" verticalAlignment="center" {...$$restProps}>
        {#if icon}
            <CardIcon {color} marginRight={text ? 2 : 0} size={12} src={icon} verticalAlignment="center" />
        {/if}
        {#if text}
            <label {color} fontSize={12} {fontWeight} lineBreak="end" maxLines={1} {text} verticalAlignment="center" />
        {/if}
    </stacklayout>
{/if}
