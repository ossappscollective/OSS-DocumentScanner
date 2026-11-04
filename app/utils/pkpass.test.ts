import { File } from '@nativescript/core';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PKBarcodeFormat, PKPass, PKPassTransitType, PKPassType } from '~/models/PKPass';
import { documentHasPKPassData, getBarcodeFormat, getFieldTextAlignment, getPKPassColors, getPKPassDisplayName, getPKPassStatus, getStoredPassFormat, getTransitIcon, isPKPassFile } from './pkpass';

// Pass parsing/display rules for the wallet app mode. These map Apple's
// PKPass vocabulary onto what the UI renders, so a silent change here shows up
// as wrong barcodes, wrong icons or wrongly named passes.

describe('getBarcodeFormat', () => {
    it('maps each Apple barcode format to the renderer name', () => {
        expect(getBarcodeFormat({ format: PKBarcodeFormat.QR } as any)).toBe('QRCode');
        expect(getBarcodeFormat({ format: PKBarcodeFormat.PDF417 } as any)).toBe('PDF417');
        expect(getBarcodeFormat({ format: PKBarcodeFormat.Aztec } as any)).toBe('Aztec');
        expect(getBarcodeFormat({ format: PKBarcodeFormat.Code128 } as any)).toBe('Code128');
    });

    it('falls back to QRCode for an unknown format', () => {
        expect(getBarcodeFormat({ format: 'PKBarcodeFormatSomethingNew' } as any)).toBe('QRCode');
    });

    it('falls back to QRCode when the format is missing', () => {
        expect(getBarcodeFormat({} as any)).toBe('QRCode');
    });
});

describe('getTransitIcon', () => {
    it('maps each transit type to its icon', () => {
        expect(getTransitIcon(PKPassTransitType.Air)).toBe('mdi-airplane');
        expect(getTransitIcon(PKPassTransitType.Boat)).toBe('mdi-ferry');
        expect(getTransitIcon(PKPassTransitType.Bus)).toBe('mdi-bus');
        expect(getTransitIcon(PKPassTransitType.Train)).toBe('mdi-train');
        expect(getTransitIcon(PKPassTransitType.Generic)).toBe('mdi-transit-connection-variant');
    });

    it('returns undefined when there is no transit type', () => {
        expect(getTransitIcon(undefined)).toBeUndefined();
    });

    it('returns undefined for an unknown transit type', () => {
        expect(getTransitIcon('PKTransitTypeRocket' as any)).toBeUndefined();
    });
});

describe('getPKPassDisplayName', () => {
    it('prefers the logo text', () => {
        const pass: any = { passData: { logoText: 'Logo', organizationName: 'Org', description: 'Desc' } };
        expect(getPKPassDisplayName(pass)).toBe('Logo');
    });

    it('falls back to the organization name', () => {
        const pass: any = { passData: { organizationName: 'Org', description: 'Desc' } };
        expect(getPKPassDisplayName(pass)).toBe('Org');
    });

    it('falls back to the description', () => {
        expect(getPKPassDisplayName({ passData: { description: 'Desc' } } as any)).toBe('Desc');
    });

    it('falls back to a generic label when the pass carries no name at all', () => {
        expect(getPKPassDisplayName({ passData: {} } as any)).toBe('Pass');
    });

    it('skips empty strings rather than displaying a blank name', () => {
        const pass: any = { passData: { logoText: '', organizationName: '', description: 'Desc' } };
        expect(getPKPassDisplayName(pass)).toBe('Desc');
    });
});

describe('getFieldTextAlignment', () => {
    it('strips the PKTextAlignment prefix', () => {
        expect(getFieldTextAlignment({ textAlignment: 'PKTextAlignmentRight' } as any)).toBe('right');
        expect(getFieldTextAlignment({ textAlignment: 'PKTextAlignmentCenter' } as any)).toBe('center');
        expect(getFieldTextAlignment({ textAlignment: 'PKTextAlignmentNatural' } as any)).toBe('natural');
    });

    it('defaults to left when the field has no alignment', () => {
        expect(getFieldTextAlignment({} as any)).toBe('left');
    });

    it('honours a caller-supplied default', () => {
        expect(getFieldTextAlignment({} as any, 'right')).toBe('right');
    });

    it('returns undefined when there is no field', () => {
        expect(getFieldTextAlignment(undefined as any)).toBeUndefined();
    });
});

