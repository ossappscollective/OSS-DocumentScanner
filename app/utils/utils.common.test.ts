import { vi, describe, expect, it } from 'vitest';
import { cleanFilename, ellipsize, getFileNameForDocument, getFormatedDateForFilename, omit, pick, sortByKey } from './utils.common';

// ─── cleanFilename ────────────────────────────────────────────────────────────

describe('cleanFilename', () => {
    it('replaces control characters with underscores', () => {
        expect(cleanFilename('hello\x00world')).toBe('hello_world');
    });

    it('replaces all forbidden characters with underscores', () => {
        // Characters forbidden in filenames: " * / < > ? \ : |
        expect(cleanFilename('file"name')).toBe('file_name');
        expect(cleanFilename('file*name')).toBe('file_name');
        expect(cleanFilename('file/name')).toBe('file_name');
        expect(cleanFilename('file<name')).toBe('file_name');
        expect(cleanFilename('file>name')).toBe('file_name');
        expect(cleanFilename('file?name')).toBe('file_name');
        expect(cleanFilename('file\\name')).toBe('file_name');
        expect(cleanFilename('file:name')).toBe('file_name');
        expect(cleanFilename('file|name')).toBe('file_name');
    });

    it('replaces whitespace with underscores', () => {
        expect(cleanFilename('my document')).toBe('my_document');
        expect(cleanFilename('tab\there')).toBe('tab_here');
        expect(cleanFilename('new\nline')).toBe('new_line');
    });

    it('accepts a custom replacement function', () => {
        expect(cleanFilename('a b:c', () => '-')).toBe('a-b-c');
    });

    it('leaves safe characters unchanged', () => {
        expect(cleanFilename('invoice_2024-01-01')).toBe('invoice_2024-01-01');
        expect(cleanFilename('report.pdf')).toBe('report.pdf');
    });

    it('handles an empty string', () => {
        expect(cleanFilename('')).toBe('');
    });

    it('collapses adjacent forbidden characters into a single replacement', () => {
        // The regex uses + so consecutive forbidden chars become one replacement
        expect(cleanFilename('a**b')).toBe('a_b');
        expect(cleanFilename('a::b')).toBe('a_b');
    });
});

// ─── pick ─────────────────────────────────────────────────────────────────────

describe('pick', () => {
    it('returns a new object with only the selected keys', () => {
        const obj = { a: 1, b: 2, c: 3 };
        expect(pick(obj, 'a', 'c')).toEqual({ a: 1, c: 3 });
    });

    it('does not include keys not asked for', () => {
        const result = pick({ x: 10, y: 20 }, 'x');
        expect(Object.keys(result)).toEqual(['x']);
    });

    it('picks undefined values faithfully', () => {
        const obj = { a: undefined as any, b: 2 };
        expect(pick(obj, 'a')).toEqual({ a: undefined });
    });
});

// ─── omit ─────────────────────────────────────────────────────────────────────

describe('omit', () => {
    it('returns a new object without the omitted keys', () => {
        const obj = { a: 1, b: 2, c: 3 };
        expect(omit(obj, 'b')).toEqual({ a: 1, c: 3 });
    });

    it('returns an unchanged copy when no keys are omitted', () => {
        const obj = { a: 1, b: 2 };
        expect(omit(obj)).toEqual({ a: 1, b: 2 });
    });

    it('returns an empty object when all keys are omitted', () => {
        const obj = { a: 1, b: 2 };
        expect(omit(obj, 'a', 'b')).toEqual({});
    });
});

// ─── sortByKey ────────────────────────────────────────────────────────────────

describe('sortByKey', () => {
    const items = [
        { name: 'banana', count: 3 },
        { name: 'apple', count: 1 },
        { name: 'cherry', count: 2 }
    ];

    it('sorts strings ascending by default', () => {
        const result = sortByKey(items, 'name');
        expect(result.map((i) => i.name)).toEqual(['apple', 'banana', 'cherry']);
    });

    it('sorts strings descending', () => {
        const result = sortByKey(items, 'name DESC');
        expect(result.map((i) => i.name)).toEqual(['cherry', 'banana', 'apple']);
    });

    it('sorts numbers ascending', () => {
        const result = sortByKey(items, 'count ASC');
        expect(result.map((i) => i.count)).toEqual([1, 2, 3]);
    });

    it('sorts numbers descending', () => {
        const result = sortByKey(items, 'count DESC');
        expect(result.map((i) => i.count)).toEqual([3, 2, 1]);
    });

    it('places null values first when ascending', () => {
        const data = [{ v: 2 }, { v: null as any }, { v: 1 }];
        const result = sortByKey(data, 'v ASC');
        expect(result[0].v).toBeNull();
    });

    it('places null values last when descending', () => {
        const data = [{ v: 2 }, { v: null as any }, { v: 1 }];
        const result = sortByKey(data, 'v DESC');
        expect(result[result.length - 1].v).toBeNull();
    });

    it('does not mutate the original array', () => {
        const original = [{ n: 2 }, { n: 1 }];
        sortByKey(original, 'n');
        expect(original[0].n).toBe(2);
    });
});

