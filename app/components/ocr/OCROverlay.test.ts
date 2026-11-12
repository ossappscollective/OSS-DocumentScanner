import { describe, expect, test } from 'vitest';
import { Affine, applyToPoint, getBlockAt, getBlockRanges, getFitMatrix, invert, multiply } from './OCROverlay';

const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

function expectPoint(matrix: Affine, x: number, y: number, expected: [number, number]) {
    const point = applyToPoint(matrix, x, y);
    expect(point.x).toBeCloseTo(expected[0]);
    expect(point.y).toBeCloseTo(expected[1]);
}

describe('getFitMatrix', () => {
    test('centers and scales a landscape image in a square view', () => {
        const matrix = getFitMatrix({ imageWidth: 200, imageHeight: 100, rotation: 0, viewWidth: 400, viewHeight: 400 });
        expectPoint(matrix, 0, 0, [0, 100]);
        expectPoint(matrix, 200, 100, [400, 300]);
    });

    test('rotation 90 swaps the displayed size and moves the corners clockwise', () => {
        const matrix = getFitMatrix({ imageWidth: 200, imageHeight: 100, rotation: 90, viewWidth: 400, viewHeight: 400 });
        expectPoint(matrix, 0, 0, [300, 0]);
        expectPoint(matrix, 200, 0, [300, 400]);
        expectPoint(matrix, 0, 100, [100, 0]);
    });

    test('rotation 180 flips the image around its center', () => {
        const matrix = getFitMatrix({ imageWidth: 200, imageHeight: 100, rotation: 180, viewWidth: 400, viewHeight: 400 });
        expectPoint(matrix, 0, 0, [400, 300]);
        expectPoint(matrix, 200, 100, [0, 100]);
    });

    test('negative and over-full rotations are normalized', () => {
        const base = { imageWidth: 200, imageHeight: 100, viewWidth: 400, viewHeight: 400 };
        expect(getFitMatrix({ ...base, rotation: -90 })).toEqual(getFitMatrix({ ...base, rotation: 270 }));
        expect(getFitMatrix({ ...base, rotation: 450 })).toEqual(getFitMatrix({ ...base, rotation: 90 }));
    });

    test('an empty view gives the identity', () => {
        expect(getFitMatrix({ imageWidth: 200, imageHeight: 100, rotation: 0, viewWidth: 0, viewHeight: 0 })).toEqual(IDENTITY);
    });
});

describe('multiply / invert', () => {
    test('multiply applies the first matrix then the second', () => {
        const fit = getFitMatrix({ imageWidth: 200, imageHeight: 100, rotation: 0, viewWidth: 400, viewHeight: 400 });
        const zoom: Affine = [2, 0, 0, 2, -50, -20];
        expectPoint(multiply(fit, zoom), 200, 100, [750, 580]);
    });

    test('invert maps a point back', () => {
        const matrix = multiply(getFitMatrix({ imageWidth: 200, imageHeight: 100, rotation: 90, viewWidth: 400, viewHeight: 400 }), [1.5, 0, 0, 1.5, 10, -30]);
        const mapped = applyToPoint(matrix, 70, 30);
        expectPoint(invert(matrix), mapped.x, mapped.y, [70, 30]);
    });
});

describe('getBlockAt', () => {
    const blocks = [{ box: { x: 10, y: 10, width: 100, height: 40 } }, { box: { x: 10, y: 60, width: 100, height: 40 } }, { box: { x: 0, y: 0, width: 200, height: 200 } }];

    test('finds the block under a view point through the matrix', () => {
        const matrix: Affine = [2, 0, 0, 2, 100, 0];
        expect(getBlockAt(blocks.slice(0, 2), matrix, 100 + 2 * 50, 2 * 70)).toBe(1);
    });

    test('returns -1 outside every block', () => {
        expect(getBlockAt(blocks.slice(0, 2), IDENTITY, 150, 150)).toBe(-1);
    });

    test('the smallest block wins when they overlap', () => {
        expect(getBlockAt(blocks, IDENTITY, 50, 20)).toBe(0);
        expect(getBlockAt(blocks, IDENTITY, 150, 150)).toBe(2);
    });

    test('works through a rotation', () => {
        const matrix = getFitMatrix({ imageWidth: 200, imageHeight: 100, rotation: 90, viewWidth: 400, viewHeight: 400 });
        const target = applyToPoint(matrix, 30, 20);
        expect(getBlockAt([{ box: { x: 10, y: 10, width: 40, height: 20 } }], matrix, target.x, target.y)).toBe(0);
    });
});

describe('getBlockRanges', () => {
    test('locates each block in order in the full text', () => {
        const text = 'first\n\nsecond line\n\nthird';
        const ranges = getBlockRanges(text, [{ text: 'first' }, { text: 'second line' }, { text: 'third' }]);
        expect(ranges).toEqual([
            { start: 0, end: 5 },
            { start: 7, end: 18 },
            { start: 20, end: 25 }
        ]);
    });

    test('a block that cannot be found, or is empty, gets null and does not shift the others', () => {
        const ranges = getBlockRanges('alpha\n\nomega', [{ text: 'alpha' }, { text: 'missing' }, { text: '' }, { text: 'omega' }]);
        expect(ranges).toEqual([{ start: 0, end: 5 }, null, null, { start: 7, end: 12 }]);
    });

    test('identical blocks map to successive occurrences', () => {
        expect(getBlockRanges('a\n\na', [{ text: 'a' }, { text: 'a' }])).toEqual([
            { start: 0, end: 1 },
            { start: 3, end: 4 }
        ]);
    });
});
