import dayjs, { type Dayjs } from 'dayjs';
import { type PKPass, type PKPassField, PKPassStyle } from '~/models/PKPass';
import { type CardStatus, formatShortDate, getExpirationState } from '~/utils/cardStatus';

/** a row of a list, or the way a tile of the cards grid shows the pass: a strip (only its header is seen) or the whole pass */
export type PKPassStatusLayout = 'list' | 'cardholder' | 'full' | 'columns';

// `gate`, or a namespaced one like `flights.departureGate`, but not `flights.gateClosingTime`
const GATE_KEY = /(^|\.)(departure)?gate$/i;
const SEAT_KEY = /(^|\.)seat(number)?$/i;

// the date of these is the one of the flight or of the event, not an expiration
const DATED_STYLES = [PKPassStyle.BoardingPass, PKPassStyle.EventTicket];
// the fields of an event which tell when it starts and when it ends
const START_KEY = /(open|start|begin)s?$/i;
const END_KEY = /(close|end)s?$/i;
const DATE_VALUE = /^\d{4}-\d{2}-\d{2}/;

function findField(fields: PKPassField[][], key: RegExp) {
    return fields.flat().find((field) => field && key.test(field.key));
}

function getFieldTimestamp(fields: PKPassField[][], key: RegExp) {
    const value = findField(fields, key)?.value;
    return typeof value === 'string' && DATE_VALUE.test(value) && dayjs(value).isValid() ? dayjs(value).valueOf() : undefined;
}

const toTimestamp = (date?: string) => (date ? dayjs(date).valueOf() : undefined);
const earliest = (...timestamps: number[]) => Math.min(...timestamps.filter((timestamp) => timestamp !== undefined));
const latest = (...timestamps: number[]) => Math.max(...timestamps.filter((timestamp) => timestamp !== undefined));

/**
 * when a pass starts, to show it, and ends, to expire it.
 * a boarding pass is done after its flight, an event ticket after its last day, the others at their expiration date
 */
function getPassDates(pass: PKPass) {
    const { expirationDate, relevantDate } = pass.passData;
    const structure = pass.getPassStructure();
    const fields = [structure?.headerFields, structure?.primaryFields, structure?.secondaryFields, structure?.auxiliaryFields, structure?.backFields].filter(Boolean);
    const expiration = toTimestamp(expirationDate);
    const relevant = toTimestamp(relevantDate);
    switch (pass.getPassStyle()) {
        case PKPassStyle.BoardingPass:
            return { start: relevant ?? expiration, end: earliest(relevant, expiration) };
        case PKPassStyle.EventTicket: {
            const start = relevant ?? getFieldTimestamp(fields, START_KEY);
            const end = expiration ?? latest(relevant, getFieldTimestamp(fields, END_KEY));
            return { start, end };
        }
        default:
            return { start: undefined, end: expiration };
    }
}

/** what a pass has to say at a glance, as the status chips of the other cards: its date or expiration, its gate and its seat */
export function getPKPassStatus(pass: PKPass, lang: string, layout: PKPassStatusLayout, now: Dayjs = dayjs()) {
    const result: CardStatus[] = [];
    const dated = DATED_STYLES.includes(pass.getPassStyle());
    const { start, end } = getPassDates(pass);
    const state = pass.isVoided() ? 'expired' : Number.isFinite(end) ? getExpirationState(end, now) : null;
    if (state === 'expired' || (state && !dated)) {
        result.push({ kind: state, timestamp: Number.isFinite(end) ? end : now.valueOf() });
    } else if (dated && Number.isFinite(start) && (layout === 'list' || layout === 'cardholder')) {
        result.push({ kind: 'info', text: formatShortDate(start, now) });
    }
    if (layout === 'list' || layout === 'cardholder') {
        const structure = pass.getPassStructure();
        const shown = layout === 'cardholder' ? [structure?.headerFields ?? []] : [];
        const hidden = [structure?.headerFields, structure?.primaryFields, structure?.secondaryFields, structure?.auxiliaryFields].filter(Boolean);
        for (const key of [GATE_KEY, SEAT_KEY]) {
            const field = findField(hidden, key);
            if (field && !findField(shown, key)) {
                result.push({ kind: 'info', text: `${pass.getLocalizedFieldLabel(field, lang)} ${pass.formatFieldValue(field, lang)}` });
            }
        }
    }
    return result;
}
