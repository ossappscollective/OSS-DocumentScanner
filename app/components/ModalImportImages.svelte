<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Pager } from '@nativescript-community/ui-pager';
    import { AndroidActivityBackPressedEventData, Application, GridLayout, Page } from '@nativescript/core';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { onDestroy, onMount } from 'svelte';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import CropView from '~/components/common/CropView.svelte';
    import { lc } from '~/helpers/locale';
    import { isEInk } from '~/helpers/theme';
    import { ImportImageData } from '~/models/OCRDocument';
    import { confirmGoBack, onBackButton } from '~/utils/ui';
    import { colors, fontScale, windowInset } from '~/variables';
    import PageIndicator from './common/PageIndicator.svelte';

    let page: NativeViewElementNode<Page>;
    let pager: NativeViewElementNode<Pager>;

    let { colorBackground, colorOnBackground } = $colors;
    // technique for only specific properties to get updated on store change
    $: ({ colorBackground, colorOnBackground } = $colors);
    const visualState = isEInk ? colorBackground : 'black';
    const textColor = isEInk ? colorOnBackground : 'white';

    export let items: ImportImageData[] = [];
    // export let editingImage;
    // export let quads;
    // export let qrcode: QRCodeData = null;
    function onTapFinish() {
        closeModal(items);
    }
    function onGoBack() {
        if (items.length > 1) {
            confirmGoBack({ message: lc('sure_cancel_import'), onGoBack: closeModal });
        } else {
            closeModal(undefined);
        }
    }
    const onAndroidBackButton = (data: AndroidActivityBackPressedEventData) =>
        onBackButton(page?.nativeView, () => {
            if (items.length > 1) {
                data.cancel = true;
                onGoBack();
            }
        });

    onMount(() => {
        if (__ANDROID__) {
            Application.android.on(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
    });
    onDestroy(() => {
        if (__ANDROID__) {
            Application.android.off(Application.android.activityBackPressedEvent, onAndroidBackButton);
        }
    });

    let currentIndex = 0;
    let currentItem: ImportImageData = items[currentIndex];
    function onSelectedIndex(event) {
        currentIndex = event.object.selectedIndex;
        currentItem = items[currentIndex];
        // DEV_LOG && console.log('onSelectedIndex', currentIndex, items.length);
    }
    function changePage(delta) {
        currentIndex += delta;
    }

    function resetCrop() {
        const item = items[currentIndex];
        const shouldInverse = item.imageRotation % 180 !== 0;
        const imageWidth = shouldInverse ? item.imageHeight : item.imageWidth;
        const imageHeight = shouldInverse ? item.imageWidth : item.imageHeight;
        DEV_LOG && console.log('resetCrop', item);
        // const editingImage = item.editingImage;
        item.quads = item.quads.map((quad) => [
            [0, 0],
            [imageWidth - 0, 0],
            [imageWidth - 0, imageHeight - 0],
            [0, imageHeight - 0]
        ]);
        pager.nativeView.refreshVisibleItems();
    }

    function getCurrentCropView() {
        return pager?.nativeView?.getChildView(currentIndex)?.getViewById<GridLayout>('cropView');
    }

    async function onUndo() {
        getCurrentCropView().notify({ eventName: 'undo' });
    }
    async function onRedo() {
        getCurrentCropView().notify({ eventName: 'redo' });
    }
    async function onUndosChanged() {
        //trigger update
        currentItem = currentItem;
    }
</script>

<page bind:this={page} id="modalImport" actionBarHidden={true} statusBarStyle={isEInk ? 'light' : 'dark'}>
    <gridlayout class="pageContent" backgroundColor={visualState} columns="auto,*,auto" rows="auto,*,auto,auto,auto" android:paddingBottom={$windowInset.bottom}>
        <pager bind:this={pager} id="pager" colSpan={3} disableSwipe={true} {items} row={1} selectedIndex={currentIndex} transformers="zoomOut" on:selectedIndexChange={onSelectedIndex}>
            <Template let:item>
                <CropView {...item} on:undosChanged={onUndosChanged} />
            </Template>
        </pager>
        <PageIndicator colSpan={3} horizontalAlignment="right" margin="10 10 0 0" row={2} scale={$fontScale} text={`${currentIndex + 1}/${items.length}`} />
        <uibutton
            class="icon-btn"
            color={textColor}
            fontSize={46}
            horizontalAlignment="left"
            rippleColor={textColor}
            row={3}
            text="mdi-chevron-left"
            variant="text"
            verticalAlignment="center"
            visibility={currentIndex > 0 ? 'visible' : 'hidden'}
            on:tap={() => changePage(-1)}
        />
        <label col={1} color={textColor} fontSize={13} row={3} text={lc('crop_edit_doc')} textAlignment="center" textWrap={true} verticalAlignment="center" />
        <uibutton
            class="icon-btn"
            col={2}
            color={textColor}
            fontSize={46}
            horizontalAlignment="right"
            rippleColor={textColor}
            row={3}
            text="mdi-chevron-right"
            variant="text"
            verticalAlignment="center"
            visibility={currentIndex < items.length - 1 ? 'visible' : 'hidden'}
            on:tap={() => changePage(1)}
        />
        <uibutton class="fab" colSpan={3} elevation={0} horizontalAlignment="center" row={4} text="mdi-check" variant="text" on:tap={onTapFinish} />
        <uibutton
            class="icon-btn"
            colSpan={3}
            color={textColor}
            horizontalAlignment="right"
            marginRight={10}
            row={4}
            text="mdi-arrow-expand-all"
            variant="text"
            verticalAlignment="center"
            on:tap={resetCrop}
        />
        <CActionBar backgroundColor="transparent" buttonsDefaultVisualState={visualState} colSpan={3} modalWindow={true} {onGoBack} title={null}>
            <uibutton class="actionBarButton" defaultVisualState={visualState} isEnabled={currentItem?.undos.length > 0} text="mdi-undo" variant="text" on:tap={onUndo} />
            <uibutton class="actionBarButton" defaultVisualState={visualState} isEnabled={currentItem?.redos.length > 0} text="mdi-redo" variant="text" on:tap={onRedo} />
        </CActionBar>
    </gridlayout>
</page>
