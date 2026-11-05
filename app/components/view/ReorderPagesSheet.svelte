<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import type { CollectionView } from '@nativescript-community/ui-collectionview';
    import { Utils } from '@akylas/nativescript';
    import { ObservableArray } from '@nativescript/core';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { lc } from '~/helpers/locale';
    import type { OCRPage } from '~/models/OCRDocument';
    import { appIcon } from '~/utils/appIcons';
    import { colors, windowInset } from '~/variables';

    let { colorOnSurface, colorOnSurfaceVariant, colorSurfaceContainerLow } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorSurfaceContainerLow } = $colors);

    export let pages: OCRPage[];

    interface Row {
        page: OCRPage;
        number: number;
    }
    let rootView;
    let collectionView: NativeViewElementNode<CollectionView>;
    const rows = new ObservableArray<Row>(pages.map((page, index) => ({ page, number: index + 1 })));

    // the sheet returns the new order of the page ids, nothing when it is cancelled
    function close(order?: string[]) {
        rootView.nativeView.bindingContext.closeCallback(order);
    }
    function save() {
        const order: string[] = [];
        rows.forEach((row) => order.push(row.page.id));
        close(order);
    }

    function startDragging(row: Row, event) {
        collectionView?.nativeElement.startDragging(rows.indexOf(row), event.getActivePointers()[0]);
    }
    function onItemReordered(event) {
        if (event.index !== event.data.targetIndex) {
            const [moved] = rows.splice(event.index, 1);
            rows.splice(event.data.targetIndex, 0, moved);
        }
    }
</script>

<gesturerootview bind:this={rootView} padding="0 0 {$windowInset.bottom} 0" rows="auto,*">
    <SheetHeader doneText={lc('save')} onCancel={() => close()} onDone={save} title={lc('reorder_pages')} />
    <collectionview bind:this={collectionView} items={rows} reorderEnabled={true} row={1} rowHeight={72} on:itemReordered={onItemReordered}>
        <Template let:item>
            <gridlayout backgroundColor={colorSurfaceContainerLow} columns="auto,*,auto" height={72} padding="0 16" on:longPress={(event) => startDragging(item, event)}>
                <RotableImageView borderRadius={6} decodeWidth={Utils.layout.toDevicePixels(40)} height={56} item={item.page} stretch="aspectFill" verticalAlignment="center" width={40} />
                <label col={1} color={colorOnSurface} fontSize={16} marginLeft={12} text={lc('page') + ' ' + item.number} verticalAlignment="center" />
                <CardIcon col={2} color={colorOnSurfaceVariant} size={20} src={appIcon('reorder')} verticalAlignment="center" />
            </gridlayout>
        </Template>
    </collectionview>
</gesturerootview>
