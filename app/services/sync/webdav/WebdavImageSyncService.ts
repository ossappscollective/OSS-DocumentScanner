import { File, ImageSource, knownFolders, path } from '@nativescript/core';
import type { DocFolder } from '~/models/OCRDocument';
import { networkService } from '~/services/api';
import { DocumentEvents } from '~/services/documents';
import { BaseImageSyncService, BaseImageSyncServiceOptions } from '~/services/sync/BaseImageSyncService';
import { SERVICES_SYNC_MASK } from '~/services/sync/types';
import { WebdavSyncOptions, createWebdavClientFromConfig, normalizeRemoteFolder } from '~/services/sync/webdav/Webdav';
import { saveImage } from '~/utils/utils';
import { FileStat, WebDAVClient } from '~/webdav';

export interface WebdavImageSyncServiceOptions extends BaseImageSyncServiceOptions, WebdavSyncOptions {}

export class WebdavImageSyncService extends BaseImageSyncService {
    shouldSync(force?: boolean, event?: DocumentEvents) {
        return (force || (event && this.autoSync)) && networkService.connected;
    }
    static type = 'webdav_image';
    type = WebdavImageSyncService.type;
    syncMask = SERVICES_SYNC_MASK[WebdavImageSyncService.type];
    remoteURL;
    username;
    remoteFolder;
    authType;
    client: WebDAVClient;
    token;
    password;

    static start(config?: { id: number; [k: string]: any }) {
        if (config) {
            const service = WebdavImageSyncService.getOrCreateInstance();
            Object.assign(service, config, { remoteFolder: normalizeRemoteFolder(config.remoteFolder) });
            DEV_LOG && console.log('WebdavImageSyncService', 'start', JSON.stringify(config), service.autoSync);
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
    override async writeImage(imageSource: ImageSource, fileName: string, imageFormat: 'png' | 'jpeg' | 'jpg', imageQuality: number, overwrite: boolean, docFolder?: DocFolder) {
        const temp = knownFolders.temp().path;
        await saveImage(imageSource, {
            exportDirectory: temp,
            fileName,
            imageFormat,
            imageQuality,
            overwrite
        });
        const localFilePath = path.join(temp, fileName);
        let destinationPath = this.remoteFolder;
        if (docFolder) {
            destinationPath = path.join(destinationPath, docFolder.name);
            await this.ensureRemoteFolder(destinationPath);
        }
        return this.client.putFileContents(path.join(destinationPath, fileName), File.fromPath(localFilePath));
    }
}
