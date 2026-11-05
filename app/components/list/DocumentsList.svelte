<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { showMenu } from '@nativescript-community/ui-menu';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { ObservableArray, StackLayout, View } from '@nativescript/core';
    import { throttle } from '@nativescript/core/utils';
    import { showError } from '@shared/utils/showError';
    import { Writable } from 'svelte/store';
    import DocumentRow from '~/components/list/DocumentRow.svelte';
    import DocumentTile from '~/components/list/DocumentTile.svelte';
    import { DocFolder } from '~/models/OCRDocument';
    import { appIcon } from '~/utils/appIcons';
    import { DOCUMENT_TILE_RATIO } from '~/utils/constants';
    import { getTileRadius } from '~/utils/documentCell';
    import { importImageFromCamera } from '~/utils/ui';
    import { colors, hasCamera, isLandscape, screenHeightDips, screenWidthDips, windowInset } from '~/variables';
    import MainList, { Item } from './MainList.svelte';

    // 16 from the screen edge to a tile, 12 between two tiles
    const rowMargin = 6;
    const gridPadding = 10;
    const GRID_COLUMNS = 2;
    const GRID_COLUMNS_LANDSCAPE = 4;
    const LIST_ROW_HEIGHT = 84;
</script>

<script lang="ts">
    let { colorOnPrimaryContainer, colorPrimaryContainer } = $colors;
    $: ({ colorOnPrimaryContainer, colorPrimaryContainer } = $colors);
    export let title = lc('documents');
    export let folder: DocFolder;
    let fabHolder: NativeViewElementNode<StackLayout>;
    let collectionView: NativeViewElementNode<CollectionView>;
    // the stored keys are shared with the trash and the picker: `default` is the grid, `condensed` the list
    let viewStyle: string;
    let nbColumns: Writable<number>;
    let selectionMode: Writable<boolean>;
    let syncEnabled: boolean;
    let folderItems: ObservableArray<Item>;
    let documents: ObservableArray<Item>;
    let getSyncColors: (item: Item) => string[];
    let onItemLongPress: (item: Item, event?) => Promise<void>;
    let onItemTap: (item: Item) => Promise<void>;
    let importImages: () => Promise<void>;
    let importDocument: (importPDFs?: boolean) => Promise<void>;
    let refreshCollectionView: () => void;

    // a list in landscape is a grid: a row would be too wide
    $: asList = viewStyle === 'condensed' && !$isLandscape;
    $: contentPadding = asList ? 0 : gridPadding;
    $: itemWidth = (($isLandscape ? screenHeightDips : screenWidthDips) - $windowInset.left - $windowInset.right - 2 * contentPadding) / $nbColumns - 2 * rowMargin;
    $: tileHeight = itemWidth * DOCUMENT_TILE_RATIO + 2 * rowMargin;
    $: tileRadius = getTileRadius(itemWidth, itemWidth * DOCUMENT_TILE_RATIO);
    $: if (tileHeight) {
        refreshCollectionView?.();
    }

    function updateColumns(isLandscape: boolean, orientationChanged = false) {
        $nbColumns = isLandscape ? GRID_COLUMNS_LANDSCAPE : viewStyle === 'condensed' ? 1 : GRID_COLUMNS;
        if (orientationChanged) {
            refreshCollectionView?.();
        }
    }

    function itemTemplateSelector(currentViewStyle: string, item?: Item) {
        if (item?.type) {
            return item.type;
        }
        return currentViewStyle === 'condensed' && !$isLandscape ? 'list' : 'grid';
    }

    async function onStartCam(inverseUseSystemCamera = false) {
        try {
            await importImageFromCamera({ folder, inverseUseSystemCamera });
        } catch (error) {
            showError(error);
        }
    }

    // Android: the small add button opens a menu next to it
    async function onAddButton(event: { object: View }) {
        try {
            await showMenu({
                anchor: event.object,
                placement: { horizontal: 'end', vertical: 'above' },
                items: [
                    { title: lc('import_from_file'), icon: appIcon('import_file'), onSelect: () => importDocument() },
                    { title: lc('import_from_image'), icon: appIcon('import_image'), onSelect: () => importImages() }
                ]
            });
        } catch (error) {
            showError(error);
        }
    }
</script>

<MainList
    actions={[
        { text: lc('import_from_image'), icon: 'import_image', onTap: () => importImages() },
        { text: lc('import_from_file'), icon: 'import_file', onTap: () => importDocument() },
        { text: lc('camera'), icon: 'camera', primary: true, onTap: () => onStartCam() }
    ]}
    {contentPadding}
    folderViewStyles={{
        horizontal: { name: lc('horizontal') },
        vertical: { name: lc('vertical') }
    }}
    {itemTemplateSelector}
    {title}
    {updateColumns}
    viewStyleChanged={(oldValue, newValue) => itemTemplateSelector(oldValue) !== itemTemplateSelector(newValue)}
    viewStyles={{
        default: { name: lc('grid'), icon: 'mdi-view-grid' },
        condensed: { name: lc('list'), icon: 'mdi-view-day' }
    }}
    bind:fabHolder
    bind:nbColumns
    bind:selectionMode
    bind:viewStyle
    bind:onItemTap
    bind:onItemLongPress
    bind:syncEnabled
    bind:folder
    bind:importDocument
    bind:importImages
    bind:refreshCollectionView
    bind:getSyncColors
    bind:documents
    bind:folderItems
    bind:collectionView>
    <Template key="grid" let:item>
        <DocumentTile
            height={tileHeight}
            {item}
            radius={tileRadius}
            syncColors={getSyncColors(item)}
            {syncEnabled}
            width={itemWidth}
            on:tap={() => onItemTap(item)}
            on:longPress={(e) => onItemLongPress(item, e)} />
    </Template>
    <Template key="list" let:item>
        <DocumentRow height={LIST_ROW_HEIGHT} {item} {selectionMode} syncColors={getSyncColors(item)} {syncEnabled} on:tap={() => onItemTap(item)} on:longPress={(e) => onItemLongPress(item, e)} />
    </Template>

    <stacklayout bind:this={fabHolder} slot="fab" class="fabHolder" marginBottom={Math.min(60, $windowInset.bottom)} orientation="horizontal">
        <uibutton class="addFab" {...{ src: appIcon('add') }} variant="contained" verticalAlignment="center" on:tap={throttle((event) => onAddButton(event), 500)} />
        {#if $hasCamera}
            <uifloatingactionbutton
                class="scanFab"
                backgroundColor={colorPrimaryContainer}
                color={colorOnPrimaryContainer}
                shrinkOnScroll={collectionView?.nativeView}
                src={appIcon('camera')}
                text={lc('scan')}
                on:tap={throttle(() => onStartCam(), 500)}
                on:longPress={() => onStartCam(true)} />
        {/if}
    </stacklayout>
</MainList>
