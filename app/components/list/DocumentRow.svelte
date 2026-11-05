<script lang="ts">
    import { Utils } from '@akylas/nativescript';
    import dayjs from 'dayjs';
    import CardChip from '~/components/common/CardChip.svelte';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import RowSelectionMarker from '~/components/common/RowSelectionMarker.svelte';
    import DocumentSyncChip from '~/components/list/DocumentSyncChip.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import { isEInk } from '~/helpers/theme';
    import { appIcon } from '~/utils/appIcons';
    import { isAutoName } from '~/utils/documentCell';
    import { getRowCorners } from '~/utils/groupedRows';
    import { computeStorageSizes } from '~/utils/originals';
    import { selectionTransition } from '~/utils/svelte/actions';
    import { formatStorageSizes } from '~/utils/ui';
    import type { Readable } from 'svelte/store';
    import { colors } from '~/variables';

    // rows of a group touch on iOS, Android keeps 2 between them
    const rowGap = __IOS__ ? 0 : 2;

    export let item: Item;
    export let height: number;
    export let selectionMode: Readable<boolean>;
    export let syncEnabled: boolean;
    export let syncColors: string[];

    let { colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSecondaryContainer, colorSurfaceContainerLow } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSecondaryContainer, colorSurfaceContainerLow } = $colors);

    // the content is pushed right by the leading marker while selecting
    $: markerWidth = $selectionMode ? 36 : 0;
    $: groupStart = item.position === 'first' || item.position === 'only';
    $: created = dayjs(item.doc.createdDate);
    $: title = isAutoName(item.doc.name) ? created.format('L LT') : item.doc.name;
    $: details = created.format('ll') + ' · ' + formatStorageSizes(computeStorageSizes(item.doc.pages));
</script>

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
        on:longPress>
        <gridlayout columns="auto,*,auto,auto" paddingLeft={markerWidth} use:selectionTransition={{ selectionMode }}>
            <RotableImageView
                id="imageView"
                borderRadius={9}
                decodeWidth={Utils.layout.toDevicePixels(48)}
                document={item.doc}
                fadeDuration={100}
                height={62}
                item={item.doc.pages[0]}
                sharedTransitionTag="document_{item.doc.id}_{item.doc.pages[0]?.id}"
                stretch="aspectFill"
                verticalAlignment="center"
                width={48} />
            <stacklayout col={1} margin="0 12" verticalAlignment="center">
                <label color={colorOnSurface} fontSize={__IOS__ ? 17 : 16} fontWeight={__IOS__ ? '600' : '500'} lineBreak="end" maxLines={1} text={title} />
                <label color={colorOnSurfaceVariant} fontSize={13} lineBreak="end" maxLines={1} text={details} />
                <wraplayout marginTop={5} orientation="horizontal">
                    <CardChip icon={appIcon('pages')} marginRight={6} text={item.doc.pages.length + ''} visibility={item.doc.pages.length > 1 ? 'visible' : 'collapsed'} />
                    <DocumentSyncChip max={6} {syncColors} visibility={syncEnabled ? 'visible' : 'collapsed'} />
                </wraplayout>
            </stacklayout>
            <CardIcon col={2} color={colorPrimary} marginRight={8} size={16} src={appIcon('favorite_on')} verticalAlignment="center" visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'} />
        </gridlayout>
        <RowSelectionMarker selected={item.selected} {selectionMode} />
        <gridlayout
            backgroundColor={colorOutlineVariant}
            height={0.5}
            marginLeft={68 + markerWidth}
            marginRight={-12}
            verticalAlignment="bottom"
            visibility={__IOS__ && (item.position === 'first' || item.position === 'middle') ? 'visible' : 'collapsed'} />
    </gridlayout>
</gridlayout>
