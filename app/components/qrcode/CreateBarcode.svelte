<script lang="ts">
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { TextField } from '@nativescript-community/ui-textfield';
    import { ObservableArray } from '@nativescript/core';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import { lc } from '~/helpers/locale';
    import { FORMATS, getBarcodeFallbackString, qrcodeService } from '~/services/qrcode';
    import { colors, windowInset } from '~/variables';
    import SvgView from '../common/SVGView.svelte';

    // technique for only specific properties to get updated on store change
    $: ({ colorOnBackground, colorPrimary } = $colors);

    let collectionview: NativeViewElementNode<CollectionView>;
    let textField: NativeViewElementNode<TextField>;
    let text = null;
    let items: ObservableArray<any>;
    updateItems();

    function updateItems() {
        items = new ObservableArray(
            Object.values(FORMATS).map((format) => ({
                format,
                text,
                async getSVG(item) {
                    try {
                        const result = await qrcodeService.getQRCodeSVG({ ...item, text: text || '' }, 200, 'black', {
                            fallbackText: getBarcodeFallbackString(format),
                            fallbackColor: '#aaaaaa'
                        });
                        return result;
                    } catch (error) {
                        console.error(item.format, item.text, error);
                        return null;
                    }
                }
            }))
        );
    }

    function onTextChange(event) {
        text = event.value;
        updateItems();
        // collectionview?.nativeView.refreshVisibleItems();
    }
    function focus() {
        setTimeout(() => {
            textField?.nativeView?.requestFocus();
        }, 200);
    }

    async function selectItem(item) {
        try {
            if (text) {
                const result = await qrcodeService.getQRCodeSVG({ format: item.format, text }, 200, 'black');
                if (result?.length) {
                    closeModal({ format: item.format, text });
                }
            }
        } catch (error) {}
    }
</script>

<page id="fullscreenImage" actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,auto,*" android:paddingBottom={$windowInset.bottom}>
        <textfield bind:this={textField} hint={lc('barcode')} marginBottom={10} returnKeyType="search" row={1} {text} on:textChange={onTextChange} on:loaded={focus} />
        <collectionview bind:this={collectionview} {items} row={2} rowHeight={150}>
            <Template let:item>
                <gridlayout rows="*,auto" on:tap={() => selectItem(item)}>
                    <SvgView backgroundColor="white" {item} rippleColor={colorPrimary} stretch="aspectFit" />
                    <label fontSize={24} fontWeight="bold" maxLines={2} paddingBottom={15} row={1} text={item.format} textAlignment="center" verticalAlignment="bottom" />
                </gridlayout>
            </Template>
        </collectionview>

        <CActionBar modalWindow={true} title={lc('create_barcode')} />
    </gridlayout>
</page>
