import { prepareRequestOptions, request } from '../request';
import { handleResponseCode, processResponsePayload } from '../response';
import { parseStat, parseXML } from '../tools/dav';
import { encodePath, join } from '../tools/path';
import { FileStat, ResponseDataDetailed, StatOptions, WebDAVClientContext } from '../types';

async function fetchStat(context: WebDAVClientContext, url: string, filename: string, options: StatOptions) {
    const { details: isDetailed = false } = options;
    const requestOptions = prepareRequestOptions(
        {
            url,
            method: 'PROPFIND' as any,
            headers: {
                Accept: 'text/plain,application/xml',
                Depth: '0'
            }
        },
        context,
        options
    );
    const response = await request(requestOptions);
    await handleResponseCode(context, response, requestOptions);
    const responseData = await response.text();
    const result = await parseXML(responseData);
    const stat = parseStat(result, filename, isDetailed);
    return processResponsePayload(response, stat, isDetailed);
}

export async function getStat(context: WebDAVClientContext, filename: string, options: StatOptions = {}): Promise<FileStat | ResponseDataDetailed<FileStat>> {
    const url = join(context.remoteURL, encodePath(filename));
    try {
        return await fetchStat(context, url, filename, options);
    } catch (err) {
        // Many WebDAV servers (e.g. Seafile/WsgiDAV behind nginx, Apache mod_dav) respond to
        // PROPFIND on a collection without a trailing slash with a 301 redirect that HTTP clients
        // turn into a GET (returning HTML instead of multistatus XML). Retry with a trailing slash.
        const statusCode = (err as any)?.statusCode;
        if (!url.endsWith('/') && (!statusCode || statusCode === 301 || statusCode === 302 || statusCode === 308 || statusCode === 405)) {
            return fetchStat(context, `${url}/`, filename, options);
        }
        throw err;
    }
}
