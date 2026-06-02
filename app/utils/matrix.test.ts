import { describe, expect, it } from 'vitest';
import { concatColorMatrices, concatTwoColorMatrices } from './color_matrix';
import type { Matrix } from './color_matrix';

// Identity matrix: passing it through a concatenation should leave the other unchanged.
const IDENTITY: Matrix = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0
];

// Simple invert matrix (values chosen for __ANDROID__/bias=255 path, since vitest sets __IOS__=false)
const INVERT: Matrix = [
    -1, 0, 0, 0, 255,
    0, -1, 0, 0, 255,
    0, 0, -1, 0, 255,
    0, 0, 0, 1, 0
];

describe('concatTwoColorMatrices', () => {
    it('returns matB when matA is null/falsy', () => {
        expect(concatTwoColorMatrices(IDENTITY, null as any)).toBe(IDENTITY);
    });

    it('returns matA when matB is null/falsy', () => {
        expect(concatTwoColorMatrices(null as any, IDENTITY)).toBe(IDENTITY);
    });

    it('returns a 20-element array', () => {
        const result = concatTwoColorMatrices(IDENTITY, INVERT);
        expect(result).toHaveLength(20);
    });

    it('is associative with the identity matrix (matB=identity → result equals matA)', () => {
        // Concatenating INVERT with IDENTITY should give back INVERT.
        const result = concatTwoColorMatrices(INVERT, IDENTITY);
        result.forEach((v, i) => expect(v).toBeCloseTo(INVERT[i], 8));
    });

    it('double-invert yields the identity transformation', () => {
        // Applying invert twice should cancel out.
        const result = concatTwoColorMatrices(INVERT, INVERT);
        // The diagonal entries (indices 0,6,12) for RGB should be 1,
        // the alpha diagonal (index 18) stays 1 (alpha is pass-through),
        // and translation column (indices 4,9,14) should be 0.
        expect(result[0]).toBeCloseTo(1, 5);
        expect(result[6]).toBeCloseTo(1, 5);
        expect(result[12]).toBeCloseTo(1, 5);
        expect(result[18]).toBe(1); // alpha row is pass-through: [0,0,0,1,0]
        expect(result[4]).toBeCloseTo(0, 5);
        expect(result[9]).toBeCloseTo(0, 5);
        expect(result[14]).toBeCloseTo(0, 5);
    });
});

describe('concatColorMatrices', () => {
    it('returns the single element when the array has one matrix', () => {
        const result = concatColorMatrices([IDENTITY]);
        expect(result).toBe(IDENTITY);
    });

    it('chains three matrices in order', () => {
        // identity ∘ invert ∘ identity = invert
        const result = concatColorMatrices([IDENTITY, INVERT, IDENTITY]);
        result.forEach((v, i) => expect(v).toBeCloseTo(INVERT[i], 8));
    });
});
