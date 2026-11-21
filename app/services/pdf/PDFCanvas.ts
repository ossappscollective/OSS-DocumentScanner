import { Canvas, ColorMatrixColorFilter, Paint } from '@nativescript-community/ui-canvas';
import { ApplicationSettings, Screen, Utils } from '@nativescript/core';
import { getActualLanguage } from '@shared/helpers/lang';
import type { OCRDocument, OCRPage } from '~/models/OCRDocument';
import { DEFAULT_PDF_OPTIONS, DEFAULT_PDF_OPTIONS_STRING } from '~/utils/constants';
import { loadImage, recycleImages } from '~/utils/images';
import { getPageColorMatrix } from '~/utils/matrix';
import { renderPKPassToCanvas } from '~/utils/pkpass';

const screenWidthDips = Screen.mainScreen.widthDIPs;

export interface PDFExportBaseOptions {
    reduce_image_size: boolean;
    paper_size: string;
    color: string;
    orientation: string;
    page_padding: number;
    imageLoadScale: number;
    imageSizeThreshold: number;
    image_page_scale: number;
    jpegQuality: number;
    items_per_page: number;
    dpi: number;
    draw_ocr_text: boolean;
    password?: string;
}
export interface PDFExportOptions {
    pages: { page: OCRPage; document: OCRDocument }[];
    document?: OCRDocument;
    folder?: string;
    filename?: string;
    compress?: boolean;
    options?: Partial<PDFExportBaseOptions>;
}

export function getPDFDefaultExportOptions() {
    const result = JSON.parse(ApplicationSettings.getString('default_export_options', DEFAULT_PDF_OPTIONS_STRING)) as PDFExportBaseOptions;
    Object.keys(DEFAULT_PDF_OPTIONS).forEach((k) => {
        if (result[k] === undefined) {
            result[k] = DEFAULT_PDF_OPTIONS[k];
        }
    });
    return result;
}

let bitmapPaint: Paint;
const textPaint = new Paint();

const textOverlayPaint = new Paint();
textOverlayPaint.color = '#00000077';
const bgPaint = new Paint();
bgPaint.color = 'white';
bgPaint.setShadowLayer(6, 0, 2, '#00000088');

// OCR text layer geometry. A tesseract line box spans ascenders to descenders:
// the font size is the box height and the baseline sits just above the box bottom.
// Keep in sync with PDFUtils.kt (android).
const OCR_FONT_SIZE_RATIO = 1;
const OCR_BASELINE_RATIO = 0.8;
const OCR_MIN_HORIZONTAL_SCALE = 0.25;
const OCR_MAX_HORIZONTAL_SCALE = 4;

function ptToPixel(value, dpi) {
    //1pt = 1/72 inch
    //1inch = dpi pixels

    return (value / 72) * dpi;
}

export interface PDFCanvasItem {
    pages: OCRPage[];
    index;
    number;
    loading?: boolean;
    pageWidth?;
    pageHeight?;
}

export default class PDFCanvas {
    canvas: Canvas;
    // imagesCache: { [k: string]: ImageSource } = {};
    items: PDFCanvasItem[];
    updatePages(pages: OCRPage[]) {
        let { items_per_page } = this.options;
        if (this.options.paper_size === 'full') {
            items_per_page = 1;
        }

        // const pages = documents.reduce((acc, doc) => {
        //     acc.push(...doc.pages);
        //     return acc;
        // }, []);
        const docPagesLength = pages.length;
        let nbPages = Math.floor(docPagesLength / items_per_page);
        nbPages += (docPagesLength - nbPages) % items_per_page;
        const newItems = [];
        for (let index = 0; index < docPagesLength; index += items_per_page) {
            const item = {
                index,
                pages: pages.slice(index, index + items_per_page)
            } as PDFCanvasItem;
            // item.loading = this.needsLoadImage(index, item);
            newItems.push(item);
        }
        this.items = newItems;
    }

    options: PDFExportBaseOptions = getPDFDefaultExportOptions();

