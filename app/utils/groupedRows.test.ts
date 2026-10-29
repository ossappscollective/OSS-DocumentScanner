import { expect, test } from 'vitest';
import { getRowCorners, updateRowPositions } from './groupedRows';

const folder = () => ({ folder: {} }) as any;
const doc = () => ({ doc: {} }) as any;

test('updateRowPositions marks the first, middle and last row of each run', () => {
    const items = [folder(), folder(), doc(), doc(), doc()];
    updateRowPositions(items);
    expect(items.map((item) => item.position)).toEqual(['first', 'last', 'first', 'middle', 'last']);
});

test('updateRowPositions marks a lone row as only and skips non row items', () => {
    const items = [{ type: 'folders' } as any, doc()];
    updateRowPositions(items);
    expect(items.map((item) => item.position)).toEqual([undefined, 'only']);
});

test('updateRowPositions returns only the indexes that changed', () => {
    const items = [doc(), doc(), doc()];
    updateRowPositions(items);
    items.pop();
    expect(updateRowPositions(items)).toEqual([1]);
    expect(updateRowPositions(items)).toEqual([]);
});

test('getRowCorners on iOS rounds only the outer corners', () => {
    expect(getRowCorners('first', true)).toEqual({ borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 });
    expect(getRowCorners('middle', true).borderTopLeftRadius).toBe(0);
});

test('getRowCorners on Android uses 20 outside and 6 between rows', () => {
    expect(getRowCorners('last', false)).toEqual({ borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 });
    expect(getRowCorners('only', false).borderTopLeftRadius).toBe(20);
});
