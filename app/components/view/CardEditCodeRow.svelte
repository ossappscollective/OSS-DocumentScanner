<script lang="ts">
    import { lc } from '@nativescript-community/l';
    import { TextField } from '@nativescript-community/ui-textfield';
    import type { PropertyChangeData } from '@nativescript/core';
    import { onMount } from 'svelte';
    import FormTextField from '~/components/common/FormTextField.svelte';
    import SvgView from '~/components/common/SVGView.svelte';
    import { qrcodeService } from '~/services/qrcode';
    import { appIcon } from '~/utils/appIcons';
    import { getBarcodeInputRule, sanitizeBarcodeInput } from '~/utils/barcodeInput';
    import { colors } from '~/variables';

    export let code: { original: any; text: string; error?: string };
    export let onRemove: () => void;
    let { colorError } = $colors;
    $: ({ colorError } = $colors);

    const format: string = code.original.format;
    const rule = getBarcodeInputRule(format);
    let svg: string;
    let error: string;

    async function update(text: string) {
        try {
            svg = await qrcodeService.getQRCodeSVG({ ...code.original, text }, 100, 'black');
            error = svg?.length ? undefined : lc('unsupported_barcode_value');
        } catch (err) {
            svg = null;
            error = lc('unsupported_barcode_value');
        }
        code.error = error;
    }
    function onTextChange(event: PropertyChangeData) {
        const value = event.value as string;
        const text = sanitizeBarcodeInput(format, value);
        if (text !== value && event.object instanceof TextField) {
            event.object.text = text;
        }
        code.text = text;
        update(text);
    }
    onMount(() => update(code.text));
</script>

<!-- the barcode is drawn on the left while it is edited: what is changed or removed is visible -->
<gridlayout columns="auto,*,auto" margin="0 16" {...$$restProps}>
    <SvgView backgroundColor="white" borderRadius={11} height={56} item={{ svg }} margin="{__IOS__ ? 12 : 4} 12 0 0" padding="4" stretch="aspectFit" verticalAlignment="top" width={88} />
    <FormTextField col={1} {error} keyboardType={rule.numeric ? 'number' : undefined} label={format} margin="0 0 8 0" text={code.text} onChange={onTextChange} />
    <uibutton
        accessibilityLabel={lc('delete')}
        col={2}
        color={colorError}
        height={44}
        marginTop={__IOS__ ? 18 : 6}
        padding="0"
        verticalAlignment="top"
        variant="text"
        width={44}
        {...{ src: appIcon('delete') }}
        on:tap={onRemove}
    />
</gridlayout>
