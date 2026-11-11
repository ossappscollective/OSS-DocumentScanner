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

    let { colorBackground, colorOnBackground, colorPrimary, colorSurfaceContainerLow, colorOutlineVariant } = $colors;
    // technique for only specific properties to get updated on store change
    $: ({ colorBackground, colorOnBackground, colorPrimary, colorSurfaceContainerLow, colorOutlineVariant } = $colors);
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

    // the header and a few lines of text
    // the grabber and the header: the whole image is seen
    const SHEET_MIN = 96;
    const SHEET_START = 200;
    const steps = [SHEET_MIN, SHEET_START, Math.round(screenHeightDips * 0.5), Math.round(screenHeightDips * 0.85)];
    const START_STEP_INDEX = 1;
    const FULL_STEP_INDEX = steps.length - 1;
    // iOS: the sheet stops at the safe area, and goes under it
    const bottomInset = getIOSBottomInset();
    const sheetHeight = steps[FULL_STEP_INDEX] + bottomInset;

    let sheet: NativeViewElementNode<PersistentBottomSheet>;
    let textView: NativeViewElementNode<any>;
    let pager: NativeViewElementNode<Pager>;
    let stepIndex = START_STEP_INDEX;
    // the text is read (and selected) until the user asks to edit it
    let editing = false;
    let currentIndex = startIndex;
    const viewState = writable<OCRViewState>({ page: items[startIndex]?.pageIndex, block: -1, showText: false, version: 0 });

    let text = texts[currentIndex];
    $: dirty = texts.some((value, index) => value !== items[index].ocrData.text);

    function onSelectedIndex(event: { object: Pager }) {
        currentIndex = event.object.selectedIndex;
        text = texts[currentIndex];
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
            if (stepIndex < 2) {
                sheet?.nativeView?.animateStepIndex(2);
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
        text = value;
        texts[currentIndex] = value;
    }

    function copyText() {
        try {
            copyOCRToClipboard(text);
        } catch (error) {
            showError(error);
        }
    }

    // --- helper: levenshtein distance & similarity ---
    function levenshtein(a: string, b: string): number {
        const la = a.length,
            lb = b.length;
        if (la === 0) return lb;
        if (lb === 0) return la;
        const v0 = new Array(lb + 1).fill(0);
        const v1 = new Array(lb + 1).fill(0);
        for (let j = 0; j <= lb; j++) v0[j] = j;
        for (let i = 0; i < la; i++) {
            v1[0] = i + 1;
            for (let j = 0; j < lb; j++) {
                const cost = a[i] === b[j] ? 0 : 1;
                v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
            }
            for (let j = 0; j <= lb; j++) v0[j] = v1[j];
        }
        return v1[lb];
    }

    function similarity(a: string, b: string): number {
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1;
        return 1 - levenshtein(a, b) / maxLen;
    }

    // find best matching substring in 'text' for 'pattern' starting at 'fromIndex'
    function findBestMatch(pattern: string, text: string, fromIndex: number, expectedLen: number) {
        const maxSearchWindow = Math.max(1000, expectedLen * 5); // tune if needed
        const searchStart = fromIndex;
        const searchEnd = Math.min(text.length, fromIndex + maxSearchWindow);
        let best = { idx: -1, len: 0, score: -1, substr: '' };

        // quick exact match first (preserves exact characters/spaces)
        if (pattern && pattern.length > 0) {
            const exactIdx = text.indexOf(pattern, fromIndex);
            if (exactIdx >= 0 && exactIdx <= searchEnd) {
                return { idx: exactIdx, len: pattern.length, score: 1, substr: text.substr(exactIdx, pattern.length) };
            }
        }

        // candidate lengths around expectedLen
        const minLen = Math.max(1, Math.floor(expectedLen * 0.5));
        const maxLen = Math.min(text.length, Math.ceil(expectedLen * 1.5));

        // full search with step=1 to avoid skipping characters
        for (let pos = searchStart; pos <= Math.max(searchStart, searchEnd - minLen); pos++) {
            // remaining too small
            if (searchEnd - pos < minLen) break;
            const limit = Math.min(maxLen, searchEnd - pos);
            for (let L = minLen; L <= limit; L++) {
                const substr = text.substr(pos, L);
                const score = similarity(pattern, substr);
                // prefer higher score, then earlier pos, then length closer to expectedLen
                const quality = score - Math.abs(L - expectedLen) * 1e-4;
                if (quality > best.score + 1e-6 || (Math.abs(quality - best.score) < 1e-6 && (best.idx < 0 || pos < best.idx))) {
                    best = { idx: pos, len: L, score, substr };
                }
            }
        }
        return best;
    }

    // Update blocks from edited full text, preserving boxes. Returns mutated ocrData.
    function updateBlocksFromEditedText(data: any, editedFullText: string) {
        if (!data || !Array.isArray(data.blocks)) return data;

        const origFull = String(data.text || '');
        const edited = String(editedFullText || '');

        const n = origFull.length;
        const m = edited.length;

        // quick path: no change
        if (origFull === edited) {
            // clone blocks to avoid mutating original object unexpectedly
            return { ...data, blocks: data.blocks.map((b) => ({ ...b })), text: edited };
        }

        // Build LCS DP table (sizes (n+1) x (m+1))
        const lcs = new Array(n + 1);
        for (let i = 0; i <= n; i++) {
            lcs[i] = new Array(m + 1).fill(0);
        }
        for (let i = 1; i <= n; i++) {
            const ci = origFull.charCodeAt(i - 1);
            for (let j = 1; j <= m; j++) {
                lcs[i][j] = ci === edited.charCodeAt(j - 1) ? lcs[i - 1][j - 1] + 1 : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
            }
        }

        // backtrack to create mappings
        const origToEdit = new Array(n).fill(-1);
        const editToOrig = new Array(m).fill(-1);
        let i = n,
            j = m;
        while (i > 0 && j > 0) {
            if (origFull.charCodeAt(i - 1) === edited.charCodeAt(j - 1)) {
                origToEdit[i - 1] = j - 1;
                editToOrig[j - 1] = i - 1;
                i--;
                j--;
            } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }

        // precompute nearest mapped edited index for each edited index (left/right)
        const nearestLeft = new Array(m).fill(-1);
        let last = -1;
        for (let k = 0; k < m; k++) {
            if (editToOrig[k] !== -1) last = k;
            nearestLeft[k] = last;
        }
        const nearestRight = new Array(m).fill(-1);
        last = -1;
        for (let k = m - 1; k >= 0; k--) {
            if (editToOrig[k] !== -1) last = k;
            nearestRight[k] = last;
        }

        // assign each edited char to a block index
        const blockCount = data.blocks.length;
        const blockAssigned = new Array(blockCount).fill(0).map(() => []);
        // compute orig index ranges for blocks
        const blockRanges = [];
        let acc = 0;
        for (let b = 0; b < blockCount; b++) {
            const btxt = String(data.blocks[b].text || '');
            const start = acc;
            const end = acc + btxt.length; // exclusive
            blockRanges.push({ start, end });
            acc = end;
        }

        function origIndexToBlock(origIdx: number) {
            // binary searchish because blocks in order; do linear scan (small count)
            for (let bi = 0; bi < blockRanges.length; bi++) {
                if (origIdx >= blockRanges[bi].start && origIdx < blockRanges[bi].end) return bi;
            }
            return -1;
        }

        for (let ej = 0; ej < m; ej++) {
            const oi = editToOrig[ej];
            if (oi !== -1) {
                const bi = origIndexToBlock(oi);
                blockAssigned[bi >= 0 ? bi : blockCount - 1].push(ej);
            } else {
                // inserted char: choose nearest mapped edited index (prefer left)
                const left = nearestLeft[ej];
                const right = nearestRight[ej];
                let chosenBlock = -1;
                if (left !== -1 && right !== -1) {
                    // pick nearer; tie -> left
                    chosenBlock = ej - left <= right - ej ? origIndexToBlock(editToOrig[left]) : origIndexToBlock(editToOrig[right]);
                } else if (left !== -1) {
                    chosenBlock = origIndexToBlock(editToOrig[left]);
                } else if (right !== -1) {
                    chosenBlock = origIndexToBlock(editToOrig[right]);
                } else {
                    // no mapped characters anywhere -> fallback to last block
                    chosenBlock = blockCount - 1;
                }
                if (chosenBlock < 0) chosenBlock = blockCount - 1;
                blockAssigned[chosenBlock].push(ej);
            }
        }

        // build new blocks preserving boxes & metadata, taking assigned edited chars in order
        const newBlocks = [];
        for (let bi = 0; bi < blockCount; bi++) {
            const blk = { ...data.blocks[bi] };
            const assigned = blockAssigned[bi];
            if (assigned.length === 0) {
                blk.text = '';
            } else {
                // assigned indices are increasing because we iterated ej ascending
                const chars = [];
                for (let idx = 0; idx < assigned.length; idx++) {
                    chars.push(edited.charAt(assigned[idx]));
                }
                blk.text = chars.join('');
            }
            newBlocks.push(blk);
        }

        // ensure editedFullText preserved exactly
        const newData = { ...data, blocks: newBlocks, text: edited };
        return newData;
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
                // ensure updated.text equals editedFullText exactly
                updated.text = edited;
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
            <pager bind:this={pager} {items} selectedIndex={startIndex} on:selectedIndexChange={onSelectedIndex}>
                <Template let:item>
                    <OCRPageView {item} state={viewState} on:blockSelected={onBlockSelected} />
                </Template>
            </pager>
        </gridlayout>
        <gridlayout
            prop:bottomSheet
            backgroundColor={__IOS__ ? colorBackground : colorSurfaceContainerLow}
            borderTopLeftRadius={__IOS__ ? 26 : 28}
            borderTopRightRadius={__IOS__ ? 26 : 28}
            boxShadow={__IOS__ ? '0 -3 10 #00000072' : undefined}
            height={sheetHeight}
            horizontalAlignment="left"
            rows="28,auto,*"
            width="100%"
        >
            <absolutelayout backgroundColor={colorOutlineVariant} borderRadius={2.5} height={5} horizontalAlignment="center" marginTop={10} width={36} />
            <!-- the title and the button say if the text is read or edited -->
            <SheetHeader doneText={editing ? lc('done') : lc('edit')} onCancel={close} onDone={toggleEditing} row={1} showCancel={false} title={editing ? lc('ocr_text_editing') : lc('ocr_text')} />
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
        </gridlayout>
    </bottomsheet>
</appPage>
