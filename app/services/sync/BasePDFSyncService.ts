import { wrapNativeException } from '@nativescript-community/ui-image';
import { File, Screen, knownFolders, path } from '@nativescript/core';
import { getActualLanguage } from '@shared/helpers/lang';
import { generatePDFASync } from 'plugin-nativeprocessor';
import { DocFolder, OCRDocument, OCRPage } from '~/models/OCRDocument';
import PDFExportCanvas from '~/services/pdf/PDFExportCanvas';
import { PDF_EXT } from '~/utils/constants';
import { recycleImages } from '~/utils/images';
import { getPageColorMatrix } from '~/utils/matrix';
import { pkpassToImage } from '~/utils/pkpass';
import { getFileNameForDocument } from '~/utils/utils.common';
import { FileStat } from '~/webdav';
import type { PDFExportBaseOptions } from '../pdf/PDFCanvas';
import { BaseSyncService, BaseSyncServiceOptions } from './BaseSyncService';

export interface BasePDFSyncServiceOptions extends BaseSyncServiceOptions {
    fileNameFormat?: string;
    exportOptions?: PDFExportBaseOptions;
    OCREnabled?: boolean;
    OCRDataType?: string;
    OCRLanguages?: string[];
    useDocumentName?: boolean;

    useFoldersStructure?: boolean;
    deleteAfterSync?: boolean;
}

export abstract class BasePDFSyncService extends BaseSyncService {
    fileNameFormat?: string;
    exportOptions?: PDFExportBaseOptions;
    useDocumentName?: boolean;

    OCREnabled: boolean;
    OCRDataType: string;
    OCRLanguages: string[];

    useFoldersStructure: boolean;
    deleteAfterSync: boolean;

    abstract ensureRemoteFolder(): Promise<void>;
    abstract getRemoteFolderFiles(folderStr: string): Promise<FileStat[]>;
    // abstract updatePage(document: OCRDocument, page: OCRPage, pageIndex: number): Promise<any>;
    // abstract deleteFile(remotePath: string): Promise<any>;
    // abstract putFileContents(relativePath: string, localFilePath: string, options?): Promise<any>;
    // abstract putFileContentsFromData(relativePath: string, data: string, options?): Promise<any>;
    // abstract writePDF(document: OCRDocument, name: string, docFolder?: DocFolder): Promise<any>;
    abstract uploadPDF(document: OCRDocument, localFilePath: string, fileName: string, docFolder?: DocFolder): Promise<any>;

    getPDFName(document: OCRDocument) {
        // DEV_LOG && console.log('getPDFName', this.useDocumentName, this.fileNameFormat);
        return getFileNameForDocument(document, this.useDocumentName, document.createdDate, this.fileNameFormat);
    }

    async writePDFToFolder(document: OCRDocument, fileName: string, folderPath: string, _docFolder?: DocFolder) {
        const pages = document.pages.filter((p) => !!p.imagePath || p.pkpass);
        if (!pages || pages.length === 0) {
            return;
        }

        if (__ANDROID__) {
            const exportOptions = this.exportOptions;
            const black_white = exportOptions.color === 'black_white';
            const thePages = pages.map((p) => ({ document, page: { ...p, colorMatrix: getPageColorMatrix(p, black_white ? 'grayscale' : undefined) } as OCRPage }));
            if (CARD_APP) {
                // look through pages to find pkpasses
                for (const page of thePages) {
                    if (page.page.pkpass) {
                        const imageSource = await pkpassToImage(page.page.pkpass, {
                            lang: getActualLanguage(),
                            layout: 'full',
                            includeBackFields: false
                        });
                        // render the pkpass in temp file and pass that image to the pdf renderer
                        const tempImagePath = path.join(knownFolders.temp().path, `pkpass_${page.document.id}_${page.page.pkpass_id}.jpg`);
                        await imageSource.saveToFileAsync(tempImagePath, 'png', 100);
                        recycleImages(imageSource);
                        page.page = { ...page.page, imagePath: tempImagePath, scale: 2, width: imageSource.width, height: imageSource.height } as any;
                    }
                }
            }

            const options = JSON.stringify({
                overwrite: true,
                // page_padding: Utils.layout.toDevicePixels(pdfCanvas.options.page_padding),
                text_scale: Screen.mainScreen.scale * 1.4,
                pages: thePages.map((p) => p.page),
                ...exportOptions
            });
            DEV_LOG && console.log('generatePDFASync', folderPath, fileName, document.name);
            await generatePDFASync(folderPath, fileName, options, wrapNativeException);
        } else {
            const thePages = pages.map((page) => ({ page, document }));
            if (!thePages.length) {
                return;
            }
            const exporter = new PDFExportCanvas();
            await exporter.export({
                pages: pages.map((page) => ({ page, document })),
                folder: folderPath,
                filename: fileName,
                compress: true,
                options: this.exportOptions
            });
        }
    }
    async writePDF(document: OCRDocument, fileName: string, _docFolder?: DocFolder) {
        if (!fileName.endsWith(PDF_EXT)) {
            fileName += PDF_EXT;
        }
        const temp = knownFolders.temp().path;

        await this.writePDFToFolder(document, fileName, temp, _docFolder);
        const localFilePath = path.join(temp, fileName);
        if (File.exists(localFilePath)) {
            return this.uploadPDF(document, localFilePath, fileName, _docFolder);
        }
    }
}
