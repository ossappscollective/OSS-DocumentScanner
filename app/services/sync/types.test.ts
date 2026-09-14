import { describe, expect, it } from 'vitest';
import { SERVICES_SYNC_COLOR, SERVICES_SYNC_MASK, SyncType, SyncTypes, getRemoteDeleteDocumentSettingsKey, getRemoteDeleteFolderSettingsKey } from './types';

// `_synced` is a bitfield: each sync service owns one bit and marks a document
// as synced with `_synced & service.syncMask`. A duplicated or shifted bit would
// silently make two services share sync state, so these invariants are pinned.

const syncTypeKeys = Object.keys(SyncTypes) as (keyof typeof SyncTypes)[];

describe('SERVICES_SYNC_MASK', () => {
    it('defines a mask for every declared sync type', () => {
        syncTypeKeys.forEach((key) => {
            expect(SERVICES_SYNC_MASK[key], `missing mask for ${key}`).toBeTypeOf('number');
        });
    });

    it('does not define masks for unknown sync types', () => {
        expect(Object.keys(SERVICES_SYNC_MASK).sort()).toEqual([...syncTypeKeys].sort());
    });

    it('assigns a unique bit to each sync type', () => {
        const masks = Object.values(SERVICES_SYNC_MASK);
        expect(new Set(masks).size).toBe(masks.length);
    });

    it('uses a single bit per sync type', () => {
        Object.entries(SERVICES_SYNC_MASK).forEach(([key, mask]) => {
            // A power of two has exactly one bit set.
            expect(mask & (mask - 1), `${key} is not a single bit`).toBe(0);
            expect(mask, `${key} must be non-zero`).toBeGreaterThan(0);
        });
    });

    it('keeps every mask inside the 32-bit range used by bitwise operators', () => {
        Object.entries(SERVICES_SYNC_MASK).forEach(([key, mask]) => {
            expect(mask, `${key} overflows 32-bit bitwise math`).toBeLessThan(2 ** 31);
        });
    });

    it('combines without collision so a document can be synced to several services', () => {
        const combined = SERVICES_SYNC_MASK.webdav_data | SERVICES_SYNC_MASK.gdrive_pdf;
        expect(combined & SERVICES_SYNC_MASK.webdav_data).toBeTruthy();
        expect(combined & SERVICES_SYNC_MASK.gdrive_pdf).toBeTruthy();
        expect(combined & SERVICES_SYNC_MASK.onedrive_image).toBeFalsy();
    });
});

describe('SyncTypes enum', () => {
    it('maps every key to its own name so stored settings stay readable', () => {
        syncTypeKeys.forEach((key) => {
            expect(SyncTypes[key]).toBe(key);
        });
    });
});

describe('SERVICES_SYNC_COLOR', () => {
    it('defines a colour for every sync type', () => {
        syncTypeKeys.forEach((key) => {
            expect(SERVICES_SYNC_COLOR[key], `missing colour for ${key}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
    });
});

describe('SyncType category flags', () => {
    it('keeps DATA, IMAGE and PDF distinct', () => {
        expect(new Set([SyncType.DATA, SyncType.IMAGE, SyncType.PDF]).size).toBe(3);
    });

    it('uses ALL as the neutral value', () => {
        expect(SyncType.ALL).toBe(0);
    });
});

describe('getRemoteDeleteDocumentSettingsKey', () => {
    it('namespaces the key by service type', () => {
        expect(getRemoteDeleteDocumentSettingsKey({ type: SyncTypes.webdav_data } as any)).toBe('webdav_data_docs_to_remove_remote');
    });

    it('produces a distinct key per service so deletions do not leak across services', () => {
        const keys = syncTypeKeys.map((type) => getRemoteDeleteDocumentSettingsKey({ type } as any));
        expect(new Set(keys).size).toBe(keys.length);
    });
});

describe('getRemoteDeleteFolderSettingsKey', () => {
    it('namespaces the key by service type', () => {
        expect(getRemoteDeleteFolderSettingsKey({ type: SyncTypes.webdav_data } as any)).toBe('webdav_data_folders_to_remove_remote');
    });

    it('never collides with the pending document deletions of the same service', () => {
        const service = { type: SyncTypes.webdav_data } as any;
        expect(getRemoteDeleteFolderSettingsKey(service)).not.toBe(getRemoteDeleteDocumentSettingsKey(service));
    });
});
