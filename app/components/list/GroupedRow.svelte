<script lang="ts">
    import RowSelectionMarker from '~/components/common/RowSelectionMarker.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { isEInk } from '~/helpers/theme';
    import { getRowCorners } from '~/utils/groupedRows';
    import { selectionTransition } from '~/utils/svelte/actions';
    import type { Readable } from 'svelte/store';
    import { colors } from '~/variables';

    // rows of a group touch on iOS, Android keeps 2 between them
    const rowGap = __IOS__ ? 0 : 2;

    export let item: Item;
    export let height: number;
    export let selectionMode: Readable<boolean>;
    /** where the iOS divider starts: the width of the thumbnail and its margins */
    export let dividerInset: number;

    $: ({ colorOnSurface, colorOutlineVariant, colorSecondaryContainer, colorSurfaceContainerLow } = $colors);

    // the content is pushed right by the leading marker while selecting
    $: markerWidth = $selectionMode ? 36 : 0;
    $: groupStart = item.position === 'first' || item.position === 'only';
</script>

<!-- the slot is the 3 columns of the row: thumbnail, texts, trailing icon -->
<gridlayout height={height + rowGap + (groupStart ? 8 : 0)} width="100%" {...$$restProps}>
    <gridlayout
        backgroundColor={isEInk ? 'transparent' : item.selected ? colorSecondaryContainer : colorSurfaceContainerLow}
        {...getRowCorners(item.position, __IOS__)}
        {height}
        margin="{rowGap / 2} 16"
        padding="0 12 0 8"
        rippleColor={colorOnSurface}
        verticalAlignment="bottom"
        on:tap
        on:longPress
    >
        <gridlayout columns="auto,*,auto" paddingLeft={markerWidth} use:selectionTransition={{ selectionMode }}>
            <slot />
        </gridlayout>
        <RowSelectionMarker {selectionMode} selected={item.selected} />
        <gridlayout
            backgroundColor={colorOutlineVariant}
            height={0.5}
            marginLeft={dividerInset + markerWidth}
            marginRight={-12}
            verticalAlignment="bottom"
            visibility={__IOS__ && (item.position === 'first' || item.position === 'middle') ? 'visible' : 'collapsed'}
        />
    </gridlayout>
</gridlayout>
