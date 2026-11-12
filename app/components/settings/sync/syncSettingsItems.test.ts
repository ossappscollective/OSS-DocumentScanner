import { writable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

vi.mock('~/helpers/locale', () => ({ lc: (key: string) => key }));
vi.mock('~/utils/ui', () => ({ getNameFormatHTMLArgs: () => ['arg'], openLink: vi.fn() }));

import { openLink } from '~/utils/ui';
import { getColorEnabledAutoSyncItems, getDeleteAfterSyncItem, getFileNameFormatItem, getUseFoldersStructureItem } from './syncSettingsItems';

describe('syncSettingsItems', () => {
    it('starts the rows with the color then the switches reading the store', () => {
        const store = writable({ enabled: true, autoSync: false });
        expect(getColorEnabledAutoSyncItems(store)).toEqual([
            { type: 'color' },
            { type: 'switch', id: 'enabled', title: 'enabled', value: true },
            { type: 'switch', id: 'autoSync', title: 'auto_sync', description: 'local_auto_sync_desc', value: false }
        ]);
    });

    it('reads deleteAfterSync and useFoldersStructure from the store', () => {
        const store = writable({ deleteAfterSync: true, useFoldersStructure: false });
        expect(getDeleteAfterSyncItem(store)).toMatchObject({ type: 'switch', id: 'deleteAfterSync', value: true });
        expect(getUseFoldersStructureItem(store)).toMatchObject({ type: 'switch', id: 'useFoldersStructure', value: false });
    });

    it('gives the current file name format when asked, not the one of creation', () => {
        const store = writable({ fileNameFormat: 'a' });
        const item = getFileNameFormatItem(store);
        store.set({ fileNameFormat: 'b' });
        expect(item.rightValue()).toBe('b');
        expect(item).toMatchObject({ id: 'setting', key: 'fileNameFormat', type: 'prompt', valueType: 'string', full_description: 'filename_date_format_fulldesc' });
    });

    it('opens the tapped link', () => {
        getFileNameFormatItem(writable({})).onLinkTap({ link: 'https://x' });
        expect(openLink).toHaveBeenCalledWith('https://x');
    });
});
