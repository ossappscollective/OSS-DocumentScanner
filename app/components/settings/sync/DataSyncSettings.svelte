<script lang="ts">
    import { Color, ObservableArray } from '@nativescript/core';
    import { writable } from 'svelte/store';
    import SyncSettingsPage from '~/components/settings/sync/SyncSettingsPage.svelte';
    import { getColorEnabledAutoSyncItems } from '~/components/settings/sync/syncSettingsItems';
    import { lc } from '~/helpers/locale';
    import { BasePDFSyncServiceOptions } from '~/services/sync/BasePDFSyncService';
    import { SERVICES_SYNC_COLOR, SYNC_TYPES } from '~/services/sync/types';

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

    export let topItems = [];
    export let updateItem;

    const items = new ObservableArray([
        ...getColorEnabledAutoSyncItems(store),
        ...topItems,
        {
            type: 'syncfolders'
        }
    ]);
</script>

<SyncSettingsPage title={lc('data_sync_settings')} {items} {store} bind:updateItem {...$$restProps}>
    <slot />
</SyncSettingsPage>
