import { File } from '@nativescript/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PKBarcodeFormat, PKPassTransitType, PKPassType } from '~/models/PKPass';
import { documentHasPKPassData, getBarcodeFormat, getPKPassColors, getFieldTextAlignment, getPKPassDisplayName, getStoredPassFormat, getTransitIcon, isPKPassFile } from './pkpass';

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
