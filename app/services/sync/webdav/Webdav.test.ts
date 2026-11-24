import { describe, expect, it } from 'vitest';
import { AuthType } from '~/webdav';
import {
    LUH_SEAFILE_WEBDAV_URL,
    applyWebdavSyncMode,
    createWebdavClientFromConfig,
    createWebdavConfig,
    getWebdavSyncModeId,
    normalizeRemoteFolder,
    normalizeWebdavUrl
} from './Webdav';

describe('normalizeWebdavUrl', () => {
    it('automatically appends /dav for LUH seafile hosts without a path', () => {
        expect(normalizeWebdavUrl('seafile.cloud.uni-hannover.de')).toBe(LUH_SEAFILE_WEBDAV_URL);
        expect(normalizeWebdavUrl('https://seafile.cloud.uni-hannover.de/')).toBe(LUH_SEAFILE_WEBDAV_URL);
    });

    it('preserves existing /dav or /seafdav paths and strips trailing slash', () => {
        expect(normalizeWebdavUrl('https://seafile.cloud.uni-hannover.de/dav/')).toBe(LUH_SEAFILE_WEBDAV_URL);
        expect(normalizeWebdavUrl('https://seafile.cloud.uni-hannover.de/dav/0-inbox/')).toBe(
            'https://seafile.cloud.uni-hannover.de/dav/0-inbox'
        );
        expect(normalizeWebdavUrl('https://seafile.example.com/seafdav/')).toBe('https://seafile.example.com/seafdav');
    });

    it('appends /seafdav when forceSeafile=true on a custom domain', () => {
        expect(normalizeWebdavUrl('cloud.example.edu', true)).toBe('https://cloud.example.edu/seafdav');
    });

    it('preserves non-seafile custom WebDAV paths', () => {
        expect(normalizeWebdavUrl('https://nextcloud.example.com/remote.php/dav/files/user/')).toBe(
            'https://nextcloud.example.com/remote.php/dav/files/user'
        );
    });
});

describe('normalizeRemoteFolder', () => {
    it('normalizes empty, whitespace, and trailing slashes consistently', () => {
        expect(normalizeRemoteFolder(undefined)).toBe('/');
        expect(normalizeRemoteFolder('')).toBe('/');
        expect(normalizeRemoteFolder('   ')).toBe('/');
        expect(normalizeRemoteFolder('/')).toBe('/');
        expect(normalizeRemoteFolder('Scans/')).toBe('/Scans');
        expect(normalizeRemoteFolder(' /My Library/Scans/ ')).toBe('/My Library/Scans');
    });
});

describe('createWebdavConfig and createWebdavClientFromConfig', () => {
    it('preserves Basic Authorization header when restarting a saved password config without raw password', () => {
        const saved = createWebdavConfig({
            remoteURL: 'https://seafile.cloud.uni-hannover.de/dav/',
            remoteFolder: '0-inbox/',
            username: 'alice',
            password: 'secret',
            authType: AuthType.Password
        });
        expect(saved.remoteURL).toBe(LUH_SEAFILE_WEBDAV_URL);
        expect(saved.remoteFolder).toBe('/0-inbox');
        expect(saved.headers?.Authorization).toMatch(/^Basic /);

        const client = createWebdavClientFromConfig(saved);
        expect(client.context.headers.Authorization).toBe(saved.headers.Authorization);
    });

    it('builds valid Bearer Authorization header for token auth without clobbering it to undefined', () => {
        const saved = createWebdavConfig({
            remoteURL: 'https://cloud.example.com/dav',
            remoteFolder: '/Scans',
            authType: AuthType.Token,
            token: 'my-secret-token'
        });
        expect(saved.headers?.Authorization).toBe('Bearer my-secret-token');

        const client = createWebdavClientFromConfig(saved);
        expect(client.context.headers.Authorization).toBe('Bearer my-secret-token');
    });

    it('clears stale Authorization header when switching to AuthType.None', () => {
        const saved = createWebdavConfig({
            remoteURL: 'https://cloud.example.com/dav',
            remoteFolder: '/Scans',
            authType: AuthType.None,
            headers: { Authorization: 'Basic stale' }
        });
        expect(saved.headers?.Authorization).toBeUndefined();
    });
});

describe('WebdavSyncMode helpers', () => {
    it('maps autoSync and deleteAfterSync flags to mode IDs and back', () => {
        expect(getWebdavSyncModeId({ autoSync: true, deleteAfterSync: false })).toBe('auto_keep');
        expect(getWebdavSyncModeId({ autoSync: true, deleteAfterSync: true })).toBe('auto_delete');
        expect(getWebdavSyncModeId({ autoSync: false, deleteAfterSync: false })).toBe('manual_keep');
        expect(getWebdavSyncModeId({ autoSync: false, deleteAfterSync: true })).toBe('manual_delete');

        expect(applyWebdavSyncMode('auto_keep')).toEqual({ autoSync: true, deleteAfterSync: false });
        expect(applyWebdavSyncMode('auto_delete')).toEqual({ autoSync: true, deleteAfterSync: true });
        expect(applyWebdavSyncMode('manual_keep')).toEqual({ autoSync: false, deleteAfterSync: false });
        expect(applyWebdavSyncMode('manual_delete')).toEqual({ autoSync: false, deleteAfterSync: true });
    });
});
