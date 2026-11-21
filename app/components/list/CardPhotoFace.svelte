<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import CardChip from '~/components/common/CardChip.svelte';
    import CardStatusChips from '~/components/common/CardStatusChips.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import CardBadges from '~/components/list/CardBadges.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { CARD_RATIO } from '~/utils/constants';
    import { colors } from '~/variables';

    export let item: Item;
    export let itemWidth: number;
    export let layout: string;
    export let alwaysShowNames: boolean;
    export let stripHeight: number = undefined;

    $: ({ colorBackground } = $colors);

    $: stacked = layout === 'cardholder' || layout === 'full';
    $: ({ autoName, hasCode, label, page } = getCardDisplay(item));
    // the color of the image, as on the tile behind it: the icons take the readable color over it
    $: iconColor = getTileColors(page.extra?.color ?? page.colors?.[1], colorBackground).text;
    // the icons share the bottom row of a columns tile with the title chip
    $: iconsWidth = (hasCode ? 18 : 0) + (item.doc.favorite === 1 ? 18 : 0) + (hasCode && item.doc.favorite === 1 ? 6 : 0) + (hasCode || item.doc.favorite === 1 ? 12 : 0);
    // the title chip: the contrast color of the photo, semi-transparent, with the inverse color for the text
    $: chipBackground = `${iconColor}99`;
    $: chipTextColor = iconColor === '#ffffff' ? '#000000' : '#ffffff';
    $: showLabel = !autoName || alwaysShowNames;
</script>

<RotableImageView
    id="imageView"
    borderRadius={__IOS__ ? 18 : 20}
    decodeWidth={Utils.layout.toDevicePixels(itemWidth) * CARD_RATIO}
    document={item.doc}
    fadeDuration={100}
    item={item.doc.pages[0]}
    sharedTransitionTag="document_{item.doc.id}_{item.doc.pages[0].id}"
    stretch="aspectFill" />
<!-- stacked, only the strip above the next card is seen: one row, the title chip then the chips and the icons at its right. Otherwise the title chip is at the bottom, the chips at the top and the icons at the bottom right -->
<gridlayout columns="*,auto,auto" height={stripHeight} rows="auto,*" verticalAlignment={stripHeight ? 'top' : 'stretch'}>
    <CardChip
        colSpan={stacked ? 1 : 3}
        fill={chipBackground}
        fontWeight={autoName ? '500' : '600'}
        horizontalAlignment="left"
        margin={8}
        marginLeft={stacked && item.selected ? 40 : 8}
        marginRight={stacked ? 0 : iconsWidth + 8}
        row={stacked ? 0 : 1}
        text={label}
        tint={chipTextColor}
        verticalAlignment={stacked ? 'top' : 'bottom'}
        visibility={showLabel ? 'visible' : 'collapsed'} />
    <CardStatusChips col={1} colSpan={stacked ? 1 : 2} extra={item.doc.extra} horizontalAlignment="right" margin={8} reversed row={0} verticalAlignment="top" />
    <CardBadges code={hasCode} col={2} color={iconColor} favorite={item.doc.favorite === 1} horizontalAlignment="right" margin={stacked ? '8 12 0 0' : '8 12 6 0'} row={stacked ? 0 : 1} verticalAlignment={stacked ? 'top' : 'bottom'} />
</gridlayout>
