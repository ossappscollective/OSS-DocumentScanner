<script lang="ts">
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
    $: hasTopChips = hasStatus;
    $: hasIcons = hasCode || item.doc.favorite === 1;
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
            margin="8 8 0 16"
            marginLeft={item.selected ? 44 : 16}
            maxFontSize={28}
            maxLines={2}
            minFontSize={14}
            text={label}
            textAlignment="left"
            verticalAlignment="top"
        />
        <stacklayout col={1} margin="14 10 0 0" verticalAlignment="top">
            <CardStatusChips extra={item.doc.extra} horizontalAlignment="right" tint={tile.text} />
            <stacklayout horizontalAlignment="right" marginTop={hasStatus ? 6 : 30} orientation="horizontal">
                <CardIcon
                    color={tile.text}
                    marginRight={hasCode ? 6 : 0}
                    opacity={0.75}
                    size={18}
                    src={appIcon('favorite_on')}
                    visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'}
                />
                <CardIcon color={tile.text} opacity={0.75} size={18} src={appIcon('qrcode')} visibility={hasCode ? 'visible' : 'collapsed'} />
            </stacklayout>
        </stacklayout>
    </gridlayout>
{:else}
    <!-- the chips have their own row above the title: they never cover it -->
    <gridlayout rows="auto,*">
        <CardStatusChips extra={item.doc.extra} horizontalAlignment="right" margin="8 8 0 8" tint={tile.text} verticalAlignment="top" />
        <label
            autoFontSize={true}
            color={tile.text}
            fontSize={22}
            fontWeight="bold"
            horizontalAlignment="stretch"
            lineBreak="end"
            margin="{hasTopChips ? 0 : 10} 16 {hasIcons && hasTopChips ? 28 : 10} 16"
            maxFontSize={22}
            maxLines={3}
            minFontSize={12}
            row={hasTopChips ? 1 : 0}
            rowSpan={hasTopChips ? 1 : 2}
            text={label}
            textAlignment="center"
            verticalAlignment="center"
        />
        <stacklayout horizontalAlignment="right" margin={10} orientation="horizontal" row={1} verticalAlignment="bottom">
            <CardIcon
                color={tile.text}
                marginRight={hasCode ? 6 : 0}
                opacity={0.75}
                size={18}
                src={appIcon('favorite_on')}
                visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'}
            />
            <CardIcon color={tile.text} opacity={0.75} size={18} src={appIcon('qrcode')} visibility={hasCode ? 'visible' : 'collapsed'} />
        </stacklayout>
    </gridlayout>
{/if}
