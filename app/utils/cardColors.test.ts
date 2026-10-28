import { describe, expect, it } from 'vitest';
import { contrastRatio, getCardAccent, getChroma, pickCardColor } from './cardColors';

function rgb(hex: string): [number, number, number] {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

describe('getCardAccent', () => {
    it('keeps a color that is already readable', () => {
        expect(getCardAccent('#006a65', false, '#000000').accent).toBe('#006a65');
    });

    it('darkens a pale color on a light page until it holds 3:1', () => {
        const { accent } = getCardAccent('#ffee88', false, '#000000');
        expect(accent).not.toBe('#ffee88');
        expect(contrastRatio(rgb(accent), [255, 255, 255])).toBeGreaterThanOrEqual(3);
    });

    it('lightens a dark color on a dark page until it holds 3:1', () => {
        const { accent } = getCardAccent('#101830', true, '#000000');
        expect(contrastRatio(rgb(accent), [0, 0, 0])).toBeGreaterThanOrEqual(3);
    });

    it('picks an on color with 4.5:1', () => {
        for (const color of ['#006a65', '#c9a227', '#7a3b4f', '#ffffff']) {
            const { accent, onAccent } = getCardAccent(color, false, '#000000');
            expect(contrastRatio(rgb(onAccent), rgb(accent))).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('uses white for large text on a color that holds 3:1 with white', () => {
        // red: 4.5:1 is not reached with white (small text gets black), 3:1 is (titles get white)
        const { accent, onAccent, onAccentLarge } = getCardAccent('#ee2233', false, '#000000');
        expect(contrastRatio([255, 255, 255], rgb(accent))).toBeGreaterThanOrEqual(3);
        expect(onAccentLarge).toBe('#ffffff');
        expect(onAccent).toBe('#000000');
    });

    it('picks the text color of the backdrop like the iOS status bar does', () => {
        // the top of the backdrop is the card color at 85% over the page
        expect(getCardAccent('#ee2233', false, '#000000').onBackdrop).toBe('#ffffff');
        expect(getCardAccent('#2979ff', false, '#000000').onBackdrop).toBe('#000000');
    });

    it('falls back when there is no color or an unreadable one', () => {
        expect(getCardAccent(undefined, false, '#006a65').accent).toBe('#006a65');
        expect(getCardAccent('not a color', false, '#006a65').accent).toBe('#006a65');
    });
});

describe('pickCardColor', () => {
    it('measures the chroma of a color', () => {
        expect(getChroma('#eae9e4')).toBeLessThan(8);
        expect(getChroma('#ee2233')).toBeGreaterThan(50);
        expect(getChroma('#ffffff')).toBeCloseTo(0, 0);
    });

    it('prefers the color set by the user', () => {
        expect(pickCardColor('#2979ff', ['#ee2233'])).toBe('#2979ff');
    });

    it('uses the first colorful color of the photo', () => {
        expect(pickCardColor(undefined, ['#eae9e4', '#ee2233'])).toBe('#ee2233');
    });

    it('has no color for a gray white paper scan', () => {
        expect(pickCardColor(undefined, ['#eae9e4', '#d9d8d2'])).toBeNull();
        expect(pickCardColor(undefined, [])).toBeNull();
    });
});
