<script lang="ts">
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { getChipWash } from '~/utils/cardColors';
    import { colors } from '~/variables';

    export let text: string = null;
    export let icon: string = null;
    export let fontWeight: any = '600';
    export let tint: string = null;
    let { colorOnPrimaryContainer, colorOnSurface } = $colors;
    $: ({ colorOnPrimaryContainer, colorOnSurface } = $colors);
    $: color = __IOS__ ? colorOnSurface : colorOnPrimaryContainer;
</script>

{#if tint}
    <!-- on a tile the chip is a wash of the tile text color: it fades into its card -->
    <gridlayout backgroundColor={getChipWash(tint)} borderRadius={12} columns="auto,auto" height={24} minWidth={24} padding={text ? '0 10' : '0 6'} verticalAlignment="middle" {...$$restProps}>
        <CardIcon color={tint} horizontalAlignment="center" marginRight={text && icon ? 4 : 0} size={14} src={icon} verticalAlignment="center" visibility={icon ? 'visible' : 'collapsed'} />
        <label col={1} color={tint} fontSize={12} {fontWeight} lineBreak="end" maxLines={1} {text} verticalAlignment="center" visibility={text ? 'visible' : 'collapsed'} />
    </gridlayout>
{:else}
    <!-- glass on iOS, tonal on Android (see the cardChip class): legible on any image -->
    <uisurface class="cardChip" android:variant="clear" {...$$restProps}>
        <stacklayout minWidth={22} orientation="horizontal" padding={text ? '0 8' : '0 5'}>
            <CardIcon {color} horizontalAlignment="center" marginRight={text && icon ? 4 : 0} size={12} src={icon} verticalAlignment="center" visibility={icon ? 'visible' : 'collapsed'} />
            <label {color} fontSize={11} {fontWeight} lineBreak="end" maxLines={1} {text} verticalAlignment="center" visibility={text ? 'visible' : 'collapsed'} />
        </stacklayout>
    </uisurface>
{/if}
