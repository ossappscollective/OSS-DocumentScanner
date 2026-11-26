import { request } from '~/services/api';
import { generateDigestAuthHeader, parseDigestAuth } from './auth/digest';
import { mergeHeaders } from './tools/headers';
import { RequestOptions, RequestOptionsWithState, WebDAVClientContext, WebDAVMethodOptions } from './types';

export function prepareRequestOptions(requestOptions: RequestOptions | RequestOptionsWithState, context: WebDAVClientContext, userOptions: WebDAVMethodOptions): RequestOptionsWithState {
    const finalOptions = { ...requestOptions, ...(userOptions || {}) } as RequestOptionsWithState;
    finalOptions.headers = mergeHeaders(context.headers, finalOptions.headers || {}, userOptions.headers || {});
    finalOptions.responseOnMainThread = false;
    finalOptions.timeout = finalOptions.timeout ?? 60;
    finalOptions.body = requestOptions.data as any;

    if (context.digest) {
        finalOptions._digest = context.digest;
    }
    return finalOptions;
}

const TRANSIENT_STATUS_CODES = new Set([408, 423, 429, 500, 502, 503, 504]);
const MAX_WEBDAV_RETRIES = 3;

function isTransientWebdavError(err: any): boolean {
    if (!err) return false;
    if (typeof err.statusCode === 'number' && TRANSIENT_STATUS_CODES.has(err.statusCode)) {
        return true;
    }
    const msg = String(err.message || err).toLowerCase();
    return (
        msg.includes('timeout') ||
        msg.includes('timed out') ||
        msg.includes('econnreset') ||
        msg.includes('eai_again') ||
        msg.includes('socket hang up') ||
        msg.includes('network error') ||
        msg.includes('connection abort')
    );
}

async function requestWithRetry<T = any>(requestOptions: RequestOptionsWithState, maxRetries = MAX_WEBDAV_RETRIES) {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await request<T>({ ...requestOptions });
            if (attempt < maxRetries - 1 && TRANSIENT_STATUS_CODES.has(response?.statusCode)) {
                await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
                continue;
            }
            return response;
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries - 1 && isTransientWebdavError(err)) {
                await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

async function webdavRequest<T = any>(requestOptions: RequestOptionsWithState) {
    // Client not configured for digest authentication
    if (!requestOptions._digest) {
        return requestWithRetry<T>(requestOptions);
    }
    // Remove client's digest authentication object from request options
    const _digest = requestOptions._digest;
    delete requestOptions._digest;
    // If client is already using digest authentication, include the digest authorization header
    if (_digest.hasDigestAuth) {
        requestOptions.headers = requestOptions.headers || {};
        requestOptions.headers.Authorization = generateDigestAuthHeader(requestOptions, _digest);
    }
    // Perform digest request + check
    const response = await requestWithRetry<T>(requestOptions);
    if (response.statusCode === 401) {
        _digest.hasDigestAuth = parseDigestAuth(response, _digest);
        if (_digest.hasDigestAuth) {
            requestOptions.headers = requestOptions.headers || {};
            requestOptions.headers.Authorization = generateDigestAuthHeader(requestOptions, _digest);
            const response2 = await requestWithRetry<T>(requestOptions);
            if (response2.statusCode === 401) {
                _digest.hasDigestAuth = false;
            } else {
                _digest.nc++;
            }
            return response2;
        }
    } else {
        _digest.nc++;
    }
    return response;
}
export { webdavRequest as request };