describe('getStoredPassFormat', () => {
    it('reports espass only for an espass pass', () => {
        expect(getStoredPassFormat({ passType: PKPassType.ESpass } as any)).toBe(PKPassType.ESpass);
    });

    it('defaults to pkpass for a pkpass pass', () => {
        expect(getStoredPassFormat({ passType: PKPassType.PKPass } as any)).toBe(PKPassType.PKPass);
    });

    it('defaults to pkpass when the type is unknown or missing', () => {
        expect(getStoredPassFormat({} as any)).toBe(PKPassType.PKPass);
        expect(getStoredPassFormat(undefined)).toBe(PKPassType.PKPass);
    });
});

describe('isPKPassFile', () => {
    beforeEach(() => {
        vi.mocked(File.exists).mockReturnValue(true);
    });

    it('accepts both supported pass extensions', () => {
        expect(isPKPassFile('/tmp/ticket.pkpass')).toBe(true);
        expect(isPKPassFile('/tmp/ticket.espass')).toBe(true);
    });

    it('is case insensitive on the extension', () => {
        expect(isPKPassFile('/tmp/TICKET.PKPASS')).toBe(true);
    });

    it('rejects other extensions', () => {
        expect(isPKPassFile('/tmp/scan.pdf')).toBe(false);
        expect(isPKPassFile('/tmp/pkpass.zip')).toBe(false);
    });

    it('rejects a file that does not exist even with the right extension', () => {
        vi.mocked(File.exists).mockReturnValue(false);
        expect(isPKPassFile('/tmp/ticket.pkpass')).toBe(false);
    });
});

describe('documentHasPKPassData', () => {
    it('is true when any page carries a pass', () => {
        const document: any = { pages: [{ pkpass: undefined }, { pkpass: { passType: PKPassType.PKPass } }] };
        expect(documentHasPKPassData(document)).toBe(true);
    });

    it('is false when no page carries a pass', () => {
        expect(documentHasPKPassData({ pages: [{ pkpass: undefined }] } as any)).toBe(false);
    });

    it('is false for a document with no pages', () => {
        expect(documentHasPKPassData({ pages: [] } as any)).toBe(false);
        expect(documentHasPKPassData({} as any)).toBe(false);
    });
});

describe('getPKPassColors', () => {
    it('takes the colors of the pass', () => {
        expect(getPKPassColors({ backgroundColor: '#112233', foregroundColor: '#ffeedd', labelColor: '#999999' } as any, '#ffffff')).toEqual({
            backgroundColor: '#112233',
            foregroundColor: '#ffeedd',
            labelColor: '#999999',
            isDark: true
        });
    });

    it('falls back to the given background and readable white text on a dark one', () => {
        expect(getPKPassColors({} as any, '#101010')).toEqual({ backgroundColor: '#101010', foregroundColor: 'white', labelColor: 'white', isDark: true });
    });

    it('uses black text on a light background', () => {
        const { foregroundColor, labelColor } = getPKPassColors({ backgroundColor: '#f0f0f0' } as any, '#000000');
        expect([foregroundColor, labelColor]).toEqual(['black', 'black']);
    });

    it('is not dark on a light background, whatever the text color', () => {
        expect(getPKPassColors({ backgroundColor: '#f0f0f0', foregroundColor: '#ffffff' } as any, '#000000').isDark).toBe(false);
    });

    it('ignores empty colors', () => {
        expect(getPKPassColors({ backgroundColor: '', foregroundColor: '' } as any, '#101010').backgroundColor).toBe('#101010');
    });
});

