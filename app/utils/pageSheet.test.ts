import { describe, expect, it } from 'vitest';
import { createPageSheetTranslation, getPageFit, interpolatePageFit } from './pageSheet';

const input = { containerHeight: 800, roomTop: 0, pageHeight: 600, pageCenter: 300, sheetHeight: 300, margin: 16 };

describe('getPageFit', () => {
    it('keeps the size of a page which fits above the sheet', () => {
        expect(getPageFit({ ...input, pageHeight: 300, pageCenter: 150 }).scale).toBe(1);
    });
    it('shrinks a page which is taller than the room above the sheet', () => {
        // the room is 800 - 300 - 0 - 16 = 484 for a 600 page
        expect(getPageFit(input).scale).toBeCloseTo(484 / 600);
    });
    it('puts the center of the page at the center of the room above the sheet', () => {
        const { scale, translateY } = getPageFit(input);
        const center = input.containerHeight / 2 + scale * (input.pageCenter - input.containerHeight / 2) + translateY;
        expect(center).toBeCloseTo(input.roomTop + 484 / 2);
    });
    it('scales around the center of its own view', () => {
        const { scale, translateY } = getPageFit({ ...input, viewCenter: 300 });
        // the view is the page: its center only goes to the center of the room
        expect(scale).toBeCloseTo(484 / 600);
        expect(300 + translateY).toBeCloseTo(484 / 2);
    });
    it('never collapses the page', () => {
        expect(getPageFit({ ...input, sheetHeight: 2000 }).scale).toBeGreaterThan(0);
    });
});

describe('interpolatePageFit', () => {
    const fit = { scale: 0.5, translateY: -100 };
    it('is the identity without sheet', () => {
        expect(interpolatePageFit(fit, 0)).toEqual({ scale: 1, translateY: 0 });
    });
    it('is the fit with the whole sheet', () => {
        expect(interpolatePageFit(fit, 1)).toEqual(fit);
    });
    it('follows the sheet in between', () => {
        expect(interpolatePageFit(fit, 0.5)).toEqual({ scale: 0.75, translateY: -50 });
    });
});

describe('createPageSheetTranslation', () => {
    const first = { name: 'first' } as never;
    const second = { name: 'second' } as never;
    const fit = { scale: 0.5, translateY: -100 };
    it('moves the sheet and every page together', () => {
        const translation = createPageSheetTranslation(() => [
            { target: first, fit },
            { target: second, fit: { scale: 0.8, translateY: -40 } }
        ]);
        expect(translation(-150, 300, 0.5)).toEqual({
            bottomSheet: { translateY: -150 },
            previewPage0: { target: first, scaleX: 0.75, scaleY: 0.75, translateY: -50 },
            previewPage1: { target: second, scaleX: 0.9, scaleY: 0.9, translateY: -20 }
        });
    });
    it('moves the followers with the sheet', () => {
        const button = { name: 'button' } as never;
        const translation = createPageSheetTranslation(
            () => [],
            () => [button]
        );
        expect(translation(-150, 300, 0.5)).toEqual({ bottomSheet: { translateY: -150 }, follower0: { target: button, translateY: -150 } });
    });
    it('only moves the sheet without pages', () => {
        const translation = createPageSheetTranslation(() => []);
        expect(translation(0, 300, 0)).toEqual({ bottomSheet: { translateY: 0 } });
    });
    it('never uses a property of the sheet as a key', () => {
        const result = createPageSheetTranslation(() => [{ target: first, fit }])(-10, 300, 0.1);
        expect(Object.keys(result)).not.toContain('page');
    });
});
