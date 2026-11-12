<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionViewWithSwipeMenu } from '@nativescript-community/ui-collectionview-swipemenu';
    import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { ApplicationSettings, ObservableArray, StackLayout, View } from '@nativescript/core';
    import { throttle } from '@nativescript/core/utils';
    import { showMenu } from '@nativescript-community/ui-menu';
    import { prefs } from '@shared/services/preferences';
    import { showError } from '@shared/utils/showError';
    import { onDestroy, onMount } from 'svelte';
    import type { Writable } from 'svelte/store';
    import PKPassCardCell from '~/components/pkpass/PKPassCardCell.svelte';
    import CardPhotoFace from '~/components/list/CardPhotoFace.svelte';
    import CardRow from '~/components/list/CardRow.svelte';
    import CardRowPass from '~/components/list/CardRowPass.svelte';
    import CardRowPhoto from '~/components/list/CardRowPhoto.svelte';
    import CardRowTile from '~/components/list/CardRowTile.svelte';
    import CardTile from '~/components/list/CardTile.svelte';
    import CardTileFace from '~/components/list/CardTileFace.svelte';
    import { DocFolder, OCRDocument } from '~/models/OCRDocument';
    import {
        CARD_RATIO,
        CARDHOLDER_GAP,
        DEFAULT_CARD_ALWAYS_SHOW_NAME,
        DEFAULT_NB_COLUMNS,
        DEFAULT_NB_COLUMNS_LANDSCAPE,
        SETTINGS_CARD_ALWAYS_SHOW_NAME,
        SETTINGS_NB_COLUMNS,
        SETTINGS_NB_COLUMNS_LANDSCAPE,
        SHEET_SOFT_INPUT_MODE
    } from '~/utils/constants';
    import { appIcon } from '~/utils/appIcons';
    import { getCardVariant } from '~/utils/cardCell';
    import { goToDocumentAfterScan, importImageFromCamera } from '~/utils/ui';
    import { colors, hasCamera, isLandscape, screenHeightDips, screenWidthDips, windowInset } from '~/variables';
    import MainList, { Item } from './MainList.svelte';

    // 16 from the screen edge to a tile, 12 between two tiles
    const rowMargin = 6;
    const columnsPadding = 10;
    const FULL_VISIBLE_RATIO = 0.29;
</script>

