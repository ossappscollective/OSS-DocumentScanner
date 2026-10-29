<script lang="ts">
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { colors } from '~/variables';

    interface ChipSegment {
        icon?: string;
        text?: string;
    }

    export let text: string = null;
    export let icon: string = null;
    /** several segments are one pill with a hairline between them */
    export let segments: ChipSegment[] = null;
    export let fontWeight: any = '600';
    let { colorOnPrimaryContainer, colorOnSurface } = $colors;
    $: ({ colorOnPrimaryContainer, colorOnSurface } = $colors);
    $: color = __IOS__ ? colorOnSurface : colorOnPrimaryContainer;
    $: parts = segments ?? [{ icon, text }];
</script>

<!-- glass on iOS, tonal on Android (see the cardChip class): legible on any image -->
<uisurface class="cardChip" android:variant="clear" {...$$restProps}>
    <stacklayout orientation="horizontal">
        {#each parts as part, index}
            {#if index > 0}
                <absolutelayout backgroundColor={color} height={12} opacity={0.25} verticalAlignment="center" width={1} />
            {/if}
            <stacklayout minWidth={22} orientation="horizontal" padding={part.text ? '0 8' : 0}>
                {#if part.icon}
                    <CardIcon {color} horizontalAlignment="center" marginRight={part.text ? 4 : 0} size={12} src={part.icon} verticalAlignment="center" />
                {/if}
                {#if part.text}
                    <label {color} fontSize={11} {fontWeight} lineBreak="end" maxLines={1} text={part.text} verticalAlignment="center" />
                {/if}
            </stacklayout>
        {/each}
    </stacklayout>
</uisurface>
