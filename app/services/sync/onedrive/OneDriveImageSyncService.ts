import { File, ImageSource, knownFolders, path } from '@nativescript/core';
import dayjs from 'dayjs';
import type { DocFolder } from '~/models/OCRDocument';
import { networkService } from '~/services/api';
import { DocumentEvents } from '~/services/documents';
import { BaseImageSyncService, BaseImageSyncServiceOptions } from '~/services/sync/BaseImageSyncService';
import { OAuthTokens } from '~/services/sync/OAuthHelper';
import { type OneDriveSyncOptions, OneDriveSyncService, getItemByPath, getOrCreateFolder, listItems, uploadFile } from '~/services/sync/onedrive/OneDrive';
import { SERVICES_SYNC_MASK } from '~/services/sync/types';
import { saveImage } from '~/utils/utils';
import type { FileStat } from '~/webdav';

export interface OneDriveImageSyncServiceOptions extends BaseImageSyncServiceOptions, OneDriveSyncOptions {}

export class OneDriveImageSyncService extends BaseImageSyncService implements OneDriveSyncService {
    shouldSync(force?: boolean, event?: DocumentEvents) {
        return (force || (event && this.autoSync)) && networkService.connected;
    }
    static type = 'onedrive_image';
    type = OneDriveImageSyncService.type;
    syncMask = SERVICES_SYNC_MASK[OneDriveImageSyncService.type];
    remoteFolder: string;
    remoteFolderId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;

    get tokens(): OAuthTokens {
        return {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            expiresAt: this.expiresAt
        };
    }

    static start(config?: { id: number; [k: string]: any }) {
        if (config) {
            const service = OneDriveImageSyncService.getOrCreateInstance();
            Object.assign(service, config);
            // DEV_LOG && console.log('OneDriveImageSyncService', 'start', JSON.stringify(config), service.autoSync);
            return service;
        }
    }

    override stop() {}

    override async ensureRemoteFolder(remoteFolder = this.remoteFolder) {
        if (!this.remoteFolderId) {
            this.remoteFolderId = await getOrCreateFolder(this, remoteFolder);
        }
    }

    getItemByPath(path: string) {
        return getItemByPath(this, path, this.remoteFolderId, this.remoteFolder);
    }
    override async getRemoteFolderFiles(relativePath: string): Promise<FileStat[]> {
        const item = relativePath ? await this.getItemByPath(relativePath) : { id: this.remoteFolderId };

        if (!item) {
            return [];
        }

        const items = await listItems(this, item.id);

        return items
            .filter((item) => !item.folder)
            .map((item) => ({
                filename: path.join(relativePath || '', item.name),
                basename: item.name,
                lastmod: item.lastModifiedDateTime ? dayjs(item.lastModifiedDateTime).valueOf() : undefined,
                size: item.size || 0,
                type: 'file' as const,
                mime: item.file?.mimeType
            }));
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

        let targetFolderId = this.remoteFolderId;
        if (docFolder) {
            const folderPath = docFolder.name;
            const folderItem = await this.getItemByPath(folderPath);
            targetFolderId = folderItem?.id || (await getOrCreateFolder(this, folderPath));
        }

        const file = File.fromPath(localFilePath);
        // const content = await file.readText('base64');
        // DEV_LOG && console.warn('writeImage', fileName, localFilePath, File.exists(localFilePath));
        await uploadFile(this, fileName, file, targetFolderId);

        try {
            file.remove();
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}
