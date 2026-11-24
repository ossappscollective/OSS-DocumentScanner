import { AuthType, FileStat, Headers, createClient, createContext } from '~/webdav';
import { getStat } from '~/webdav/operations/stat';
import { join, normalisePath } from '~/webdav/tools/path';

export interface WebdavSyncOptions {
    remoteURL: string;
    username?: string;
    password?: string;
    remoteFolder: string;
    authType: AuthType;
    token?: string;
    headers?: Headers;
    autoSync?: boolean;
    deleteAfterSync?: boolean;
    fileNameFormat?: string;
    useDocumentName?: boolean;
}

export interface WebdavDirectoryEntry {
    name: string;
    path: string;
}

export type WebdavSyncModeId = 'auto_keep' | 'auto_delete' | 'manual_keep' | 'manual_delete';

export const LUH_SEAFILE_WEBDAV_URL = 'https://seafile.cloud.uni-hannover.de/dav';

/**
 * Normalizes a WebDAV URL. If the host looks like a Seafile server (e.g. seafile.cloud.uni-hannover.de)
 * or `forceSeafile` is true and no path is given, `/dav` (for LUH) or `/seafdav` is appended automatically.
 */
export function normalizeWebdavUrl(rawUrl: string, forceSeafile = false): string {
    if (!rawUrl || !rawUrl.trim()) {
        return '';
    }
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    // Strip trailing slashes for consistent path joining
    url = url.replace(/\/+$/, '');

    try {
        const withoutProto = url.replace(/^https?:\/\//i, '');
        const slashIdx = withoutProto.indexOf('/');
        const host = (slashIdx === -1 ? withoutProto : withoutProto.slice(0, slashIdx)).toLowerCase();
        const pathPart = slashIdx === -1 ? '' : withoutProto.slice(slashIdx);

        if ((forceSeafile || host.includes('seafile')) && (!pathPart || pathPart === '/')) {
            url = host.includes('uni-hannover.de') ? `${url}/dav` : `${url}/seafdav`;
        }
    } catch (_e) {
        // keep normalized url
    }
    return url;
}

export function getWebdavSyncModeId(options: { autoSync?: boolean; deleteAfterSync?: boolean } = {}): WebdavSyncModeId {
    const auto = !!options.autoSync;
    const del = !!options.deleteAfterSync;
    if (auto && del) return 'auto_delete';
    if (auto && !del) return 'auto_keep';
    if (!auto && del) return 'manual_delete';
    return 'manual_keep';
}

export function applyWebdavSyncMode(mode: WebdavSyncModeId): { autoSync: boolean; deleteAfterSync: boolean } {
    switch (mode) {
        case 'auto_keep':
            return { autoSync: true, deleteAfterSync: false };
        case 'auto_delete':
            return { autoSync: true, deleteAfterSync: true };
        case 'manual_delete':
            return { autoSync: false, deleteAfterSync: true };
        case 'manual_keep':
        default:
            return { autoSync: false, deleteAfterSync: false };
    }
}

export function normalizeRemoteFolder(folder?: string): string {
    if (!folder || !folder.trim()) {
        return '/';
    }
    const trimmed = folder.trim().replace(/\/+$/, '');
    if (!trimmed || trimmed === '/') {
        return '/';
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function createWebdavClientFromConfig(options: Partial<WebdavSyncOptions> & { ha1?: string; [k: string]: any }) {
    const { authType: rawAuthType, headers, password, remoteURL, token, username, ...otherConfig } = options;
    const normalizedURL = normalizeWebdavUrl(remoteURL || '');
    const authType = rawAuthType || AuthType.Password;
    const oauthToken =
        typeof token === 'string'
            ? token
                ? { access_token: token, token_type: 'Bearer' }
                : undefined
            : token;

    // If fresh credentials (password or token) are explicitly provided, build fresh auth headers
    if ((authType === AuthType.Password && password) || (authType === AuthType.Token && oauthToken)) {
        return createClient(normalizedURL, {
            ...otherConfig,
            username,
            password,
            authType,
            token: oauthToken,
            headers: headers ? { ...headers } : undefined
        });
    }

    // If saved Authorization header is already present (e.g. from createWebdavConfig), reuse it
    // without letting setupAuth overwrite it (especially for Password/Token auth where raw secrets are omitted or string-typed)
    if (headers?.Authorization && authType !== AuthType.Digest) {
        return createClient(normalizedURL, {
            ...otherConfig,
            headers: { ...headers },
            authType: AuthType.None,
            username
        });
    }

    return createClient(normalizedURL, {
        ...otherConfig,
        headers: headers ? { ...headers } : undefined,
        authType: authType === AuthType.Password && !password ? AuthType.None : authType,
        username,
        password,
        token: oauthToken
    });
}

function buildWebdavClientFromOptions(options: Partial<WebdavSyncOptions>) {
    return createWebdavClientFromConfig(options);
}

export async function testWebdavConnection({ authType = null, headers, password, remoteFolder, remoteURL, token, username }: Partial<WebdavSyncOptions>): Promise<boolean> {
    try {
        const normalizedURL = normalizeWebdavUrl(remoteURL || '');
        if (!normalizedURL) {
            return false;
        }
        const client = createWebdavClientFromConfig({
            authType: authType || AuthType.Password,
            headers,
            password,
            remoteFolder,
            remoteURL: normalizedURL,
            token,
            username
        });
        // Use getStat directly instead of exists() so HTTP 404 or non-WebDAV HTML responses
        // actually fail the connection test instead of returning false and being ignored.
        await getStat(client.context, '/', { cachePolicy: 'noCache' });
        return true;
    } catch (error) {
        console.error(error, error?.stack);
        return false;
    }
}

/**
 * Fetches available remote folders (e.g. Seafile Libraries and subdirectories) from the WebDAV server
 * so the user can pick the target folder from a selection list instead of typing paths manually.
 */
export async function listWebdavDirectories(options: Partial<WebdavSyncOptions>, currentFolder: string = '/'): Promise<WebdavDirectoryEntry[]> {
    const client = buildWebdavClientFromOptions(options);
    const cleanCurrent = !currentFolder || currentFolder === '/' ? '' : normalisePath(currentFolder);
    const items = (await client.getDirectoryContents(cleanCurrent, { includeSelf: false, details: false })) as FileStat[];
    const prefix = cleanCurrent ? (cleanCurrent.startsWith('/') ? cleanCurrent : `/${cleanCurrent}`) : '';

    return (items || [])
        .filter((item) => item && item.type === 'directory' && item.basename)
        .map((item) => {
            const relPath = join(prefix || '/', item.basename);
            return {
                name: item.basename,
                path: relPath.startsWith('/') ? relPath : `/${relPath}`
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createWebdavSubdirectory(options: Partial<WebdavSyncOptions>, folderPath: string): Promise<string> {
    const client = buildWebdavClientFromOptions(options);
    const normalized = folderPath.startsWith('/') ? normalisePath(folderPath) : `/${normalisePath(folderPath)}`;
    await client.createDirectory(normalized, { recursive: true });
    return normalized;
}

export function createWebdavConfig({ authType = AuthType.Password, password, remoteFolder, remoteURL, token, username, ...otherProps }: WebdavSyncOptions) {
    const normalizedURL = normalizeWebdavUrl(remoteURL);
    const normalizedFolder = normalizeRemoteFolder(remoteFolder);
    const context = createContext(normalizedURL, { username, password, authType, token: token ? { access_token: token, token_type: 'Bearer' } : undefined });
    const headers =
        authType === AuthType.None
            ? {}
            : password || token || !otherProps.headers
              ? context.headers
              : { ...otherProps.headers };
    return {
        remoteURL: normalizedURL,
        username,
        remoteFolder: normalizedFolder,
        authType,
        token,
        ...otherProps,
        headers,
        ha1: context.ha1 || context.digest?.ha1
    };
}
