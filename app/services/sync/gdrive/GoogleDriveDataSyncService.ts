import { File, Folder, path } from '@nativescript/core';
import dayjs from 'dayjs';
import { type OCRDocument } from '~/models/OCRDocument';
import { networkService } from '~/services/api';
import { DocumentEvents } from '~/services/documents';
import { BaseDataSyncService, BaseDataSyncServiceOptions } from '~/services/sync/BaseDataSyncService';
import {
    type GoogleDriveSyncOptions,
    GoogleDriveSyncService,
    deleteFile,
    downloadFile,
    getGoogleDriveRequestContents,
    getOrCreateFolder,
    listFiles,
    uploadFile
} from '~/services/sync/gdrive/GoogleDrive';
import { OAuthTokens } from '~/services/sync/OAuthHelper';
import { SERVICES_SYNC_MASK } from '~/services/sync/types';
import type { FileStat, GetFileContentsOptions, ResponseData } from '~/webdav';

export interface GoogleDriveDataSyncOptions extends BaseDataSyncServiceOptions, GoogleDriveSyncOptions {}

export class GoogleDriveDataSyncService extends BaseDataSyncService implements GoogleDriveSyncService {
    shouldSync(force?: boolean, event?: DocumentEvents) {
        return (force || (event && this.autoSync)) && networkService.connected;
    }
    static type = 'gdrive_data';
    type = GoogleDriveDataSyncService.type;
    syncMask = SERVICES_SYNC_MASK[GoogleDriveDataSyncService.type];
    remoteFolder: string;
    remoteFolderId: string; // Google Drive folder ID
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

    stop() {}

    static start(config?: { id: number; [k: string]: any }) {
        if (config) {
            const service = GoogleDriveDataSyncService.getOrCreateInstance();
            Object.assign(service, config);
            // DEV_LOG && console.log('GoogleDriveDataSyncService', 'start', JSON.stringify(config), service.autoSync);
            return service;
        }
    }

    override async ensureRemoteFolder() {
        // DEV_LOG && console.log('ensureRemoteFolder', this.remoteFolder);
        if (!this.remoteFolderId) {
            this.remoteFolderId = await getOrCreateFolder(this, this.remoteFolder || 'DocumentScanner');
        }
    }

    override async getRemoteFolderDirectories(relativePath: string): Promise<FileStat[]> {
        const items = await this.getFiles(relativePath);

        // Convert Google Drive items to FileStat format
        return items.map(
            (item) =>
                ({
                    filename: path.join(relativePath || '', item.name),
                    basename: item.name,
                    lastmod: item.modifiedTime ? dayjs(item.modifiedTime).valueOf() : undefined,
                    size: parseInt((item.size || 0) + '', 10),
                    type: item.mimeType === 'application/vnd.google-apps.folder' ? 'directory' : 'file',
                    mime: item.mimeType
                }) as FileStat
        );
    }

    async createDirectory(remotePath: string, recursive = true) {
        const pathParts = remotePath.split('/').filter((p) => p);
        if (pathParts[0] === this.remoteFolder) {
            pathParts.shift();
        }
        let targetFolderId = this.remoteFolderId;

        for (const part of pathParts) {
            const files = await listFiles(this, targetFolderId);
            const folderItem = files.find((f) => f.name === part && f.mimeType === 'application/vnd.google-apps.folder');

            if (!folderItem) {
                // Create folder
                const folderId = await getOrCreateFolder(this, part, targetFolderId);
                targetFolderId = folderId;
            } else {
                targetFolderId = folderItem.id;
            }
        }
        return targetFolderId;
    }

    override async sendFolderToRemote(folder: Folder, remoteRelativePath: string) {
        // DEV_LOG && console.log('sendFolderToGDrive', folder.path, remoteRelativePath);

        // Get or create the target folder
        let targetFolderId = this.remoteFolderId;

        targetFolderId = await this.createDirectory(remoteRelativePath, false);

        // Upload files
        const entities = await folder.getEntities();
        for (let index = 0; index < entities.length; index++) {
            const entity = entities[index];
            // DEV_LOG && console.log('sendFolderToGDrive entity', entity.name, entity.path);
            if (entity instanceof File) {
                await uploadFile(this, entity.name, entity, 'application/octet-stream', targetFolderId);
            } else {
                // Recursively upload subdirectory
                await this.sendFolderToRemote(Folder.fromPath(entity.path), path.join(remoteRelativePath, entity.name));
            }
        }
    }

