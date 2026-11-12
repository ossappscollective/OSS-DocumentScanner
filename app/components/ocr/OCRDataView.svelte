<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import type { Pager } from '@nativescript-community/ui-pager';
    import type { PersistentBottomSheet } from '@nativescript-community/ui-persistent-bottomsheet';
    import { showError } from '@shared/utils/showError';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { OCRData } from 'plugin-nativeprocessor';
    import { tick } from 'svelte';
    import { writable } from 'svelte/store';
    import PersistentSheetFrame from '~/components/common/PersistentSheetFrame.svelte';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import OCRPageView from '~/components/ocr/OCRPageView.svelte';
    import { OCRViewState, getBlockRanges } from '~/components/ocr/OCROverlay';
    import { updateOCRBlocks } from '~/components/ocr/OCRDataUpdater';
    import { lc } from '~/helpers/locale';
    import { Color } from '@nativescript/core';
    import { isEInk } from '~/helpers/theme';
    import { OCRDocument } from '~/models/OCRDocument';
    import { appIcon } from '~/utils/appIcons';
    import { getIOSBottomInset } from '~/utils/safeArea';
    import { copyOCRToClipboard } from '~/utils/ui';
    import { colors, screenHeightDips } from '~/variables';

    let { colorBackground, colorOnBackground, colorPrimary } = $colors;
    // technique for only specific properties to get updated on store change
    $: ({ colorBackground, colorOnBackground, colorPrimary } = $colors);
    const visualState = isEInk ? colorBackground : 'black';
    const textColor = isEInk ? colorOnBackground : 'white';

    export let document: OCRDocument;
    // the page of the document to show first, the others with text are a swipe away
    export let pageIndex: number = 0;

    interface OCRItem {
        pageIndex: number;
        imagePath: string;
        rotation: number;
        ocrData: OCRData;
    }
    const items: OCRItem[] = document.pages
        .map((page, index) => ({ pageIndex: index, imagePath: page.imagePath, rotation: page.rotation ?? 0, ocrData: page.ocrData }))
        .filter((item) => item.imagePath && item.ocrData);
    const startIndex = Math.max(
        0,
        items.findIndex((item) => item.pageIndex === pageIndex)
    );
    // what is typed, by page
    let texts = items.map((item) => item.ocrData.text);

    // the grabber and the header: the whole image is seen
    const SHEET_MIN = 96;
    // the header and a few lines of text
    const SHEET_START = 200;
    const steps = [SHEET_MIN, SHEET_START, Math.round(screenHeightDips * 0.5), Math.round(screenHeightDips * 0.85)];
    const START_STEP_INDEX = 1;
    const EDIT_STEP_INDEX = 2;
    const FULL_STEP_INDEX = steps.length - 1;
    // iOS: the sheet stops at the safe area, and goes under it
    const bottomInset = getIOSBottomInset();
    const sheetHeight = steps[FULL_STEP_INDEX] + bottomInset;

    let sheet: NativeViewElementNode<PersistentBottomSheet>;
    let textView: NativeViewElementNode<any>;
    let stepIndex = START_STEP_INDEX;
    // the text is read (and selected) until the user asks to edit it
    let editing = false;
    let currentIndex = startIndex;
    const viewState = writable<OCRViewState>({ page: items[startIndex]?.pageIndex, block: -1, showText: false, version: 0 });

    $: text = texts[currentIndex];
    $: dirty = texts.some((value, index) => value !== items[index].ocrData.text);

    function onSelectedIndex(event: { object: Pager }) {
        currentIndex = event.object.selectedIndex;
        viewState.update((state) => ({ ...state, page: items[currentIndex].pageIndex, block: -1 }));
    }

    function onBlockSelected(event: CustomEvent<number>) {
        const block = event.detail;
        viewState.update((state) => ({ ...state, block }));
        if (block === -1) {
            return;
        }
        if (stepIndex < START_STEP_INDEX) {
            sheet?.nativeView?.animateStepIndex(START_STEP_INDEX);
        }
        const range = getBlockRanges(text, items[currentIndex].ocrData.blocks)[block];
        if (range) {
            textView?.nativeView?.setSelection(range.start, range.end);
            if (__IOS__) {
                textView?.nativeView?.nativeViewProtected?.scrollRangeToVisible(NSMakeRange(range.start, range.end - range.start));
            }
        }
    }

    function toggleShowTextOnImage() {
        viewState.update((state) => ({ ...state, showText: !state.showText }));
    }

    // Android: `editable=false` also makes the text not focusable, clickable and long clickable, and `setTextIsSelectable(true)` does nothing when the text is already selectable
    function makeSelectable(view = textView?.nativeView) {
        if (__ANDROID__) {
            const editText = view?.nativeTextViewProtected;
            if (editText) {
                editText.setTextIsSelectable(true);
                editText.setFocusable(true);
                editText.setFocusableInTouchMode(true);
                editText.setClickable(true);
                editText.setLongClickable(true);
            }
        }
    }
    // the native view applies `editable` after it is loaded
    function onTextViewLoaded(event: { object: any }) {
        makeSelectable(event.object);
        setTimeout(() => makeSelectable(), 500);
    }

    async function toggleEditing() {
        editing = !editing;
        await tick();
        if (editing) {
            if (stepIndex < EDIT_STEP_INDEX) {
                sheet?.nativeView?.animateStepIndex(EDIT_STEP_INDEX);
            }
            textView?.nativeView?.focus();
        } else {
            textView?.nativeView?.blur();
            makeSelectable();
        }
    }

    function close() {
        closeModal(false);
    }

    function onTextChange(value: string) {
        texts[currentIndex] = value;
    }

    function copyText() {
        try {
            copyOCRToClipboard(text);
        } catch (error) {
            showError(error);
        }
    }

    // Save handler called by UI action bar: saves every page whose text was edited.
    async function saveEdit() {
        try {
            for (let index = 0; index < items.length; index++) {
                const item = items[index];
                const edited = String(texts[index] || '');
                if (edited === item.ocrData.text) {
                    continue;
                }
                DEV_LOG && console.log('ocrData', edited);
                const updated = updateOCRBlocks(item.ocrData, edited);
                item.ocrData = updated;
                await document.updatePage(
                    item.pageIndex,
                    {
                        ocrData: updated
                    },
                    false,
                    true,
                    true
                );
            }
            texts = texts;
            viewState.update((state) => ({ ...state, version: state.version + 1 }));
        } catch (err) {
            showError(err);
        }
    }
