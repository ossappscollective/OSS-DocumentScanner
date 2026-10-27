<script lang="ts">
    import { Pager } from '@nativescript-community/ui-pager';
    import { Application, OrientationChangedEventData } from '@nativescript/core';
    import { onDestroy, onMount } from 'svelte';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import { isEInk } from '~/helpers/theme';
    import { colors, fontScale, windowInset } from '~/variables';
    import PageIndicator from './common/PageIndicator.svelte';

    // technique for only specific properties to get updated on store changex
    $: ({ colorOnBackground, colorPrimary } = $colors);
    export let useSVG = false;
    export let keepScreenAwake = false;
    export let refreshOnOrientationChange = false;
    export let screenBrightness = -1;
    /** shows an edit button in the bar, called with the index of the current image */
    export let onEdit: (index: number) => void = null;
    export let startPageIndex: number = 0;
    export let backgroundColor = isEInk ? 'white' : 'black';
    export let labelColor = isEInk ? 'black' : 'white';
    export let statusBarStyle: any = isEInk ? 'light' : 'dark';
    export let actionBarStyle: any = backgroundColor;
    export let images: { image?; subtitle?; sharedTransitionTag?; colorMatrix?; colorType?; margin?; rotation?; svg?; scale?; stretch? }[];
    let pager: NativeViewElementNode<Pager>;
    let imageFunctionArg = Application.orientation();

    let currentIndex = startPageIndex;
    const firstItem = images[currentIndex];

    // let currentImageSrc = firstItem.image;
    // let currentImageRotation = firstItem.rotation;
    // let currentImageColorMatrix = firstItem.colorMatrix || getColorMatrix(firstItem.colorType);

    function onSelectedIndex(event) {
        currentIndex = event.object.selectedIndex;
        // const item = images[currentIndex];
        // currentImageSrc = item.image;
        // currentImageRotation = item.rotation;
        // currentImageColorMatrix = item.colorMatrix || getColorMatrix(item.colorType);
    }
    // function onFirstLayout(item, e) {
    //     console.log('onFirstLayout');
    //     if (item.rotation % 180 === 90) {
    //         const currentWidth = layout.toDeviceIndependentPixels(e.object.getMeasuredWidth());
    //         const currentHeight = layout.toDeviceIndependentPixels(e.object.getMeasuredHeight());
    //         const delta = item.rotation % 180 === 0 ? 0 : (currentWidth - currentHeight) / 2;
    //         Object.assign(e.object, {
    //             translateX: delta,
    //             translateY: -delta,
    //             width: currentHeight,
    //             height: currentWidth
    //         });
    //     }
    // }

    // $: {
    //     colorType = document.pages[currentIndex].colorType || 0;
    // }
    // async function setColorType(type: number) {
    //     colorType = type;
    //     try {
    //         await document.updatePage(currentIndex, {
    //             colorType: type
    //             // colorMatrix: getColorMatrix(type)
    //         });
    //         // pages.setItem(currentIndex, current);
    //     } catch (err) {
    //         showError(err);
    //     }
    // }

    // function getCurrentImageView() {
    //     return pager?.nativeView?.getChildView(currentIndex)?.getViewById<Img>('imageView');
    // }

    // async function shareItem(item: OCRPage) {
    //     try {
    //         await share({ file: item.imagePath });
    //     } catch (error) {
    //         showError(error);
    //     }
    // }

    function onOrientationChanged(event: OrientationChangedEventData) {
        imageFunctionArg = event.newValue;
        // setTimeout(() => {
        if (refreshOnOrientationChange) {
            pager?.nativeElement.refresh();
        }
        // }, 1000);
    }

    onMount(() => {
        Application.on(Application.orientationChangedEvent, onOrientationChanged);
    });
    onDestroy(() => {
        Application.off(Application.orientationChangedEvent, onOrientationChanged);
    });
</script>

<page id="fullscreenImage" actionBarHidden={true} {backgroundColor} {keepScreenAwake} {screenBrightness} screenOrientation="all" {statusBarStyle}>
    <gridlayout class="pageContent" rows="auto,*,auto" android:paddingBottom={$windowInset.bottom}>
        <!-- <image blurRadius={20} colorMatrix={currentImageColorMatrix} fadeDuration={100} imageRotation={currentImageRotation} opacity={0.3} rowSpan={2} src={currentImageSrc} stretch="aspectFill" /> -->

        <pager
            bind:this={pager}
            itemTemplateSelector={() => (useSVG ? 'svg' : 'default')}
            items={images}
            preserveIndexOnItemsChange={true}
            rowSpan={2}
            selectedIndex={startPageIndex}
            transformers="zoomOut"
            on:selectedIndexChange={onSelectedIndex}
            android:marginTop={$windowInset.top}
        >
            <Template let:item>
                <gridlayout rows="*,auto" width="100%">
                    <RotableImageView id="imageView" {imageFunctionArg} {item} margin={item.margin} sharedTransitionTag={item.sharedTransitionTag} zoomable={true} />
                    <label
                        color={labelColor}
                        fontSize={30}
                        fontWeight="bold"
                        ios:linkColor={colorOnBackground}
                        maxLines={2}
                        paddingTop={5}
                        row={1}
                        selectable={true}
                        sharedTransitionTag={item.labelSharedTransitionTag}
                        text={item.subtitle}
                        textAlignment="center"
                        verticalAlignment="bottom"
                        visibility={item.subtitle ? 'visible' : 'hidden'}
                    />
                </gridlayout>
            </Template>
            <Template key="svg" let:item>
                <gridlayout rows="*,auto" width="100%">
                    <svgview
                        margin={item.margin}
                        scaleX={item.scale ?? 1}
                        scaleY={item.scale ?? 1}
                        sharedTransitionTag={item.sharedTransitionTag}
                        src={item.svg}
                        stretch={item.stretch ?? 'aspectFit'}
                    />
                    <label
                        color={labelColor}
                        fontSize={30}
                        fontWeight="bold"
                        maxLines={2}
                        paddingTop={5}
                        row={1}
                        selectable={true}
                        sharedTransitionTag={item.labelSharedTransitionTag}
                        text={item.subtitle}
                        textAlignment="center"
                        verticalAlignment="bottom"
                        visibility={item.subtitle ? 'visible' : 'hidden'}
                    />
                </gridlayout>
            </Template>
        </pager>
        <PageIndicator horizontalAlignment="right" margin={10} row={2} scale={$fontScale} text={`${currentIndex + 1}/${images.length}`} verticalAlignment="bottom" />

        <CActionBar backgroundColor="transparent" buttonsDefaultVisualState={actionBarStyle} titleProps={{ autoFontSize: true, padding: 0 }}>
            {#if onEdit}
                <uibutton class="actionBarButton" defaultVisualState={actionBarStyle} text="mdi-pencil" variant="text" on:tap={() => onEdit(currentIndex)} />
            {/if}
        </CActionBar>
    </gridlayout>
</page>
