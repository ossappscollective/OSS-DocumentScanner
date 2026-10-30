import dayjs, { type Dayjs } from 'dayjs';

export const EXTRA_KIND_EXPIRATION = 'expire_on';
export const EXTRA_KIND_BALANCE = 'balance';
export const EXPIRATION_WARNING_DAYS = 30;

interface ExtraEntry {
    type: string;
    value: unknown;
    kind?: string;
}

export type CardStatus = { kind: 'expired' | 'expiring'; timestamp: number } | { kind: 'balance'; value: number };

function isExtraEntry(entry: unknown): entry is ExtraEntry {
    return !!entry && typeof entry === 'object' && 'type' in entry && 'value' in entry;
}

// a field made from a name template keeps its kind, the others are found by their (localized) name
function findField(extra: Record<string, unknown>, kind: string, localizedName: string, type: string) {
    for (const [key, entry] of Object.entries(extra)) {
        if (isExtraEntry(entry) && entry.type === type && (entry.kind ? entry.kind === kind : key.toLowerCase() === localizedName.toLowerCase())) {
            return entry;
        }
    }
}

export function getExpirationState(timestamp: number, now: Dayjs = dayjs()) {
    const end = dayjs(timestamp).endOf('day');
    if (end.isBefore(now)) {
        return 'expired';
    }
    return end.diff(now, 'day', true) <= EXPIRATION_WARNING_DAYS ? 'expiring' : null;
}

/** the expiration only shows when it is close or past, the balance whenever it is set */
export function getCardStatus(extra: Record<string, unknown> | undefined, names: { expiration: string; balance: string }, now: Dayjs = dayjs()) {
    const result: CardStatus[] = [];
    if (!extra) {
        return result;
    }
    const expiration = findField(extra, EXTRA_KIND_EXPIRATION, names.expiration, 'date');
    if (typeof expiration?.value === 'number') {
        const state = getExpirationState(expiration.value, now);
        if (state) {
            result.push({ kind: state, timestamp: expiration.value });
        }
    }
    const balance = findField(extra, EXTRA_KIND_BALANCE, names.balance, 'number');
    if (typeof balance?.value === 'number' && !isNaN(balance.value)) {
        result.push({ kind: 'balance', value: balance.value });
    }
    return result;
}
