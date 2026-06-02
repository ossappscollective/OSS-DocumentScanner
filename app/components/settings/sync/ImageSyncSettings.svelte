<script context="module" lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { TextFieldProperties } from '@nativescript-community/ui-material-textfield';
    import { ApplicationSettings, Color, ObservableArray, Page } from '@nativescript/core';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { Writable, get, writable } from 'svelte/store';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import SyncSettingsCollectionView from '~/components/settings/sync/SyncSettingsCollectionView.svelte';
    import { lc } from '~/helpers/locale';
    import { BaseImageSyncServiceOptions } from '~/services/sync/BaseImageSyncService';
    import { SERVICES_SYNC_COLOR, SYNC_TYPES } from '~/services/sync/types';
    import { FILENAME_DATE_FORMAT, SETTINGS_FILE_NAME_FORMAT, getImageExportSettings } from '~/utils/constants';
    import { getNameFormatHTMLArgs, openLink, requestNotificationPermission, showSnack } from '~/utils/ui';
</script>

<script lang="ts">
    let page: NativeViewElementNode<Page>;

    const imageExportSettings = getImageExportSettings();
    export let data: BaseImageSyncServiceOptions = {} as any;

    export let serviceType: SYNC_TYPES;
    export let validateSave: () => Promise<boolean> = async () => true;
    export let onSaveError: Function = () =>
        showSnack({
            message: lc('need_fill_fields'),
            view: page.nativeView
        });
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

    async function save() {
        const result = get(store);

        if (await validateSave()) {
            if (__ANDROID__) {
                await requestNotificationPermission();
            }
            closeModal(result);
        } else {
            onSaveError();
        }
    }
    export let topItems: any[] | ((store: Writable<BaseImageSyncServiceOptions>) => any[]) = [];
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
        {
            type: 'switch',
            id: 'deleteAfterSync',
            title: lc('delete_after_sync'),
            description: lc('delete_after_sync_desc'),
            value: $store.deleteAfterSync
        },
        ...(typeof topItems === 'function' ? topItems(store) : topItems),
        {
            id: 'setting',
            key: 'fileNameFormat',
            useHTML: true,
            title: lc('filename_date_format'),
            description: lc('filename_date_format_desc'),
            full_description: lc('filename_date_format_fulldesc', ...getNameFormatHTMLArgs()),
            onLinkTap: ({ link }) => {
                openLink(link);
            },
            valueType: 'string',
            textFieldProperties: {
                autocapitalizationType: 'none',
                autocorrect: false
            } as TextFieldProperties,
            rightValue: () => $store.fileNameFormat,
            type: 'prompt'
        },
        {
            type: 'switch',
            id: 'useFoldersStructure',
            title: lc('use_folder_structure'),
            description: lc('use_folder_structure_desc'),
            value: $store.useFoldersStructure
        },
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
        }
    ]);
</script>

<page bind:this={page} actionBarHidden={true} {...$$restProps}>
    <gridlayout class="pageContent" rows="auto,*">
        <SyncSettingsCollectionView {items} row={1} bind:store bind:updateItem>
            <slot />
        </SyncSettingsCollectionView>

        <CActionBar canGoBack modalWindow={true} title={lc('image_sync_settings')}>
            <mdbutton text={lc('save')} variant="text" verticalAlignment="middle" on:tap={save} />
        </CActionBar>
    </gridlayout>
</page>
