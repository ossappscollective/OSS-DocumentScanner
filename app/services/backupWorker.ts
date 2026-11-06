import BaseWorkerHandler from '@akylas/nativescript-app-utils/worker/BaseWorkerHandler';
import { showError } from '@shared/utils/showError';
import { CustomError } from '@akylas/nativescript-app-utils/error';
import type BackupWorker from '~/workers/BackupWorker';
import { pickFolder } from '@nativescript-community/ui-document-picker';
import { documentsService } from './documents';
import { OCRDocument, OCRPage } from '~/models/OCRDocument';

export class BackupWorkerService extends BaseWorkerHandler<BackupWorker> {
    async onWorkerEvent(eventData) {
        if (eventData.target === 'documentsService') {
            if (eventData.doc) {
                eventData.doc = OCRDocument.fromJSON(eventData.doc);
            }
            if (eventData.documents) {
                eventData.documents = eventData.documents.map((d) => OCRDocument.fromJSON(d));
            }
            if (eventData.pages) {
                eventData.pages = eventData.pages.map((d) => OCRPage.fromJSON(d));
            }
            if (eventData.object?.id === eventData.doc?.id) {
                eventData.object = eventData.doc;
            } else {
                delete eventData.object;
            }
            documentsService.notify({ ...eventData, object: eventData.object || documentsService, fromWorker: true });
        } else {
            this.notify({ ...eventData });
        }
    }
    private static instance: BackupWorkerService;

    constructor() {
        super(() => new Worker('~/workers/BackupWorker'));
    }

    static getInstance(): BackupWorkerService {
        if (!BackupWorkerService.instance) {
            BackupWorkerService.instance = new BackupWorkerService();
        }
        return BackupWorkerService.instance;
    }

    handleError(error: any) {
        showError(error);
    }

    handleWorkerError(error: any) {
        DEV_LOG && console.log('handleWorkerError', error);
        showError(CustomError.fromObject({ ...error, sentryReportTranslatedName: true }));
    }

    async createBackup(): Promise<string> {
        const folders = await pickFolder({
            multipleSelection: false,
            permissions: { write: true, persistable: false, read: true },
            forceSAF: true
        });
        if (folders.folders?.[0]) {
            const result = await this.sendMessageToWorker('createBackup', { zipPath: folders.folders?.[0] }, Date.now());
            return result.path;
        }
    }

    async restoreBackup(zipPath: string): Promise<void> {
        await this.sendMessageToWorker('restoreBackup', { zipPath }, Date.now());
    }
}

export const backupWorkerService = BackupWorkerService.getInstance();
