<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import { FORMATS, getBarcodeFallbackString, qrcodeService } from '~/services/qrcode';
    import { getBarcodeInputRule, sanitizeBarcodeInput } from '~/utils/barcodeInput';
    import { pickColor, showPopoverMenu } from '~/utils/ui';
    import { colors } from '~/variables';
    import { focusState } from '~/utils/svelte/actions';
    import SheetHeader from '../common/SheetHeader.svelte';
    import SvgView from '../common/SVGView.svelte';
</script>

<script lang="ts">
    let { colorOnBackground, colorOutline, colorPrimary } = $colors;
    $: ({ colorOnBackground, colorOutline, colorPrimary } = $colors);

    export let name = null;
    export let color = colorPrimary;
    let code;
    let codeFormat = FORMATS.QR_CODE;
    let rootView;
    let svg: string;
    let validCode = true;
    const tMargin = '4 0 4 0';

    function close() {
        rootView.nativeView.bindingContext.closeCallback();
    }

    async function add() {
        try {
            if (!name || !color) {
                throw new SilentError(lc('need_fill_name_color'));
            }
            rootView.nativeView.bindingContext.closeCallback({
                name,
                code,
                codeFormat,
                color
            });
        } catch (error) {
            showError(error);
        }
    }

    async function selectBarcodeFormat(event) {
        try {
            DEV_LOG && console.log('selectBarcodeFormat');
            // const OptionSelect = (await import('~/components/OptionSelect.svelte')).default;
            const options = Object.keys(FORMATS).map((k) => ({ name: lc(FORMATS[k]), id: k }));
            await showPopoverMenu({
                options,
                anchor: event.object,
                onClose: (item) => {
                    codeFormat = FORMATS[item.id];
                    code = sanitizeBarcodeInput(codeFormat, code);
                    updateSvg();
                }
            });
        } catch (error) {
            showError(error);
        }
    }

    async function updateSvg() {
        try {
            svg = await qrcodeService.getQRCodeSVG({ format: codeFormat, text: code || '' }, 200, 'black', {
                fallbackText: getBarcodeFallbackString(codeFormat),
                fallbackColor: '#aaaaaa'
            });
            validCode = !/#aaaaaa/.test(svg);
        } catch (error) {
            console.error(codeFormat, code, error);
            return null;
        }
    }
    function onCodeTextChange(e) {
        code = sanitizeBarcodeInput(codeFormat, e.value);
        if (code !== e.value) {
            e.object.text = code;
        }
        updateSvg();
    }
    async function changeColor(event) {
        try {
            color = (await pickColor(color, { anchor: event.object }))?.hex;
        } catch (error) {
            showError(error);
        }
    }
</script>

<gesturerootview bind:this={rootView} rows="auto,auto">
    <SheetHeader doneEnabled={name?.length > 0} doneText={lc('add')} onCancel={close} onDone={add} title={lc('create')} />
    <gridlayout columns="*,auto" padding="0 16 16 16" row={1} rows="auto,auto,auto,auto,auto,auto">
        <textfield colSpan={2} hint={lc('name')} margin={tMargin} text={name} use:focusState variant="outline" on:textChange={(e) => (name = e.value)} />
        <textfield
            colSpan={2}
            hint={lc('barcode')}
            keyboardType={getBarcodeInputRule(codeFormat).numeric ? 'number' : undefined}
            margin={tMargin}
            row={1}
            text={code}
            use:focusState
            variant="outline"
            on:textChange={onCodeTextChange}
        />
        <textfield
            colSpan={2}
            editable={false}
            hint={lc('barcode_type')}
            margin={tMargin}
            row={2}
            text={codeFormat}
            textTransform="uppercase"
            variant="outline"
            on:tap={(e) => selectBarcodeFormat(e)}
        />
        <gridlayout class="formRow" colSpan={2} columns="*,auto" row={3} on:tap={changeColor}>
            <label color={colorOnBackground} fontSize={17} margin="0 4" text={lc('color')} verticalAlignment="center" />
            <absolutelayout backgroundColor={color} borderColor={colorOutline} borderRadius="50%" borderWidth={2} col={1} height={40} verticalAlignment="center" width={40} />
        </gridlayout>
        <SvgView backgroundColor="white" borderRadius={12} colSpan={2} height={100} item={{ svg }} row={4} stretch="aspectFit" visibility={code?.length ? 'visible' : 'collapse'} />
        <label
            colSpan={2}
            fontSize={20}
            fontWeight="bold"
            row={4}
            text={lc('invalid')}
            textAlignment="center"
            verticalAlignment="center"
            visibility={code?.length && !validCode ? 'visible' : 'collapse'}
        />
    </gridlayout>
</gesturerootview>
