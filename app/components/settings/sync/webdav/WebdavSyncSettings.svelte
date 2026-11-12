<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { Writable } from 'svelte/store';
    import { getSyncSettingsBase } from '~/components/settings/sync/getSyncSettingsBase';
    import WebdavSettingsView from '~/components/settings/sync/webdav/WebdavSettingsView.svelte';
    import { lc } from '~/helpers/locale';
    import { SYNC_TYPES } from '~/services/sync/types';
    import { WebdavSyncOptions } from '~/services/sync/webdav/Webdav';

    export let data: WebdavSyncOptions & { type: SYNC_TYPES };

    let updateItem;
    let store: Writable<WebdavSyncOptions>;

    const topItems = [
        {
            type: 'sectionHeader',
            title: lc('webdav_config')
        },
        {
            type: 'webdav'
        }
    ];
    let webdavView: WebdavSettingsView;

    async function validateSave() {
        return webdavView?.validateSave();
    }
</script>

<svelte:component this={getSyncSettingsBase(data.type)} {data} serviceType={data.type} {topItems} {validateSave} bind:updateItem bind:store>
    <Template key="webdav" let:item>
        <WebdavSettingsView bind:this={webdavView} {store} />
    </Template>
</svelte:component>
