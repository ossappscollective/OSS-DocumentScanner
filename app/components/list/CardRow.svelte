<script lang="ts">
    import CardIcon from '~/components/common/CardIcon.svelte';
    import CardStatusChips from '~/components/common/CardStatusChips.svelte';
    import GroupedRow from '~/components/list/GroupedRow.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { lang, lc } from '~/helpers/locale';
    import { appIcon } from '~/utils/appIcons';
    import { getCardDisplay } from '~/utils/cardCell';
    import { getTileColors } from '~/utils/cardColors';
    import { getPKPassStatus } from '~/utils/pkpass';
    import type { Readable } from 'svelte/store';
    import { colors } from '~/variables';

    export let item: Item;
    export let height: number;
    export let pkPassCell: boolean = false;
    export let selectionMode: Readable<boolean>;

    $: ({ colorOnSurface, colorOnSurfaceVariant, colorPrimary } = $colors);

    $: ({ cardColor, hasCode, hasImage, hasStatus, label, page } = getCardDisplay(item));
    $: tile = getTileColors(cardColor, colorPrimary);
    $: status = pkPassCell && page?.pkpass ? getPKPassStatus(page.pkpass, lang, 'list') : undefined;
</script>

<!-- the content of the thumbnail is the slot: a photo, a tile or a pass each have their own template -->
<GroupedRow dividerInset={108} {height} {item} {selectionMode} {...$$restProps} on:tap on:longPress>
    <gridlayout backgroundColor={pkPassCell ? (page?.pkpass?.passData?.backgroundColor ?? tile.fill) : hasImage ? null : tile.fill} borderRadius={11} height={60} verticalAlignment="center" width={96}>
        <slot />
    </gridlayout>
    <gridlayout col={1} margin="0 12" rows="auto,auto" verticalAlignment="center">
        <label color={colorOnSurface} fontSize={__IOS__ ? 17 : 16} fontWeight={__IOS__ ? '600' : '500'} lineBreak="end" maxLines={1} text={item.doc.name || label} />
        <stacklayout orientation="horizontal" row={1}>
            <CardStatusChips extra={item.doc.extra} {status} verticalAlignment="center" />
            <slot name="chips" hasLeading={hasStatus || status?.length > 0} />
        </stacklayout>
    </gridlayout>
    <!-- the icons are always at the end of the row -->
    <stacklayout col={2} orientation="horizontal" verticalAlignment="center">
        <CardIcon color={colorOnSurfaceVariant} size={16} src={appIcon('qrcode')} visibility={hasCode ? 'visible' : 'collapsed'} />
        <CardIcon color={colorPrimary} marginLeft={hasCode ? 8 : 0} size={16} src={appIcon('favorite_on')} visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'} />
    </stacklayout>
</GroupedRow>
