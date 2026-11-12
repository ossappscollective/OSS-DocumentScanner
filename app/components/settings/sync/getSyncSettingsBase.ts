import DataSyncSettings from '~/components/settings/sync/DataSyncSettings.svelte';
import ImageSyncSettings from '~/components/settings/sync/ImageSyncSettings.svelte';
import PDFSyncSettings from '~/components/settings/sync/PDFSyncSettings.svelte';
import { SYNC_TYPES } from '~/services/sync/types';

const SYNC_SETTINGS_BASES = { data: DataSyncSettings, image: ImageSyncSettings, pdf: PDFSyncSettings };

// the service type ends with the kind of data it syncs: webdav_pdf, gdrive_data...
export function getSyncSettingsBase(serviceType: SYNC_TYPES) {
    return SYNC_SETTINGS_BASES[serviceType.split('_')[1]];
}
