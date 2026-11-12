<script lang="ts">
    import { ApplicationSettings, Color, ObservableArray } from '@nativescript/core';
    import { Writable, writable } from 'svelte/store';
    import SyncSettingsPage from '~/components/settings/sync/SyncSettingsPage.svelte';
    import { getColorEnabledAutoSyncItems, getDeleteAfterSyncItem, getFileNameFormatItem, getUseFoldersStructureItem } from '~/components/settings/sync/syncSettingsItems';
    import { lc } from '~/helpers/locale';
    import { BaseImageSyncServiceOptions } from '~/services/sync/BaseImageSyncService';
    import { SERVICES_SYNC_COLOR, SYNC_TYPES } from '~/services/sync/types';
    import { FILENAME_DATE_FORMAT, SETTINGS_FILE_NAME_FORMAT, getImageExportSettings } from '~/utils/constants';

    const imageExportSettings = getImageExportSettings();
    export let data: BaseImageSyncServiceOptions = {} as any;

    export let serviceType: SYNC_TYPES;
    export let store = writable<BaseImageSyncServiceOptions>(
        Object.assign(
            {
                ...imageExportSettings,
                autoSync: false,
                useFoldersStructure: false,
                deleteAfterSync: false,
                enabled: true,
                fileNameFormat: ApplicationSettings.getString(SETTINGS_FILE_NAME_FORMAT, FILENAME_DATE_FORMAT),
                color: SERVICES_SYNC_COLOR[serviceType] as string | Color
            },
            data
        )
    );

    export let topItems: any[] | ((store: Writable<BaseImageSyncServiceOptions>) => any[]) = [];
    export let updateItem;

    const items = new ObservableArray([
        ...getColorEnabledAutoSyncItems(store),
        getDeleteAfterSyncItem(store),
        ...(typeof topItems === 'function' ? topItems(store) : topItems),
        getFileNameFormatItem(store),
        getUseFoldersStructureItem(store),
        {
            id: 'setting',
            key: 'imageFormat',
            title: lc('image_format'),
            currentValue: () => $store.imageFormat,
            description: lc('image_format_desc'),
            rightValue: () => ($store.imageFormat || imageExportSettings.imageFormat).toUpperCase(),
            valueType: 'string',
            values: [
                { value: null, title: lc('default_value') },
                { value: 'jpg', title: 'JPEG' },
                { value: 'png', title: 'PNG' }
            ]
        },
        {
            id: 'setting',
            key: 'imageQuality',
            min: 10,
            max: 100,
            step: 1,
            title: lc('image_quality'),
            description: lc('image_quality_desc'),
            type: 'slider',
            rightValue: () => $store.imageQuality,
            currentValue: () => $store.imageQuality
        },
        {
            type: 'syncfolders'
        }
    ]);
</script>

<SyncSettingsPage title={lc('image_sync_settings')} {items} {store} bind:updateItem {...$$restProps}>
    <slot />
</SyncSettingsPage>
