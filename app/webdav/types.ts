import { HttpsResponse, HttpsResponseLegacy } from '@nativescript-community/https';
import { File } from '@nativescript/core';
import type { HTTPSOptions, Headers } from '~/services/api';

export type * from '~/services/sync/interfaces';

export type AuthHeader = string;
export type { Headers };

export enum AuthType {
    Digest = 'digest',
    None = 'none',
    Password = 'password',
    Token = 'token'
}

export type BufferLike = Buffer | ArrayBuffer;

export interface CreateDirectoryOptions extends WebDAVMethodOptions {
    recursive?: boolean;
}

// export interface CreateReadStreamOptions extends WebDAVMethodOptions {
//     callback?: (response: Response) => void;
//     range?: {
//         start: number;
//         end?: number;
//     };
// }

// export type CreateWriteStreamCallback = (response: Response) => void;

// export interface CreateWriteStreamOptions extends WebDAVMethodOptions {
//     overwrite?: boolean;
// }

/** <propstat> as per http://www.webdav.org/specs/rfc2518.html#rfc.section.12.9.1.1 */
interface DAVPropStat {
    prop: DAVResultResponseProps;
    status: string;
    responsedescription?: string;
}

/**
 * DAV response can either be (href, propstat, responsedescription?) or (href, status, responsedescription?)
 * @see http://www.webdav.org/specs/rfc2518.html#rfc.section.12.9.1
 */
interface DAVResultBaseResponse {
    href: string;
    responsedescription?: string;
}

export interface DAVResultPropstatResponse extends DAVResultBaseResponse {
    propstat: DAVPropStat;
}

export interface DAVResultStatusResponse extends DAVResultBaseResponse {
    status: string;
}

export type DAVResultResponse = DAVResultBaseResponse & Partial<DAVResultPropstatResponse> & Partial<DAVResultStatusResponse>;

export interface DAVResultResponseProps {
    displayname: string;
    resourcetype: {
        collection?: boolean;
    };
    getlastmodified?: string;
    getetag?: string;
    getcontentlength?: string;
    getcontenttype?: string;
    'quota-available-bytes'?: any;
    'quota-used-bytes'?: string;

    [additionalProp: string]: unknown;
}

export interface DAVResult {
    multistatus: {
        response: DAVResultResponse[];
    };
}

export interface DAVResultRawMultistatus {
    response: DAVResultResponse | [DAVResultResponse];
}

export interface DAVResultRaw {
    multistatus: '' | DAVResultRawMultistatus | [DAVResultRawMultistatus];
}

export interface DigestContext {
    username: string;
    password: string;
    nc: number;
    algorithm: string;
    hasDigestAuth: boolean;
    cnonce?: string;
    nonce?: string;
    realm?: string;
    qop?: string;
    opaque?: string;
    ha1?: string;
}

export interface DiskQuota {
    used: number;
    available: DiskQuotaAvailable;
}

export type DiskQuotaAvailable = 'unknown' | 'unlimited' | number;

export enum ErrorCode {
    DataTypeNoLength = 'data-type-no-length',
    InvalidAuthType = 'invalid-auth-type',
    InvalidOutputFormat = 'invalid-output-format',
    LinkUnsupportedAuthType = 'link-unsupported-auth'
}

export interface FileStat {
    filename: string;
    basename: string;
    lastmod: number;
    size: number;
    type: 'file' | 'directory';
    etag?: string;
    mime?: string;
    props?: DAVResultResponseProps;
}

export interface SearchResult {
    truncated: boolean;
    results: FileStat[];
}

export interface GetDirectoryContentsOptions extends WebDAVMethodOptions {
    deep?: boolean;
    details?: boolean;
    glob?: string;
    includeSelf?: boolean;
}

export interface GetFileContentsOptions extends WebDAVMethodOptions {
    details?: boolean;
    format?: 'binary' | 'text' | 'file' | 'json';
    destinationFilePath?: string;
    onDownloadProgress?: ProgressEventCallback;
}

export interface GetQuotaOptions extends WebDAVMethodOptions {
    details?: boolean;
    path?: string;
}

export interface LockOptions extends WebDAVMethodOptions {
    refreshToken?: string;
}

export interface LockResponse {
    serverTimeout: string;
    token: string;
}

