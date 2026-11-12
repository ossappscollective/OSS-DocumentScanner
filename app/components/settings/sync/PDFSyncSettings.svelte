<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { ApplicationSettings, Color, ObservableArray } from '@nativescript/core';
    import { Writable, writable } from 'svelte/store';
    import OCRSettingsBottomSheet from '~/components/ocr/OCRSettingsBottomSheet.svelte';
    import PDFSyncSettingsView from '~/components/settings/sync/PDFSyncSettingsView.svelte';
    import SyncSettingsPage from '~/components/settings/sync/SyncSettingsPage.svelte';
    import { getColorEnabledAutoSyncItems, getDeleteAfterSyncItem, getFileNameFormatItem, getUseFoldersStructureItem } from '~/components/settings/sync/syncSettingsItems';
    import { lc } from '~/helpers/locale';
    import { getPDFDefaultExportOptions } from '~/services/pdf/PDFCanvas';
    import { BasePDFSyncServiceOptions } from '~/services/sync/BasePDFSyncService';
    import { SERVICES_SYNC_COLOR, SYNC_TYPES } from '~/services/sync/types';
    import { FILENAME_DATE_FORMAT, FILENAME_USE_DOCUMENT_NAME, SETTINGS_FILE_NAME_FORMAT, SETTINGS_FILE_NAME_USE_DOCUMENT_NAME } from '~/utils/constants';

    const pdfExportSettings = getPDFDefaultExportOptions();
    export let data: BasePDFSyncServiceOptions = {} as any;
    export let serviceType: SYNC_TYPES;

    export let store = writable<BasePDFSyncServiceOptions>(
        Object.assign(
            {
                exportOptions: pdfExportSettings,
                autoSync: false,
                enabled: true,
                OCREnabled: false,
                useFoldersStructure: false,
                deleteAfterSync: false,
                OCRDataType: 'best',
                OCRLanguages: [],
                fileNameFormat: ApplicationSettings.getString(SETTINGS_FILE_NAME_FORMAT, FILENAME_DATE_FORMAT),
                useDocumentName: ApplicationSettings.getBoolean(SETTINGS_FILE_NAME_USE_DOCUMENT_NAME, FILENAME_USE_DOCUMENT_NAME),
                color: SERVICES_SYNC_COLOR[serviceType] as string | Color
            },
            data
        )
    );

    export let topItems: any[] | ((store: Writable<BasePDFSyncServiceOptions>) => any[]) = [];
    export let updateItem;

    const items = new ObservableArray([
        ...getColorEnabledAutoSyncItems(store),
        getDeleteAfterSyncItem(store),
        ...(typeof topItems === 'function' ? topItems(store) : topItems),
        {
            type: 'switch',
            id: 'useDocumentName',
            title: lc('filename_use_document_name'),
            value: $store.useDocumentName
        },
        getFileNameFormatItem(store),
        getUseFoldersStructureItem(store),
        {
            type: 'syncfolders'
        },
        {
            type: 'sectionheader',
            title: lc('pdf_settings')
        },
        {
            type: 'pdfoptions'
        },
        {
            type: 'sectionheader',
            title: lc('ocr_settings')
        },
        {
            type: 'switch',
            id: 'OCREnabled',
            title: lc('ocr_enabled'),
            value: $store.OCREnabled
        },
        {
            type: 'ocroptions'
        }
    ]);
</script>

<SyncSettingsPage title={lc('pdf_sync_settings')} {items} {store} bind:updateItem {...$$restProps}>
    <slot />
    <Template key="pdfoptions" let:item>
        <PDFSyncSettingsView {store} on:uppdate={() => updateItem({ type: 'pdfoptions' }, 'type')} />
    </Template>

    <Template key="ocroptions">
        <OCRSettingsBottomSheet onlySettings={true} bind:dataType={$store.OCRDataType} bind:languages={$store.OCRLanguages} />
    </Template>
</SyncSettingsPage>