<script lang="ts">
    $: ({ colorOnPrimaryContainer, colorPrimaryContainer } = $colors);
    let fabHolder: NativeViewElementNode<StackLayout>;
    let collectionView: NativeViewElementNode<CollectionViewWithSwipeMenu>;
    let viewStyle: string;
    let nbColumns: Writable<number>;
    let selectionMode: Writable<boolean>;
    let syncEnabled: boolean;

    export let alwaysShowNames = ApplicationSettings.getBoolean(SETTINGS_CARD_ALWAYS_SHOW_NAME, DEFAULT_CARD_ALWAYS_SHOW_NAME);
    const onAlwaysShowNamePreferenceChanged = () => {
        alwaysShowNames = ApplicationSettings.getBoolean(SETTINGS_CARD_ALWAYS_SHOW_NAME, DEFAULT_CARD_ALWAYS_SHOW_NAME);
        refreshCollectionView();
    };
    prefs.on(`key:${SETTINGS_CARD_ALWAYS_SHOW_NAME}`, onAlwaysShowNamePreferenceChanged);
    onDestroy(() => prefs.off(`key:${SETTINGS_CARD_ALWAYS_SHOW_NAME}`, onAlwaysShowNamePreferenceChanged));

    export let folder: DocFolder;
    let getSyncColors: (item: Item) => string[];
    let onItemLongPress: (item: Item, event?) => Promise<void>;
    let onItemTap: (item: Item) => Promise<void>;
    let importDocument: (importPDFs?: boolean) => Promise<void>;
    let importImages: () => Promise<void>;
    let refreshCollectionView: () => void;

    const title = lc('cards');

    let folderItems: ObservableArray<Item>;
    let documents: ObservableArray<Item>;
    $: contentPadding = viewStyle === 'columns' ? columnsPadding : 0;
    $: itemWidth = (($isLandscape ? screenHeightDips : screenWidthDips) - $windowInset.left - $windowInset.right - 2 * contentPadding) / $nbColumns - 2 * rowMargin;
    $: itemHeight = itemWidth * CARD_RATIO + 2 * rowMargin;
    $: itemHeight, refreshCollectionView?.();

    $: itemRowHeight = getItemRowHeight(viewStyle, itemHeight, $isLandscape);
    $: stripHeight = getStripHeight(viewStyle, itemHeight, itemRowHeight);

    async function createCard() {
        try {
            const CreateCard = (await import('~/components/widgets/CreateCard.svelte')).default;
            const result = await showBottomSheet({
                parent: this,
                view: CreateCard,
                windowSoftInputMode: SHEET_SOFT_INPUT_MODE,
                ignoreTopSafeArea: true
            });
            DEV_LOG && console.log('CreateCard', result);
            if (result) {
                const document = await OCRDocument.createDocument(
                    [
                        {
                            qrcode: result.code?.length
                                ? [
                                      {
                                          text: result.code,
                                          format: result.codeFormat
                                      }
                                  ]
                                : undefined
                        }
                    ],
                    folder,
                    {
                        name: result.name,
                        ...(result.color ? { extra: { color: result.color } } : {})
                    }
                );
                await goToDocumentAfterScan(document, -1, true);
            }
        } catch (error) {
            showError(error);
        }
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
                    { title: lc('import_from_image'), icon: appIcon('import_image'), onSelect: () => importImages() },
                    { title: lc('create'), icon: appIcon('add'), onSelect: () => createCard() }
                ]
            });
        } catch (error) {
            showError(error);
        }
    }
    function getItemOverlap(viewStyle, itemHeight) {
        // DEV_LOG && console.log('getItemOverlap', viewStyle, itemHeight);
        switch (viewStyle) {
            case 'full':
                return (item, position) => {
                    // the folders (a row or one item each) come before the cards: only the cards overlap, but not the first row of them
                    if (!item?.doc || position < (documents?.findIndex((current) => !!current.doc) ?? 0) + $nbColumns) {
                        return [0, 0, 0, 0];
                    }
                    return [-(1 - FULL_VISIBLE_RATIO) * itemHeight, 0, 0, 0];
                };
            default:
                return null;
        }
    }
    // the part of a card which is seen above the next one: the title on top, the chips at the bottom
    function getStripHeight(viewStyle, itemHeight, rowHeight) {
        switch (viewStyle) {
            case 'full':
                return itemHeight * FULL_VISIBLE_RATIO;
            case 'cardholder':
                // the card starts after its margin
                return rowHeight - CARDHOLDER_GAP;
        }
    }
    function getItemRowHeight(viewStyle, itemHeight, isLandscape) {
        switch (viewStyle) {
            case 'cardholder':
                return itemHeight * (isLandscape ? 0.6 : 0.3);
            case 'list':
                return isLandscape ? itemHeight : 72;
            default:
                return itemHeight;
        }
    }
    function itemTemplateSelector(viewStyle, item?: Item) {
        if (item?.type) {
            return item.type;
        }
        const variant = getCardVariant(item);
        return (variant ? variant + '_' : '') + (viewStyle === 'list' && $isLandscape ? 'columns' : viewStyle);
    }
    function updateColumns(isLandscape, orientationChanged: boolean = false) {
        $nbColumns = isLandscape
            ? ApplicationSettings.getNumber(SETTINGS_NB_COLUMNS_LANDSCAPE, DEFAULT_NB_COLUMNS_LANDSCAPE)
            : ApplicationSettings.getNumber(SETTINGS_NB_COLUMNS, viewStyle === 'columns' ? 2 : DEFAULT_NB_COLUMNS);
        if (orientationChanged) {
            refreshCollectionView?.();
        }
    }
    onMount(() => {
        // DEV_LOG && console.log('CardsList', 'onMount', viewStyle);
        updateColumns($isLandscape);
    });
</script>

<MainList
    actions={[
        { text: lc('import_from_image'), icon: 'import_image', onTap: () => importImages() },
        { text: lc('import_from_file'), icon: 'import_file', onTap: () => importDocument() },
        { text: lc('create'), icon: 'add', onTap: () => createCard() },
        { text: lc('camera'), icon: 'camera', primary: true, onTap: () => onStartCam() }
    ]}
    collectionViewOptions={{
        // spanSize: (item) => itemTemplateSpanSize(viewStyle, item),
        swipeMenuId: 'swipeMenu',
        itemOverlap: getItemOverlap(viewStyle, itemHeight)
    }}
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
        cardholder: { name: lc('cardholder'), icon: 'mdi-view-agenda' },
        full: { name: lc('full'), icon: 'mdi-view-split-horizontal' },
        columns: { name: lc('columns'), icon: 'mdi-view-grid' },
        list: { name: lc('list'), icon: 'mdi-view-day' }
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
    bind:collectionView
