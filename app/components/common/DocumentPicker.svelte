<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { createNativeAttributedString } from '@nativescript-community/text';
    import { LayoutAlignment, Paint, StaticLayout } from '@nativescript-community/ui-canvas';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { ObservableArray, Utils } from '@nativescript/core';
    import { throttle } from '@nativescript/core/utils';
    import { closeModal } from '@shared/utils/svelte/ui';
    import dayjs from 'dayjs';
    import { filesize } from 'filesize';
    import { onMount } from 'svelte';
    import PageIndicator from '~/components/common/PageIndicator.svelte';
    import RotableImageView from '~/components/common/RotableImageView.svelte';
    import SelectedIndicator from '~/components/common/SelectedIndicator.svelte';
    import SyncIndicator from '~/components/common/SyncIndicator.svelte';
    import MainList, { Item } from '~/components/list/MainList.svelte';
    import Chip from '~/components/widgets/Chip.svelte';
    import { isEInk } from '~/helpers/theme';
    import { DocFolder, OCRDocument } from '~/models/OCRDocument';
    import { colors, fontScale, fonts, windowInset } from '~/variables';

    const textPaint = new Paint();
    const IMAGE_DECODE_WIDTH = Utils.layout.toDevicePixels(200);
</script>

<script lang="ts">
    let { colorOnBackground, colorOnSurfaceVariant } = $colors;
    $: ({ colorOnBackground, colorOnSurfaceVariant } = $colors);
    export let title = lc('select_documents_to_import');
    let folder: DocFolder = null;
    let collectionView: NativeViewElementNode<CollectionView>;
    let viewStyle: string;
    let syncEnabled: boolean;
    let nbSelected: number = 0;
    let folderItems: ObservableArray<Item>;
    let documents: ObservableArray<Item>;
    let getSyncColors: (item: Item) => string[];
    let onItemLongPress: (item: Item, event?) => Promise<void>;
    let onItemTap: (item: Item) => Promise<void>;
    let importImages: () => Promise<void>;
    let importDocument: (importPDFs?: boolean) => Promise<void>;
    let refreshCollectionView: () => void;
    let refresh: (force?: boolean, filter?: string) => Promise<void>;
    let getSelectedDocuments: () => Promise<OCRDocument[]>;

    function getItemRowHeight(viewStyle) {
        return 80;
    }
    function getImageMargin(viewStyle) {
        return 10;
    }
    function getItemImageHeight(viewStyle) {
        return 44;
    }

    $: textPaint.color = colorOnBackground || 'black';

    function onCanvasDraw(item: Item, { canvas, object }: { canvas: Canvas; object: CanvasView }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const dx = 10 + getItemImageHeight(viewStyle) * $fontScale + 16;
        textPaint.color = colorOnSurfaceVariant;
        const { doc } = item;
        textPaint.textSize = 11 * $fontScale;
        canvas.drawText(
            filesize(
                doc.pages.reduce((acc, v) => acc + v.size, 0),
                { output: 'string' }
            ),
            dx,
            h - 10,
            textPaint
        );
        textPaint.color = colorOnBackground;
        const topText = createNativeAttributedString({
            spans: [
                {
                    fontSize: 16 * $fontScale,
                    fontWeight: 'bold',
                    lineBreak: 'end',
                    lineHeight: 18 * $fontScale,
                    text: doc.name
                },
                {
                    color: colorOnSurfaceVariant,
                    fontSize: 14 * $fontScale,
                    lineHeight: 14 * $fontScale,
                    text: '\n' + dayjs(doc.createdDate).format('L LT')
                }
            ]
        });
        const staticLayout = new StaticLayout(topText, textPaint, Math.max(0, w - dx), LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
        canvas.translate(dx, 10);
        staticLayout.draw(canvas);
    }

    onMount(() => {
        refresh();
    });

    async function handleDocumentTap(doc: OCRDocument) {
        DEV_LOG && console.log('handleDocumentTap');
        closeModal([doc]);
    }
    async function handleFolderTap(tappedFolder: DocFolder) {
        DEV_LOG && console.log('handleFolderTap', tappedFolder);
        folder = tappedFolder;
        setTimeout(() => {
            refresh(true);
        }, 0);
    }
    async function importSelectedDocuments() {
        closeModal(await getSelectedDocuments());
    }

    function updateTitle(folder) {}
</script>

<MainList
    {handleDocumentTap}
    {handleFolderTap}
    modal={true}
    onlyForImport={true}
    showActionButton={true}
    {title}
    {updateTitle}
    viewStyles={{
        condensed: { name: lc('condensed') }
    }}
    bind:viewStyle
    bind:onItemTap
    bind:onItemLongPress
    bind:syncEnabled
    bind:folder
    bind:nbSelected
    bind:importDocument
    bind:importImages
    bind:refreshCollectionView
    bind:getSyncColors
    bind:documents
    bind:folderItems
    bind:getSelectedDocuments
    bind:refresh
    bind:collectionView
>
    <Template let:item>
        <canvasview
            class="card"
            borderWidth={isEInk ? 1 : 0}
            height={getItemRowHeight(viewStyle) * $fontScale}
            on:tap={() => onItemTap(item)}
            on:longPress={(e) => onItemLongPress(item, e)}
            on:draw={(e) => onCanvasDraw(item, e)}
        >
            <RotableImageView
                id="imageView"
                borderRadius={12}
                decodeWidth={IMAGE_DECODE_WIDTH}
                horizontalAlignment="left"
                item={item.doc.pages[0]}
                marginBottom={getImageMargin(viewStyle)}
                marginLeft={10}
                marginTop={getImageMargin(viewStyle)}
                sharedTransitionTag={`document_${item.doc.id}_${item.doc.pages[0]?.id}`}
                stretch="aspectFill"
                width={getItemImageHeight(viewStyle) * $fontScale}
            />
            <SelectedIndicator horizontalAlignment="left" margin={10} selected={item.selected} />
            <SyncIndicator syncColors={getSyncColors(item)} visible={syncEnabled} />
            <PageIndicator horizontalAlignment="right" margin={10} scale={$fontScale} text={item.doc.pages.length} />
        </canvasview>
    </Template>

    <stacklayout slot="fab" class="fabHolder" marginBottom={Math.min(60, $windowInset.bottom)} orientation="horizontal" row={2}>
        {#if nbSelected > 0}
            <uibutton id="fab" class="fab" verticalAlignment="center" on:tap={throttle(() => importSelectedDocuments(), 500)}>
                <cspan fontFamily={$fonts.mdi} fontSize={24} text="mdi-check  " />
                <cspan text={lc('import_documents')} />
            </uibutton>
        {/if}
    </stacklayout>
    <stacklayout slot="abovecollectionview" horizontalAlignment="left" row={1}>
        {#if folder}
            <Chip slot="abovecollectionview" margin={10} rightIcon="mdi-folder" text={folder.name} on:tap={() => handleFolderTap(null)} />
        {/if}
    </stacklayout>
</MainList>
