import { lc } from '@nativescript-community/l';
import { File, ImageSource } from '@nativescript/core';
import type { CornersOptions, CropOptions, DetectOptions, DetectQRCodeOptions, GenerateColorOptions, GenerateQRCodeOptions, LoadImageOptions, OCRData, PDFImportOptions, Quads } from '.';
import { CropView } from './CropView';

const runningPromises = new Set();

// we use wrapPromiseWithCompletionHandler to hold a reference to the promise while doing async native work.
// if we don't a GC might happen and it wouldnt know the current context.
// thus we could loose native references stored in the async method waiting for that promise.
async function wrapPromiseWithCompletionHandler<T = any>(callback: (delegate: CompletionDelegateImpl) => void, wrapResult = (r) => r, progress?, shouldParse = true) {
    const promise = new Promise<T>((resolve, reject) => {
        try {
            callback(
                CompletionDelegateImpl.initWithResolveReject(
                    (res) => {
                        resolve(wrapResult(res));
                        runningPromises.delete(promise);
                    },
                    (err) => {
                        reject(err);
                        runningPromises.delete(promise);
                    },
                    progress,
                    shouldParse
                )
            );
        } catch (error) {
            reject(error);
        }
    });
    runningPromises.add(promise);
    return promise;
}

@NativeClass
class CompletionDelegateImpl extends NSObject implements CompletionDelegate {
    static ObjCProtocols = [CompletionDelegate];
    resolve;
    reject;
    progress;
    shouldParse;
    onCompleteError(result: any, error): void {
        if (error) {
            this.reject(error);
        } else {
            if (this.shouldParse && typeof result === 'string') {
                this.resolve(result ? JSON.parse(result) : null);
            } else {
                this.resolve(result);
            }
        }
    }
    onProgress(progress: number): void {
        this.progress?.(progress);
    }

    static initWithResolveReject(resolve, reject, progress?, shouldParse = true) {
        const delegate = CompletionDelegateImpl.new() as CompletionDelegateImpl;
        delegate.resolve = resolve;
        delegate.reject = reject;
        delegate.onProgress = progress;
        delegate.shouldParse = shouldParse;
        return delegate;
    }
}

export async function cropDocument(editingImage: ImageSource, quads, transforms = '') {
    return wrapPromiseWithCompletionHandler(
        (delegate) => OpencvDocumentProcessDelegate.cropDocumentQuadsDelegateTransforms(editingImage.ios, JSON.stringify(quads), delegate, transforms),
        (nImages) => {
            const images = [];
            for (let index = 0; index < nImages.count; index++) {
                images[index] = nImages.objectAtIndex(index);
            }
            return images;
        }
    );
}
export async function cropDocumentFromFile(src: string, quads, options: CropOptions = {}) {
    return wrapPromiseWithCompletionHandler((delegate) => OpencvDocumentProcessDelegate.cropDocumentFromFileQuadsDelegateOptions(src, JSON.stringify(quads), delegate, JSON.stringify(options)));
}
export async function getJSONDocumentCorners(editingImage: ImageSource, resizeThreshold = 300, imageRotation = 0): Promise<Quads> {
    return wrapPromiseWithCompletionHandler((delegate) =>
        OpencvDocumentProcessDelegate.getJSONDocumentCornersShrunkImageHeightImageRotationDelegate(editingImage.ios, resizeThreshold, imageRotation, delegate)
    );
}
export async function getJSONDocumentCornersFromFile(src: string, options: CornersOptions = {}): Promise<Quads> {
    return wrapPromiseWithCompletionHandler((delegate) => OpencvDocumentProcessDelegate.getJSONDocumentCornersFromFileDelegateOptions(src, delegate, JSON.stringify(options)));
}
export async function processFromFile(src: string, processes: any[], options: LoadImageOptions = {}): Promise<any[]> {
    return wrapPromiseWithCompletionHandler((delegate) => OpencvDocumentProcessDelegate.processFromFileProcessesOptionsDelegate(src, JSON.stringify(processes), JSON.stringify(options), delegate));
}
export async function getColorPalette(
    editingImage: ImageSource,
    options: Partial<GenerateColorOptions> = { resizeThreshold: 100, colorsFilterDistanceThreshold: 20, colorPalette: 5 }
): Promise<Quads> {
    throw new Error('not implemented');
}
export async function getColorPaletteFromFile(
    src: string,
    options: Partial<GenerateColorOptions> = { resizeThreshold: 100, colorsFilterDistanceThreshold: 20, colorPalette: 5 },
    strOptions?: string
): Promise<Quads> {
    throw new Error('not implemented');
}

