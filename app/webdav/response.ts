import { HTTPError } from '@akylas/nativescript-app-utils/error';
import { parseRawXML } from './tools/dav';
import { Response, ResponseDataDetailed, WebDAVClientContext } from './types';
import { RequestResponse } from '~/services/api';
import { toFriendlyError } from '~/utils/errorMessages';

export async function createErrorFromResponse(response: RequestResponse, requestParams, prefix: string = '') {
    let rawErrorText = '';
    try {
        const serverResponse = await response.text();
        const result = await parseRawXML(serverResponse);
        rawErrorText = result?.error?.message || '';
        if (!rawErrorText && result?.html) {
            rawErrorText = (result.html?.head?.title || '') + (result.html?.body?.p ? ': ' + result.html?.body?.p : '');
        }
        if (!rawErrorText) {
            rawErrorText = serverResponse || '';
        }
    } catch (_e) {
        // ignore XML parse errors on empty or non-XML responses
    }
    const friendly = toFriendlyError(
        { statusCode: response.statusCode, message: rawErrorText, requestParams },
        response.statusCode,
        { url: requestParams?.url, method: requestParams?.method }
    );
    return new HTTPError({
        statusCode: response.statusCode,
        title: friendly.title,
        message: prefix ? `${prefix}: ${friendly.message}` : friendly.message,
        requestParams
    });
}

export async function handleResponseCode<T = any>(context: WebDAVClientContext, response: RequestResponse<T>, requestOptions) {
    const { statusCode } = response;
    // if (statusCode === 401 && context.digest) return response;
    if (statusCode >= 400) {
        const err = await createErrorFromResponse(response, requestOptions);
        throw err;
    }
    return response;
}

// export function processGlobFilter(files: FileStat[], glob: string): FileStat[] {
//     return files.filter((file) => minimatch(file.filename, glob, { matchBase: true }));
// }

/**
 * Process a response payload (eg. from `customRequest`) and
 *  prepare it for further processing. Exposed for custom
 *  request handling.
 * @param response The response for a request
 * @param data The data returned
 * @param isDetailed Whether or not a detailed result is
 *  requested
 * @returns The response data, or a detailed response object
 *  if required
 */
export function processResponsePayload<T, U extends boolean = false>(response: RequestResponse<T>, data: T, isDetailed?: U): U extends true ? ResponseDataDetailed<T> : T {
    const httpResponse = response.response;
    return (
        isDetailed === true
            ? {
                  data,
                  headers: httpResponse.headers,
                  status: response.statusCode,
                  statusText: httpResponse.reason
              }
            : data
    ) as U extends true ? ResponseDataDetailed<T> : T;
}
