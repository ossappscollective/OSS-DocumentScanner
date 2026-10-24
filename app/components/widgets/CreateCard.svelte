<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import { FORMATS, getBarcodeFallbackString, qrcodeService } from '~/services/qrcode';
    import { pickColor, showPopoverMenu } from '~/utils/ui';
    import { colors } from '~/variables';
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
        code = e.value;
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

<gesturerootview bind:this={rootView} columns="*,auto" padding={16} rows="auto,auto,auto,auto,auto,auto">
    <label color={colorOnBackground} fontSize={20} fontWeight="bold" text={lc('create')} verticalAlignment="center" />
    <stacklayout col={1} orientation="horizontal">
        <label color={colorOnBackground} fontSize={16} text={lc('color')} verticalAlignment="center" />
        <absolutelayout backgroundColor={color} borderColor={colorOutline} borderRadius="50%" borderWidth={2} height={40} marginLeft={10} width={40} on:tap={changeColor} />
    </stacklayout>
    <textfield colSpan={2} hint={lc('name')} margin={tMargin} row={1} text={name} variant="outline" on:textChange={(e) => (name = e.value)} />
    <textfield colSpan={2} hint={lc('barcode')} margin={tMargin} row={2} text={code} variant="outline" on:textChange={onCodeTextChange} />
    <textfield colSpan={2} editable={false} hint={lc('barcode_type')} margin={tMargin} row={3} text={codeFormat} textTransform="uppercase" variant="outline" on:tap={(e) => selectBarcodeFormat(e)} />
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

    <uibutton colSpan={2} horizontalAlignment="right" isEnabled={name?.length > 0} row={5} text={lc('add')} variant="text" on:tap={add} />
</gesturerootview>