</script>

<appPage backgroundColor={visualState} statusBarStyle={isEInk ? undefined : 'dark'}>
    <appBar
        color={textColor}
        iosIconRenderingMode="alwaysTemplate"
        size="small"
        title={items.length > 1 ? `${currentIndex + 1} / ${items.length}` : ''}
        translucent={true}
        android:backgroundColor="transparent"
    >
        {#if __ANDROID__}
            <navigationButton {...{ 'android.systemIcon': 'ic_menu_close_clear_cancel' }} on:tap={close} />
        {:else}
            <appBarItem icon={appIcon('close')} text={lc('close')} on:tap={close} />
        {/if}
        <appBarItem icon={appIcon('ocr_overlay')} ios.position="right" text={lc('ocr_show_text_on_image')} on:tap={toggleShowTextOnImage} />
        <appBarItem icon={appIcon('copy')} ios.position="right" text={lc('copy')} on:tap={copyText} />
        <appBarItem {...{ isEnabled: dirty }} icon={appIcon('save')} ios.position="right" text={lc('save')} on:tap={saveEdit} />
    </appBar>
    <bottomsheet bind:this={sheet} scrollViewId={__IOS__ ? 'ocrText' : undefined} stepIndex={START_STEP_INDEX} {steps} on:stepIndexChange={(event) => (stepIndex = event.value)}>
        <gridlayout class="pageContent" height="100%" width="100%">
            <pager {items} selectedIndex={startIndex} on:selectedIndexChange={onSelectedIndex}>
                <Template let:item>
                    <OCRPageView {item} state={viewState} on:blockSelected={onBlockSelected} />
                </Template>
            </pager>
        </gridlayout>
        <PersistentSheetFrame height={sheetHeight} rows="auto,*" width="100%">
            <!-- the title and the button say if the text is read or edited -->
            <SheetHeader doneText={editing ? lc('done') : lc('edit')} onDone={toggleEditing} row={1} showCancel={false} title={editing ? lc('ocr_text_editing') : lc('ocr_text')} />
            <textview
                id="ocrText"
                bind:this={textView}
                backgroundColor={editing ? new Color(colorPrimary).setAlpha(25).hex : 'transparent'}
                color={colorOnBackground}
                editable={editing}
                fontSize={16}
                padding="0 16"
                ios:paddingBottom={bottomInset}
                row={2}
                {text}
                variant="none"
                on:loaded={onTextViewLoaded}
                on:textChange={(e) => onTextChange(e.value)}
            />
        </PersistentSheetFrame>
    </bottomsheet>
</appPage>
