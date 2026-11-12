import dayjs from 'dayjs';
import { ExtraFieldType } from '~/models/OCRDocument';
import { EXTRA_PAPERLESS_ID_KEY } from '~/services/sync/paperless/PaperlessNgxPDFSyncService';

/** the fields the user gave to a card: the other keys of its extra are data of the app */
export function getExtraFields(extra: Record<string, unknown>) {
    const source = extra || {};
    return Object.keys(source)
        .filter((key) => key !== 'color' && key !== 'pkpass' && key !== EXTRA_PAPERLESS_ID_KEY && typeof source[key] === 'object')
        .map((key) => ({ name: key, extra: source[key] as any }));
}

export function formatExtraValue(extra) {
    return extra?.type === ExtraFieldType.Date ? dayjs(extra.value).format(extra.format || 'LL') : (extra?.value ?? '');
}
