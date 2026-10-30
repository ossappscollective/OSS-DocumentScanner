<script lang="ts">
    import CardChip from '~/components/common/CardChip.svelte';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import CardStatusChips from '~/components/common/CardStatusChips.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { colors } from '~/variables';

    export let item: Item;
    export let layout: string;
    export let stripHeight: number = undefined;

    let { colorPrimary } = $colors;
    $: ({ colorPrimary } = $colors);
    $: stacked = layout === 'cardholder' || layout === 'full';
    $: ({ hasCode, hasStatus, label, cardColor } = getCardDisplay(item));
    $: hasTopChips = hasStatus || item.doc.favorite === 1;
    $: tile = getTileColors(cardColor, colorPrimary);
</script>

{#if stacked}
    <!-- only the strip above the next card is seen: the title on top (it shrinks to fit), the chips at the bottom -->
    <gridlayout height={stripHeight} rows="*,auto" verticalAlignment="top">
        <label
            autoFontSize={true}
            color={tile.text}
            fontSize={28}
            fontWeight="bold"
            horizontalAlignment="left"
            lineBreak="end"
            margin="10 16 4 16"
            marginLeft={item.selected ? 44 : 16}
            maxFontSize={28}
            maxLines={2}
            minFontSize={14}
            text={label}
            textAlignment="left"
            verticalAlignment="top"
        />
        <gridlayout columns="auto,*,auto" margin="0 8 8 8" row={1}>
            <CardStatusChips extra={item.doc.extra} />
            <stacklayout col={2} orientation="horizontal">
                <CardIcon color={tile.text} marginRight={6} opacity={0.75} size={18} src={appIcon('qrcode')} verticalAlignment="middle" visibility={hasCode ? 'visible' : 'collapsed'} />
                <CardChip icon={appIcon('favorite_on')} verticalAlignment="middle" visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'} />
            </stacklayout>
        </gridlayout>
    </gridlayout>
{:else}
    <!-- the chips have their own row above the title: they never cover it -->
    <gridlayout rows="auto,*">
        <stacklayout horizontalAlignment="right" margin="8 8 0 8" orientation="horizontal" verticalAlignment="top" visibility={hasTopChips ? 'visible' : 'collapsed'}>
            <CardStatusChips extra={item.doc.extra} />
            <CardChip icon={appIcon('favorite_on')} verticalAlignment="middle" visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'} />
        </stacklayout>
        <label
            autoFontSize={true}
            color={tile.text}
            fontSize={22}
            fontWeight="bold"
            horizontalAlignment="stretch"
            lineBreak="end"
            margin="{hasTopChips ? 0 : 10} 16 {hasCode && hasTopChips ? 28 : 10} 16"
            maxFontSize={22}
            maxLines={3}
            minFontSize={12}
            row={hasTopChips ? 1 : 0}
            rowSpan={hasTopChips ? 1 : 2}
            text={label}
            textAlignment="center"
            verticalAlignment="center"
        />
        <CardIcon
            color={tile.text}
            horizontalAlignment="right"
            margin={10}
            opacity={0.75}
            row={1}
            size={18}
            src={appIcon('qrcode')}
            verticalAlignment="bottom"
            visibility={hasCode ? 'visible' : 'collapsed'}
        />
    </gridlayout>
{/if}
