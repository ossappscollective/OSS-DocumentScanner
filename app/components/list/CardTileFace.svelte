<script lang="ts">
    import CardChip from '~/components/common/CardChip.svelte';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { colors } from '~/variables';

    export let item: Item;
    export let layout: string;

    let { colorPrimary } = $colors;
    $: ({ colorPrimary } = $colors);
    $: stacked = layout === 'cardholder' || layout === 'full';
    $: ({ hasCode, label, cardColor } = getCardDisplay(item));
    $: tile = getTileColors(cardColor, colorPrimary);
</script>

<label
    color={tile.text}
    fontSize={stacked ? 28 : 22}
    fontWeight="bold"
    horizontalAlignment={stacked ? 'left' : 'stretch'}
    lineBreak="end"
    margin="10 16"
    marginLeft={stacked && item.selected ? 44 : 16}
    marginRight={stacked && hasCode ? 44 : 16}
    maxLines={stacked ? 2 : 3}
    text={label}
    textAlignment={stacked ? 'left' : 'center'}
    verticalAlignment={stacked ? 'top' : 'center'}
/>
<CardIcon
    color={tile.text}
    horizontalAlignment="right"
    margin={10}
    marginRight={stacked && item.doc.favorite === 1 ? 40 : 10}
    opacity={0.75}
    size={18}
    src={appIcon('qrcode')}
    verticalAlignment={stacked ? 'top' : 'bottom'}
    visibility={hasCode ? 'visible' : 'collapsed'}
/>
<CardChip horizontalAlignment="right" icon={appIcon('favorite_on')} margin={8} verticalAlignment="top" visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'} />
