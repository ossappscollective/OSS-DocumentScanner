<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { ObservableArray } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { closeModal } from '@shared/utils/svelte/ui';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import { lc } from '~/helpers/locale';
    import { OCRDocument, OCRPage } from '~/models/OCRDocument';
    import { appIcon } from '~/utils/appIcons';
    import { colors, windowInset } from '~/variables';

    $: ({ colorBackground, colorOnBackground, colorOnSurface, colorOnSurfaceVariant, colorSecondaryContainer, colorSurface } = $colors);

    export let document: OCRDocument;
    interface Row {
        page: OCRPage;
        position: number;
    }
    // the plugin reorders this array while a row is dragged: the document only changes on save
    const rows = new ObservableArray<Row>(document.pages.map((page, position) => ({ page, position })));
    let collectionView: NativeViewElementNode<CollectionView>;

    function onItemReordered() {
        rows.forEach((row, position) => (row.position = position));
        collectionView?.nativeElement?.refreshVisibleItems();
    }
    async function save() {
        try {
            const order: string[] = [];
            rows.forEach((row) => order.push(row.page.id));
            if (order.some((id, index) => id !== document.pages[index].id)) {
                await document.save({ pagesOrder: order }, true);
            }
            closeModal(true);
        } catch (error) {
            showError(error);
        }
    }
    function close() {
        closeModal(false);
    }
</script>

<frame id="reorderPagesFrame">
    <appPage id="reorderPages">
        <appBar color={colorOnBackground} iosIconRenderingMode="alwaysTemplate" size="small" title={lc('reorder_pages')}>
            {#if __ANDROID__}
                <navigationButton {...{ 'android.systemIcon': 'ic_menu_close_clear_cancel' }} on:tap={close} />
                <appBarItem text={lc('save')} on:tap={save} />
            {:else}
                <appBarItem icon={appIcon('close')} text={lc('close')} on:tap={close} />
                <appBarItem ios.position="right" prominent={true} text={lc('save')} on:tap={save} />
            {/if}
        </appBar>
        <gridlayout class="pageContent" backgroundColor={colorBackground} android:paddingBottom={$windowInset.bottom}>
            <!-- long press anywhere on a row, or drag its handle: the list reorders -->
            <collectionview bind:this={collectionView} items={rows} reorderEnabled={true} reorderLongPressEnabled={true} rowHeight={80} on:itemReordered={onItemReordered}>
                <Template let:item>
                    <gridlayout backgroundColor={colorSurface} borderRadius={16} columns="auto,*,auto" height={72} margin="4 16" padding="8 16 8 8">
                        {#if item.page.imagePath}
                            <RotableImageView borderRadius={10} decodeWidth={160} height={56} item={item.page} stretch="aspectFill" verticalAlignment="center" width={88} />
                        {:else}
                            <gridlayout backgroundColor={colorSecondaryContainer} borderRadius={10} height={56} verticalAlignment="center" width={88}>
                                <uibutton color={colorOnSurfaceVariant} height={44} horizontalAlignment="center" isUserInteractionEnabled={false} variant="text" verticalAlignment="center" width={44} {...{ src: appIcon('qrcode') }} />
                            </gridlayout>
                        {/if}
                        <label col={1} color={colorOnSurface} fontSize={17} marginLeft={16} text={`${lc('page')} ${item.position + 1}`} verticalAlignment="center" />
                        <uibutton col={2} color={colorOnSurfaceVariant} height={44} isUserInteractionEnabled={false} variant="text" verticalAlignment="center" width={44} {...{ src: appIcon('reorder') }} />
                    </gridlayout>
                </Template>
            </collectionview>
        </gridlayout>
    </appPage>
</frame>
