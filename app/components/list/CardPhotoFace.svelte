<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import CardChip from '~/components/common/CardChip.svelte';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import CardStatusChips from '~/components/common/CardStatusChips.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { CARD_RATIO } from '~/utils/constants';
    import { colors } from '~/variables';

    export let item: Item;
    export let itemWidth: number;
    export let layout: string;
    export let alwaysShowNames: boolean;
    export let stripHeight: number = undefined;

    let { colorBackground } = $colors;
    $: ({ colorBackground } = $colors);

    $: stacked = layout === 'cardholder' || layout === 'full';
    $: ({ hasCode, autoName, label, page } = getCardDisplay(item));
    // the color of the image, as on the tile behind it: the icons take the readable color over it
    $: iconColor = getTileColors(page.extra?.color ?? page.colors?.[1], colorBackground).text;
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
    stretch="aspectFill"
/>
<!-- the title chip and the chips never share a row: the title is on top and the chips at the bottom of the strip seen above the next card (stacked), the other way around otherwise -->
<gridlayout columns="*,auto,auto" height={stripHeight} rows="auto,*" verticalAlignment="top">
    <CardChip
        colSpan={3}
        fontWeight={autoName ? '500' : '600'}
        horizontalAlignment="left"
        margin={8}
        marginLeft={stacked && item.selected ? 40 : 8}
        row={stacked ? 0 : 1}
        text={label}
        verticalAlignment={stacked ? 'top' : 'bottom'}
        visibility={showLabel ? 'visible' : 'collapsed'}
    />
    <CardStatusChips col={1} extra={item.doc.extra} margin={8} row={stacked ? 1 : 0} verticalAlignment={stacked ? 'bottom' : 'top'} />
    <stacklayout col={2} margin="8 12 6 0" orientation="horizontal" row={stacked ? 1 : 0} verticalAlignment={stacked ? 'bottom' : 'top'}>
        <CardIcon color={iconColor} marginRight={hasCode ? 6 : 0} size={18} src={appIcon('favorite_on')} visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'} />
        <CardIcon color={iconColor} size={18} src={appIcon('qrcode')} visibility={hasCode ? 'visible' : 'collapsed'} />
    </stacklayout>
</gridlayout>
