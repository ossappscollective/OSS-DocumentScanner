<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import CardChip from '~/components/common/CardChip.svelte';
    import CardInfoChip from '~/components/common/CardInfoChip.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { getCardDisplay } from '~/utils/cardCell';
    import { CARD_RATIO } from '~/utils/constants';

    export let item: Item;
    export let itemWidth: number;
    export let layout: string;
    export let alwaysShowNames: boolean;

    $: stacked = layout === 'cardholder' || layout === 'full';
    $: ({ hasCode, autoName, label } = getCardDisplay(item));
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
<CardChip
    fontWeight={autoName ? '500' : '600'}
    horizontalAlignment="left"
    margin={8}
    marginLeft={stacked && item.selected ? 40 : 8}
    text={label}
    verticalAlignment={stacked ? 'top' : 'bottom'}
    visibility={showLabel ? 'visible' : 'collapsed'}
/>
<CardInfoChip {hasCode} favorite={item.doc.favorite === 1} horizontalAlignment="right" margin={8} pages={item.doc.pages.length} verticalAlignment="top" />
