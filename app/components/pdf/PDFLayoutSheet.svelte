<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { closeBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { SegmentedBar } from '@nativescript-community/ui-segmentedbar';
    import { showMenu } from '@nativescript-community/ui-menu';
    import { Application, EventData, ObservableArray, View } from '@nativescript/core';
    import { Writable } from 'svelte/store';
    import { lc } from '~/helpers/locale';
    import type { PDFExportBaseOptions } from '~/services/pdf/PDFCanvas';
    import { appIcon } from '~/utils/appIcons';
    import { DEFAULT_PDF_OPTIONS, PDF_LAYOUT_KEYS } from '~/utils/constants';
    import { PDF_OPTIONS } from '~/utils/localized_constant';
    import { colors, windowInset } from '~/variables';
    import SheetHeader from '../common/SheetHeader.svelte';
    import SheetRoot from '../common/SheetRoot.svelte';

    $: ({ colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurface, colorSurfaceContainerHigh } = $colors);
    // the glass sheet is always dark, like the camera it covers
    $: textColor = glass ? 'white' : colorOnSurface;
    $: secondaryColor = glass ? '#ffffffad' : colorOnSurfaceVariant;
    $: separatorColor = glass ? '#ffffff38' : colorOutlineVariant;
    $: groupColor = glass ? '#ffffff24' : colorSurface;
    $: tonalColor = glass ? '#ffffff2e' : colorSurfaceContainerHigh;

    export let optionsStore: Writable<PDFExportBaseOptions>;
    export let hasOCRText = false;
    /** the height of the sheet (dip): the content scrolls inside it */
    export let sheetHeight: number;
    /** iOS 26 sheet drawn as glass (shown with `transparent`): the content must not paint an opaque background */
    export let glass = false;
    export let onChange: (key: string, value: string | number | boolean) => void;
    export let onReset: () => void;
    export let onOpenSettings: () => void;
    /** the content of a persistent sheet of the page, not of a modal sheet */
    export let inline = false;
    /** the persistent sheet closes itself with this */
    export let onClose: () => void = undefined;
    /** the id of the scroll view, for the persistent sheet to hand the scrolling over to it */
    export let scrollId: string = undefined;

    // the content is one row of a collection view: the persistent sheet hands the scrolling over to a view which supports `isScrollEnabled`, the scroll view of the core does not on Android
    // its row is bound to the state: a cell shows what its item says, so the item is set again with each change of the options
    const contentItems = new ObservableArray([{}]);
    const MARGIN_MIN = 0;
    const MARGIN_MAX = 50;
    const ITEMS_MIN = 1;
    const ITEMS_MAX = 6;
    const PAPER_SIZES = Object.keys(PDF_OPTIONS.paper_size);
    const ORIENTATIONS = Object.keys(PDF_OPTIONS.orientation);
    const GROUP_RADIUS = __IOS__ ? 16 : 20;

    $: ({ color, draw_ocr_text, items_per_page, orientation, page_padding, paper_size } = $optionsStore);
    $: fullSize = paper_size === 'full';
    $: modified = PDF_LAYOUT_KEYS.some((key) => $optionsStore[key] !== DEFAULT_PDF_OPTIONS[key]);
    $: contentItems.setItem(0, { color, draw_ocr_text, fullSize, items_per_page, orientation, page_padding, paper_size });

    function setOption(key: string, value: string | number | boolean) {
        // the controls also notify on their initial value
        if ($optionsStore[key] !== value) {
            onChange(key, value);
        }
    }
    function onSegmentChanged(key: string, values: string[], event: EventData) {
        if (event.object instanceof SegmentedBar) {
            setOption(key, values[event.object.selectedIndex]);
        }
    }
    function showPaperMenu(event: EventData) {
        showMenu({
            anchor: event.object instanceof View ? event.object : null,
            items: PAPER_SIZES.map((size) => ({ title: PDF_OPTIONS.paper_size[size].name, checked: size === paper_size, onSelect: () => setOption('paper_size', size) }))
        });
    }
    function openSettings() {
        if (inline) {
            onClose?.();
        } else {
            closeBottomSheet();
        }
        onOpenSettings();
    }
    // the switch does not toggle on a tap: the row does it for it, unless the switch was tapped itself
    let switchTapTimer: ReturnType<typeof setTimeout> = null;
    function clearSwitchTapTimer() {
        clearTimeout(switchTapTimer);
        switchTapTimer = null;
    }
    function onSwitchRowTap(key: string, value: string | boolean) {
        clearSwitchTapTimer();
        switchTapTimer = setTimeout(() => setOption(key, value), 10);
    }
    function onSwitchChanged(key: string, value: string | boolean) {
        clearSwitchTapTimer();
        setOption(key, value);
    }
    function addItems(delta: number) {
        setOption('items_per_page', Math.max(ITEMS_MIN, Math.min(ITEMS_MAX, items_per_page + delta)));
    }
    // iOS 26: UIKit hides what scrolls under the toolbar behind a blur and a line: the list is seen scrolling behind the buttons
    function hideScrollEdgeEffect(event: { object: View }) {
        const scrollView = __IOS__ ? event.object.nativeViewProtected : null;
        if (scrollView?.bottomEdgeEffect) {
            scrollView.bottomEdgeEffect.hidden = true;
        }
    }
</script>

<!-- Android: the grabber of the modal sheet pushes the content down by 28 inside the detent -->
<SheetRoot height={__ANDROID__ && !inline ? sheetHeight - 28 : sheetHeight} {inline} rows="auto,*" {...__IOS__ && !inline ? { backgroundColor: glass ? 'transparent' : colorBackground } : {}} {...$$restProps}>
    <SheetHeader actionEnabled={modified} actionText={lc('reset')} doneText={inline ? lc('done') : undefined} onAction={onReset} onCancel={() => undefined} onDone={onClose} showCancel={false} title={lc('page_layout')} />
    <collectionview id={scrollId} items={contentItems} row={1} on:loaded={hideScrollEdgeEffect}>
        <Template let:item>
            {@const { color, draw_ocr_text, fullSize, items_per_page, orientation, page_padding, paper_size } = item}
            <stacklayout android:paddingBottom={$windowInset.bottom} ios:paddingBottom={$windowInset.bottom + 16}>
                <stacklayout backgroundColor={groupColor} borderRadius={GROUP_RADIUS} margin="0 16">
                    <gridlayout columns="*,auto,auto" padding="12 14" on:tap={showPaperMenu}>
                        <label color={textColor} fontSize={17} text={lc('paper_size')} verticalAlignment="center" />
                        <label col={1} color={secondaryColor} fontSize={15} text={PDF_OPTIONS.paper_size[paper_size].name} verticalAlignment="center" />
                        <uibutton col={2} color={secondaryColor} height={20} isUserInteractionEnabled={false} padding={0} variant="text" verticalAlignment="center" width={20} {...{ src: appIcon('chevron') }} />
                    </gridlayout>
                    <!-- the paper is the page itself: the other options do not apply -->
                    <stacklayout isUserInteractionEnabled={!fullSize} opacity={fullSize ? 0.45 : 1}>
                        <absolutelayout backgroundColor={separatorColor} height={1} margin="0 14" />
                        <stacklayout padding="8 14 12 14">
                            <label color={textColor} fontSize={17} text={lc('orientation')} />
                            <segmentedbar marginTop={8} selectedIndex={ORIENTATIONS.indexOf(orientation)} on:selectedIndexChanged={(event) => onSegmentChanged('orientation', ORIENTATIONS, event)}>
                                {#each ORIENTATIONS as key (key)}
                                    <segmentedbaritem title={PDF_OPTIONS.orientation[key].name} variant="outline" />
                                {/each}
                            </segmentedbar>
                        </stacklayout>
                        <absolutelayout backgroundColor={separatorColor} height={1} margin="0 14" />
                        <gridlayout columns="*,auto,auto,auto" padding="8 14">
                            <label color={textColor} fontSize={17} text={lc('items_per_page')} verticalAlignment="center" />
                            <label col={1} color={secondaryColor} fontSize={15} marginRight={12} text={items_per_page + ''} verticalAlignment="center" />
                            <uibutton
                                accessibilityLabel="-"
                                backgroundColor={tonalColor}
                                col={2}
                                color={textColor}
                                height={36}
                                isEnabled={items_per_page > ITEMS_MIN}
                                marginRight={8}
                                opacity={items_per_page > ITEMS_MIN ? 1 : 0.45}
                                padding={0}
                                variant="text"
                                verticalAlignment="center"
                                width={44}
                                {...{ src: appIcon('remove') }}
                                on:tap={() => addItems(-1)} />
                            <uibutton
                                accessibilityLabel="+"
                                backgroundColor={tonalColor}
                                col={3}
                                color={textColor}
                                height={36}
                                isEnabled={items_per_page < ITEMS_MAX}
                                opacity={items_per_page < ITEMS_MAX ? 1 : 0.45}
                                padding={0}
                                variant="text"
                                verticalAlignment="center"
                                width={44}
                                {...{ src: appIcon('add') }}
                                on:tap={() => addItems(1)} />
                        </gridlayout>
                        <absolutelayout backgroundColor={separatorColor} height={1} margin="0 14" />
                        <gridlayout columns="*,auto" padding="10 14 4 14" rows="auto,auto">
                            <label color={textColor} fontSize={17} text={lc('page_padding')} verticalAlignment="center" />
                            <label
                                col={1}
                                color={page_padding === DEFAULT_PDF_OPTIONS.page_padding ? secondaryColor : colorPrimary}
                                fontSize={15}
                                text={page_padding + ' pt'}
                                verticalAlignment="center"
                                on:tap={() => setOption('page_padding', DEFAULT_PDF_OPTIONS.page_padding)} />
                            <slider
                                colSpan={2}
                                maxValue={MARGIN_MAX}
                                minValue={MARGIN_MIN}
                                row={1}
                                stepSize={1}
                                value={page_padding}
                                on:valueChange={(event) => setOption('page_padding', Math.round(event.value))} />
                        </gridlayout>
                    </stacklayout>
                    <absolutelayout backgroundColor={separatorColor} height={1} margin="0 14" />
                    <gridlayout columns="*,auto" padding="10 14" on:tap={() => onSwitchRowTap('color', color === 'black_white' ? 'color' : 'black_white')}>
                        <label color={textColor} fontSize={17} text={lc('black_white')} verticalAlignment="center" />
                        <switch checked={color === 'black_white'} col={1} verticalAlignment="center" on:checkedChange={(event) => onSwitchChanged('color', event.value ? 'black_white' : 'color')} />
                    </gridlayout>
                </stacklayout>
                {#if fullSize}
                    <label color={secondaryColor} fontSize={__IOS__ ? 13 : 12} margin="8 32 0 32" text={lc('pdf_layout_full_hint')} textWrap={true} />
                {/if}
                {#if hasOCRText}
                    <gridlayout backgroundColor={groupColor} borderRadius={GROUP_RADIUS} columns="*,auto" margin="8 16 0 16" padding="7 14" on:tap={() => onSwitchRowTap('draw_ocr_text', !draw_ocr_text)}>
                        <stacklayout verticalAlignment="center">
                            <label color={textColor} fontSize={17} text={lc('draw_ocr_text')} />
                            <label color={secondaryColor} fontSize={13} text={lc('pdf_ocr_text_desc')} />
                        </stacklayout>
                        <switch checked={draw_ocr_text} col={1} verticalAlignment="center" on:checkedChange={(event) => onSwitchChanged('draw_ocr_text', event.value)} />
                    </gridlayout>
                {/if}
                <gridlayout backgroundColor={groupColor} borderRadius={GROUP_RADIUS} columns="auto,*,auto" margin="8 16 0 16" padding="15 14" on:tap={openSettings}>
                    <uibutton color={textColor} height={24} isUserInteractionEnabled={false} padding={0} variant="text" verticalAlignment="center" width={24} {...{ src: appIcon('settings') }} />
                    <label col={1} color={textColor} fontSize={17} marginLeft={12} text={lc('pdf_more_settings')} verticalAlignment="center" />
                    <uibutton
                        col={2}
                        color={secondaryColor}
                        height={20}
                        isUserInteractionEnabled={false}
                        padding={0}
                        variant="text"
                        verticalAlignment="center"
                        visibility={__IOS__ ? 'visible' : 'collapse'}
                        width={20}
                        {...{ src: appIcon('chevron') }} />
                </gridlayout>
            </stacklayout>
        </Template>
    </collectionview>
</SheetRoot>
