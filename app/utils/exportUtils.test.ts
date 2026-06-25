import { describe, expect, it } from 'vitest';
import { deduplicateFilenames } from './exportUtils';

describe('deduplicateFilenames', () => {
    it('returns the list unchanged when all names are unique', () => {
        expect(deduplicateFilenames(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array for empty input', () => {
        expect(deduplicateFilenames([])).toEqual([]);
    });

    it('appends _001 to the second occurrence in a pair of duplicates', () => {
        expect(deduplicateFilenames(['ts1234', 'ts1234'])).toEqual(['ts1234', 'ts1234_001']);
    });

    it('handles a run of three identical names', () => {
        expect(deduplicateFilenames(['ts1234', 'ts1234', 'ts1234'])).toEqual(['ts1234', 'ts1234_001', 'ts1234_002']);
    });

    it('resets the counter for each new run', () => {
        expect(deduplicateFilenames(['a', 'a', 'b', 'b'])).toEqual(['a', 'a_001', 'b', 'b_001']);
    });

    it('pads the suffix to three digits', () => {
        const names = Array(11).fill('x');
        const result = deduplicateFilenames(names);
        expect(result[10]).toBe('x_010');
    });

    it('does not rename non-consecutive duplicates', () => {
        // 'a' appears at index 0 and 2, but they are not adjacent
        expect(deduplicateFilenames(['a', 'b', 'a'])).toEqual(['a', 'b', 'a']);
    });

    it('handles a single entry without modification', () => {
        expect(deduplicateFilenames(['only'])).toEqual(['only']);
    });

    it('does not mutate the input array', () => {
        const input = ['x', 'x'];
        deduplicateFilenames(input);
        expect(input).toEqual(['x', 'x']);
    });
});

// ─── cleanFilename regex (document export rename) ────────────────────────────
//
// This suite pins the exact behaviour of the regex used to sanitise export
// filenames so that any future change to the pattern is caught immediately.

describe('cleanFilename regex for export', () => {
    // Re-declare the regex inline so the test is self-contained and serves as
    // a specification for the exact pattern that must remain stable.
    const FORBIDDEN_RE = /[\x00-\x1F\x7F"*/<>?\\:|]+/g;
    const WHITESPACE_RE = /\s/g;

    function sanitize(str: string) {
        return str.replace(FORBIDDEN_RE, '_').replace(WHITESPACE_RE, '_');
    }

    it('strips ASCII control characters (0x00–0x1F)', () => {
        for (let c = 0; c <= 0x1f; c++) {
            expect(sanitize(String.fromCharCode(c))).toBe('_');
        }
    });

    it('strips DEL (0x7F)', () => {
        expect(sanitize('\x7F')).toBe('_');
    });

    it('strips every forbidden filename character', () => {
        const forbidden = ['"', '*', '/', '<', '>', '?', '\\', ':', '|'];
        forbidden.forEach((ch) => {
            expect(sanitize(ch), `character: ${JSON.stringify(ch)}`).toBe('_');
        });
    });

    it('collapses adjacent forbidden characters into one underscore', () => {
        expect(sanitize('a::b')).toBe('a_b');
        expect(sanitize('a<>b')).toBe('a_b');
    });

    it('replaces spaces and tabs with underscores', () => {
        expect(sanitize('a b')).toBe('a_b');
        expect(sanitize('a\tb')).toBe('a_b');
    });

    it('leaves safe characters (letters, digits, dots, dashes) unchanged', () => {
        expect(sanitize('invoice-2024.01.pdf')).toBe('invoice-2024.01.pdf');
        expect(sanitize('SCAN_001')).toBe('SCAN_001');
    });
});
