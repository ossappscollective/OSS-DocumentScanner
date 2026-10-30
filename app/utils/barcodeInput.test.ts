import { describe, expect, it } from 'vitest';
import { BARCODE_FORMATS } from './barcodeFormats';
import { getBarcodeInputRule, sanitizeBarcodeInput } from './barcodeInput';

describe('sanitizeBarcodeInput', () => {
    it('keeps only digits and the length of an EAN-13', () => {
        expect(sanitizeBarcodeInput(BARCODE_FORMATS.EAN_13, '590 1234-123457 99')).toBe('5901234123457');
    });
    it('writes Code39 in capitals and drops what it cannot encode', () => {
        expect(sanitizeBarcodeInput(BARCODE_FORMATS.CODE_39, 'ab-12 é*')).toBe('AB-12 ');
    });
    it('only allows the start and stop letters of Codabar', () => {
        expect(sanitizeBarcodeInput(BARCODE_FORMATS.CODABAR, 'a123-4e')).toBe('A123-4');
    });
    it('keeps any text for QR codes', () => {
        expect(sanitizeBarcodeInput(BARCODE_FORMATS.QR_CODE, 'https://example.com/é')).toBe('https://example.com/é');
    });
    it('keeps printable ASCII for Code128', () => {
        expect(sanitizeBarcodeInput(BARCODE_FORMATS.CODE_128, 'aé~\n')).toBe('a~');
    });
});

describe('getBarcodeInputRule', () => {
    it('asks for a number keyboard for numeric formats only', () => {
        expect(getBarcodeInputRule(BARCODE_FORMATS.ITF).numeric).toBe(true);
        expect(getBarcodeInputRule(BARCODE_FORMATS.CODE_128).numeric).toBe(false);
        expect(getBarcodeInputRule('unknown').numeric).toBe(false);
    });
});
