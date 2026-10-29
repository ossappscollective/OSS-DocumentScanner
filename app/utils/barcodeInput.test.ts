import { describe, expect, it } from 'vitest';
import { getBarcodeInputRule, sanitizeBarcodeInput } from './barcodeInput';

describe('sanitizeBarcodeInput', () => {
    it('keeps only digits and the length of an EAN-13', () => {
        expect(sanitizeBarcodeInput('EAN-13', '590 1234-123457 99')).toBe('5901234123457');
    });
    it('writes Code39 in capitals and drops what it cannot encode', () => {
        expect(sanitizeBarcodeInput('Code39', 'ab-12 é*')).toBe('AB-12 ');
    });
    it('only allows the start and stop letters of Codabar', () => {
        expect(sanitizeBarcodeInput('Codabar', 'a123-4e')).toBe('A123-4');
    });
    it('keeps any text for QR codes', () => {
        expect(sanitizeBarcodeInput('QRCode', 'https://example.com/é')).toBe('https://example.com/é');
    });
    it('keeps printable ASCII for Code128', () => {
        expect(sanitizeBarcodeInput('Code128', 'aé~\n')).toBe('a~');
    });
});

describe('getBarcodeInputRule', () => {
    it('asks for a number keyboard for numeric formats only', () => {
        expect(getBarcodeInputRule('ITF').numeric).toBe(true);
        expect(getBarcodeInputRule('Code128').numeric).toBe(false);
        expect(getBarcodeInputRule('unknown').numeric).toBe(false);
    });
});
