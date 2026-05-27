import { File, path } from '@nativescript/core';
import dayjs from 'dayjs';
import type { DocFolder, OCRDocument } from '~/models/OCRDocument';
import { networkService } from '~/services/api';
import { DocumentEvents } from '~/services/documents';
import { BasePDFSyncService, BasePDFSyncServiceOptions } from '~/services/sync/BasePDFSyncService';
import { OAuthTokens } from '~/services/sync/OAuthHelper';
import { type OneDriveSyncOptions, OneDriveSyncService, getItemByPath, getOrCreateFolder, listItems, uploadFile } from '~/services/sync/onedrive/OneDrive';
import { SERVICES_SYNC_MASK } from '~/services/sync/types';
import type { FileStat } from '~/webdav';

export interface OneDrivePDFSyncServiceOptions extends BasePDFSyncServiceOptions, OneDriveSyncOptions {}

export class OneDrivePDFSyncService extends BasePDFSyncService implements OneDriveSyncService {
    shouldSync(force?: boolean, event?: DocumentEvents) {
        return (force || (event && this.autoSync)) && networkService.connected;
    }
    static type = 'onedrive_pdf';
    type = OneDrivePDFSyncService.type;
    syncMask = SERVICES_SYNC_MASK[OneDrivePDFSyncService.type];
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
            const service = OneDrivePDFSyncService.getOrCreateInstance();
            Object.assign(service, config);
            // DEV_LOG && console.log('OneDrivePDFSyncService', 'start', JSON.stringify(config), service.autoSync);
            return service;
        }
    }

    override stop() {}

    override async ensureRemoteFolder(remoteFolder = this.remoteFolder) {
        if (!this.remoteFolderId) {
            this.remoteFolderId = await getOrCreateFolder(this, remoteFolder);
        }
    }

    override async getRemoteFolderFiles(relativePath: string): Promise<FileStat[]> {
        const item = relativePath ? await this.getItemByPath(relativePath) : { id: this.remoteFolderId };

        if (!item) {
            return [];
        }

        const items = await listItems(this, item.id);

        return items
            .filter((item) => !item.folder && item.name.endsWith('.pdf'))
            .map((item) => ({
                filename: path.join(relativePath || '', item.name),
                basename: item.name,
                lastmod: item.lastModifiedDateTime ? dayjs(item.lastModifiedDateTime).valueOf() : undefined,
                size: item.size || 0,
                type: 'file' as const,
                mime: 'application/pdf'
            }));
    }

    getItemByPath(path: string) {
        return getItemByPath(this, path, this.remoteFolderId, this.remoteFolder);
    }

    async uploadPDF(document: OCRDocument, localFilePath: string, fileName: string, docFolder?: DocFolder) {
        let targetFolderId = this.remoteFolderId;
        if (docFolder) {
            const folderPath = docFolder.name;
            const folderItem = await this.getItemByPath(folderPath);
            targetFolderId = folderItem?.id || (await getOrCreateFolder(this, folderPath));
        }
        await uploadFile(this, fileName, File.fromPath(localFilePath), targetFolderId);
    }
}
