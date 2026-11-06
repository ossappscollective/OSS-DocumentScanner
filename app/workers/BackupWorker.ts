import { BaseWorker, WorkerEvent } from '@akylas/nativescript-app-utils/worker/BaseWorker';
import { setDocumentsService } from '~/models/OCRDocument';
import { BackupService } from '~/services/backup';
import { DocumentsService } from '~/services/documents';

const context: Worker = self as any;

const TAG = '[BackupWorker]';
DEV_LOG && console.log(TAG, 'main');

let documentsService: DocumentsService;

export default class BackupWorker extends BaseWorker {
    constructor(protected context: Worker) {
        super(context);
    }

    async handleStart(event: WorkerEvent) {
        if (!documentsService) {
            documentsService = new DocumentsService();
            documentsService.notify = (e) => {
                if (e.eventName === 'started') {
                    return;
                }
                const { object, ...other } = e;
                this.notify({ ...other, target: 'documentsService', object: object === this ? undefined : object });
            };
            setDocumentsService(documentsService);
            await documentsService.start(true);
        }
    }

    async receivedMessage(event: WorkerEvent) {
        const data = event.data;

        try {
            switch (data.type) {
                case 'createBackup':
                    DEV_LOG && console.log(TAG, 'createBackup');
                    await this.handleStart(event);
                    const backupPath = await BackupService.createBackup(documentsService, data.messageData.zipPath);
                    (global as any).postMessage({ id: data.id, messageData: backupPath });
                    this.stop(data.messageData?.error, data.id);
                    break;
                case 'restoreBackup':
                    await this.handleStart(event);
                    await BackupService.restoreBackup(documentsService, data.messageData.zipPath);
                    (global as any).postMessage({ id: data.id, messageData: data.messageData.zipPath });
                    this.stop(data.messageData?.error, data.id);
                    break;
                case 'stop':
                    this.stop(data.messageData?.error, data.id);
                    break;
            }
        } catch (error) {
            this.sendError(error);
        }
    }
}

const worker = new BackupWorker(context);
