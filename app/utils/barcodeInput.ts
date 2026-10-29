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

// keys are the values of `FORMATS` of `~/services/qrcode`
const RULES: Record<string, BarcodeInputRule> = {
    'EAN-8': { numeric: true, allowed: DIGITS, maxLength: 8 },
    'EAN-13': { numeric: true, allowed: DIGITS, maxLength: 13 },
    'UPC-A': { numeric: true, allowed: DIGITS, maxLength: 12 },
    'UPC-E': { numeric: true, allowed: DIGITS, maxLength: 8 },
    ITF: { numeric: true, allowed: DIGITS },
    DataBar: { numeric: true, allowed: DIGITS, maxLength: 14 },
    Code39: { numeric: false, allowed: CODE_39, uppercase: true },
    Code93: { numeric: false, allowed: CODE_39, uppercase: true },
    Codabar: { numeric: false, allowed: CODABAR, uppercase: true },
    Code128: { numeric: false, allowed: ASCII }
};

export function getBarcodeInputRule(format: string): BarcodeInputRule {
    return RULES[format] ?? { numeric: false };
}

/** removes what the format cannot encode, so the field only holds a value which can be drawn */
export function sanitizeBarcodeInput(format: string, text: string) {
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
