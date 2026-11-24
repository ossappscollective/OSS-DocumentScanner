import { lc } from '@nativescript-community/l';

export interface FriendlyErrorResult {
    title: string;
    message: string;
    shouldIgnore?: boolean;
}

export interface FriendlyErrorContext {
    url?: string;
    method?: string;
}

function extractPathHint(url?: string): string {
    if (!url || typeof url !== 'string') {
        return '';
    }
    try {
        const withoutProto = url.replace(/^https?:\/\//i, '');
        const slashIdx = withoutProto.indexOf('/');
        if (slashIdx === -1) {
            return '';
        }
        const rawPath = decodeURIComponent(withoutProto.slice(slashIdx));
        return rawPath.length <= 80 ? rawPath : rawPath.slice(0, 77) + '...';
    } catch (_e) {
        return '';
    }
}

function isRootDavTarget(url?: string): boolean {
    if (!url) return false;
    const cleaned = url.replace(/\/+$/, '');
    return /\/(?:seaf)?dav$/i.test(cleaned);
}

/**
 * Strips raw HTML, XML, Java/Android exception class names, and stack traces
 * so users never see technical dumps in error popups or notifications.
 */
export function stripTechnicalNoise(raw: string): string {
    if (!raw || typeof raw !== 'string') {
        return '';
    }
    let text = raw.trim();

    // If it contains an HTML or XML document, extract <title> or <message> if present, else discard tags
    if (/<\?xml|<!doctype|<html|<d:error|<s:exception/i.test(text)) {
        const msgMatch = /<(?:d:|s:)?message[^>]*>([\s\S]*?)<\/(?:d:|s:)?message>/i.exec(text);
        const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text);
        text = (msgMatch?.[1] || titleMatch?.[1] || '').trim();
    }

    // Strip any remaining HTML/XML tags
    text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove Java / Android / JS exception class prefixes (e.g. "java.net.UnknownHostException: ")
    text = text.replace(/^(?:[\w$]+\.)+(?:[\w$]*(?:Exception|Error|Throwable)):\s*/i, '');
    text = text.replace(/^(?:TypeError|ReferenceError|SyntaxError|Error|HTTPError|CustomError):\s*/i, '');

    // Remove stack trace lines ("at ...")
    text = text.split(/\r?\n/)[0].replace(/\s+at\s+[\w$.<>]+\s*\(.*$/, '').trim();

    // Remove technical server signatures like "WsgiDAV/4.x.x ..." or "nginx/1.x.x"
    text = text.replace(/\b(?:WsgiDAV|nginx|Apache|Cheroot)\/[\d.]+[^\n]*/gi, '').trim();

    return text;
}

/**
 * Converts technical HTTP, WebDAV, Seafile, and native device errors into
 * clear, non-technical user-facing messages.
 */
export function toFriendlyError(error: any, statusCodeOverride?: number, context?: FriendlyErrorContext): FriendlyErrorResult {
    const statusCode: number | undefined = statusCodeOverride ?? error?.statusCode ?? error?.status;
    const rawMessage = typeof error === 'string' ? error : error?.message || error?.error || '';
    const lower = String(rawMessage).toLowerCase();
    const requestUrl: string = context?.url || error?.requestParams?.url || '';
    const requestMethod: string = (context?.method || error?.requestParams?.method || '').toUpperCase();
    const pathHint = extractPathHint(requestUrl);

    // 1. Check specific HTTP / WebDAV status codes first with diagnostic context
    if (statusCode === 401 || lower.includes('401 unauthorized') || lower.includes('authentication failed')) {
        return {
            title: lc('friendly_error_auth_title'),
            message: lc('friendly_error_401')
        };
    }

    if (statusCode === 403 || lower.includes('403 forbidden')) {
        if (isRootDavTarget(requestUrl) || (requestMethod === 'PUT' && /\/(?:seaf)?dav\/[^/]+$/i.test(requestUrl))) {
            return {
                title: lc('friendly_error_access_title'),
                message: lc('friendly_error_403_root')
            };
        }
        return {
            title: lc('friendly_error_access_title'),
            message: pathHint ? `${lc('friendly_error_403')} (${pathHint})` : lc('friendly_error_403')
        };
    }

    if (statusCode === 404 || lower.includes('404 not found')) {
        return {
            title: lc('friendly_error_not_found_title'),
            message: pathHint ? `${lc('friendly_error_404')} (${pathHint})` : lc('friendly_error_404')
        };
    }

    if (statusCode === 405 || lower.includes('405 method not allowed')) {
        return {
            title: lc('friendly_error_config_title'),
            message: lc('friendly_error_405')
        };
    }

    if (statusCode === 409 || lower.includes('409 conflict')) {
        return {
            title: lc('friendly_error_not_found_title'),
            message: lc('friendly_error_409')
        };
    }

    if (statusCode === 408 || statusCode === 504 || lower.includes('timeout') || lower.includes('timed out') || lower.includes('sockettimeout')) {
        return {
            title: lc('friendly_error_network_title'),
            message: lc('friendly_error_timeout')
        };
    }

    if (statusCode === 413 || lower.includes('payload too large') || lower.includes('request entity too large')) {
        return {
            title: lc('friendly_error_storage_title'),
            message: lc('friendly_error_413')
        };
    }

    if (statusCode === 507 || lower.includes('insufficient storage') || lower.includes('no space left') || lower.includes('quota')) {
        return {
            title: lc('friendly_error_storage_title'),
            message: lc('friendly_error_storage_full')
        };
    }

    if (statusCode === 423 || statusCode === 429 || lower.includes('423 locked') || lower.includes('too many requests')) {
        return {
            title: lc('friendly_error_busy_title'),
            message: lc('friendly_error_locked')
        };
    }

    if (statusCode && statusCode >= 500) {
        return {
            title: lc('friendly_error_server_title'),
            message: `${lc('friendly_error_server')} (HTTP ${statusCode})`
        };
    }

    // 2. Check common network / DNS / SSL errors
    if (lower.includes('unknownhost') || lower.includes('unable to resolve host') || lower.includes('enotfound') || lower.includes('eai_again')) {
        const hostMatch = /unable to resolve host "([^"]+)"/i.exec(rawMessage);
        return {
            title: lc('friendly_error_network_title'),
            message: hostMatch?.[1] ? `${lc('friendly_error_host')} (${hostMatch[1]})` : lc('friendly_error_host')
        };
    }

    if (lower.includes('ssl') || lower.includes('certpath') || lower.includes('certificate')) {
        return {
            title: lc('friendly_error_network_title'),
            message: lc('friendly_error_ssl')
        };
    }

    if (lower.includes('econnrefused') || lower.includes('econnreset') || lower.includes('connectexception') || lower.includes('network is unreachable') || lower.includes('no_network')) {
        return {
            title: lc('friendly_error_network_title'),
            message: lc('friendly_error_network')
        };
    }

    // 3. Clean up any remaining message or fall back to a general friendly message
    const cleaned = stripTechnicalNoise(rawMessage);
    if (!cleaned || cleaned.length > 180 || /^[\d\s]+$/.test(cleaned) || /undefined|null|\[object/i.test(cleaned)) {
        return {
            title: lc('error'),
            message: statusCode ? `${lc('friendly_error_general')} (HTTP ${statusCode})` : lc('friendly_error_general')
        };
    }

    return {
        title: lc('error'),
        message: statusCode ? `${cleaned} (HTTP ${statusCode})` : cleaned
    };
}
