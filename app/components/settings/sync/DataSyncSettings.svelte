<script context="module" lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { Color, ObservableArray, Page } from '@nativescript/core';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { get, writable } from 'svelte/store';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import SyncFoldersSettingsView from '~/components/settings/sync/SyncFoldersSettingsView.svelte';
    import SyncSettingsCollectionView from '~/components/settings/sync/SyncSettingsCollectionView.svelte';
    import { lc } from '~/helpers/locale';
    import { BasePDFSyncServiceOptions } from '~/services/sync/BasePDFSyncService';
    import { SERVICES_SYNC_COLOR, SYNC_TYPES } from '~/services/sync/types';
    import { checkOrDownloadOCRLanguages, requestNotificationPermission, showSnack } from '~/utils/ui';
</script>

<script lang="ts">
    let page: NativeViewElementNode<Page>;

    export let data: BasePDFSyncServiceOptions = {} as any;
    export let serviceType: SYNC_TYPES;
    export let store = writable<BasePDFSyncServiceOptions>(
        Object.assign(
            {
                autoSync: false,
                enabled: true,
                color: SERVICES_SYNC_COLOR[serviceType] as string | Color,
                remoteFolder: CARD_APP ? 'OSSCardWallet' : 'OSSDocumentScanner'
            },
            data
        )
    );

    export let validateSave: () => Promise<boolean> = async () => true;
    export let onSaveError: Function = () =>
        showSnack({
            message: lc('need_fill_fields'),
            view: page.nativeView
        });

    async function save() {
        const result = get(store);
        DEV_LOG && console.log('save', JSON.stringify(result));
        if (await validateSave()) {
            if (__ANDROID__) {
                await requestNotificationPermission();
            }
            if (result.OCREnabled && result.OCRLanguages.length) {
                await checkOrDownloadOCRLanguages({
                    dataType: result.OCRDataType,
                    languages: result.OCRLanguages,
                    shouldConfirm: false
                });
            }
            closeModal(result);
        } else {
            onSaveError();
        }
    }
    export let topItems = [];
    export let updateItem;

    const items = new ObservableArray([
        {
            type: 'color'
        },
        {
            type: 'switch',
            id: 'enabled',
            title: lc('enabled'),
            value: $store.enabled
        },
        {
            type: 'switch',
            id: 'autoSync',
            title: lc('auto_sync'),
            description: lc('local_auto_sync_desc'),
            value: $store.autoSync
        },
        ...topItems,
        {
            type: 'syncfolders'
        }
    ]);
</script>

<page bind:this={page} actionBarHidden={true} {...$$restProps}>
    <gridlayout class="pageContent" rows="auto,*">
        <SyncSettingsCollectionView {items} row={1} bind:store bind:updateItem>
            <slot />
            <Template key="syncfolders">
                <SyncFoldersSettingsView {store} />
            </Template>
        </SyncSettingsCollectionView>

        <CActionBar canGoBack modalWindow={true} title={lc('data_sync_settings')}>
            <uibutton text={lc('save')} variant="text" verticalAlignment="middle" on:tap={save} />
        </CActionBar>
    </gridlayout>
</page>
