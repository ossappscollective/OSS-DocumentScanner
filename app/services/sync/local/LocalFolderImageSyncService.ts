import { File, Folder, ImageSource } from '@nativescript/core';
import type { DocFolder } from '~/models/OCRDocument';
import { DocumentEvents } from '~/services/documents';
import { BaseImageSyncService, BaseImageSyncServiceOptions } from '~/services/sync/BaseImageSyncService';
import { SERVICES_SYNC_MASK } from '~/services/sync/types';
import { saveImage } from '~/utils/utils';
import type { FileStat } from '~/webdav';

export interface LocalFolderImageSyncServiceOptions extends BaseImageSyncServiceOptions {
    localFolderPath: string;
}

export class LocalFolderImageSyncService extends BaseImageSyncService {
    shouldSync(force?: boolean, event?: DocumentEvents) {
        // DEV_LOG && console.log('shouldSync', force, this.autoSync);
        return force || (event && this.autoSync);
    }
    static type = 'folder_image';
    type = LocalFolderImageSyncService.type;
    syncMask = SERVICES_SYNC_MASK[LocalFolderImageSyncService.type];
    localFolderPath: string;
    static start(config?: { id: number; [k: string]: any }) {
        if (config) {
            const service = LocalFolderImageSyncService.getOrCreateInstance();
            Object.assign(service, config);
            DEV_LOG && console.log('LocalFolderImageSyncService', 'start', JSON.stringify(config), service.autoSync);
            return service;
        }
    }
    override stop() {}
    override async ensureRemoteFolder() {
        if (!Folder.exists(this.localFolderPath)) {
            Folder.fromPath(this.localFolderPath);
        }
    }
    override async getRemoteFolderFiles(folderStr: string) {
        let nURL: NSURL;
        if (__IOS__) {
            nURL = NSURL.fileURLWithPathIsDirectory(this.localFolderPath, true);
            nURL.startAccessingSecurityScopedResource();
        }
        const files = await Folder.fromPath(this.localFolderPath).getEntities();
        nURL?.stopAccessingSecurityScopedResource();
        return files
            .filter((e) => e instanceof File)
            .map(
                (e) =>
                    ({
                        basename: e.name,
                        filename: e.path,
                        type: 'file',
                        lastmod: e.lastModified.valueOf(),
                        size: e.size
                    }) as FileStat
            );
    }
    override async writeImage(imageSource: ImageSource, fileName: string, imageFormat: 'png' | 'jpeg' | 'jpg', imageQuality: number, overwrite: boolean, docFolder?: DocFolder) {
        let destinationPath = this.localFolderPath;
        if (docFolder) {
            const subFolders = docFolder.name.split('/');
            let folder = Folder.fromPath(destinationPath, true);
            for (let i = 0; i < subFolders.length; i++) {
                folder = folder.getFolder(subFolders[i], true);
            }
            destinationPath = folder.path;
        }
        let nURL: NSURL;
        if (__IOS__) {
            nURL = NSURL.fileURLWithPathIsDirectory(destinationPath, true);
            nURL.startAccessingSecurityScopedResource();
        }
        await saveImage(imageSource, {
            exportDirectory: destinationPath,
            fileName,
            imageFormat,
            imageQuality,
            overwrite
        });
        nURL?.stopAccessingSecurityScopedResource();
    }
}
