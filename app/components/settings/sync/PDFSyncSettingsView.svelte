<script lang="ts">
    import { VerticalPosition } from '@nativescript-community/ui-popover';
    import { showError } from '@shared/utils/showError';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';
    import { Writable } from 'svelte/store';
    import { lc } from '~/helpers/locale';
    import { PDFExportBaseOptions } from '~/services/pdf/PDFCanvas';
    import { PDF_OPTIONS } from '~/utils/localized_constant';
    import { showPopoverMenu, showSliderPopover } from '~/utils/ui';
    import { screenWidthDips } from '~/variables';
    const dispatch = createEventDispatcher();

    export let store: Writable<{ exportOptions?: PDFExportBaseOptions }>;
    export let variant = 'outline';

    const tWidth = (screenWidthDips - 29) / 2;

    async function selectPDFOption(option: keyof PDFExportBaseOptions, event, valueTransformer?) {
        try {
            // const OptionSelect = (await import('~/components/OptionSelect.svelte')).default;
            const options = Object.keys(PDF_OPTIONS[option]).map((k) => ({ ...PDF_OPTIONS[option][k], id: k }));
            await showPopoverMenu({
                options,
                anchor: event.object,
                onClose: (item) => {
                    updatePDFOption(option, valueTransformer ? valueTransformer(item.id) : item.id);
                }
            });
        } catch (error) {
            showError(error);
        }
    }

    function updatePDFOption(option: keyof PDFExportBaseOptions, value: any) {
        try {
            clearCheckboxTimer();
            //@ts-ignore
            $store.exportOptions[option] = value;
            dispatch('update');
        } catch (error) {
            showError(error);
        }
    }
    async function selectSilderPDFOption(option: keyof PDFExportBaseOptions, event) {
        try {
            await showSliderPopover({
                debounceDuration: 0,
                anchor: event.object,
                vertPos: VerticalPosition.BELOW,
                value: $store.exportOptions[option],
                onChange(value) {
                    updatePDFOption(option, Math.round(value));
                }
            });
        } catch (error) {
            showError(error);
        }
    }
    let checkboxTapTimer;
    function clearCheckboxTimer() {
        if (checkboxTapTimer) {
            clearTimeout(checkboxTapTimer);
            checkboxTapTimer = null;
        }
    }
    function onCheckBox(event, pdfOption?: string) {
        if ($store.exportOptions[pdfOption] === event.value) {
            return;
        }
        const value = event.value;
        clearCheckboxTimer();
        try {
            $store.exportOptions[pdfOption] = value;
        } catch (error) {
            showError(error);
        }
    }
</script>

<wraplayout margin="4 12 4 12">
    <textfield
        editable={false}
        hint={lc('orientation')}
        margin="0 4 5 0"
        text={PDF_OPTIONS['orientation'][$store.exportOptions.orientation].name}
        {variant}
        width={tWidth}
        on:tap={(e) => selectPDFOption('orientation', e)}
    />
    <textfield
        editable={false}
        hint={lc('paper_size')}
        margin="0 0 5 4"
        text={PDF_OPTIONS['paper_size'][$store.exportOptions.paper_size].name}
        {variant}
        width={tWidth}
        on:tap={(e) => selectPDFOption('paper_size', e)}
    />

    <textfield editable={false} hint={lc('color')} margin="5 4 5 0" text={PDF_OPTIONS['color'][$store.exportOptions.color].name} {variant} width={tWidth} on:tap={(e) => selectPDFOption('color', e)} />
    <textfield
        editable={false}
        hint={lc('items_per_page')}
        margin="5 0 5 4"
        text={PDF_OPTIONS['items_per_page'][$store.exportOptions.items_per_page].name}
        {variant}
        width={tWidth}
        on:tap={(e) => selectPDFOption('items_per_page', e, parseInt)}
    />
    <textfield editable={false} hint={lc('page_padding')} margin="5 4 5 0" text={$store.exportOptions.page_padding} {variant} width={tWidth} on:tap={(e) => selectSilderPDFOption('page_padding', e)} />
    <stacklayout margin="5 0 5 4" orientation="horizontal" width={tWidth}>
        <checkbox id="checkbox" checked={$store.exportOptions.draw_ocr_text} verticalAlignment="center" on:checkedChange={(e) => updatePDFOption('draw_ocr_text', e.value)} ios:margin={14} />
        <label fontSize={14} text={lc('draw_ocr_text')} textWrap={true} verticalAlignment="center" on:tap={(e) => onCheckBox(e, 'draw_ocr_text')} />
    </stacklayout>
    <textfield
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('optional_pdf_password')}
        margin="5 0 5 0"
        placeholder={lc('password')}
        placeholderColor="gray"
        returnKeyType="done"
        secure={true}
        text={$store.exportOptions.password}
        {variant}
        width={tWidth * 2 + 20}
        on:textChange={(e) => updatePDFOption('password', e['value'])}
    />
</wraplayout>