describe('status chips of a pass', () => {
    const now = dayjs('2026-11-04T12:00:00Z');

    function createPass(passData: any) {
        const pass = new PKPass('id', 'page');
        pass.passData = { formatVersion: 1, ...passData };
        return pass;
    }

    const gate = { key: 'gate', label: 'Gate', value: 'B61' };
    const seat = { key: 'seat', label: 'Seat', value: '12D' };
    const boardingPass = (structure: any, extra: any = {}) => createPass({ boardingPass: structure, ...extra });
    const infos = (status: any[]) => status.filter((current) => current.kind === 'info').map((current) => current.text);

    describe('getPKPassStatus: gate and seat', () => {
        it('has nothing to say about a pass without any', () => {
            expect(getPKPassStatus(createPass({ generic: { primaryFields: [{ key: 'name', value: 'Peter' }] } }), 'en', 'list', now)).toEqual([]);
        });

        it('lists show the gate then the seat', () => {
            const pass = boardingPass({ auxiliaryFields: [seat], headerFields: [gate] });
            expect(infos(getPKPassStatus(pass, 'en', 'list', now))).toEqual(['Gate B61', 'Seat 12D']);
        });

        it('finds airline namespaced keys in any front section', () => {
            const pass = boardingPass({
                secondaryFields: [
                    { key: 'flights.departureTerminal', value: '2' },
                    { key: 'flights.departureGate', label: 'Gate', value: '69A' }
                ],
                auxiliaryFields: [{ key: 'flights.seatNumber', label: 'Seat', value: '1A' }]
            });
            expect(infos(getPKPassStatus(pass, 'en', 'list', now))).toEqual(['Gate 69A', 'Seat 1A']);
        });

        it('does not mistake the gate closing time for the gate', () => {
            expect(infos(getPKPassStatus(boardingPass({ headerFields: [{ key: 'flights.gateClosingTime', label: 'Closing', value: '07:20' }] }), 'en', 'list', now))).toEqual([]);
        });

        it('localizes the labels', () => {
            const pass = boardingPass({ headerFields: [{ key: 'gate', label: 'gate_str', value: 'B61' }] });
            pass.passData._allLocalizations = { fr: { gate_str: 'Porte' } };
            expect(infos(getPKPassStatus(pass, 'fr', 'list', now))).toEqual(['Porte B61']);
        });

        it('the strip of a stack only shows what its header does not', () => {
            const pass = boardingPass({ auxiliaryFields: [seat], headerFields: [gate] });
            expect(infos(getPKPassStatus(pass, 'en', 'cardholder', now))).toEqual(['Seat 12D']);
        });

        it('a tile which shows the whole pass has no chip for its fields', () => {
            const pass = boardingPass({ auxiliaryFields: [seat], headerFields: [gate] });
            expect(getPKPassStatus(pass, 'en', 'full', now)).toEqual([]);
            expect(getPKPassStatus(pass, 'en', 'columns', now)).toEqual([]);
        });
    });

    describe('getPKPassStatus: expiration of a pass', () => {
        it('warns when it expires within 30 days, like the other cards', () => {
            const timestamp = dayjs('2026-11-24T21:15:00Z').valueOf();
            expect(getPKPassStatus(createPass({ expirationDate: '2026-11-24T21:15:00Z', storeCard: {} }), 'en', 'columns', now)).toEqual([{ kind: 'expiring', timestamp }]);
        });

        it('says nothing about an expiration far away', () => {
            expect(getPKPassStatus(createPass({ expirationDate: '2027-06-01T00:00:00Z', coupon: {} }), 'en', 'list', now)).toEqual([]);
        });

        it('marks an expired pass in every layout', () => {
            const timestamp = dayjs('2026-10-01T00:00:00Z').valueOf();
            for (const layout of ['list', 'cardholder', 'full', 'columns'] as const) {
                expect(getPKPassStatus(createPass({ expirationDate: '2026-10-01T00:00:00Z', generic: {} }), 'en', layout, now)).toEqual([{ kind: 'expired', timestamp }]);
            }
        });

        it('treats a voided pass as expired', () => {
            const [status] = getPKPassStatus(createPass({ voided: true, generic: {} }), 'en', 'list', now);
            expect(status.kind).toBe('expired');
        });
    });

    describe('getPKPassStatus: the date of a flight or an event is not an expiration', () => {
        const flight = (extra: any, structure: any = {}) => boardingPass(structure, extra);

        it('shows the date of the flight, without "exp"', () => {
            expect(getPKPassStatus(flight({ relevantDate: '2026-11-22T07:30:00-07:00', expirationDate: '2026-11-24T21:15:00Z' }), 'en', 'list', now)).toEqual([{ kind: 'info', text: 'Nov 22' }]);
        });

        it('falls back to the expiration date, still as a date', () => {
            expect(getPKPassStatus(flight({ expirationDate: '2026-11-24T21:15:00Z' }), 'en', 'list', now)).toEqual([{ kind: 'info', text: 'Nov 24' }]);
        });

        it('is shown before the gate, in the lists and the strips only', () => {
            const pass = flight({ relevantDate: '2026-11-22T12:00:00Z' }, { headerFields: [gate] });
            expect(infos(getPKPassStatus(pass, 'en', 'list', now))).toEqual(['Nov 22', 'Gate B61']);
            expect(infos(getPKPassStatus(pass, 'en', 'cardholder', now))).toEqual(['Nov 22']);
            expect(getPKPassStatus(pass, 'en', 'columns', now)).toEqual([]);
        });

        it('turns into expired once it is past', () => {
            const [status, ...others] = getPKPassStatus(flight({ relevantDate: '2026-10-20T12:00:00Z', expirationDate: '2026-10-22T12:00:00Z' }), 'en', 'list', now);
            expect(status.kind).toBe('expired');
            expect(others).toEqual([]);
        });

        it('an event without a date has none', () => {
            expect(getPKPassStatus(createPass({ eventTicket: {} }), 'en', 'list', now)).toEqual([]);
        });

        it('applies to event tickets too', () => {
            expect(getPKPassStatus(createPass({ eventTicket: {}, relevantDate: '2026-12-01T18:00:00Z' }), 'en', 'list', now)).toEqual([{ kind: 'info', text: 'Dec 1' }]);
        });

        it('a flight is expired once its date is past, even without an expiration', () => {
            const [status] = getPKPassStatus(flight({ relevantDate: '2019-09-08T05:00+02:00' }), 'en', 'list', now);
            expect(status.kind).toBe('expired');
        });

        it('a flight is expired the day after, before its expiration date', () => {
            const pass = flight({ relevantDate: '2026-11-22T14:30:00Z', expirationDate: '2026-11-24T21:15:00Z' });
            expect(getPKPassStatus(pass, 'en', 'list', dayjs('2026-11-22T20:00:00Z'))).toEqual([{ kind: 'info', text: 'Nov 22' }]);
            expect(getPKPassStatus(pass, 'en', 'list', dayjs('2026-11-23T08:00:00Z'))[0].kind).toBe('expired');
        });
    });

    describe('getPKPassStatus: events', () => {
        const event = (extra: any = {}, fields: any[] = []) => createPass({ eventTicket: { auxiliaryFields: fields }, ...extra });
        const doors = [
            { key: 'doorsOpen', label: 'From', value: '2026-11-03 08:00' },
            { key: 'doorsClose', label: 'To', value: '2026-11-05 18:30' }
        ];

        it('takes the date of the event from its opening field', () => {
            expect(getPKPassStatus(event({}, doors), 'en', 'list', now)).toEqual([{ kind: 'info', text: 'Nov 3' }]);
        });

        it('is not expired while a multi day event is running', () => {
            expect(getPKPassStatus(event({ relevantDate: '2026-11-03T08:00:00Z' }, doors), 'en', 'list', now)).toEqual([{ kind: 'info', text: 'Nov 3' }]);
        });

        it('is expired once its closing field is past', () => {
            expect(getPKPassStatus(event({}, doors), 'en', 'list', dayjs('2026-11-06T09:00:00Z'))[0].kind).toBe('expired');
        });

        it('the expiration date of the pass ends the event', () => {
            const pass = event({ relevantDate: '2026-11-03T08:00:00Z', expirationDate: '2026-11-10T00:00:00Z' });
            expect(getPKPassStatus(pass, 'en', 'list', now)).toEqual([{ kind: 'info', text: 'Nov 3' }]);
        });

        it('ignores a field which is not a date', () => {
            expect(getPKPassStatus(event({}, [{ key: 'doorsOpen', label: 'From', value: 'soon' }]), 'en', 'list', now)).toEqual([]);
        });
    });
});
