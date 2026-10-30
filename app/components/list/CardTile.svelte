<script context="module" lang="ts">
    import { Color } from '@akylas/nativescript';
    import { Writable } from 'svelte/store';
    import SelectedIndicator from '~/components/common/SelectedIndicator.svelte';
    import SyncIndicator from '~/components/common/SyncIndicator.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { isEInk } from '~/helpers/theme';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { colors } from '~/variables';
    const tileRadius = __IOS__ ? 18 : 20;
</script>

<script lang="ts">
    export let nbColumns: Writable<number>;
    export let item: Item;
    export let height: number;
    export let syncEnabled: boolean;
    export let layout: string;
    export let syncColors: string[];

    let { colorBackground, colorPrimary } = $colors;
    $: ({ colorBackground, colorPrimary } = $colors);

    $: ({ page, hasImage, cardColor } = getCardDisplay(item));
    $: tile = getTileColors(cardColor, colorPrimary);

    function getItemHolderParams(layout, nbColumns, tileFill: string, selected: boolean) {
        const result = {
            backgroundColor: isEInk ? null : hasImage ? new Color(page.extra?.color ?? page.colors?.[1] ?? colorBackground) : new Color(tileFill),
            borderRadius: tileRadius,
            scaleX: selected && layout === 'columns' ? 0.95 : 1,
            scaleY: selected && layout === 'columns' ? 0.95 : 1
        };
        switch (layout) {
            case 'cardholder':
            case 'full':
                Object.assign(result, {
                    // @akylas/nativescript (background.ios) applies the alpha of the color twice on iOS (shadowOpacity and shadowColor):
                    // 0x72 renders the 20% of the design. Use 0x33 again once it is fixed there
                    boxShadow: isEInk ? 0 : `0 -3 10 ${__IOS__ ? '#00000072' : '#00000033'}`,
                    margin: 16 / nbColumns
                });
                break;
            case 'columns':
            case 'list':
                Object.assign(result, {
                    margin: 6
                });
                break;
        }
        return result;
    }
</script>

<!-- the content is the slot: a photo, a tile or a pass each have their own template -->
<gridlayout {height} width="100%" {...$$restProps}>
    <gridlayout id="cardItemTemplate" class="cardItemTemplate" prop:mainContent {...getItemHolderParams(layout, $nbColumns, tile.fill, item.selected)} on:tap on:longPress>
        <slot />
        <SelectedIndicator selected={item.selected} />
        <SyncIndicator {syncColors} verticalAlignment="top" visible={syncEnabled} />
    </gridlayout>
</gridlayout>
