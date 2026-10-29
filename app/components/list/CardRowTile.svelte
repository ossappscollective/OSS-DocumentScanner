<script lang="ts">
    import CardIcon from '~/components/common/CardIcon.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { colors } from '~/variables';

    export let item: Item;

    let { colorPrimary } = $colors;
    $: ({ colorPrimary } = $colors);
    $: ({ label, cardColor, hasCode } = getCardDisplay(item));
    $: tile = getTileColors(cardColor, colorPrimary);
</script>

<label color={tile.text} fontSize={12} fontWeight="bold" lineBreak="end" margin="4 6" maxLines={3} text={label} textAlignment="center" verticalAlignment="center" />
<CardIcon color={tile.text} horizontalAlignment="right" margin={4} opacity={0.75} size={14} src={appIcon('qrcode')} verticalAlignment="bottom" visibility={hasCode ? 'visible' : 'collapsed'} />
