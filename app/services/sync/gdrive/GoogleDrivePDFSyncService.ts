import { File, path } from '@nativescript/core';
import dayjs from 'dayjs';
import type { DocFolder, OCRDocument } from '~/models/OCRDocument';
import { networkService } from '~/services/api';
import { DocumentEvents } from '~/services/documents';
import { BasePDFSyncService, BasePDFSyncServiceOptions } from '~/services/sync/BasePDFSyncService';
import { type GoogleDriveSyncOptions, GoogleDriveSyncService, getOrCreateFolder, listFiles, uploadFile } from '~/services/sync/gdrive/GoogleDrive';
import { OAuthTokens } from '~/services/sync/OAuthHelper';
import { SERVICES_SYNC_MASK } from '~/services/sync/types';
import type { FileStat } from '~/webdav';

export interface GoogleDrivePDFSyncServiceOptions extends BasePDFSyncServiceOptions, GoogleDriveSyncOptions {}

export class GoogleDrivePDFSyncService extends BasePDFSyncService implements GoogleDriveSyncService {
    shouldSync(force?: boolean, event?: DocumentEvents) {
        return (force || (event && this.autoSync)) && networkService.connected;
    }
    static type = 'gdrive_pdf';
    type = GoogleDrivePDFSyncService.type;
    syncMask = SERVICES_SYNC_MASK[GoogleDrivePDFSyncService.type];
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
            const service = GoogleDrivePDFSyncService.getOrCreateInstance();
            Object.assign(service, config);
            // DEV_LOG && console.log('GoogleDrivePDFSyncService', 'start', JSON.stringify(config), service.autoSync);
            return service;
        }
    }

    override stop() {}

    override async ensureRemoteFolder(remoteFolder = this.remoteFolder) {
        if (!this.remoteFolderId) {
            this.remoteFolderId = await getOrCreateFolder(this, remoteFolder || 'DocumentScanner');
        } else if (remoteFolder !== this.remoteFolder) {
            await getOrCreateFolder(this, remoteFolder, this.remoteFolderId);
        }
    }

    override async getRemoteFolderFiles(relativePath: string): Promise<FileStat[]> {
        let folderId = this.remoteFolderId;

        if (relativePath) {
            const parts = relativePath.split('/').filter((p) => p);
            for (const part of parts) {
                const files = await listFiles(this, folderId);
                const folder = files.find((f) => f.name === part && f.mimeType === 'application/vnd.google-apps.folder');
                if (!folder) {
                    return [];
                }
                folderId = folder.id;
            }
        }

        const items = await listFiles(this, folderId);

        return items
            .filter((item) => item.mimeType === 'application/pdf' || item.name.endsWith('.pdf'))
            .map((item) => ({
                filename: path.join(relativePath || '', item.name),
                basename: item.name,
                lastmod: item.modifiedTime ? dayjs(item.modifiedTime).valueOf() : undefined,
                size: parseInt((item.size || 0) + '', 10),
                type: 'file' as const,
                mime: 'application/pdf'
            }));
    }

    async uploadPDF(document: OCRDocument, localFilePath: string, fileName: string, docFolder?: DocFolder) {
        let targetFolderId = this.remoteFolderId;
        if (docFolder) {
            targetFolderId = await getOrCreateFolder(this, docFolder.name, this.remoteFolderId);
        }
        await uploadFile(this, fileName, File.fromPath(localFilePath), 'application/pdf', targetFolderId);
    }
}
