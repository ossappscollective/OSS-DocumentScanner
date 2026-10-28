import { describe, expect, it } from 'vitest';
import { contrastRatio, getCardAccent } from './cardColors';

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

    it('falls back when there is no color or an unreadable one', () => {
        expect(getCardAccent(undefined, false, '#006a65').accent).toBe('#006a65');
        expect(getCardAccent('not a color', false, '#006a65').accent).toBe('#006a65');
    });
});
