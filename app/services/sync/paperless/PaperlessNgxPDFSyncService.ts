import { TimeoutError } from '@akylas/nativescript-app-utils/error';
import { File } from '@nativescript/core';
import dayjs from 'dayjs';
import type { DocFolder, OCRDocument } from '~/models/OCRDocument';
import { networkService } from '~/services/api';
import { DocumentEvents } from '~/services/documents';
import { BasePDFSyncService, BasePDFSyncServiceOptions } from '~/services/sync/BasePDFSyncService';
import { PaperlessNgxSyncOptions, PaperlessTask, ensureToken, fetchTasks, listDocuments, updateDocumentVersion, uploadDocument } from '~/services/sync/paperless/PaperlessNgx';
import { SERVICES_SYNC_MASK } from '~/services/sync/types';
import { PDF_EXT } from '~/utils/constants';
import type { FileStat } from '~/webdav';

export interface PaperlessNgxPDFSyncServiceOptions extends BasePDFSyncServiceOptions, PaperlessNgxSyncOptions {}

/** Key in doc.extra where the linked Paperless document ID is stored. */
export const EXTRA_PAPERLESS_ID_KEY = 'paperless_pdf_id';

/** Polling interval in milliseconds. */
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TIME_MS = 200000;

export class PaperlessNgxPDFSyncService extends BasePDFSyncService {
    shouldSync(force?: boolean, event?: DocumentEvents) {
        return (force || (event && this.autoSync)) && networkService.connected;
    }
    static type = 'paperless_pdf';
    type = PaperlessNgxPDFSyncService.type;
    syncMask = SERVICES_SYNC_MASK[PaperlessNgxPDFSyncService.type];
    serverUrl: string;
    token: string;
    username?: string;
    password?: string;

    /** Map from task UUID to its promise resolvers, used for polling. */
    private pendingTasks = new Map<string, { promise: Promise<number>; resolve: (id: number) => void; reject: (err: Error) => void }>();
    /** Single shared polling loop promise, null when not running. */
    private pollingPromise: Promise<void> | null = null;

    static start(config?: { id: number; [k: string]: any }) {
        if (config) {
            const service = PaperlessNgxPDFSyncService.getOrCreateInstance();
            Object.assign(service, config);
            return service;
        }
    }

    override stop() {}

    /**
     * Paperless-ngx manages its own storage — no remote folder to create.
     */
    override async ensureRemoteFolder(): Promise<any> {
        return ensureToken(this);
    }

    override async getRemoteFolderFiles(_relativePath: string): Promise<FileStat[]> {
        const documents = await listDocuments(this);
        return documents.map((doc) => {
            const baseName = doc.original_file_name || `${doc.title}.pdf`;
            const displayName = baseName.endsWith(PDF_EXT) ? baseName : `${baseName}${PDF_EXT}`;
            return {
                filename: displayName,
                basename: displayName,
                lastmod: doc.modified ? dayjs(doc.modified).valueOf() : undefined,
                size: 0,
                type: 'file' as const,
                mime: 'application/pdf'
            };
        });
    }

    /**
     * Register a task UUID and return a Promise that resolves with the Paperless
     * document ID once the task reaches SUCCESS, or rejects on failure.
     * Starts the polling loop if not already running.
     */
    private waitForTask(taskUuid: string): Promise<number> {
        const existing = this.pendingTasks.get(taskUuid);

        if (existing) {
            // Reuse the in-flight promise
            return existing.promise;
        }

        let resolve!: (value: number) => void;
        let reject!: (reason?: any) => void;

        const promise = new Promise<number>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        this.pendingTasks.set(taskUuid, {
            promise,
            resolve,
            reject
        });

        this.startPolling();

        return promise;
    }
    startPollingStartTime;
    private startPolling() {
        if (!this.pollingPromise) {
            this.startPollingStartTime = Date.now();
            this.pollingPromise = this.pollLoop();
        }
    }

    private async pollLoop() {
        while (this.pendingTasks.size > 0) {
            if (Date.now() - this.startPollingStartTime > MAX_POLL_TIME_MS) {
                this.pendingTasks.forEach((task, task_id) => {
                    task.reject(new TimeoutError());
                });
                this.pendingTasks.clear();
            }
            await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
            try {
                const tasks: PaperlessTask[] = await fetchTasks(this);
                for (const task of tasks) {
                    const pending = this.pendingTasks.get(task.task_id);
                    if (!pending) {
                        continue;
                    }
                    if (task.status === 'success') {
                        this.pendingTasks.delete(task.task_id);
                        pending.resolve(task.result_data.document_id);
                    } else if (task.status === 'failure' || task.status === 'revoked') {
                        this.pendingTasks.delete(task.task_id);
                        pending.reject(new Error(`Paperless task ${task.task_id} failed with status ${task.status}: ${task.result_data ?? ''}`));
                    }
                }
            } catch (err) {
                DEV_LOG && console.error('PaperlessNgxPDFSyncService', 'pollLoop error', err, err.task);
            }
        }
        this.pollingPromise = null;
    }

    async uploadDocument(document: OCRDocument, localFilePath: string, fileName: string, docFolder?: DocFolder) {
        const taskUuid = await uploadDocument(this, fileName, File.fromPath(localFilePath));
        const paperlessDocId = await this.waitForTask(taskUuid);
        return document.save({ extra: { [EXTRA_PAPERLESS_ID_KEY]: paperlessDocId } }, false, false);
    }
    async uploadPDF(document: OCRDocument, localFilePath: string, fileName: string, docFolder?: DocFolder) {
        try {
            const existingPaperlessId = document.extra?.[EXTRA_PAPERLESS_ID_KEY] as number;
            if (existingPaperlessId) {
                // Document already exists on Paperless — upload a new version
                try {
                    await updateDocumentVersion(this, existingPaperlessId, fileName, File.fromPath(localFilePath));
                } catch (error) {
                    if (/not found/i.test(error.message)) {
                        await this.uploadDocument(document, localFilePath, fileName, docFolder);
                    } else {
                        throw error;
                    }
                }
            } else {
                // New document — upload and wait for the task to resolve with the Paperless doc ID
                await this.uploadDocument(document, localFilePath, fileName, docFolder);
            }
        } finally {
            try {
                File.fromPath(localFilePath).remove();
            } catch (_) {
                // ignore cleanup errors
            }
        }
    }
}
