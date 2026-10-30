import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { getCardStatus, getExpirationState } from './cardStatus';

const now = dayjs('2026-10-30T10:00:00');
const names = { expiration: 'expire on', balance: 'balance' };

describe('getExpirationState', () => {
    it('is expired once the day of the date is over', () => {
        expect(getExpirationState(dayjs('2026-10-29').valueOf(), now)).toBe('expired');
        expect(getExpirationState(dayjs('2026-10-30').valueOf(), now)).toBe('expiring');
    });
    it('warns during the 30 days before the date', () => {
        expect(getExpirationState(dayjs('2026-11-28').valueOf(), now)).toBe('expiring');
        expect(getExpirationState(dayjs('2026-12-15').valueOf(), now)).toBeNull();
    });
});

describe('getCardStatus', () => {
    it('finds the fields by kind or by their localized name', () => {
        const extra = {
            validity: { type: 'date', value: dayjs('2026-11-10').valueOf(), kind: 'expire_on' },
            Balance: { type: 'number', value: 12.5 }
        };
        expect(getCardStatus(extra, names, now)).toEqual([
            { kind: 'expiring', timestamp: dayjs('2026-11-10').valueOf() },
            { kind: 'balance', value: 12.5 }
        ]);
    });
    it('hides a far expiration and ignores other fields', () => {
        const extra = { 'expire on': { type: 'date', value: dayjs('2030-01-01').valueOf() }, notes: { type: 'string', value: 'hi' }, color: '#ff0000' };
        expect(getCardStatus(extra, names, now)).toEqual([]);
    });
    it('does not take the kind of a field of another type', () => {
        expect(getCardStatus({ 'expire on': { type: 'string', value: 'soon' } }, names, now)).toEqual([]);
    });
});
