import { ImageSource, Screen, Utils } from '@nativescript/core';

export async function loadImage(imagePath, loadOptions: { width?; height?; resizeThreshold?; sourceWidth?; sourceHeight?; jpegQuality? } = {}) {
    loadOptions.resizeThreshold = loadOptions.resizeThreshold || 4500;
    if (__IOS__) {
        return new ImageSource(ImageUtils.readImageFromFileSync(imagePath, JSON.stringify(loadOptions)));
    } else {
        const result = new ImageSource(com.akylas.documentscanner.utils.ImageUtil.Companion.readBitmapFromFile(Utils.android.getApplicationContext(), imagePath, JSON.stringify(loadOptions)));
        // DEV_LOG && console.log('loadImage', imagePath, result);
        return result;
    }
    // const asset = new ImageAsset(imagePath);
    // asset.options = { autoScaleFactor: false, keepAspectRatio: true, width: Math.round(reqWidth), height: Math.round(reqHeight) };
    // DEV_LOG && console.log('loadImage', sourceWidth, sourceHeight, resizeThreshold, imageScale, reqWidth, reqHeight, asset.options);
    // const bitmap = await asset.getImage();
    // return new ImageSource(bitmap);
}

export function recycleImages(...args) {
    if (__ANDROID__) {
        for (let index = 0; index < args.length; index++) {
            const arg = args[index];
            if (!arg) {
                continue;
            }
            // this first test detect android native arrays
            if (Array.isArray(arg)) {
                recycleImages(...arg);
            } else if (typeof arg === 'object' && arg.length > 0) {
                for (let j = 0; j < arg.length; j++) {
                    arg[j]?.recycle?.();
                }
            } else if (arg.android) {
                arg.android.recycle?.();
            } else {
                arg.recycle?.();
            }
        }
    }
}

/** iOS: the average brightness (0-255) of the visible top of a photo, where the bars and the title are drawn over its blurred copy. null when it cannot be read */
export async function getTopBrightness(imagePath: string, topRatio = 0.3): Promise<number | null> {
    if (!__IOS__ || !imagePath) {
        return null;
    }
    try {
        const source = await loadImage(imagePath, { width: 32 });
        const cgImage = source.ios?.CGImage;
        if (!cgImage) {
            return null;
        }
        const width = CGImageGetWidth(cgImage);
        const height = CGImageGetHeight(cgImage);
        // the photo fills the screen (aspectFill): only its central part is visible
        const visibleWidth = Math.min(width, Math.round(height * (Screen.mainScreen.widthDIPs / Screen.mainScreen.heightDIPs)));
        const top = CGImageCreateWithImageInRect(cgImage, CGRectMake(Math.round((width - visibleWidth) / 2), 0, visibleWidth, Math.max(1, Math.round(height * topRatio))));
        // the top strip scaled down to one pixel is its average color
        const buffer = interop.alloc(4);
        const context = CGBitmapContextCreate(buffer, 1, 1, 8, 4, CGColorSpaceCreateDeviceRGB(), CGImageAlphaInfo.kCGImageAlphaPremultipliedLast);
        CGContextSetInterpolationQuality(context, CGInterpolationQuality.kCGInterpolationMedium);
        CGContextDrawImage(context, CGRectMake(0, 0, 1, 1), top);
        const pixel = new interop.Reference(interop.types.uint8, buffer);
        // the image is opaque
        return 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2];
    } catch (error) {
        console.error('getTopBrightness', error);
        return null;
    }
}