    // async loadImagesForPage(pdfPageIndex) {
    //     const item = this.items[pdfPageIndex];
    //     for (let index = 0; index < item.pages.length; index++) {
    //         const src = item.pages[index].imagePath;
    //         if (!this.imagesCache[src]) {
    //             this.imagesCache[src] = await loadImage(src);
    //         }
    //     }
    // }
    // needsLoadImage(pdfPageIndex, item?) {
    //     item = item || this.items[pdfPageIndex];
    //     for (let index = 0; index < item.pages.length; index++) {
    //         const src = item.pages[index].imagePath;
    //         if (!this.imagesCache[src]) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }
    // draw() {
    //     this.items.forEach((item, index) => {
    //         this.drawPages(index, item.pages);
    //     });
    // }
    updateBitmapPaint(page: OCRPage, options: PDFExportBaseOptions) {
        const black_white = this.options.color === 'black_white';

        if (black_white || page.colorType || page.colorMatrix) {
            const matrix = getPageColorMatrix(page, black_white ? 'grayscale' : undefined);
            if (matrix) {
                if (!bitmapPaint) {
                    bitmapPaint = new Paint();
                }
                bitmapPaint.setColorFilter(new ColorMatrixColorFilter(matrix));
            } else if (bitmapPaint) {
                bitmapPaint.setColorFilter(null);
            }
        } else if (bitmapPaint) {
            bitmapPaint.setColorFilter(null);
        }
    }
    async drawImageOnCanvas(canvas: Canvas, page: OCRPage, toDrawWidth, toDrawHeight, createCanvas?: Function) {
        const options = this.options;
        if (CARD_APP && page.pkpass) {
            await renderPKPassToCanvas(page.pkpass, {
                canvas,
                createCanvas,
                lang: getActualLanguage(),
                width: Utils.layout.toDevicePixels(screenWidthDips),
                includeBackFields: false,
                layout: 'full'
            });
            return;
        }

        const src = page.imagePath;
        let imageWidth = page.width;
        let imageHeight = page.height;
        let reqWidth = toDrawWidth;
        let reqHeight = toDrawHeight;

        if (page.rotation % 180 !== 0) {
            imageWidth = page.height;
            imageHeight = page.width;
            const temp = reqWidth;
            reqWidth = reqHeight;
            reqHeight = temp;
        }
        this.updateBitmapPaint(page, options);
        const scale = options.paper_size === 'full' ? options.imageLoadScale : 1;
        const image = await loadImage(src, {
            width: toDrawWidth * scale,
            height: toDrawHeight * scale,
            sourceWidth: imageWidth,
            sourceHeight: imageHeight,
            jpegQuality: options.jpegQuality,
            resizeThreshold: options.imageSizeThreshold
        });

        const imageScale = reqWidth / image.width;
        // now we draw the resized and transformed image
        canvas.save();
        canvas.translate(toDrawWidth / 2, toDrawHeight / 2);
        canvas.rotate(page.rotation, 0, 0);
        canvas.scale(imageScale, imageScale, 0, 0);
        canvas.drawBitmap(image, -image.width / 2, -image.height / 2, bitmapPaint);
        canvas.restore();
        recycleImages(image);

        if (this.options.draw_ocr_text && page.ocrData) {
            const ocrData = page.ocrData;
            // ocr boxes live in the ocr image space, which is already rotated (the ocr ran with page.rotation)
            const scaleX = toDrawWidth / ocrData.imageWidth;
            const scaleY = toDrawHeight / ocrData.imageHeight;
            textPaint.color = !PRODUCTION && DEV_LOG ? '#ff000088' : '#ffffff01';
            ocrData.blocks.forEach((block) => {
                // a block holds several lines when the ocr ran at paragraph level (documents
                // scanned before line level ocr): share the box height between them
                const lines = block.text
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0);
                if (lines.length === 0) {
                    return;
                }
                const boxWidth = block.box.width * scaleX;
                const boxTop = block.box.y * scaleY;
                const lineHeight = (block.box.height * scaleY) / lines.length;
                textPaint.textSize = lineHeight * OCR_FONT_SIZE_RATIO;
                lines.forEach((line, lineIndex) => {
                    const measured = textPaint.measureText(line);
                    // stretch the run so that it covers exactly the detected box
                    const horizontalScale = measured > 0 ? Math.min(Math.max(boxWidth / measured, OCR_MIN_HORIZONTAL_SCALE), OCR_MAX_HORIZONTAL_SCALE) : 1;
                    canvas.save();
                    // canvas is y down here: the baseline sits below the line top
                    canvas.translate(block.box.x * scaleX, boxTop + (lineIndex + OCR_BASELINE_RATIO) * lineHeight);
                    canvas.scale(horizontalScale, 1, 0, 0);
                    canvas.drawText(line, 0, 0, textPaint);
                    canvas.restore();
                });
            });
        }
    }
    async drawPages(pdfPageIndex: number, pages: OCRPage[], createCanvas?: Function) {
        const { dpi, imageSizeThreshold, items_per_page, orientation, page_padding, paper_size } = this.options;
        const pagePadding = ptToPixel(page_padding, dpi);
        const canvas = this.canvas;
        const w = canvas.getWidth() - 2;
        const h = canvas.getHeight() - 2;

        const nbItems = pages.length;
        // console.log('drawPDFPage', w, h, nbItems, srcs);
        const canvasRatio = w / h;
        if (paper_size === 'full') {
            // we only support 1 item per page for this
            const page = pages[0];
            if (!page.imagePath && (!CARD_APP || !page.pkpass)) {
                return false;
            }
            let imageWidth = page.width;
            let imageHeight = page.height;
            if (page.rotation % 180 !== 0) {
                imageWidth = page.height;
                imageHeight = page.width;
            }
            imageWidth *= page.scale;
            imageHeight *= page.scale;
            if (imageSizeThreshold) {
                const minSize = Math.max(imageWidth, imageHeight);
                if (minSize > imageSizeThreshold) {
                    const resizeScale = (1.0 * minSize) / imageSizeThreshold;
                    imageWidth = imageWidth / resizeScale;
                    imageHeight = imageHeight / resizeScale;
                }
            }
            await this.drawImageOnCanvas(canvas, page, imageWidth, imageHeight, createCanvas);
        } else {
            let hasPages = false;
            let dx = 0;
            let dy = 0;
            canvas.translate(dx, dy);
            let pageRatio = 1;
            switch (paper_size) {
                case 'letter':
                    pageRatio = 612 / 792;
                    break;
                case 'a5':
                case 'a3':
                case 'a4':
                default:
                    pageRatio = 595 / 842;
                    break;
            }
            if (orientation === 'landscape') {
                pageRatio = 1 / pageRatio;
            }
            let availableWidth;
            let availableHeight;
            // console.log('pageRatio', pageRatio, canvasRatio);
            if (pageRatio > canvasRatio) {
                availableWidth = w;
                availableHeight = w / pageRatio;
                dy += (h - availableHeight) / 2;
            } else {
                availableWidth = h * pageRatio;
                availableHeight = h;
                dx += (w - availableWidth) / 2;
            }

            const pageDx = w / 2 - availableWidth / 2;
            const pageDy = h / 2 - availableHeight / 2;
            canvas.translate(pageDx, pageDy);

            // compute space diivision
            let columns = items_per_page > 2 ? 2 : 1;
            let rows = items_per_page > 2 ? Math.ceil(items_per_page / 2) : items_per_page;
            // console.log('columns', columns, rows);
            if (orientation === 'landscape') {
                const temp = columns;
                columns = rows;
                rows = temp;
            }
            const shared = Math.min(rows, columns);
            const widthPerColumn = availableWidth / columns;
            const heightPerRow = availableHeight / rows;
            let ddx = 0;
            let ddy = 0;
            let toDrawWidth;
            let toDrawHeight;
            // console.log('rows', rows, columns, shared, widthPerColumn, widthPerRow);
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < columns; j++) {
                    const pageIndex = i * shared + j;
                    if (pageIndex >= nbItems) {
                        continue;
                    }
                    const last = pageIndex === items_per_page - 1;

                    const page = pages[pageIndex];
                    if (!page.imagePath) {
                        continue;
                    }
                    hasPages = true;
                    let imageWidth = page.width;
                    let imageHeight = page.height;
                    if (page.rotation % 180 !== 0) {
                        imageWidth = page.height;
                        imageHeight = page.width;
                    }
                    const pageRatio = imageWidth / imageHeight;
                    // const src = page.imagePath;

                    let itemAvailableWidth = widthPerColumn - 2 * pagePadding;
                    const itemAvailableHeight = heightPerRow - 2 * pagePadding;
                    if (last && columns * rows > nbItems) {
                        itemAvailableWidth = 2 * widthPerColumn - 2 * pagePadding;
                    }
                    const itemRatio = itemAvailableWidth / itemAvailableHeight;
                    if (pageRatio > itemRatio) {
                        toDrawWidth = itemAvailableWidth;
                        toDrawHeight = itemAvailableWidth / pageRatio;
                    } else {
                        toDrawHeight = itemAvailableHeight;
                        toDrawWidth = itemAvailableHeight * pageRatio;
                    }
                    canvas.save();
                    canvas.translate(ddx + pagePadding, ddy + pagePadding);
                    // canvas.drawRect(0, 0, itemAvailableWidth, itemAvailableHeight, bgPaint);
                    canvas.translate(itemAvailableWidth / 2 - toDrawWidth / 2, itemAvailableHeight / 2 - toDrawHeight / 2);

                    await this.drawImageOnCanvas(canvas, page, toDrawWidth, toDrawHeight);
                    canvas.restore();
                    if (last) {
                        break;
                    }
                    // for those same size!
                    ddx += widthPerColumn;
                }
                ddy += heightPerRow;
                ddx = 0;
            }
            return hasPages;
        }
        return true;
    }
}
