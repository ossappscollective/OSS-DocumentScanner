import { expect, test } from 'vitest';
import { naturalCompare, sortByFileName } from './importOrder';

const identity = (value: string) => value;

test('sorts digit runs numerically', () => {
    expect(sortByFileName(['IMG_10.jpg', 'IMG_2.jpg', 'IMG_1.jpg'], identity)).toEqual(['IMG_1.jpg', 'IMG_2.jpg', 'IMG_10.jpg']);
});

test('is case-insensitive', () => {
    expect(sortByFileName(['b.jpg', 'A.jpg', 'c.jpg'], identity)).toEqual(['A.jpg', 'b.jpg', 'c.jpg']);
});

test('keeps timestamp names in capture order', () => {
    expect(sortByFileName(['20261025_182814.jpg', '20261025_182812.jpg', '20261024_235959.jpg'], identity)).toEqual(['20261024_235959.jpg', '20261025_182812.jpg', '20261025_182814.jpg']);
});

test('compares basenames, ignoring directories', () => {
    expect(sortByFileName(['/z/page_B.jpg', '/a/page_C.jpg', '/m/page_A.jpg'], identity)).toEqual(['/m/page_A.jpg', '/z/page_B.jpg', '/a/page_C.jpg']);
});

test('treats leading zeros as equal numeric value', () => {
    expect(naturalCompare('IMG_007.jpg', 'IMG_7.jpg')).toBe(0);
    expect(naturalCompare('IMG_008.jpg', 'IMG_7.jpg')).toBeGreaterThan(0);
});

test('handles numbers larger than safe integers', () => {
    expect(naturalCompare('file_99999999999999999999.jpg', 'file_100000000000000000000.jpg')).toBeLessThan(0);
});

test('shorter name sorts first when it is a prefix', () => {
    expect(naturalCompare('page', 'page_2')).toBeLessThan(0);
});

test('is stable for equal names', () => {
    const items = [
        { id: 1, name: 'IMG_7.jpg' },
        { id: 2, name: 'IMG_007.jpg' },
        { id: 3, name: 'IMG_7.jpg' }
    ];
    expect(sortByFileName(items, (item) => item.name).map((item) => item.id)).toEqual([1, 2, 3]);
});

test('handles empty and single item lists', () => {
    expect(sortByFileName([], identity)).toEqual([]);
    expect(sortByFileName(['only.jpg'], identity)).toEqual(['only.jpg']);
});

test('does not mutate the input', () => {
    const input = ['b.jpg', 'a.jpg'];
    sortByFileName(input, identity);
    expect(input).toEqual(['b.jpg', 'a.jpg']);
});
