import { HTTPError } from '@akylas/nativescript-app-utils/error';
import { SEPARATOR } from '~/utils/constants';
import { prepareRequestOptions, request } from '../request';
import { handleResponseCode } from '../response';
import { encodePath, getAllDirectories, join, makePathAbsolute, normalisePath } from '../tools/path';
import { CreateDirectoryOptions, FileStat, WebDAVClientContext } from '../types';
import { getStat } from './stat';

export async function createDirectory(context: WebDAVClientContext, dirPath: string, options: CreateDirectoryOptions = {}) {
    if (!dirPath || dirPath === SEPARATOR || dirPath === '.') {
        return;
    }
    if (options.recursive === true) return createDirectoryRecursively(context, dirPath, options);
    const requestOptions = prepareRequestOptions(
        {
            url: ensureCollectionPath(join(context.remoteURL, encodePath(dirPath))),
            method: 'MKCOL' as any
        },
        context,
        options
    );
    const response = await request(requestOptions);
    try {
        await handleResponseCode(context, response, requestOptions);
    } catch (err) {
        const error = err as HTTPError;
        // 405 Method Not Allowed on MKCOL indicates the collection already exists (e.g. Seafile / WsgiDAV)
        if (error?.statusCode === 405) {
            return;
        }
        throw err;
    }
}

/**
 * Ensure the path is a proper "collection" path by ensuring it has a trailing "/".
 * The proper format of collection according to the specification does contain the trailing slash.
 * http://www.webdav.org/specs/rfc4918.html#rfc.section.5.2
 * @param path Path of the collection
 * @return string Path of the collection with appended trailing "/" in case the `path` does not have it.
 */
function ensureCollectionPath(path: string): string {
    if (!path.endsWith(SEPARATOR)) {
        return path + SEPARATOR;
    }
    return path;
}

async function createDirectoryRecursively(context: WebDAVClientContext, dirPath: string, options: CreateDirectoryOptions = {}): Promise<void> {
    const paths = getAllDirectories(makePathAbsolute(normalisePath(dirPath)));
    paths.sort((a, b) => {
        if (a.length > b.length) {
            return 1;
        } else if (b.length > a.length) {
            return -1;
        }
        return 0;
    });
    let creating: boolean = false;
    for (const testPath of paths) {
        if (creating) {
            await createDirectory(context, testPath, {
                ...options,
                recursive: false
            });
            continue;
        }
        try {
            const testStat = (await getStat(context, ensureCollectionPath(testPath))) as FileStat;
            if (testStat.type !== 'directory') {
                throw new Error(`Path includes a file: ${dirPath}`);
            }
        } catch (err) {
            const error = err as HTTPError;
            if (error.statusCode === 404) {
                creating = true;
                await createDirectory(context, testPath, {
                    ...options,
                    recursive: false
                });
            } else if ((error.statusCode === 403 || error.statusCode === 405) && testPath !== paths[paths.length - 1]) {
                // Some servers restrict PROPFIND on intermediate mount points; proceed to deeper segments
                continue;
            } else {
                throw err;
            }
        }
    }
}
