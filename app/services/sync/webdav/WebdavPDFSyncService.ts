import { File, path } from '@nativescript/core';
import type { DocFolder, OCRDocument } from '~/models/OCRDocument';
import { networkService } from '~/services/api';
import { DocumentEvents } from '~/services/documents';
import { BasePDFSyncService, BasePDFSyncServiceOptions } from '~/services/sync/BasePDFSyncService';
import { SERVICES_SYNC_MASK } from '~/services/sync/types';
import { WebdavSyncOptions, createWebdavClientFromConfig, normalizeRemoteFolder } from '~/services/sync/webdav/Webdav';
import { FileStat, WebDAVClient } from '~/webdav';

export interface WebdavPDFSyncServiceOptions extends BasePDFSyncServiceOptions, WebdavSyncOptions {}

export class WebdavPDFSyncService extends BasePDFSyncService {
    shouldSync(force?: boolean, event?: DocumentEvents) {
        return (force || (event && this.autoSync)) && networkService.connected;
    }
    static type = 'webdav_pdf';
    type = WebdavPDFSyncService.type;
    syncMask = SERVICES_SYNC_MASK[WebdavPDFSyncService.type];
    remoteURL;
    username;
    remoteFolder;
    authType;
    client: WebDAVClient;
    token;
    password;

    static start(config?: { id: number; [k: string]: any }) {
        if (config) {
            const service = WebdavPDFSyncService.getOrCreateInstance();
            Object.assign(service, config, { remoteFolder: normalizeRemoteFolder(config.remoteFolder) });
            DEV_LOG && console.log('WebdavPDFSyncService', 'start', JSON.stringify(config), service.autoSync);
            service.client = createWebdavClientFromConfig(config);
            return service;
        }
    }
    override stop() {}
    override async ensureRemoteFolder(remoteFolder = this.remoteFolder) {
        const normalized = normalizeRemoteFolder(remoteFolder);
        if (!normalized || normalized === '/') {
            return;
        }
        const collectionPath = normalized.endsWith('/') ? normalized : `${normalized}/`;
        if (!(await this.client.exists(collectionPath))) {
            return this.client.createDirectory(normalized, { recursive: true });
        }
    }

    override async getRemoteFolderFiles(relativePath: string) {
        return this.client.getDirectoryContents(path.join(this.remoteFolder, relativePath), { includeSelf: false, details: false }) as Promise<FileStat[]>;
    }

    async uploadPDF(document: OCRDocument, localFilePath: string, fileName: string, docFolder?: DocFolder) {
        let destinationPath = this.remoteFolder || '/';
        await this.ensureRemoteFolder(destinationPath);
        if (docFolder) {
            destinationPath = path.join(destinationPath, docFolder.name);
            await this.ensureRemoteFolder(destinationPath);
        }
        return this.client.putFileContents(path.join(destinationPath, fileName), File.fromPath(localFilePath));
    }
}
