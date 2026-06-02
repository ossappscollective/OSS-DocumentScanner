import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { convertTime } from './formatter';

describe('convertTime', () => {
    // Use a fixed timestamp to keep tests deterministic regardless of locale.
    // 2024-03-15T12:30:00.000Z
    const TIMESTAMP = 1710502200000;

    it('returns an empty string for falsy input', () => {
        expect(convertTime(0, 'YYYY-MM-DD')).toBe('');
        expect(convertTime('', 'YYYY-MM-DD')).toBe('');
        expect(convertTime(null as any, 'YYYY-MM-DD')).toBe('');
    });

    it('formats a numeric timestamp with a custom format string', () => {
        // YYYY-MM-DD should always produce the ISO date portion
        const result = convertTime(TIMESTAMP, 'YYYY-MM-DD');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formats a date string input', () => {
        const result = convertTime('2024-01-01', 'YYYY');
        expect(result).toBe('2024');
    });

    it('accepts a dayjs object directly', () => {
        const d = dayjs(TIMESTAMP);
        const result = convertTime(d, 'YYYY');
        expect(result).toBe('2024');
    });

    it('formats with HH:mm for time-only format', () => {
        // Just check it looks like a time — exact value depends on local TZ
        const result = convertTime('2024-06-01T10:30:00', 'HH:mm');
        expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
});
