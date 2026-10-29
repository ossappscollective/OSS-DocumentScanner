<script context="module" lang="ts">
    import { Color, Utils, View } from '@akylas/nativescript';

    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionViewWithSwipeMenu } from '@nativescript-community/ui-collectionview-swipemenu';
    import { navigate } from '@shared/utils/svelte/ui';
    import { Writable } from 'svelte/store';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import SelectedIndicator from '~/components/common/SelectedIndicator.svelte';
    import SyncIndicator from '~/components/common/SyncIndicator.svelte';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import CardChip from '~/components/common/CardChip.svelte';
    import { Item } from '~/components/list/MainList.svelte';
    import PKPassCardCell from '~/components/pkpass/PKPassCardCell.svelte';
    import { isEInk } from '~/helpers/theme';
    import { lc, lcp } from '~/helpers/locale';
    import { appIcon } from '~/utils/appIcons';
    import { selectionMode } from '~/utils/svelte/store';
    import { getTileColors, pickCardColor } from '~/utils/cardColors';
    import { CARD_RATIO } from '~/utils/constants';
    import { colors } from '~/variables';
    import dayjs from 'dayjs';
    const rowMargin = 8;
    const tileRadius = __IOS__ ? 18 : 20;
</script>

<script lang="ts">
    let { colorBackground, colorOnSurface, colorOnSurfaceVariant, colorPrimary, colorSecondaryContainer, colorSurfaceContainerLow } = $colors;
    $: ({ colorBackground, colorOnSurface, colorOnSurfaceVariant, colorPrimary, colorSecondaryContainer, colorSurfaceContainerLow } = $colors);

    export let collectionView: NativeViewElementNode<CollectionViewWithSwipeMenu>;
    export let itemWidth: number;
    export let itemHeight: number;
    export let height: number;
    export let nbColumns: Writable<number>;
    export let item: Item;
    export let pkPassCell: boolean = false;
    export let alwaysShowNames: boolean = true;
    export let syncEnabled: boolean;
    export let layout: string;
    export let syncColors: string[];

    // function animateCards(animOptions, startIndex, endIndex = -1) {
    //     let index = startIndex;
    //     const startView = collectionView?.nativeElement.getViewForItemAtIndex(startIndex);

    //     let foundFirst = false;
    //     collectionView?.nativeElement.eachChild((child: View) => {
    //         if (foundFirst) {
    //             if (endIndex === -1 || index <= endIndex) {
    //                 child.animate(animOptions);
    //                 index++;
    //             }
    //         } else {
    //             if (child === startView) {
    //                 foundFirst = true;
    //             }
    //         }
    //         return true;
    //     });
    // }
    // function translateCards(startIndex, endIndex = -1) {
    //     animateCards(
    //         {
    //             duration: 100,
    //             translate: {
    //                 x: 0,
    //                 y: 160
    //             }
    //         },
    //         startIndex,
    //         endIndex
    //     );
    // }
    // function hideCards(startIndex, endIndex = -1) {
    //     animateCards(
    //         {
    //             duration: 100,
    //             translate: {
    //                 x: 0,
    //                 y: 0
    //             }
    //         },
    //         startIndex,
    //         endIndex
    //     );
    // }
    // function fullCardDrawerTranslationFunction(side, width, value, delta, progress) {
    //     const result = {
    //         mainContent: {
    //             translateX: side === 'right' ? -delta : delta
    //         },
    //         rightDrawer: {
    //             // translateX: width + (side === 'right' ? -delta : delta)
    //         },
    //         leftDrawer: {
    //             // translateX: (side === 'right' ? -delta : delta) - width
    //         },
    //         backDrop: {
    //             translateX: side === 'right' ? -delta : delta.dev,
    //             opacity: progress * 0.01
    //         }
    //     };

    //     return result;
    // }
    function getItemRotableImageParams(item: Item) {
        return {
            id: 'imageView',
            document: item.doc,
            // backgroundColor: item.doc.pages[0].colors?.[0] || item.doc.extra?.color,
            borderRadius: tileRadius,
            decodeWidth: Utils.layout.toDevicePixels(itemWidth) * CARD_RATIO,
            fadeDuration: 100,
            item: item.doc.pages[0],
            sharedTransitionTag: `document_${item.doc.id}_${item.doc.pages[0].id}`,
            stretch: 'aspectFill'
        };
    }

    $: page = item.doc.pages[0];
    $: hasImage = !!page?.imagePath;
    $: hasCode = !!page?.qrcode?.length;
    $: stacked = layout === 'cardholder' || layout === 'full';
    // the default name is a timestamp: a tile only shows its date
    $: autoName = !item.doc.name || /\d+:\d+:\d+/.test(item.doc.name);
    $: label = autoName ? dayjs(item.doc.createdDate).format('ll') : item.doc.name;
    $: infoSegments = [
        ...(item.doc.pages.length > 1 ? [{ icon: appIcon('pages'), text: item.doc.pages.length + '' }] : []),
        ...(hasCode ? [{ icon: appIcon('qrcode') }] : []),
        ...(item.doc.favorite === 1 ? [{ icon: appIcon('favorite_on') }] : [])
    ];
    $: showLabel = !hasImage || !autoName || alwaysShowNames;
    $: cardColor = isEInk ? null : pickCardColor(item.doc.extra?.color, [page?.extra?.color, ...(page?.colors ?? [])]);
    $: tile = getTileColors(cardColor, colorPrimary);
    $: subtitle = pkPassCell ? lc('wallet_pass') : hasImage ? lcp('photos_count', item.doc.pages.length) : '';

    function getItemHolderParams(layout, item: Item, nbColumns, tileFill: string, selected: boolean) {
        const imagePage = item.doc.pages[0];
        const result = {
            backgroundColor: isEInk ? null : imagePage?.imagePath ? new Color(imagePage.extra?.color ?? imagePage.colors?.[1] ?? colorBackground) : new Color(tileFill),
            borderRadius: tileRadius,
            scaleX: selected && layout === 'columns' ? 0.95 : 1,
            scaleY: selected && layout === 'columns' ? 0.95 : 1
        };
        switch (layout) {
            case 'cardholder':
            case 'full':
                Object.assign(result, {
                    boxShadow: isEInk ? 0 : `0 -3 10 #00000033`,
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

    // async function showImages(item: Item) {
    //     const component = (await import('~/components/FullScreenImageViewer.svelte')).default;
    //     const doc = item.doc;
    //     navigate({
    //         page: component,
    //         // transition: __ANDROID__ ? SharedTransition.custom(new PageTransition(300, undefined, 10), {}) : undefined,
    //         props: {
    //             images: doc.pages.map((page, index) => ({
    //                 sharedTransitionTag: `document_${doc.id}_${page.id}`,
    //                 name: doc.name,
    //                 image: page.imagePath,
    //                 ...page
    //             })),
    //             startPageIndex: 0
    //         }
    //     });
    //     collectionView?.nativeElement.closeCurrentMenu();
    // }

    // function onItemTouch(item: Item, event) {
    //     if (layout !== 'cardholder') {
    //         return;
    //     }
    //     if (__ANDROID__) {
    //         // const index = documents.findIndex((d) => d.doc.id === item.doc.id);
    //         switch (event.action) {
    //             case 'down':
    //                 (event.object as View).animate({
    //                     duration: 100,
    //                     translate: {
    //                         x: 0,
    //                         y: -40
    //                     }
    //                 });
    //                 break;

    //             case 'up':
    //             case 'cancel':
    //                 (event.object as View).animate({
    //                     duration: 100,
    //                     translate: {
    //                         x: 0,
    //                         y: 0
    //                     }
    //                 });
    //                 break;
    //         }
    //     }
    // }
</script>

<!-- <swipemenu
    id="swipeMenu"
    {height}
    openAnimationDuration={100}
    rightSwipeDistance={0}
    startingSide={item.startingSide}
    translationFunction={fullCardDrawerTranslationFunction}
    width="100%"
    {...$$restProps}
    on:start={(e) => onFullCardItemTouch(item, { action: 'down' })}
    on:close={(e) => onFullCardItemTouch(item, { action: 'up' })}> -->
<gridlayout {height} width="100%" {...$$restProps}>
    {#if layout === 'list'}
        <gridlayout
            backgroundColor={isEInk ? 'transparent' : item.selected ? colorSecondaryContainer : colorSurfaceContainerLow}
            borderRadius={__IOS__ ? 14 : 6}
            columns="auto,*,auto,auto,auto"
            margin="1 16"
            padding="0 12 0 8"
            rippleColor={colorOnSurface}
            on:tap
            on:longPress
        >
            <gridlayout
                backgroundColor={pkPassCell ? (page?.pkpass?.passData?.backgroundColor ?? tile.fill) : hasImage ? null : tile.fill}
                borderRadius={11}
                height={60}
                verticalAlignment="center"
                width={96}
            >
                {#if hasImage}
                    <RotableImageView {...getItemRotableImageParams(item)} borderRadius={11} decodeWidth={Utils.layout.toDevicePixels(96)} />
                {:else if !pkPassCell}
                    <label color={tile.text} fontSize={12} fontWeight="bold" lineBreak="end" margin="4 6" maxLines={3} text={label} textAlignment="center" verticalAlignment="center" />
                {/if}
            </gridlayout>
            <label col={1} color={colorOnSurface} lineBreak="end" margin="0 12" textWrap={true} verticalAlignment="center">
                <span fontSize={__IOS__ ? 17 : 16} fontWeight={__IOS__ ? '600' : '500'} text={item.doc.name || label} />
                <span color={colorOnSurfaceVariant} fontSize={14} text={subtitle ? '\n' + subtitle : ''} />
            </label>
            <CardIcon col={2} color={colorOnSurfaceVariant} marginRight={8} size={16} src={appIcon('qrcode')} verticalAlignment="center" visibility={hasCode ? 'visible' : 'collapsed'} />
            <CardIcon col={3} color={colorPrimary} marginRight={8} size={16} src={appIcon('favorite_on')} verticalAlignment="center" visibility={item.doc.favorite === 1 ? 'visible' : 'collapsed'} />
            <CardIcon col={4} color={colorOnSurfaceVariant} size={16} src={appIcon('chevron')} verticalAlignment="center" visibility={$selectionMode || __ANDROID__ ? 'collapsed' : 'visible'} />
            <SelectedIndicator margin="12 0 0 12" selected={item.selected} />
        </gridlayout>
    {:else}
        <gridlayout id="cardItemTemplate" class="cardItemTemplate" prop:mainContent {...getItemHolderParams(layout, item, $nbColumns, tile.fill, item.selected)} on:tap on:longPress>
            {#if pkPassCell}
                <PKPassCardCell {item} {itemWidth} {layout} pkpass={item.doc.pages[0]?.pkpass} />
            {:else if hasImage}
                <RotableImageView {...getItemRotableImageParams(item)} />
                {#if showLabel}
                    <CardChip
                        fontWeight={autoName ? '500' : '600'}
                        horizontalAlignment="left"
                        margin={8}
                        marginLeft={stacked && item.selected ? 40 : 8}
                        text={label}
                        verticalAlignment={stacked ? 'top' : 'bottom'}
                    />
                {/if}
                {#if infoSegments.length}
                    <CardChip horizontalAlignment="right" margin={8} segments={infoSegments} verticalAlignment="top" />
                {/if}
            {:else}
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
                {#if item.doc.favorite === 1}
                    <CardChip horizontalAlignment="right" icon={appIcon('favorite_on')} margin={8} verticalAlignment="top" />
                {/if}
            {/if}
            <SelectedIndicator selected={item.selected} />
            <SyncIndicator {syncColors} verticalAlignment="top" visible={syncEnabled} />
        </gridlayout>
        <!-- <uibutton prop:rightDrawer class="mdi" fontSize={40} height={60} text="mdi-fullscreen" variant="text" verticalAlignment="center" width={60} on:tap={() => showImages(item)} />
</swipemenu> -->
    {/if}
</gridlayout>
