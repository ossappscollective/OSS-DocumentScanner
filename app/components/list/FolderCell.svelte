<script lang="ts">
    import { lcp } from '@nativescript-community/l';
    import { Color } from '@nativescript/core';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import SelectedIndicator from '~/components/common/SelectedIndicator.svelte';
    import type { Item } from '~/components/list/MainList.svelte';
    import { isEInk } from '~/helpers/theme';
    import { appIcon } from '~/utils/appIcons';
    import { colors } from '~/variables';

    export let item: Item;
    export let name: string;
    /** a tile of the horizontal row, else a row of the vertical list */
    export let tile = true;
    let { colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurfaceContainerLow } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurfaceContainerLow } = $colors);

    $: iconColor = item.folder.color || colorPrimary;
    // the folder icon sits in a circle of its color at 20%
    $: iconBackground = new Color(iconColor).setAlpha(51);
    $: iconSize = tile ? 32 : 30;
</script>

<gridlayout
    backgroundColor={isEInk ? 'transparent' : colorSurfaceContainerLow}
    borderColor={colorOutlineVariant}
    borderRadius={tile ? (__IOS__ ? 16 : 20) : 14}
    borderWidth={isEInk ? 1 : 0}
    columns={tile ? 'auto,*' : 'auto,*,auto,auto'}
    height={tile ? 54 : 46}
    padding={tile ? '0 10' : '0 14'}
    rippleColor={colorOnSurface}
    {...$$restProps}
    on:tap
    on:longPress
>
    <gridlayout backgroundColor={iconBackground} borderRadius={iconSize / 2} height={iconSize} verticalAlignment="center" width={iconSize}>
        <CardIcon color={iconColor} horizontalAlignment="center" size={tile ? 18 : 17} src={appIcon('folder')} verticalAlignment="center" />
    </gridlayout>
    <label col={1} color={colorOnSurface} lineBreak="end" marginLeft={tile ? 8 : 10} maxLines={tile ? 2 : 1} verticalAlignment="center">
        <span fontSize={tile ? 13 : 14} fontWeight="600" text={name} />
        <span color={colorOnSurfaceVariant} fontSize={11} text={tile ? '\n' + lcp('documents_count', item.folder.count) : ''} />
    </label>
    {#if !tile}
        <label col={2} color={colorOnSurfaceVariant} fontSize={12} text={item.folder.count + ''} verticalAlignment="center" />
        <CardIcon col={3} color={colorOnSurfaceVariant} marginLeft={6} size={16} src={appIcon('chevron')} verticalAlignment="center" />
    {/if}
    <SelectedIndicator horizontalAlignment="right" margin={tile ? 2 : 0} selected={item.selected} verticalAlignment="top" />
</gridlayout>
