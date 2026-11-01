import { describe, expect, it } from 'vitest';
import { canFillFirstPage } from './pageFill';

describe('canFillFirstPage', () => {
    it('fills a page without image with a new image', () => {
        expect(canFillFirstPage({}, { imagePath: '/tmp/a.jpg' })).toBe(true);
        expect(canFillFirstPage({ imagePath: null }, { image: {} })).toBe(true);
    });

    it('creates a new page when the first one has an image', () => {
        expect(canFillFirstPage({ imagePath: '/data/1/image.jpg' }, { imagePath: '/tmp/a.jpg' })).toBe(false);
    });

    it('keeps the pkpass page and the pages without data to add', () => {
        expect(canFillFirstPage({ pkpass_id: 'pass' }, { imagePath: '/tmp/a.jpg' })).toBe(false);
        expect(canFillFirstPage(undefined, { imagePath: '/tmp/a.jpg' })).toBe(false);
        expect(canFillFirstPage({}, undefined)).toBe(false);
        expect(canFillFirstPage({}, {})).toBe(false);
    });

    it('does not fill when the data targets an existing page (sync, restore)', () => {
        expect(canFillFirstPage({}, { id: '12', imagePath: '/tmp/a.jpg' })).toBe(false);
    });
});
