<script lang="ts">
    const iconSize = 32;
    import { lcp } from '@nativescript-community/l';
    import { Color } from '@nativescript/core';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import RowSelectionMarker from '~/components/common/RowSelectionMarker.svelte';
    import SelectedIndicator from '~/components/common/SelectedIndicator.svelte';
    import type { Item } from '~/components/list/MainList.svelte';
    import { isEInk } from '~/helpers/theme';
    import { appIcon } from '~/utils/appIcons';
    import { getRowCorners } from '~/utils/groupedRows';
    import { selectionTransition } from '~/utils/svelte/actions';
    import { rowMarkerWidth, selectionMode } from '~/utils/svelte/store';
    import { colors } from '~/variables';

    export let item: Item;
    export let name: string;
    /** a tile of the horizontal row, else a row of the vertical list */
    export let tile = true;
    let { colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurfaceContainerLow } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurfaceContainerLow } = $colors);

    $: corners = tile ? { borderRadius: __IOS__ ? 16 : 20 } : getRowCorners(item.position, __IOS__);
    $: marginTop = !tile && (item.position === 'first' || item.position === 'only') ? 8 : __IOS__ || tile ? 0 : 1;
    $: iconColor = item.folder.color || colorPrimary;
    // the folder icon sits in a circle of its color at 16% over the tile
    $: iconBackground = Color.mix(new Color(colorSurfaceContainerLow), new Color(iconColor), 16);
</script>

<gridlayout
    backgroundColor={isEInk ? 'transparent' : colorSurfaceContainerLow}
    borderColor={colorOutlineVariant}
    borderWidth={isEInk ? 1 : 0}
    height={tile ? 54 : 52}
    marginBottom={tile || __IOS__ ? 0 : 1}
    {marginTop}
    padding={tile ? '0 10' : '0 14'}
    rippleColor={colorOnSurface}
    {...corners}
    {...$$restProps}
    on:tap
    on:longPress
>
    <gridlayout columns={tile ? 'auto,*' : 'auto,*,auto,auto'} paddingLeft={tile ? 0 : $rowMarkerWidth} use:selectionTransition={{ shift: tile ? 0 : 36 }}>
        <gridlayout backgroundColor={iconBackground.hex} borderRadius={iconSize / 2} height={iconSize} verticalAlignment="center" width={iconSize}>
            <CardIcon color={iconColor} horizontalAlignment="center" size={20} src={appIcon('folder_outline')} verticalAlignment="center" />
        </gridlayout>
        <label col={1} color={colorOnSurface} lineBreak="end" marginLeft={tile ? 8 : 10} maxLines={tile ? 2 : 1} verticalAlignment="center">
            <span fontSize={tile ? 13 : 16} fontWeight={tile ? '600' : '500'} text={name} />
            <span color={colorOnSurfaceVariant} fontSize={11} text={tile ? '\n' + lcp('documents_count', item.folder.count) : ''} />
        </label>
        {#if !tile}
            <label col={2} color={colorOnSurfaceVariant} fontSize={12} text={item.folder.count + ''} verticalAlignment="center" />
            <CardIcon
                col={4}
                color={colorOnSurfaceVariant}
                marginLeft={6}
                size={16}
                src={appIcon('chevron')}
                verticalAlignment="center"
                visibility={$selectionMode || __ANDROID__ ? 'collapsed' : 'visible'}
            />
        {/if}
    </gridlayout>
    {#if tile}
        <SelectedIndicator horizontalAlignment="right" margin={2} selected={item.selected} verticalAlignment="top" />
    {:else}
        <RowSelectionMarker marginLeft={0} selected={item.selected} />
        <gridlayout
            backgroundColor={colorOutlineVariant}
            height={0.5}
            marginLeft={46 + $rowMarkerWidth}
            marginRight={-14}
            verticalAlignment="bottom"
            visibility={__IOS__ && (item.position === 'first' || item.position === 'middle') ? 'visible' : 'collapsed'}
        />
    {/if}
</gridlayout>
