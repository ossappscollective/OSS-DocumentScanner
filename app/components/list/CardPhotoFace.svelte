<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import CardChip from '~/components/common/CardChip.svelte';
    import CardInfoChip from '~/components/common/CardInfoChip.svelte';
    import CardStatusChips from '~/components/common/CardStatusChips.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { getCardDisplay } from '~/utils/cardCell';
    import { CARD_RATIO } from '~/utils/constants';

    export let item: Item;
    export let itemWidth: number;
    export let layout: string;
    export let alwaysShowNames: boolean;
    export let stripHeight: number = undefined;

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
{#if stacked}
    <!-- only the strip above the next card is seen: the title chip on top, the chips at the bottom -->
    <gridlayout columns="*,auto" height={stripHeight} rows="auto,*" verticalAlignment="top">
        <CardChip
            colSpan={2}
            fontWeight={autoName ? '500' : '600'}
            horizontalAlignment="left"
            margin={8}
            marginLeft={item.selected ? 40 : 8}
            text={label}
            verticalAlignment="top"
            visibility={showLabel ? 'visible' : 'collapsed'}
        />
        <stacklayout col={1} horizontalAlignment="right" margin="8 8 8 0" orientation="horizontal" row={1} verticalAlignment="bottom">
            <CardStatusChips extra={item.doc.extra} />
            <CardInfoChip {hasCode} favorite={item.doc.favorite === 1} />
        </stacklayout>
    </gridlayout>
{:else}
    <CardChip fontWeight={autoName ? '500' : '600'} horizontalAlignment="left" margin={8} text={label} verticalAlignment="bottom" visibility={showLabel ? 'visible' : 'collapsed'} />
    <stacklayout horizontalAlignment="right" margin={8} orientation="horizontal" verticalAlignment="top">
        <CardStatusChips extra={item.doc.extra} />
        <CardInfoChip {hasCode} favorite={item.doc.favorite === 1} />
    </stacklayout>
{/if}
