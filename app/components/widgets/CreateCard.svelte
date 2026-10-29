<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import { FORMATS, getBarcodeFallbackString, qrcodeService } from '~/services/qrcode';
    import { pickColor, showPopoverMenu } from '~/utils/ui';
    import { colors } from '~/variables';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import SheetHeader from '../common/SheetHeader.svelte';
    import SvgView from '../common/SVGView.svelte';
</script>

<script lang="ts">
    let { colorOutline, colorPrimary } = $colors;
    $: ({ colorOutline, colorPrimary } = $colors);

    export let name = null;
    export let color = colorPrimary;
    let code;
    let codeFormat = FORMATS.QR_CODE;
    let rootView;
    let svg: string;
    let validCode = true;

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

<gesturerootview bind:this={rootView} class="cardFormSheet" rows="auto,auto">
    <SheetHeader doneEnabled={name?.length > 0} doneText={lc('add')} onCancel={close} onDone={add} title={lc('create')} />
    <stacklayout row={1}>
        <stacklayout class="cardFormGroup">
            <ListItemAutoSize columns="auto,*" fontSize={17} item={{ title: lc('name') }} showBottomLine={true}>
                <textfield col={1} floating={false} hint={lc('name')} text={name} textAlignment="right" variant="none" verticalAlignment="center" on:textChange={(e) => (name = e.value)} />
            </ListItemAutoSize>
            <ListItemAutoSize columns="auto,*" fontSize={17} item={{ title: lc('barcode') }} showBottomLine={true}>
                <textfield col={1} floating={false} hint={lc('barcode')} text={code} textAlignment="right" variant="none" verticalAlignment="center" on:textChange={onCodeTextChange} />
            </ListItemAutoSize>
            <ListItemAutoSize fontSize={17} item={{ title: lc('barcode_type'), rightValue: codeFormat.toUpperCase() }} showBottomLine={true} on:tap={(e) => selectBarcodeFormat(e)} />
            <ListItemAutoSize columns="*,auto" fontSize={17} item={{ title: lc('color') }} on:tap={changeColor}>
                <absolutelayout backgroundColor={color} borderColor={colorOutline} borderRadius="50%" borderWidth={2} col={1} height={36} width={36} />
            </ListItemAutoSize>
        </stacklayout>
        <gridlayout height={100} margin="0 16 16 16" visibility={code?.length ? 'visible' : 'collapse'}>
            <SvgView backgroundColor="white" borderRadius={12} item={{ svg }} stretch="aspectFit" />
            <label fontSize={20} fontWeight="bold" text={lc('invalid')} textAlignment="center" verticalAlignment="center" visibility={!validCode ? 'visible' : 'collapse'} />
        </gridlayout>
    </stacklayout>
</gesturerootview>