    override async fileExists(filename: string) {
        // const parts = filename.split('/').filter((p) => p);
        // const fileName = parts.pop();

        // let folderId = this.remoteFolderId;
        // // Navigate to parent folder
        // for (const part of parts) {
        //     const files = await listFiles(this, folderId);
        //     const folder = files.find((f) => f.name === part && f.mimeType === 'application/vnd.google-apps.folder');
        //     if (!folder) {
        //         return false;
        //     }
        //     folderId = folder.id;
        // }
        return (await this.getFileId(filename)) !== undefined;
    }

    override async getFileFromRemote(filename: string, document?: OCRDocument) {
        const remoteDocPath = document ? path.join(this.remoteFolder, document.id) : this.remoteFolder;
        const fullPath = path.join(remoteDocPath, filename);

        const fileId = await this.getFileId(fullPath);
        if (!fileId) {
            throw new Error(`File not found: ${fullPath}`);
        }

        const result = await downloadFile(this, fileId, { format: 'text' });
        // DEV_LOG && console.log('getFileFromRemote', result);
        return result;
    }

    override async putFileContents(relativePath: string, localFilePath: string, options?) {
        const folderId = await this.createDirectory(relativePath, true);
        const file = File.fromPath(localFilePath);
        // const content = await File.fromPath(localFilePath).readText();
        await uploadFile(this, file.name, file, 'application/octet-stream', folderId);
        // return this.putFileContentsFromData(relativePath, content, options);
    }

    override async putFileContentsFromData(relativePath: string, data: string, options?) {
        const parts = relativePath.split('/').filter((p) => p);
        const fileName = parts.pop();

        const parentPath = parts.join('/');
        const folderId = await this.createDirectory(parentPath, true);
        // DEV_LOG && console.log('putFileContentsFromData', relativePath, folderId, data);
        await uploadFile(this, fileName, data, 'application/octet-stream', folderId);
    }

    async getFiles(relativePath: string) {
        let folderId = this.remoteFolderId;
        if (relativePath) {
            // Navigate to subdirectory
            const parts = relativePath.split('/').filter((p) => p);
            if (parts[0] === this.remoteFolder) {
                parts.shift();
            }
            for (const part of parts) {
                const files = await listFiles(this, folderId);
                const folder = files.find((f) => f.name === part && f.mimeType === 'application/vnd.google-apps.folder');
                if (folder) {
                    folderId = folder.id;
                } else {
                    // Folder doesn't exist
                    return [];
                }
            }
        }

        return listFiles(this, folderId);
    }
    async getFileId(relativePath: string) {
        const parts = relativePath.split('/').filter((p) => p);
        const fileName = parts.pop();

        const parentPath = parts.join('/');

        const files = await this.getFiles(parentPath);
        const file = files.find((f) => f.name === fileName);
        // DEV_LOG && console.log('getFileId', relativePath, files, file);
        return file?.id;
    }

    override async deleteFile(relativePath: string) {
        const fileId = await this.getFileId(relativePath);
        if (fileId) {
            return deleteFile(this, fileId);
        }
    }

    override async getFileContents<V extends 'binary' | 'text' | 'file' | 'json' = 'json'>(filePath: string, options?: GetFileContentsOptions & { format?: V }): Promise<ResponseData<V>> {
        const fileId = await this.getFileId(filePath);
        DEV_LOG && console.log('getFileContents', filePath, fileId);
        if (fileId) {
            return getGoogleDriveRequestContents(this, `/files/${fileId}?alt=media`, undefined, options);
        }
        throw new Error(`file not found: ${filePath}`);
    }
}