>
    <Template key="cardholder" let:item>
        <absolutelayout height={itemRowHeight}>
            <CardTile
                height={itemHeight}
                {item}
                layout="cardholder"
                {nbColumns}
                {stripHeight}
                syncColors={getSyncColors(item)}
                {syncEnabled}
                on:tap={() => onItemTap(item)}
                on:longPress={(e) => onItemLongPress(item, e)}
            >
                <CardTileFace {item} layout="cardholder" {stripHeight} />
            </CardTile>
        </absolutelayout>
    </Template>
    <Template key="full" let:item>
        <CardTile height={itemRowHeight} {item} layout="full" {nbColumns} syncColors={getSyncColors(item)} {syncEnabled} on:tap={() => onItemTap(item)} on:longPress={(e) => onItemLongPress(item, e)}>
            <CardTileFace {item} layout="full" {stripHeight} />
        </CardTile>
    </Template>
    <Template key="columns" let:item>
        <CardTile
            height={itemRowHeight}
            {item}
            layout="columns"
            {nbColumns}
            syncColors={getSyncColors(item)}
            {syncEnabled}
            on:tap={() => onItemTap(item)}
            on:longPress={(e) => onItemLongPress(item, e)}
        >
            <CardTileFace {item} layout="columns" />
        </CardTile>
    </Template>
    <Template key="list" let:item>
        <CardRow height={itemRowHeight} {selectionMode} {item} on:tap={() => onItemTap(item)} on:longPress={(e) => onItemLongPress(item, e)}>
            <CardRowTile {item} />
        </CardRow>
    </Template>
    <Template key="photo_cardholder" let:item>
        <absolutelayout height={itemRowHeight}>
            <CardTile
                height={itemHeight}
                {item}
                layout="cardholder"
                {nbColumns}
                {stripHeight}
                syncColors={getSyncColors(item)}
                {syncEnabled}
                on:tap={() => onItemTap(item)}
                on:longPress={(e) => onItemLongPress(item, e)}
            >
                <CardPhotoFace {alwaysShowNames} {item} {itemWidth} layout="cardholder" {stripHeight} />
            </CardTile>
        </absolutelayout>
    </Template>
    <Template key="photo_full" let:item>
        <CardTile height={itemRowHeight} {item} layout="full" {nbColumns} syncColors={getSyncColors(item)} {syncEnabled} on:tap={() => onItemTap(item)} on:longPress={(e) => onItemLongPress(item, e)}>
            <CardPhotoFace {alwaysShowNames} {item} {itemWidth} layout="full" {stripHeight} />
        </CardTile>
    </Template>
    <Template key="photo_columns" let:item>
        <CardTile
            height={itemRowHeight}
            {item}
            layout="columns"
            {nbColumns}
            syncColors={getSyncColors(item)}
            {syncEnabled}
            on:tap={() => onItemTap(item)}
            on:longPress={(e) => onItemLongPress(item, e)}
        >
            <CardPhotoFace {alwaysShowNames} {item} {itemWidth} layout="columns" />
        </CardTile>
    </Template>
    <Template key="photo_list" let:item>
        <CardRow height={itemRowHeight} {selectionMode} {item} on:tap={() => onItemTap(item)} on:longPress={(e) => onItemLongPress(item, e)}>
            <CardRowPhoto {item} />
        </CardRow>
    </Template>
    <Template key="pkpass_cardholder" let:item>
        <absolutelayout height={itemRowHeight}>
            <CardTile
                height={itemHeight}
                {item}
                layout="cardholder"
                {nbColumns}
                {stripHeight}
                syncColors={getSyncColors(item)}
                {syncEnabled}
                on:tap={() => onItemTap(item)}
                on:longPress={(e) => onItemLongPress(item, e)}
            >
                <PKPassCardCell {item} {itemWidth} layout="cardholder" pkpass={item.doc.pages[0]?.pkpass} />
            </CardTile>
        </absolutelayout>
    </Template>
    <Template key="pkpass_full" let:item>
        <CardTile height={itemRowHeight} {item} layout="full" {nbColumns} syncColors={getSyncColors(item)} {syncEnabled} on:tap={() => onItemTap(item)} on:longPress={(e) => onItemLongPress(item, e)}>
            <PKPassCardCell {item} {itemWidth} layout="full" pkpass={item.doc.pages[0]?.pkpass} />
        </CardTile>
    </Template>
    <Template key="pkpass_columns" let:item>
        <CardTile
            height={itemRowHeight}
            {item}
            layout="columns"
            {nbColumns}
            syncColors={getSyncColors(item)}
            {syncEnabled}
            on:tap={() => onItemTap(item)}
            on:longPress={(e) => onItemLongPress(item, e)}
        >
            <PKPassCardCell {item} {itemWidth} layout="columns" pkpass={item.doc.pages[0]?.pkpass} />
        </CardTile>
    </Template>
    <Template key="pkpass_list" let:item>
        <CardRow height={itemRowHeight} {selectionMode} {item} pkPassCell={true} on:tap={() => onItemTap(item)} on:longPress={(e) => onItemLongPress(item, e)}>
            <CardRowPass {item} />
        </CardRow>
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
                on:longPress={() => onStartCam(true)}
            />
        {/if}
    </stacklayout>
</MainList>
