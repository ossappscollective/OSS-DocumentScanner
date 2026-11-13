import { ImageSource, Utils } from '@nativescript/core';

export * from './images.common';

export async function loadImage(imagePath, loadOptions: { width?; height?; resizeThreshold?; sourceWidth?; sourceHeight?; jpegQuality? } = {}) {
    loadOptions.resizeThreshold = loadOptions.resizeThreshold || 4500;
    return new ImageSource(com.akylas.documentscanner.utils.ImageUtil.Companion.readBitmapFromFile(Utils.android.getApplicationContext(), imagePath, JSON.stringify(loadOptions)));
}

export async function getTopBrightness(_imagePath: string, _topRatio = 0.3): Promise<number | null> {
    return null;
}
