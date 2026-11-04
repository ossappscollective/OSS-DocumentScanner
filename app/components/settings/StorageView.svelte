<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { ObservableArray, Utils } from '@nativescript/core';
    import { goBack } from '@shared/utils/svelte/ui';
    import { showError } from '@shared/utils/showError';
    import { writable } from 'svelte/store';
    import CardRowPass from '~/components/list/CardRowPass.svelte';
    import CardRow from '~/components/list/CardRow.svelte';
    import CardRowPhoto from '~/components/list/CardRowPhoto.svelte';
    import CardRowTile from '~/components/list/CardRowTile.svelte';
    import type { Item } from '~/components/list/MainList.svelte';
    import StorageChips from '~/components/settings/StorageChips.svelte';
    import StorageOverview from '~/components/settings/StorageOverview.svelte';
    import { lc, lcp } from '~/helpers/locale';
    import { documentsService } from '~/services/documents';
    import { optionsToMenuItems } from '~/utils/appMenu';
    import { appIcon } from '~/utils/appIcons';
    import { getCardVariant } from '~/utils/cardCell';
    import { updateRowPositions } from '~/utils/groupedRows';
    import { StorageSizes, computeStorageSizes } from '~/utils/originals';
    import { deleteDocumentsWithConfirm, deleteOriginalImages, goToDocumentView } from '~/utils/ui';
    import { colors, windowInset } from '~/variables';

    interface StorageItem extends Item {
        sizes?: StorageSizes;
        title?: string;
    }

    const ROW_HEIGHT = 72;
</script>

<script lang="ts">
    let { colorError, colorOnBackground, colorPrimaryContainer } = $colors;
    $: ({ colorError, colorOnBackground, colorPrimaryContainer } = $colors);

    let collectionView: NativeViewElementNode<CollectionView>;
    let items: ObservableArray<StorageItem> = new ObservableArray([]);
    let totals: StorageSizes = { size: 0, sourceSize: 0, total: 0 };
    let nbDocuments = 0;
    let nbSelected = 0;
    const selectionMode = writable(false);
    $: selectionMode.set(nbSelected > 0);

    async function refresh() {
        try {
            const documents = await documentsService.documentRepository.findDocuments();
            const rows: StorageItem[] = documents.map((doc) => ({ doc, selected: false, sizes: computeStorageSizes(doc.pages) }));
            const using = rows.filter((row) => row.sizes.total > 0).sort((first, second) => second.sizes.total - first.sizes.total);
            const unused = rows.filter((row) => row.sizes.total === 0);
            const newItems: StorageItem[] = [
                { type: 'overview', selected: false },
                ...(using.length ? [{ type: 'section', title: lc('using_storage'), selected: false }, ...using] : []),
                ...(unused.length ? [{ type: 'section', title: lc('no_storage_used'), selected: false }, ...unused] : [])
            ];
            updateRowPositions((index) => newItems[index], newItems.length);
            totals = computeStorageSizes(documents.flatMap((doc) => doc.pages));
            nbDocuments = documents.length;
            nbSelected = 0;
            items = new ObservableArray(newItems);
        } catch (error) {
            showError(error);
        }
    }

    function getDocumentItems() {
        const documentItems: StorageItem[] = [];
        items.forEach((item) => {
            if (item.doc) {
                documentItems.push(item);
            }
        });
        return documentItems;
    }
    function getSelectedDocuments() {
        return getDocumentItems()
            .filter((item) => item.selected)
            .map((item) => item.doc);
    }
    function setSelected(item: StorageItem, selected: boolean) {
        if (item.selected === selected) {
            return;
        }
        item.selected = selected;
        nbSelected += selected ? 1 : -1;
        items.setItem(items.indexOf(item), item);
    }
    function unselectAll() {
        getDocumentItems().forEach((item) => setSelected(item, false));
    }
    function selectAll() {
        getDocumentItems().forEach((item) => setSelected(item, true));
    }

    async function onItemTap(item: StorageItem) {
        try {
            if (nbSelected > 0) {
                setSelected(item, !item.selected);
            } else {
                await goToDocumentView(item.doc);
            }
        } catch (error) {
            showError(error);
        }
    }
    function onItemLongPress(item: StorageItem) {
        setSelected(item, !item.selected);
    }

    const selectionOptions = [
        { id: 'select_all', name: lc('select_all') },
        { id: 'delete_originals', name: lc('delete_original_images') },
        { id: 'delete', name: lc('delete'), color: colorError }
    ];
    async function onSelectionAction(option: { id: string }) {
        try {
            switch (option.id) {
                case 'select_all':
                    if (nbSelected === getDocumentItems().length) {
                        unselectAll();
                    } else {
                        selectAll();
                    }
                    break;
                case 'delete_originals':
                    if (await deleteOriginalImages({ documents: getSelectedDocuments() })) {
                        await refresh();
                    }
                    break;
                case 'delete':
                    if (await deleteDocumentsWithConfirm(getSelectedDocuments())) {
                        await refresh();
                    }
                    break;
            }
        } catch (error) {
            showError(error);
        }
    }
    // Android: the actions are in the top bar while selecting, iOS: in the bottom toolbar
    $: bottomItems =
        __IOS__ && nbSelected > 0
            ? selectionOptions.flatMap((option) => [{ spacer: true }, { text: option.name, icon: appIcon(option.id), color: option.color, onTap: () => onSelectionAction(option) }])
            : [];

    const optionsMenu = optionsToMenuItems([{ id: 'delete_originals', name: lc('delete_all_original_images') }], async () => {
        try {
            if (await deleteOriginalImages({ documents: getDocumentItems().map((item) => item.doc) })) {
                await refresh();
            }
        } catch (error) {
            showError(error);
        }
    });

    // the list lays out under the bars: NativeScript then does not lay it out again each time the large title of the bar changes its height,
    // which made it reload and jump while it came back to the top. UIKit insets the content, only the bottom has to be given back
    const bottomSafeInset = __IOS__ ? Utils.ios.getRootViewController().view.safeAreaInsets.bottom : 0;
    function templateSelector(item: StorageItem) {
        return item.type ?? (getCardVariant(item) || 'tile');
    }

    refresh();
