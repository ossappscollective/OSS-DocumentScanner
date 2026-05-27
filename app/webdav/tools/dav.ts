import { XMLParser } from 'fast-xml-parser';
import nestedProp from 'nested-property';
import { decodeHTMLEntities } from './encode';
import { encodePath, normalisePath } from './path';
import { DAVResult, DAVResultPropstatResponse, DAVResultRaw, DAVResultResponse, DAVResultResponseProps, DiskQuotaAvailable, FileStat, SearchResult } from '../types';
import { basename } from './path';
import { HTTPError } from '@akylas/nativescript-app-utils/error';
import { SEPARATOR } from '~/utils/constants';
import dayjs from 'dayjs';

enum PropertyType {
    Array = 'array',
    Object = 'object',
    Original = 'original'
}

function getParser(): XMLParser {
    return new XMLParser({
        removeNSPrefix: true,
        numberParseOptions: {
            hex: true,
            leadingZeros: false
        }
        // // We don't use the processors here as decoding is done manually
        // // later on - decoding early would break some path checks.
        // attributeValueProcessor: val => decodeHTMLEntities(decodeURIComponent(val)),
        // tagValueProcessor: val => decodeHTMLEntities(decodeURIComponent(val))
    });
}

function getPropertyOfType(obj: object, prop: string, type: PropertyType = PropertyType.Original): any {
    const val = nestedProp.get(obj, prop);
    if (type === 'array' && Array.isArray(val) === false) {
        return [val];
    } else if (type === 'object' && Array.isArray(val)) {
        return val[0];
    }
    return val;
}

function normaliseResponse(response: any): DAVResultResponse {
    const output = Object.assign({}, response);
    // Only either status OR propstat is allowed
    if (output.status) {
        nestedProp.set(output, 'status', getPropertyOfType(output, 'status', PropertyType.Object));
    } else {
        nestedProp.set(output, 'propstat', getPropertyOfType(output, 'propstat', PropertyType.Object));
        nestedProp.set(output, 'propstat.prop', getPropertyOfType(output, 'propstat.prop', PropertyType.Object));
    }
    return output;
}

function normaliseResult(result: DAVResultRaw): DAVResult {
    const { multistatus } = result;
    if (multistatus === '') {
        return {
            multistatus: {
                response: []
            }
        };
    }
    if (!multistatus) {
        DEV_LOG && console.error('normaliseResult failed', JSON.stringify(result));
        throw new Error('Invalid response: No root multistatus found');
    }
    const output: any = {
        multistatus: Array.isArray(multistatus) ? multistatus[0] : multistatus
    };
    nestedProp.set(output, 'multistatus.response', getPropertyOfType(output, 'multistatus.response', PropertyType.Array));
    nestedProp.set(
        output,
        'multistatus.response',
        nestedProp.get(output, 'multistatus.response').map((response) => normaliseResponse(response))
    );
    return output as DAVResult;
}

/**
 * Parse an XML response from a WebDAV service,
 *  converting it to an internal DAV result
 * @param xml The raw XML string
 * @returns A parsed and processed DAV result
 */
export function parseXML(xml: string): Promise<DAVResult> {
    return new Promise((resolve) => {
        const result = getParser().parse(xml);
        resolve(normaliseResult(result));
    });
}
/**
 * Parse an XML response from a WebDAV service,
 *  converting it to an internal DAV result
 * @param xml The raw XML string
 * @returns A parsed and processed DAV result
 */
export function parseRawXML(xml: string): Promise<any> {
    return getParser().parse(xml);
}

export function prepareFileFromProps(props: DAVResultResponseProps, rawFilename: string, isDetailed: boolean = false): FileStat {
    // Last modified time, raw size, item type and mime
    const { getcontentlength: rawSize = '0', getcontenttype: mimeType, getetag: etag, getlastmodified, resourcetype: resourceType } = props;
    const type = resourceType && typeof resourceType === 'object' && typeof resourceType.collection !== 'undefined' ? 'directory' : 'file';
    const filename = decodeHTMLEntities(rawFilename);
    const stat: FileStat = {
        filename,
        basename: basename(filename),
        lastmod: getlastmodified ? dayjs(getlastmodified).valueOf() : undefined,
        size: parseInt(rawSize, 10),
        type,
        etag: typeof etag === 'string' ? etag.replace(/"/g, '') : null
    };
    if (type === 'file') {
        stat.mime = mimeType && typeof mimeType === 'string' ? mimeType.split(';')[0] : '';
    }
    if (isDetailed) {
        stat.props = props;
    }
    DEV_LOG && console.log('prepareFileFromProps', JSON.stringify(props), stat);
    return stat;
}

/**
 * Parse a DAV result for file stats
 * @param result The resulting DAV response
 * @param filename The filename that was stat'd
 * @param isDetailed Whether or not the raw props of
 *  the resource should be returned
 * @returns A file stat result
 */
export function parseStat(result: DAVResult, filename: string, isDetailed: boolean = false): FileStat {
    let responseItem: DAVResultPropstatResponse = null;
    try {
        // should be a propstat response, if not the if below will throw an error
        if ((result.multistatus.response[0] as DAVResultPropstatResponse).propstat) {
            responseItem = result.multistatus.response[0] as DAVResultPropstatResponse;
        }
    } catch (e) {
        /* ignore */
    }
    if (!responseItem) {
        throw new Error('Failed getting item stat: bad response');
    }
    const {
        propstat: { prop: props, status: statusLine }
    } = responseItem;

    // As defined in https://tools.ietf.org/html/rfc2068#section-6.1
    const [_, statusCodeStr, statusText] = statusLine.split(' ', 3);
    const statusCode = parseInt(statusCodeStr, 10);
    if (statusCode >= 400) {
        // const err: WebDAVClientError = new Error(`Invalid response: ${statusCode} ${statusText}`) as WebDAVClientError;
        // err.status = statusCode;
        throw new HTTPError({
            message: statusText,
            statusCode,
            requestParams: null
        });
    }

    const filePath = normalisePath(filename);
    return prepareFileFromProps(props, filePath, isDetailed);
}

/**
 * Parse a DAV result for a search request
 *
 * @param result The resulting DAV response
 * @param searchArbiter The collection path that was searched
 * @param isDetailed Whether or not the raw props of the resource should be returned
 */
export function parseSearch(result: DAVResult, searchArbiter: string, isDetailed: boolean) {
    const response: SearchResult = {
        truncated: false,
        results: []
    };

    response.truncated = result.multistatus.response.some(
        (v) => (v.status || v.propstat?.status).split(' ', 3)?.[1] === '507' && v.href.replace(/\/$/, '').endsWith(encodePath(searchArbiter).replace(/\/$/, ''))
    );

    result.multistatus.response.forEach((result) => {
        if (result.propstat === undefined) {
            return;
        }
        const filename = result.href.split(SEPARATOR).map(decodeURIComponent).join(SEPARATOR);
        response.results.push(prepareFileFromProps(result.propstat.prop, filename, isDetailed));
    });

    return response;
}

/**
 * Translate a disk quota indicator to a recognised
 *  value (includes "unlimited" and "unknown")
 * @param value The quota indicator, eg. "-3"
 * @returns The value in bytes, or another indicator
 */
export function translateDiskSpace(value: string | number): DiskQuotaAvailable {
    switch (value.toString()) {
        case '-3':
            return 'unlimited';
        case '-2':
        case '-1':
            // -1 is non-computed
            return 'unknown';
        default:
            return parseInt(value as string, 10);
    }
}
