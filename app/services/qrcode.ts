import { Color, Observable, PageTransition, SharedTransition } from '@nativescript/core';
import { navigate, showModal } from '@shared/utils/svelte/ui';
import { QRCodeSingleData, detectQRCodeFromFile, generateQRCodeImage, getSVGFromQRCode } from 'plugin-nativeprocessor';
import { OCRDocument, OCRPage } from '~/models/OCRDocument';
import { QRCODE_RESIZE_THRESHOLD } from '~/utils/constants';
import { BARCODE_FORMATS } from '~/utils/barcodeFormats';
import { getBarcodeFormat } from '~/utils/pkpass';
import { screenWidthDips } from '~/variables';

export { BARCODE_FORMATS };

const TAG = 'QRCodeService';

export function getBarcodeFallbackString(format) {
    switch (format) {
        case BARCODE_FORMATS.AZTEC:
            return 'AZTEC';
        case BARCODE_FORMATS.DATA_MATRIX:
            return 'DATA_MATRIX';
        case BARCODE_FORMATS.PDF_417:
            return 'PDF_417';
        case BARCODE_FORMATS.QR_CODE:
            return 'QR_CODE';
        case BARCODE_FORMATS.CODABAR:
            return 'C0C';
        case BARCODE_FORMATS.CODE_39:
            return 'CODE-39';
        case BARCODE_FORMATS.CODE_93:
            return 'CODE-93';
        case BARCODE_FORMATS.CODE_128:
            return 'CODE-128';
        case BARCODE_FORMATS.EAN_8:
            return '32123456';
        case BARCODE_FORMATS.EAN_13:
            return '5901234123457';
        case BARCODE_FORMATS.ITF:
            return '1003';
        case BARCODE_FORMATS.UPC_A:
            return '123456789012';
        case BARCODE_FORMATS.UPC_E:
            return '0123456';
        // case BARCODE_FORMATS.DXFILMEDGE:
        //     return '0123456';
        case BARCODE_FORMATS.DATABAR:
            return '12345678901231';
        case BARCODE_FORMATS.DATABAREXPANDED:
            return '[01]98898765432106[3202]012345[15]991231';
        default:
            return format;
    }
}

export class QRCodeService extends Observable {
    async getQRCodeSVG(qrcode: QRCodeSingleData, width: number, color: string | Color = '#000000', options?) {
        return getSVGFromQRCode(qrcode.text, qrcode.format, width, {
            color: color instanceof Color ? color.hex : color,
            ...(options || {})
        });
    }
    async getQRCodeImage(qrcode: QRCodeSingleData, width: number, height: number, color: string | Color = '#000000', options?) {
        return generateQRCodeImage(qrcode.text, qrcode.format, width, height, {
            color: color instanceof Color ? color.hex : color,
            ...(options || {})
        });
    }
    async detectQRcode(document: OCRDocument, pageIndex: number) {
        const page = document.pages[pageIndex];
        const qrcode = await detectQRCodeFromFile(page.imagePath, {
            resizeThreshold: QRCODE_RESIZE_THRESHOLD,
            rotation: page.rotation
        });
        if (qrcode?.length) {
            await document.updatePage(pageIndex, {
                qrcode: (document.pages[pageIndex].qrcode || []).concat(qrcode)
            });
            return qrcode;
        }
    }

    async createQRCode() {
        const CreateBarcode = (await import('~/components/qrcode/CreateBarcode.svelte')).default;
        return showModal({
            page: CreateBarcode,
            fullscreen: true,
            props: {}
        }) as any as Promise<{ text: string; format: string }>;
    }

    async showQRCode(pages: OCRPage[], document?: OCRDocument, startPageIndex = 0) {
        const qrcodes = pages.reduce((acc, page) => {
            if (CARD_APP && page.pkpass) {
                const qrcodes = page.pkpass.getAllBarcodes().map(
                    (q) =>
                        ({
                            text: q.message,
                            format: getBarcodeFormat(q)
                        }) as QRCodeSingleData
                );
                return acc.concat(qrcodes);
            } else {
                return acc.concat(page.qrcode || []);
            }
        }, []);

        const component = (await import('~/components/FullScreenImageViewer.svelte')).default;
        navigate({
            page: component,
            transition:
                __ANDROID__ && !CARD_APP
                    ? SharedTransition.custom(new PageTransition(300, undefined, 10), {
                          //   pageStart: {
                          //       sharedTransitionTags: {
                          //           [`document_${document.id}_${item.page.id}`]: {}
                          //       }
                          //   }
                      })
                    : undefined,
            // transition: { name: 'slideLeft', duration: 300, curve: 'easeOut' },
            props: {
                refreshOnOrientationChange: false,
                useSVG: true,
                labelColor: 'black',
                backgroundColor: 'white',
                statusBarStyle: 'light',
                keepScreenAwake: true,
                screenBrightness: 1,
                images: qrcodes.map((qrcode, index) => ({
                    name: document?.name,
                    subtitle: qrcode.text,
                    sharedTransitionTag: 'qrcode' + index,
                    labelSharedTransitionTag: 'qrcodelabel' + index,
                    // colorMatrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 1, 1],
                    margin: '0 10 0 10',
                    scale: qrcode.scale,
                    svg: async () => this.getQRCodeSVG(qrcode, screenWidthDips)
                })),
                startPageIndex
            }
        });
    }
}
export const qrcodeService = new QRCodeService();