</script>

<appPage id="storageView">
    <appBar
        android:backgroundColor={nbSelected > 0 ? colorPrimaryContainer : undefined}
        {bottomItems}
        color={colorOnBackground}
        iosIconRenderingMode="alwaysTemplate"
        scrollBehavior="lift"
        android:scrollBehavior="none"
        scrollTargetId="storageCollectionView"
        size={__IOS__ ? 'large' : 'medium'}
        ios:translucent={true}
        title={nbSelected > 0 ? lcp('selected', nbSelected) : lc('documents_storage')}
    >
        {#if __ANDROID__}
            <navigationButton {...{ 'android.systemIcon': nbSelected > 0 ? 'ic_menu_close_clear_cancel' : 'ic_menu_back' }} on:tap={nbSelected > 0 ? unselectAll : () => goBack()} />
        {/if}
        {#if nbSelected === 0}
            <appBarItem icon={appIcon('more')} ios.position="right" menu={optionsMenu} />
        {:else if __IOS__}
            <appBarItem ios.position="right" prominent={true} text={lc('cancel')} on:tap={unselectAll} />
        {:else}
            {#each selectionOptions as option (option.id)}
                <appBarItem icon={appIcon(option.id)} text={option.name} on:tap={() => onSelectionAction(option)} />
            {/each}
        {/if}
    </appBar>
    <gridlayout class="pageContent">
        <collectionview
            id="storageCollectionView"
            bind:this={collectionView}
            ios:animateItemUpdate={false}
            ios:autoReloadItemOnLayout={true}
            {...{ iosIgnoreSafeArea: true }}
            ios:marginBottom={-bottomSafeInset}
            itemTemplateSelector={templateSelector}
            {items}
            android:paddingBottom={$windowInset.bottom}
        >
            <Template key="overview">
                <StorageOverview {nbDocuments} {totals} />
            </Template>
            <Template key="section" let:item>
                <label class="settingsSectionHeader" text={item.title} />
            </Template>
            <Template key="tile" let:item>
                <CardRow height={ROW_HEIGHT} {item} {selectionMode} on:tap={() => onItemTap(item)} on:longPress={() => onItemLongPress(item)}>
                    <CardRowTile {item} />
                    <StorageChips slot="chips" let:hasLeading {hasLeading} sizes={item.sizes} />
                </CardRow>
            </Template>
            <Template key="photo" let:item>
                <CardRow height={ROW_HEIGHT} {item} {selectionMode} on:tap={() => onItemTap(item)} on:longPress={() => onItemLongPress(item)}>
                    <CardRowPhoto {item} />
                    <StorageChips slot="chips" let:hasLeading {hasLeading} sizes={item.sizes} />
                </CardRow>
            </Template>
            <Template key="pkpass" let:item>
                <CardRow height={ROW_HEIGHT} {item} pkPassCell={true} {selectionMode} on:tap={() => onItemTap(item)} on:longPress={() => onItemLongPress(item)}>
                    <CardRowPass {item} />
                    <StorageChips slot="chips" let:hasLeading {hasLeading} sizes={item.sizes} />
                </CardRow>
            </Template>
        </collectionview>
    </gridlayout>
</appPage>
