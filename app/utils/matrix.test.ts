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

// ─── Matrices filter factory ──────────────────────────────────────────────────

import Matrices from './color_matrix';

describe('Matrices.normal', () => {
    it('returns null (no-op marker)', () => {
        expect(Matrices.normal.fn()).toBeNull();
    });
});

describe('Matrices.invert', () => {
    it('returns a 20-element matrix', () => {
        expect(Matrices.invert.fn()).toHaveLength(20);
    });

    it('negates the RGB diagonal (values -1)', () => {
        const m = Matrices.invert.fn();
        expect(m[0]).toBe(-1); // R scale
        expect(m[6]).toBe(-1); // G scale
        expect(m[12]).toBe(-1); // B scale
    });

    it('alpha row is a pass-through', () => {
        const m = Matrices.invert.fn();
        // Row 4 (indices 15-19): [0, 0, 0, 1, 0]
        expect(m[15]).toBe(0);
        expect(m[16]).toBe(0);
        expect(m[17]).toBe(0);
        expect(m[18]).toBe(1);
        expect(m[19]).toBe(0);
    });
});

describe('Matrices.grayscale', () => {
    it('v=1 produces a fully-desaturated matrix (luma weights on every RGB row)', () => {
        const m = Matrices.grayscale.fn(1);
        expect(m).toHaveLength(20);
        // All three colour rows start with the luma weights (approx)
        expect(m[0]).toBeCloseTo(0.2126, 4);
        expect(m[1]).toBeCloseTo(0.7152, 4);
        expect(m[2]).toBeCloseTo(0.0722, 4);
    });

    it('v=0 produces near-identity (no desaturation)', () => {
        const m = Matrices.grayscale.fn(0);
        expect(m[0]).toBeCloseTo(1, 5);
        expect(m[6]).toBeCloseTo(1, 5);
        expect(m[12]).toBeCloseTo(1, 5);
        // Off-diagonal colour terms should be near zero
        expect(m[1]).toBeCloseTo(0, 5);
        expect(m[7]).toBeCloseTo(0, 5);
    });

    it('defaultValue is 1', () => {
        expect(Matrices.grayscale.defaultValue).toBe(1);
    });

    it('range is [0, 1]', () => {
        expect(Matrices.grayscale.range).toEqual([0, 1]);
    });
});

describe('Matrices.sepia', () => {
    it('v=1 uses the canonical sepia weights for the red output row', () => {
        const m = Matrices.sepia.fn(1);
        expect(m[0]).toBeCloseTo(0.393, 4);
        expect(m[1]).toBeCloseTo(0.769, 4);
        expect(m[2]).toBeCloseTo(0.189, 4);
    });

    it('v=0 is near identity', () => {
        const m = Matrices.sepia.fn(0);
        expect(m[0]).toBeCloseTo(1, 4);
        expect(m[6]).toBeCloseTo(1, 4);
        expect(m[12]).toBeCloseTo(1, 4);
    });

    it('alpha row is always a pass-through', () => {
        const m = Matrices.sepia.fn(0.5);
        expect(m[15]).toBe(0);
        expect(m[18]).toBe(1);
        expect(m[19]).toBe(0);
    });
});

describe('Matrices.brightness', () => {
    it('scales RGB uniformly by v', () => {
        const v = 1.5;
        const m = Matrices.brightness.fn(v);
        expect(m[0]).toBe(v);
        expect(m[6]).toBe(v);
        expect(m[12]).toBe(v);
    });

    it('off-diagonal terms are zero', () => {
        const m = Matrices.brightness.fn(0.8);
        expect(m[1]).toBe(0);
        expect(m[5]).toBe(0);
        expect(m[10]).toBe(0);
    });

    it('translation column is zero', () => {
        const m = Matrices.brightness.fn(1.2);
        expect(m[4]).toBe(0);
        expect(m[9]).toBe(0);
        expect(m[14]).toBe(0);
    });
});

describe('Matrices.contrast', () => {
    it('scales RGB diagonal by v', () => {
        const v = 2;
        const m = Matrices.contrast.fn(v);
        expect(m[0]).toBe(v);
        expect(m[6]).toBe(v);
        expect(m[12]).toBe(v);
    });

    it('translation offset equals 0.5*(1-v)*255 (Android bias=255)', () => {
        const v = 2;
        const expected = 0.5 * (1 - v) * 255;
        const m = Matrices.contrast.fn(v);
        expect(m[4]).toBeCloseTo(expected, 6);
        expect(m[9]).toBeCloseTo(expected, 6);
        expect(m[14]).toBeCloseTo(expected, 6);
    });

    it('v=1 translation is 0 (no shift)', () => {
        const m = Matrices.contrast.fn(1);
        expect(m[4]).toBeCloseTo(0, 8);
    });
});

describe('Matrices.brightnessAndContrast', () => {
    it('scale equals contrast + brightness', () => {
        const brightness = 0.2;
        const contrast = 1.5;
        const m = Matrices.brightnessAndContrast.fn(brightness, contrast);
        const expectedScale = contrast + brightness;
        expect(m[0]).toBeCloseTo(expectedScale, 8);
        expect(m[6]).toBeCloseTo(expectedScale, 8);
        expect(m[12]).toBeCloseTo(expectedScale, 8);
    });

    it('translation equals 0.5*(1-contrast)*255 (Android bias=255)', () => {
        const brightness = 0;
        const contrast = 1.5;
        const m = Matrices.brightnessAndContrast.fn(brightness, contrast);
        const expectedTranslate = 0.5 * (1 - contrast) * 255;
        expect(m[4]).toBeCloseTo(expectedTranslate, 6);
        expect(m[9]).toBeCloseTo(expectedTranslate, 6);
        expect(m[14]).toBeCloseTo(expectedTranslate, 6);
    });
});

describe('Matrices.bw', () => {
    it('v=1 has all three RGB inputs summed then shifted by -1 per output row', () => {
        const m = Matrices.bw.fn(1);
        // row structure: [v, v, v, -1, 0, ...]
        expect(m[0]).toBe(1);
        expect(m[1]).toBe(1);
        expect(m[2]).toBe(1);
        expect(m[3]).toBe(-1);
        expect(m[4]).toBe(0);
    });

    it('alpha row is pass-through', () => {
        const m = Matrices.bw.fn(0.8);
        expect(m[15]).toBe(0);
        expect(m[18]).toBe(1);
    });
});

describe('Matrices.polaroid', () => {
    it('returns the static polaroid matrix', () => {
        const m = Matrices.polaroid.fn();
        expect(m).toHaveLength(20);
        expect(m[0]).toBeCloseTo(1.438, 4);
    });

    it('is idempotent (calling fn() twice returns equal arrays)', () => {
        expect(Matrices.polaroid.fn()).toEqual(Matrices.polaroid.fn());
    });
});
