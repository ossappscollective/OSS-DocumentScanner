<script lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Frame, Label } from '@nativescript/core';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { QuadPoint } from 'plugin-nativeprocessor';
    import CropView from '~/components/common/CropView.svelte';
    import { lc } from '~/helpers/locale';
    import { isEInk } from '~/helpers/theme';
    import { ImportImageData } from '~/models/OCRDocument';
    import { appIcon } from '~/utils/appIcons';
    import { hapticImpact } from '~/utils/haptics';
    import { colors, windowInset } from '~/variables';
    let { colorPrimary } = $colors;
    // technique for only specific properties to get updated on store change
    $: ({ colorPrimary } = $colors);

    let frame: NativeViewElementNode<Frame>;
    let hint: NativeViewElementNode<Label>;
    let cropView: CropView;

    // the editor is dark in every theme
    const screenColor = isEInk ? '#FFFFFF' : '#0E0E10';
    const textColor = isEInk ? '#000000' : __IOS__ ? '#FFFFFF' : '#E2E2E9';
    const hintColor = isEInk ? '#000000B3' : '#FFFFFFB3';

    export let cropItem: ImportImageData;
    export let quad;
    export let quadChanged = false;
    let quads;
    $: quads = quad ? [quad] : [];

    function forceDark() {
        const controller = frame?.nativeView?.viewController;
        if (__IOS__ && !isEInk && controller) {
            controller.overrideUserInterfaceStyle = UIUserInterfaceStyle.Dark;
        }
    }
    function onRecropTapFinish() {
        closeModal(quadChanged ? quads[0] : undefined);
    }
    function onClose() {
        closeModal();
    }

    function getFullQuad(): QuadPoint[] {
        const shouldInverse = cropItem.imageRotation % 180 !== 0;
        const imageWidth = shouldInverse ? cropItem.imageHeight : cropItem.imageWidth;
        const imageHeight = shouldInverse ? cropItem.imageWidth : cropItem.imageHeight;
        return [
            [0, 0],
            [imageWidth, 0],
            [imageWidth, imageHeight],
            [0, imageHeight]
        ];
    }
    function isFullQuad(current: QuadPoint[]) {
        const full = getFullQuad();
        return !!current && current.every((point, index) => point[0] === full[index][0] && point[1] === full[index][1]);
    }
    let isFullImage = false;
    $: isFullImage = !!cropItem && isFullQuad(quads[0]);

    function resetCrop() {
        if (!isFullImage) {
            hapticImpact();
            cropView?.applyQuad(getFullQuad());
        }
    }
    function onUndo() {
        cropView?.applyUndo();
    }
    function onRedo() {
        cropView?.applyRedo();
    }
    function onUndosChanged() {
        //trigger update
        cropItem = cropItem;
    }
    // the hint leaves while a handle is dragged, the row stays reserved
    function onDragging({ detail: dragging }: CustomEvent<boolean>) {
        if (!isEInk) {
            hint?.nativeView?.animate({ opacity: dragging ? 0 : 1, duration: dragging ? 100 : 150 });
        }
    }

    // iOS: the tools at the left, the main action at the right. Android: a dark floating toolbar with the tools, the main action is in the top bar
    $: bottomItems = __IOS__
        ? [{ text: lc('full_image'), enabled: !isFullImage, onTap: resetCrop }, { spacer: true }, { text: lc('save'), prominent: true, color: colorPrimary, onTap: onRecropTapFinish }]
        : [
              { text: lc('undo'), icon: appIcon('undo'), onTap: onUndo },
              { text: lc('redo'), icon: appIcon('redo'), onTap: onRedo },
              { text: lc('full_image'), icon: appIcon('full_image'), onTap: resetCrop }
          ];
</script>

<frame bind:this={frame} id="cropFrame" on:loaded={forceDark}>
    <appPage id="cropEdit" backgroundColor={screenColor} statusBarStyle="dark">
        <appBar {bottomItems} android:backgroundColor={screenColor} android:bottomBarBackgroundColor="#2B2D33" android:bottomBarColor={textColor} color={textColor} iosIconRenderingMode="alwaysTemplate" size="small" title={__ANDROID__ ? lc('crop') : ''}>
            {#if __ANDROID__}
                <navigationButton {...{ 'android.systemIcon': 'ic_menu_close_clear_cancel' }} on:tap={onClose} />
            {:else}
                <appBarItem icon={appIcon('close')} text={lc('close')} on:tap={onClose} />
            {/if}
            {#if __IOS__}
                <appBarItem {...{ isEnabled: cropItem?.undos.length > 0 }} icon={appIcon('undo')} ios.position="right" text={lc('undo')} on:tap={onUndo} />
                <appBarItem {...{ isEnabled: cropItem?.redos.length > 0 }} icon={appIcon('redo')} ios.position="right" text={lc('redo')} on:tap={onRedo} />
            {:else}
<appBarItem text={lc('save')} on:tap={onRecropTapFinish} />
            {/if}
        </appBar>
        <gridlayout class="pageContent" backgroundColor={screenColor} paddingTop={8} rows="*,auto" android:paddingBottom={$windowInset.bottom + 96}>
            <CropView bind:this={cropView} {...cropItem ? cropItem : null} bind:quadChanged bind:quads on:dragging={onDragging} on:undosChanged={onUndosChanged} />
            <label bind:this={hint} color={hintColor} fontSize={__IOS__ ? 15 : 14} height={40} marginBottom={__IOS__ ? 8 : 0} marginTop={8} row={1} text={lc('crop_edit_doc')} textAlignment="center" textWrap={true} verticalTextAlignment="center" />
        </gridlayout>
    </appPage>
</frame>
