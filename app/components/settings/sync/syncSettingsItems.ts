import type { TextFieldProperties } from '@nativescript-community/ui-textfield';
import { Writable, get } from 'svelte/store';
import { lc } from '~/helpers/locale';
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
    rightValue: () => get(store).fileNameFormat,
    type: 'prompt'
});

export const getUseFoldersStructureItem = (store: Writable<SyncSettingsValues>) => ({
    type: 'switch',
    id: 'useFoldersStructure',
    title: lc('use_folder_structure'),
    description: lc('use_folder_structure_desc'),
    value: get(store).useFoldersStructure
});
