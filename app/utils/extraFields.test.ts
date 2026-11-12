import { describe, expect, it, vi } from 'vitest';

vi.mock('~/models/OCRDocument', () => ({ ExtraFieldType: { String: 'string', Date: 'date', Number: 'number' } }));
vi.mock('~/services/sync/paperless/PaperlessNgxPDFSyncService', () => ({ EXTRA_PAPERLESS_ID_KEY: 'paperless_pdf_id' }));

import { formatExtraValue, getExtraFields } from './extraFields';

describe('getExtraFields', () => {
    it('lists the fields of a document in their order', () => {
        const email = { type: 'string', value: 'me@example.com' };
        const expiry = { type: 'date', value: 1700000000000 };
        expect(getExtraFields({ email, expiry })).toEqual([
            { name: 'email', extra: email },
            { name: 'expiry', extra: expiry }
        ]);
    });
    it('skips what is not a field', () => {
        const field = { type: 'string', value: 'a' };
        expect(getExtraFields({ color: '#FF0000', pkpass: { id: 1 }, paperless_pdf_id: { id: 3 }, count: 3, note: field })).toEqual([{ name: 'note', extra: field }]);
    });
    it('has no field without extra', () => {
        expect(getExtraFields(undefined)).toEqual([]);
    });
});

describe('formatExtraValue', () => {
    it('formats a date with its format', () => {
        expect(formatExtraValue({ type: 'date', value: Date.UTC(2026, 2, 5), format: 'YYYY-MM-DD' })).toBe('2026-03-05');
    });
    it('gives the value of the other types', () => {
        expect(formatExtraValue({ type: 'string', value: 'abc' })).toBe('abc');
        expect(formatExtraValue({ type: 'number', value: 0 })).toBe(0);
    });
    it('is empty without a value', () => {
        expect(formatExtraValue({ type: 'string' })).toBe('');
        expect(formatExtraValue(null)).toBe('');
        expect(formatExtraValue(undefined)).toBe('');
    });
});