export interface OAuthToken {
    access_token: string;
    token_type: string;
    refresh_token?: string;
}

export interface ProgressEvent {
    loaded: number;
    total: number;
}

export type ProgressEventCallback = (e: ProgressEvent) => void;

export interface PutFileContentsOptions extends WebDAVMethodOptions {
    contentLength?: boolean | number;
    overwrite?: boolean;
    onUploadProgress?: UploadProgressCallback;
}

export type RequestDataPayload = string | Buffer | ArrayBuffer | Record<string, any> | File;

export interface RequestOptions extends HTTPSOptions {
    data?: RequestDataPayload;
    headers?: Headers;
    maxRedirects?: number;
    onDownloadProgress?: ProgressEventCallback;
    onUploadProgress?: ProgressEventCallback;
    // signal?: AbortSignal;
    transformResponse?: ((value: any) => any)[];
    // withCredentials?: boolean;
}

export interface RequestOptionsWithState extends RequestOptions {
    _digest?: DigestContext;
}

export type ResponseStatusValidator = (status: number) => boolean;

export interface StatOptions extends WebDAVMethodOptions {
    details?: boolean;
}

export interface SearchOptions extends WebDAVMethodOptions {
    details?: boolean;
}

export type UploadProgress = ProgressEvent;

export type UploadProgressCallback = ProgressEventCallback;

// export interface WebDAVClient {
//     copyFile: (filename: string, destination: string) => Promise<void>;
//     createDirectory: (path: string, options?: CreateDirectoryOptions) => Promise<void>;
//     // createReadStream: (filename: string, options?: CreateReadStreamOptions) => Stream.Readable;
//     // createWriteStream: (filename: string, options?: CreateWriteStreamOptions, callback?: CreateWriteStreamCallback) => Stream.Writable;
//     customRequest: (path: string, requestOptions: RequestOptions) => Promise<Response>;
//     deleteFile: (filename: string) => Promise<void>;
//     exists: (path: string) => Promise<boolean>;
//     getDirectoryContents: (path: string, options?: GetDirectoryContentsOptions) => Promise<FileStat[] | ResponseDataDetailed<FileStat[]>>;
//     getFileContents: (filename: string, options?: GetFileContentsOptions) => Promise<BufferLike | string | ResponseDataDetailed<BufferLike | string>>;
//     getFileDownloadLink: (filename: string) => string;
//     getFileUploadLink: (filename: string) => string;
//     getHeaders: () => Headers;
//     getQuota: (options?: GetQuotaOptions) => Promise<DiskQuota | null | ResponseDataDetailed<DiskQuota | null>>;
//     lock: (path: string, options?: LockOptions) => Promise<LockResponse>;
//     moveFile: (filename: string, destinationFilename: string) => Promise<void>;
//     putFileContents: (filename: string, data: string | BufferLike /*  | Stream.Readable */, options?: PutFileContentsOptions) => Promise<boolean>;
//     search: (path: string, options?: SearchOptions) => Promise<SearchResult | ResponseDataDetailed<SearchResult>>;
//     setHeaders: (headers: Headers) => void;
//     stat: (path: string, options?: StatOptions) => Promise<FileStat | ResponseDataDetailed<FileStat>>;
//     unlock: (path: string, token: string, options?: WebDAVMethodOptions) => Promise<void>;
// }

export interface WebDAVClientContext {
    authType: AuthType;
    remoteBasePath: string;
    contactHref?: string;
    digest?: DigestContext;
    ha1?: string;
    headers: Headers;
    httpAgent?: any;
    httpsAgent?: any;
    password?: string;
    remotePath: string;
    remoteURL: string;
    token?: OAuthToken;
    username?: string;
    // withCredentials?: boolean;
}

export interface WebDAVClientOptions {
    authType?: AuthType;
    remoteBasePath?: string;
    contactHref?: string;
    ha1?: string;
    headers?: Headers;
    httpAgent?: any;
    httpsAgent?: any;
    maxBodyLength?: number;
    maxContentLength?: number;
    password?: string;
    token?: OAuthToken;
    username?: string;
    // withCredentials?: boolean;
}

export interface WebDAVMethodOptions extends Partial<HTTPSOptions> {
    data?: RequestDataPayload;
    headers?: Headers;
    // signal?: AbortSignal;
}
