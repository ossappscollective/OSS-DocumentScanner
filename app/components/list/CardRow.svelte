<script lang="ts">
    import CardIcon from '~/components/common/CardIcon.svelte';
    import RowSelectionMarker from '~/components/common/RowSelectionMarker.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { isEInk } from '~/helpers/theme';
    import { lc, lcp } from '~/helpers/locale';
    import { appIcon } from '~/utils/appIcons';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { getRowCorners } from '~/utils/groupedRows';
    import { selectionTransition } from '~/utils/svelte/actions';
    import type { Readable } from 'svelte/store';
    import { colors } from '~/variables';

    // rows of a group touch on iOS, Android keeps 2 between them
    const rowGap = __IOS__ ? 0 : 2;

    export let item: Item;
    export let height: number;
    export let pkPassCell: boolean = false;
    export let selectionMode: Readable<boolean>;

    let { colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSecondaryContainer, colorSurfaceContainerLow } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSecondaryContainer, colorSurfaceContainerLow } = $colors);

    // the content is pushed right by the leading marker while selecting
    $: markerWidth = $selectionMode ? 36 : 0;
    $: groupStart = item.position === 'first' || item.position === 'only';
    $: ({ page, hasImage, hasCode, label, cardColor } = getCardDisplay(item));
    $: tile = getTileColors(cardColor, colorPrimary);
    $: subtitle = pkPassCell ? lc('wallet_pass') : hasImage ? lcp('photos_count', item.doc.pages.length) : '';
</script>

<!-- the content of the thumbnail is the slot: a photo, a tile or a pass each have their own template -->
<gridlayout height={height + rowGap + (groupStart ? 8 : 0)} width="100%" {...$$restProps}>
    <gridlayout
        backgroundColor={isEInk ? 'transparent' : item.selected ? colorSecondaryContainer : colorSurfaceContainerLow}
        {...getRowCorners(item.position, __IOS__)}
        {height}
        margin="{rowGap / 2} 16"
        padding="0 12 0 8"
        rippleColor={colorOnSurface}
        verticalAlignment="bottom"
        on:tap
        on:longPress
    >
        <gridlayout columns="auto,*,auto,auto" paddingLeft={markerWidth} use:selectionTransition={{ selectionMode }}>
            <gridlayout
                backgroundColor={pkPassCell ? (page?.pkpass?.passData?.backgroundColor ?? tile.fill) : hasImage ? null : tile.fill}
                borderRadius={11}
                height={60}
                verticalAlignment="center"
                width={96}
            >
                <slot />
            </gridlayout>
            <gridlayout col={1} margin="0 12" rows="auto,auto" verticalAlignment="center">
                <label color={colorOnSurface} fontSize={__IOS__ ? 17 : 16} fontWeight={__IOS__ ? '600' : '500'} lineBreak="end" maxLines={1} text={item.doc.name || label} />
                <stacklayout orientation="horizontal" row={1} visibility={subtitle || (hasCode && hasImage) ? 'visible' : 'collapsed'}>
                    <label color={colorOnSurfaceVariant} fontSize={14} text={subtitle} verticalAlignment="center" visibility={subtitle ? 'visible' : 'collapsed'} />
                    <CardIcon
                        color={colorOnSurfaceVariant}
                        marginLeft={subtitle ? 6 : 0}
                        size={16}
                        src={appIcon('qrcode')}
                        verticalAlignment="center"
                        visibility={hasCode && hasImage ? 'visible' : 'collapsed'}
                    />
                </stacklayout>
            </gridlayout>
            <CardIcon col={2} color={colorPrimary} marginRight={8} size={16} src={appIcon('favorite_on')} verticalAlignment="center" visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'} />
        </gridlayout>
        <RowSelectionMarker {selectionMode} selected={item.selected} />
        <gridlayout
            backgroundColor={colorOutlineVariant}
            height={0.5}
            marginLeft={108 + markerWidth}
            marginRight={-12}
            verticalAlignment="bottom"
            visibility={__IOS__ && (item.position === 'first' || item.position === 'middle') ? 'visible' : 'collapsed'}
        />
    </gridlayout>
</gridlayout>
