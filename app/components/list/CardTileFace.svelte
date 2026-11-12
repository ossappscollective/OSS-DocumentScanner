<script lang="ts">
    import CardStatusChips from '~/components/common/CardStatusChips.svelte';
    import CardBadges from '~/components/list/CardBadges.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { colors } from '~/variables';

    export let item: Item;
    export let layout: string;
    export let stripHeight: number = undefined;

    $: ({ colorPrimary } = $colors);
    $: stacked = layout === 'cardholder' || layout === 'full';
    $: ({ hasCode, hasStatus, label, cardColor } = getCardDisplay(item));
    $: tile = getTileColors(cardColor, colorPrimary);
</script>

{#if stacked}
    <!-- only the strip above the next card is seen: the title (it shrinks to fit) with the chips at its right, the icons always on the line below -->
    <gridlayout height={stripHeight} columns="*,auto" verticalAlignment="top">
        <label
            autoFontSize={true}
            color={tile.text}
            fontSize={28}
            fontWeight="bold"
            horizontalAlignment="left"
            lineBreak="end"
            margin="8 8 0 {item.selected ? 44 : 16}"
            maxFontSize={28}
            maxLines={2}
            minFontSize={14}
            text={label}
            textAlignment="left"
            verticalAlignment="top"
        />
        <stacklayout col={1} margin="14 10 0 0" verticalAlignment="top">
            <CardStatusChips background={tile.fill} extra={item.doc.extra} horizontalAlignment="right" tint={tile.text} />
            <CardBadges code={hasCode} color={tile.text} favorite={item.doc.favorite === 1} horizontalAlignment="right" marginTop={hasStatus ? 6 : 30} opacity={0.75} />
        </stacklayout>
    </gridlayout>
{:else}
    <!-- the chips have their own row above the title: they never cover it -->
    <gridlayout rows="auto,*">
        <CardStatusChips background={tile.fill} extra={item.doc.extra} horizontalAlignment="right" margin="8 8 0 8" tint={tile.text} verticalAlignment="top" />
        <label
            autoFontSize={true}
            color={tile.text}
            fontSize={22}
            fontWeight="bold"
            horizontalAlignment="stretch"
            lineBreak="end"
            margin="{hasStatus ? 0 : 10} 16 {(hasCode || item.doc.favorite === 1) && hasStatus ? 28 : 10} 16"
            maxFontSize={22}
            maxLines={3}
            minFontSize={12}
            row={hasStatus ? 1 : 0}
            rowSpan={hasStatus ? 1 : 2}
            text={label}
            textAlignment="center"
            verticalAlignment="center"
        />
        <CardBadges code={hasCode} color={tile.text} favorite={item.doc.favorite === 1} horizontalAlignment="right" margin={10} opacity={0.75} row={1} verticalAlignment="bottom" />
    </gridlayout>
{/if}
