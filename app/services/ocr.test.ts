import { request } from '@nativescript-community/https';
import { File } from '@nativescript/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ocrService } from './ocr';

const DESTINATION = '/docs/tesseract/best/jpn.traineddata';

let downloadPath: string;

function writeFile(filePath: string, size: number) {
    downloadPath = filePath;
    File.fromPath(filePath).writeSync(new Uint8Array(size));
}

function mockResponse({
    contentLength,
    statusCode = 200,
    totalReported = contentLength,
    writtenSize = contentLength
}: {
    contentLength: number;
    statusCode?: number;
    totalReported?: number;
    writtenSize?: number;
}) {
    vi.mocked(request).mockImplementation((async (options) => {
        options.onProgress?.(0, totalReported);
        options.onProgress?.(500, totalReported);
        return {
            statusCode,
            contentLength,
            content: {
                toFile: async (filePath: string) => {
                    writeFile(filePath, writtenSize);
                },
                toJSONAsync: async () => {
                    throw new Error('not json');
                },
                toStringAsync: async () => 'Not Found'
            }
        };
    }) as any);
}

async function download() {
    const progresses: number[] = [];
    const promise = ocrService.downloadLanguages({
        dataType: 'best',
        langArray: ['jpn'],
        onProgress: async (progress) => {
            progresses.push(progress);
        }
    });
    return { progresses, promise };
}

describe('OCRService.downloadLanguages', () => {
    beforeEach(() => {
        ocrService.mDataType = 'best';
        ocrService.mDownloadedLanguages = [];
    });

    it('stores the model at its final path once fully downloaded', async () => {
        mockResponse({ contentLength: 1000 });
        const { promise, progresses } = await download();
        await promise;
        expect(File.fromPath(DESTINATION).size).toBe(1000);
        expect(ocrService.mDownloadedLanguages).toContain('jpn');
        expect(progresses[progresses.length - 1]).toBe(100);
    });

    it('never reports a negative progress when the server sends no content length', async () => {
        mockResponse({ contentLength: -1, totalReported: -1, writtenSize: 1000 });
        const { promise, progresses } = await download();
        await promise;
        expect(progresses.every((progress) => progress >= 0)).toBe(true);
    });

    it('rejects and keeps no file when the server answers with an error status', async () => {
        mockResponse({ contentLength: 9, statusCode: 404, writtenSize: 9 });
        const { promise } = await download();
        await expect(promise).rejects.toThrow();
        expect(File.exists(DESTINATION)).toBe(false);
        expect(File.exists(downloadPath)).toBe(false);
        expect(ocrService.mDownloadedLanguages).not.toContain('jpn');
    });

    it('rejects and keeps no file when the download is shorter than announced', async () => {
        mockResponse({ contentLength: 1000, writtenSize: 400 });
        const { promise } = await download();
        await expect(promise).rejects.toThrow();
        expect(File.exists(DESTINATION)).toBe(false);
        expect(File.exists(downloadPath)).toBe(false);
        expect(ocrService.mDownloadedLanguages).not.toContain('jpn');
    });

    it('does not expose the model at its final path while it is still downloading', async () => {
        let destinationDuringWrite: boolean;
        vi.mocked(request).mockImplementation((async () => ({
            statusCode: 200,
            contentLength: 1000,
            content: {
                toFile: async (filePath: string) => {
                    writeFile(filePath, 400);
                    destinationDuringWrite = File.exists(DESTINATION);
                    writeFile(filePath, 1000);
                }
            }
        })) as any);
        const { promise } = await download();
        await promise;
        expect(destinationDuringWrite).toBe(false);
    });
});