// ─── ellipsize ────────────────────────────────────────────────────────────────

describe('ellipsize', () => {
    it('returns the string unchanged when it fits within maxLength', () => {
        expect(ellipsize('hello', 10)).toBe('hello');
        expect(ellipsize('hello', 5)).toBe('hello');
    });

    it('truncates and appends ellipsis when the string is too long', () => {
        expect(ellipsize('hello world', 8)).toBe('hello w…');
    });

    it('returns just the ellipsis character when maxLength is 1', () => {
        expect(ellipsize('abc', 1)).toBe('…');
    });

    it('returns the ellipsis character when maxLength is 0 or negative', () => {
        expect(ellipsize('abc', 0)).toBe('…');
        expect(ellipsize('abc', -5)).toBe('…');
    });

    it('handles an empty string', () => {
        expect(ellipsize('', 5)).toBe('');
    });
});

// ─── getFormatedDateForFilename ───────────────────────────────────────────────
// ApplicationSettings.getString is mocked in vitest.setup.ts to return defaultValue,
// so the default dateFormat resolves to FILENAME_DATE_FORMAT = 'timestamp'.

describe('getFormatedDateForFilename', () => {
    it('returns a numeric string for the "timestamp" format', () => {
        const ts = 1710502200000;
        const result = getFormatedDateForFilename(ts, 'timestamp');
        expect(result).toBe(String(ts));
    });

    it('returns a clean ISO string for the "iso" format', () => {
        const ts = 1710502200000;
        const result = getFormatedDateForFilename(ts, 'iso');
        // ISO strings contain colons which get cleaned → underscores
        expect(result).not.toContain(':');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns raw ISO string when clean=false', () => {
        const ts = 1710502200000;
        const result = getFormatedDateForFilename(ts, 'iso', false);
        expect(result).toContain(':');
    });

    it('formats with a custom dayjs format string', () => {
        const ts = 1710502200000;
        const result = getFormatedDateForFilename(ts, 'YYYY');
        expect(result).toBe('2024');
    });

    it('cleans forbidden characters from the result by default', () => {
        // Pass a custom format that would contain a colon; result must be clean
        const ts = 1710502200000;
        const result = getFormatedDateForFilename(ts, 'HH:mm');
        expect(result).not.toContain(':');
        expect(result).toMatch(/^\d{2}_\d{2}$/);
    });

    it('uses "timestamp" format when the mocked ApplicationSettings returns default', () => {
        // With __ANDROID__=false and mocked settings returning defaults, format = 'timestamp'
        const ts = 1234567890;
        const result = getFormatedDateForFilename(ts);
        expect(result).toBe('1234567890');
    });
});

// ─── getFileNameForDocument ───────────────────────────────────────────────────

describe('getFileNameForDocument', () => {
    it('returns cleaned document name when useDocumentName=true and name is set', () => {
        const doc: any = { name: 'My Invoice 2024' };
        const result = getFileNameForDocument(doc, true);
        expect(result).toBe('My_Invoice_2024');
    });

    it('falls back to timestamp filename when useDocumentName=true but name is absent', () => {
        const doc: any = { name: '' };
        const ts = 1710502200000;
        const result = getFileNameForDocument(doc, true, ts, 'timestamp');
        expect(result).toBe(String(ts));
    });

    it('falls back to timestamp filename when document is undefined', () => {
        const ts = 1710502200000;
        const result = getFileNameForDocument(undefined, true, ts, 'timestamp');
        expect(result).toBe(String(ts));
    });

    it('uses formatted date when useDocumentName=false even if name is set', () => {
        const doc: any = { name: 'Ignored Name' };
        const ts = 1710502200000;
        const result = getFileNameForDocument(doc, false, ts, 'YYYY');
        expect(result).toBe('2024');
    });

    it('cleans forbidden chars in the document name', () => {
        const doc: any = { name: 'report: Q1/2024' };
        const result = getFileNameForDocument(doc, true);
        expect(result).toBe('report__Q1_2024');
    });
});
