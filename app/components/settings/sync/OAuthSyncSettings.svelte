<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { Writable } from 'svelte/store';
    import OAuthSettingsView from '~/components/settings/sync/OAuthSettingsView.svelte';
    import { getSyncSettingsBase } from '~/components/settings/sync/getSyncSettingsBase';
    import { lc } from '~/helpers/locale';
    import { GOOGLE_DRIVE_PROVIDER, GoogleDriveSyncOptions, testGoogleDriveConnection } from '~/services/sync/gdrive/GoogleDrive';
    import { OAuthTokens } from '~/services/sync/OAuthHelper';
    import { ONEDRIVE_PROVIDER, testOneDriveConnection } from '~/services/sync/onedrive/OneDrive';
    import { SYNC_TYPES } from '~/services/sync/types';

    export let data: GoogleDriveSyncOptions & { type: SYNC_TYPES };

    const providers = {
        gdrive: { provider: GOOGLE_DRIVE_PROVIDER, testConnection: (tokens: OAuthTokens) => testGoogleDriveConnection({ tokens } as any) },
        onedrive: { provider: ONEDRIVE_PROVIDER, testConnection: (tokens: OAuthTokens) => testOneDriveConnection({ tokens } as any) }
    };
    const { provider, testConnection } = providers[data.type.split('_')[0]];

    let updateItem;
    let store: Writable<GoogleDriveSyncOptions>;

    const topItems = [
        {
            type: 'sectionHeader',
            title: lc('authentication')
        },
        {
            type: 'oauth'
        }
    ];
    let oauthView: OAuthSettingsView;

    async function validateSave() {
        return oauthView?.validateSave();
    }
</script>

<svelte:component this={getSyncSettingsBase(data.type)} {data} serviceType={data.type} {topItems} {validateSave} bind:updateItem bind:store>
    <Template key="oauth" let:item>
        <OAuthSettingsView bind:this={oauthView} {provider} {store} {testConnection} />
    </Template>
</svelte:component>
