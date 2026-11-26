import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
import type { TextFieldProperties } from '@nativescript-community/ui-textfield';
import { Writable, get } from 'svelte/store';
import { lc } from '~/helpers/locale';
import { SHEET_PAN_SOFT_INPUT_MODE } from '~/utils/constants';
import { formatNamingTemplate, getDefaultCustomText } from '~/utils/namingTemplates';
import { getNameFormatHTMLArgs, openLink } from '~/utils/ui';

interface SyncSettingsValues {
    enabled?: boolean;
    autoSync?: boolean;
    deleteAfterSync?: boolean;
    useFoldersStructure?: boolean;
    fileNameFormat?: string;
}

export const getColorEnabledAutoSyncItems = (store: Writable<SyncSettingsValues>) => [
    {
        type: 'color'
    },
    {
        type: 'switch',
        id: 'enabled',
        title: lc('enabled'),
        value: get(store).enabled
    },
    {
        type: 'switch',
        id: 'autoSync',
        title: lc('auto_sync'),
        description: lc('local_auto_sync_desc'),
        value: get(store).autoSync
    }
];

export const getDeleteAfterSyncItem = (store: Writable<SyncSettingsValues>) => ({
    type: 'switch',
    id: 'deleteAfterSync',
    title: lc('delete_after_sync'),
    description: lc('delete_after_sync_desc'),
    value: get(store).deleteAfterSync
});

export const getFileNameFormatItem = (store: Writable<SyncSettingsValues>) => ({
    id: 'setting',
    key: 'fileNameFormat',
    useHTML: true,
    title: lc('filename_date_format'),
    description: () => {
        const pattern = get(store).fileNameFormat || 'YYYY-MM-DD.{freetext}.HH-mm';
        const freetext = getDefaultCustomText();
        const preview = formatNamingTemplate(pattern, { date: Date.now(), customText: freetext, clean: true });
        return `${lc('filename_date_format_desc')} (${preview}.pdf)`;
    },
    full_description: lc('filename_date_format_fulldesc', ...getNameFormatHTMLArgs()),
    onLinkTap: ({ link }) => {
        openLink(link);
    },
    onTap: async () => {
        const RenameDocumentSheet = (await import('~/components/view/RenameDocumentSheet.svelte')).default;
        const chosenPattern = await showBottomSheet({
            view: RenameDocumentSheet,
            windowSoftInputMode: SHEET_PAN_SOFT_INPUT_MODE,
            ignoreTopSafeArea: true,
            props: {
                initialPattern: get(store).fileNameFormat || 'YYYY-MM-DD.{freetext}.HH-mm',
                title: lc('filename_date_format')
            }
        });
        if (typeof chosenPattern === 'string' && chosenPattern.trim()) {
            store.update((s) => ({ ...s, fileNameFormat: chosenPattern.trim(), useDocumentName: false }));
        }
    },
    valueType: 'string',
    textFieldProperties: {
        autocapitalizationType: 'none',
        autocorrect: false
    } as TextFieldProperties,
    rightValue: () => get(store).fileNameFormat || 'YYYY-MM-DD.{freetext}.HH-mm',
    type: 'prompt'
});

export const getUseFoldersStructureItem = (store: Writable<SyncSettingsValues>) => ({
    type: 'switch',
    id: 'useFoldersStructure',
    title: lc('use_folder_structure'),
    description: lc('use_folder_structure_desc'),
    value: get(store).useFoldersStructure
});
