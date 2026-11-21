<script lang="ts">
    import { Item } from '~/components/list/MainList.svelte';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { colors } from '~/variables';

    export let item: Item;

    $: ({ colorPrimary } = $colors);
    $: ({ cardColor, label } = getCardDisplay(item));
    $: tile = getTileColors(cardColor, colorPrimary);
</script>

<label color={tile.text} fontSize={12} fontWeight="bold" lineBreak="end" margin="4 6" maxLines={3} text={label} textAlignment="center" verticalAlignment="center" />