export async function ocrDocument(editingImage: ImageSource | UIImage, options?: Partial<DetectOptions>, onProgress?: (progress: number) => void) {
    return wrapPromiseWithCompletionHandler(
        (delegate) => OpencvDocumentProcessDelegate.ocrDocumentOptionsDelegate(editingImage['ios'] || editingImage, options ? JSON.stringify(options) : '', delegate),
        (r) => r,
        onProgress
    );
}
export async function ocrDocumentFromFile(src: string, options?: Partial<DetectOptions>, onProgress?: (progress: number) => void) {
    return wrapPromiseWithCompletionHandler(
        (delegate) => OpencvDocumentProcessDelegate.ocrDocumentFromFileOptionsDelegate(src, options ? JSON.stringify(options) : '', delegate),
        (r) => r,
        onProgress
    );
}

export async function detectQRCode(editingImage: ImageSource | UIImage, options?: Partial<DetectQRCodeOptions>) {
    return wrapPromiseWithCompletionHandler((delegate) => {
        OpencvDocumentProcessDelegate.detectQRCodeOptionsDelegate(editingImage['ios'] || editingImage, options ? JSON.stringify(options) : '', delegate);
    });
}

export async function detectQRCodeFromFile(src: string, options?: Partial<DetectQRCodeOptions>) {
    return wrapPromiseWithCompletionHandler((delegate) => OpencvDocumentProcessDelegate.detectQRCodeFromFileOptionsDelegate(src, options ? JSON.stringify(options) : '', delegate));
}

export async function generateQRCodeImage(text: string, format: string, width: number, height: number, options?: Partial<GenerateQRCodeOptions>) {
    return wrapPromiseWithCompletionHandler(
        (delegate) => {
            OpencvDocumentProcessDelegate.generateQRCodeFormatWidthHeightOptionsDelegate(text, format, width, height, options ? JSON.stringify(options) : '', delegate);
        },
        (image) => new ImageSource(image)
    );
}

export async function getSVGFromQRCode(text: string, format: string, hintSize: number, options?: Partial<GenerateQRCodeOptions>) {
    return wrapPromiseWithCompletionHandler(
        (delegate) => {
            OpencvDocumentProcessDelegate.generateQRCodeSVGFormatSizeHintOptionsDelegate(text, format, hintSize, options ? JSON.stringify(options) : '', delegate);
        },
        (r) => r,
        undefined,
        false
    );
}
export function getSVGFromQRCodeSync(text: string, format: string, hintSize: number, options?: Partial<GenerateQRCodeOptions>) {
    return OpencvDocumentProcessDelegate.generateQRCodeSVGSyncFormatSizeHintOptions(text, format, hintSize, options ? JSON.stringify(options) : '');
}

@NativeClass
export class OnQRCodeImpl extends NSObject implements OnQRCode {
    static ObjCProtocols = [OnQRCode];
    callback;

    static initWithCallback(callback) {
        const delegate = OnQRCodeImpl.new() as OnQRCodeImpl;
        delegate.callback = callback;
        return delegate;
    }
    onQRCodes(data: string): void {
        this.callback(data);
    }
}

@NativeClass
class OnAutoScanImpl extends NSObject implements OnAutoScan {
    static ObjCProtocols = [OnAutoScan];
    callback;
    onAutoScan(corners: string): void {
        this.callback(corners);
    }

    static initWithCallback(callback) {
        const delegate = OnAutoScanImpl.new() as OnAutoScanImpl;
        delegate.callback = callback;
        return delegate;
    }
}
export function createAutoScanHandler(cropView: CropView, block: (result) => void) {
    return AutoScanHandler.alloc().initWithCropViewOnAutoScan(cropView.nativeViewProtected, OnAutoScanImpl.initWithCallback(block));
}

export function createQRCodeCallback(onQRCodes): any {
    return onQRCodes ? OnQRCodeImpl.initWithCallback(onQRCodes) : null;
}

export async function importPdfToTempImages(pdfPath: string, options?: Partial<PDFImportOptions>) {
    return wrapPromiseWithCompletionHandler<string[]>((delegate) => PDFUtils.importPdfToTempImagesDelegateOptions(pdfPath, delegate, options ? JSON.stringify(options) : ''));
}

export async function getImageSize(imagePath: string) {
    const size = ImageUtils.getImageSize(imagePath);
    if (size) {
        return { width: size.objectForKey('width'), height: size.objectForKey('height'), rotation: size.objectForKey('rotation') };
    } else {
        throw new Error(lc('error_loading_image', imagePath, File.exists(imagePath)));
    }
}
