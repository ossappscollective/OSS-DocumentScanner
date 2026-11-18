import { describe, expect, it } from 'vitest';
import { DEFAULT_PDF_OPTIONS, isPDFLayoutModified } from './constants';

describe('isPDFLayoutModified', () => {
    it('is false for the default options', () => {
        expect(isPDFLayoutModified({ ...DEFAULT_PDF_OPTIONS })).toBe(false);
    });

    it('is true when a layout option changed', () => {
        expect(isPDFLayoutModified({ ...DEFAULT_PDF_OPTIONS, items_per_page: DEFAULT_PDF_OPTIONS.items_per_page + 1 })).toBe(true);
        expect(isPDFLayoutModified({ ...DEFAULT_PDF_OPTIONS, page_padding: DEFAULT_PDF_OPTIONS.page_padding + 5 })).toBe(true);
    });

    it('ignores the options which are not about the layout', () => {
        expect(isPDFLayoutModified({ ...DEFAULT_PDF_OPTIONS, jpegQuality: 12 })).toBe(false);
    });
});
