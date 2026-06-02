import { ImageSource } from '@nativescript/core';
import type { DocFolder, OCRDocument, OCRPage } from '~/models/OCRDocument';
import { MatricesTypes, Matrix } from '~/utils/color_matrix';
import { FileStat } from '~/webdav';
import { BaseSyncService, BaseSyncServiceOptions } from './BaseSyncService';
import { getFileNameForDocument, getFormatedDateForFilename } from '~/utils/utils.common';

export interface BaseImageSyncServiceOptions extends BaseSyncServiceOptions {
    fileNameFormat?: string;
    imageFormat?: 'png' | 'jpeg' | 'jpg';
    imageQuality?: number;
    // transforms?: string;
    colorType?: MatricesTypes;
    colorMatrix?: Matrix;
    brightness?: number;
    contrast?: number;
    rotation?: number;
    useFoldersStructure?: boolean;
    deleteAfterSync?: boolean;
}

export abstract class BaseImageSyncService extends BaseSyncService {
    fileNameFormat?: string;
    imageFormat?: 'png' | 'jpeg' | 'jpg';
    imageQuality?: number;
    // transforms?: string;
    colorType?: MatricesTypes;
    colorMatrix?: Matrix;
    brightness?: number;
    contrast?: number;
    rotation?: number;

    useFoldersStructure: boolean;
    deleteAfterSync: boolean;

    abstract ensureRemoteFolder(): Promise<void>;
    abstract getRemoteFolderFiles(folderStr: string): Promise<FileStat[]>;
    // abstract updatePage(document: OCRDocument, page: OCRPage, pageIndex: number): Promise<any>;
    // abstract deleteFile(remotePath: string): Promise<any>;
    // abstract putFileContents(relativePath: string, localFilePath: string, options?): Promise<any>;
    // abstract putFileContentsFromData(relativePath: string, data: string, options?): Promise<any>;
    abstract writeImage(imageSource: ImageSource, name: string, imageFormat: 'png' | 'jpeg' | 'jpg', imageQuality: number, overwrite: boolean, docFolder?: DocFolder): Promise<any>;

    getImageName(document: OCRDocument, page: OCRPage, pageIndex: number, exportFormat: string) {
        let destinationName = getFileNameForDocument(document) + '_' + (pageIndex + 1);
        // let destinationName = getFormatedDateForFilename(page.createdDate, this.fileNameFormat);
        if (!destinationName.endsWith(exportFormat)) {
            destinationName += '.' + exportFormat;
        }
        return destinationName;
    }
}
