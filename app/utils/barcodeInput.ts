import { BARCODE_FORMATS } from '~/utils/barcodeFormats';

export interface BarcodeInputRule {
    /** the value is only digits: a number keyboard */
    numeric: boolean;
    /** the characters the format can encode, undefined for any */
    allowed?: RegExp;
    maxLength?: number;
    /** letters are written in capitals */
    uppercase?: boolean;
}

const DIGITS = /[0-9]/;
const CODE_39 = /[0-9A-Z\-. $/+%]/;
const CODABAR = /[0-9ABCD\-$:/.+]/;
const ASCII = /[\x20-\x7e]/;

const RULES: Partial<Record<BARCODE_FORMATS, BarcodeInputRule>> = {
    [BARCODE_FORMATS.EAN_8]: { numeric: true, allowed: DIGITS, maxLength: 8 },
    [BARCODE_FORMATS.EAN_13]: { numeric: true, allowed: DIGITS, maxLength: 13 },
    [BARCODE_FORMATS.UPC_A]: { numeric: true, allowed: DIGITS, maxLength: 12 },
    [BARCODE_FORMATS.UPC_E]: { numeric: true, allowed: DIGITS, maxLength: 8 },
    [BARCODE_FORMATS.ITF]: { numeric: true, allowed: DIGITS },
    [BARCODE_FORMATS.DATABAR]: { numeric: true, allowed: DIGITS, maxLength: 14 },
    [BARCODE_FORMATS.CODE_39]: { numeric: false, allowed: CODE_39, uppercase: true },
    [BARCODE_FORMATS.CODE_93]: { numeric: false, allowed: CODE_39, uppercase: true },
    [BARCODE_FORMATS.CODABAR]: { numeric: false, allowed: CODABAR, uppercase: true },
    [BARCODE_FORMATS.CODE_128]: { numeric: false, allowed: ASCII }
};

export function getBarcodeInputRule(format: BARCODE_FORMATS | string): BarcodeInputRule {
    return RULES[format as BARCODE_FORMATS] ?? { numeric: false };
}

/** removes what the format cannot encode, so the field only holds a value which can be drawn */
export function sanitizeBarcodeInput(format: BARCODE_FORMATS | string, text: string) {
    const rule = getBarcodeInputRule(format);
    let result = text ?? '';
    if (rule.uppercase) {
        result = result.toUpperCase();
    }
    if (rule.allowed) {
        result = Array.from(result)
            .filter((char) => rule.allowed.test(char))
            .join('');
    }
    return rule.maxLength ? result.slice(0, rule.maxLength) : result;
}
