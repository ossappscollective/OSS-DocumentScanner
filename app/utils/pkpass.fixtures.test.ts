import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import nodeOs from 'node:os';
import nodePath from 'node:path';
import { Folder } from '@nativescript/core';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import UTC from 'dayjs/plugin/utc';
import { unzip } from 'plugin-zip';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PKBarcodeFormat, PKPassStyle, PKPassTransitType, PKPassType } from '~/models/PKPass';
import type { PKPass } from '~/models/PKPass';
import {
    convertEspassToPKPassData,
    convertPKPassDataToEspassJson,
    extractAndParsePKPassFile,
    getBarcodeFormat,
    getFieldTextAlignment,
    getPKPassDisplayName,
    getStoredPassFormat,
    getTransitIcon,
    isPKPassFile
} from './pkpass';

vi.mock('@nativescript/core', async () => {
    const nodeFs = await import('node:fs');
    const nodePathModule = await import('node:path');
    class FakeFile {
        constructor(public path: string) {}
        get name() {
            return nodePathModule.basename(this.path);
        }
        static exists(filePath: string) {
            return nodeFs.existsSync(filePath) && nodeFs.statSync(filePath).isFile();
        }
        static fromPath(filePath: string) {
            return new FakeFile(filePath);
        }
        readText() {
            return nodeFs.promises.readFile(this.path, 'utf8');
        }
        readTextSync() {
            return nodeFs.readFileSync(this.path, 'utf8');
        }
    }
    class FakeFolder {
        constructor(public path: string) {}
        get name() {
            return nodePathModule.basename(this.path);
        }
        static exists(folderPath: string) {
            return nodeFs.existsSync(folderPath) && nodeFs.statSync(folderPath).isDirectory();
        }
        static fromPath(folderPath: string) {
            return new FakeFolder(folderPath);
        }
        getEntitiesSync() {
            return nodeFs.readdirSync(this.path, { withFileTypes: true }).map((entry) => {
                const entryPath = nodePathModule.join(this.path, entry.name);
                return entry.isDirectory() ? new FakeFolder(entryPath) : new FakeFile(entryPath);
            });
        }
        async remove() {
            nodeFs.rmSync(this.path, { recursive: true, force: true });
        }
    }
    const readDefault = (_key: string, defaultValue?: unknown) => defaultValue;
    return {
        ApplicationSettings: { getString: readDefault, getBoolean: readDefault, getNumber: readDefault, hasKey: () => false },
        Color: (await vi.importActual<any>('@nativescript/core/color/color-common')).ColorBase,
        Screen: { mainScreen: { widthPixels: 1080, heightPixels: 1920, widthDIPs: 390, heightDIPs: 852 } },
        knownFolders: { temp: () => ({ path: '/tmp' }), currentApp: () => ({ path: '/app' }) },
        Observable: class Observable {},
        File: FakeFile,
        Folder: FakeFolder,
        path: { join: (...parts: string[]) => nodePathModule.join(...parts) },
        isString: (value: unknown) => typeof value === 'string',
        isObject: (value: unknown) => value !== null && typeof value === 'object'
    };
});

dayjs.extend(LocalizedFormat);
dayjs.extend(UTC);

const FIXTURES_DIR = nodePath.resolve(__dirname, '../../test_assets/passes');
const scratchRoot = fs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'pkpass-fixtures-'));

const PASS_FIXTURES = [
    'Eurowings.pkpass',
    'Eurowings(1).pkpass',
    'Eurowings(2).pkpass',
    '2YRvwooZ8wswnTZZhBbCeR.pkpass',
    'DCBLN24-QLUKT-1-passbook.pkpass',
    'Pass-Example-Generic.pkpass',
    'charge_coupon.espass',
    'movie.espass',
    'spaceport.espass',
    'spaceship_boarding.espass'
] as const;
type PassFixture = (typeof PASS_FIXTURES)[number];

const parsed = new Map<string, { pass: PKPass; extractedPath: string }>();

function fixturePath(fileName: string) {
    return nodePath.join(FIXTURES_DIR, fileName);
}

function newTargetFolder() {
    return Folder.fromPath(fs.mkdtempSync(nodePath.join(scratchRoot, 'target-')));
}

function getPass(fileName: PassFixture) {
    const result = parsed.get(fileName);
    if (!result) {
        throw new Error(`fixture not parsed: ${fileName}`);
    }
    return result.pass;
}

function allFields(pass: PKPass) {
    const structure = pass.getPassStructure();
    return [structure?.headerFields, structure?.primaryFields, structure?.secondaryFields, structure?.auxiliaryFields, structure?.backFields].flatMap((section) => section ?? []);
}

// Real files are unzipped with the system `unzip` in place of the native plugin-zip.
beforeAll(async () => {
    vi.mocked(unzip).mockImplementation(async ({ archive, directory }) => {
        fs.mkdirSync(directory, { recursive: true });
        execFileSync('unzip', ['-q', '-o', archive, '-d', directory]);
    });
    for (const fileName of PASS_FIXTURES) {
        parsed.set(fileName, await extractAndParsePKPassFile(fixturePath(fileName), newTargetFolder()));
    }
});

afterEach(() => {
    vi.useRealTimers();
});

afterAll(() => {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
});

// Expectations per fixture: how the pass is classified and which renderer inputs it yields.
const OVERVIEW: {
    fileName: PassFixture;
    passType: PKPassType;
    style: PKPassStyle;
    displayName: string;
    barcodeFormat?: PKBarcodeFormat;
    rendererFormat?: string;
    transitIcon?: string;
    imageKeys: string[];
}[] = [
    {
        fileName: 'Eurowings.pkpass',
        passType: PKPassType.PKPass,
        style: PKPassStyle.BoardingPass,
        displayName: 'EUROWINGS',
        barcodeFormat: PKBarcodeFormat.Aztec,
        rendererFormat: 'Aztec',
        transitIcon: 'mdi-airplane',
        imageKeys: ['icon', 'icon2x', 'logo', 'logo2x']
    },
    {
        fileName: 'Eurowings(1).pkpass',
        passType: PKPassType.PKPass,
        style: PKPassStyle.Generic,
        displayName: 'EUROWINGS',
        barcodeFormat: PKBarcodeFormat.Aztec,
        rendererFormat: 'Aztec',
        imageKeys: ['icon', 'icon2x', 'logo', 'logo2x']
    },
    {
        fileName: 'Eurowings(2).pkpass',
        passType: PKPassType.PKPass,
        style: PKPassStyle.BoardingPass,
        displayName: 'EUROWINGS',
        transitIcon: 'mdi-airplane',
        imageKeys: ['icon', 'icon2x', 'logo', 'logo2x']
    },
    {
        fileName: '2YRvwooZ8wswnTZZhBbCeR.pkpass',
        passType: PKPassType.PKPass,
        style: PKPassStyle.BoardingPass,
        displayName: 'PassKit Airways',
        barcodeFormat: PKBarcodeFormat.QR,
        rendererFormat: 'QRCode',
        transitIcon: 'mdi-airplane',
        imageKeys: ['icon', 'icon2x', 'icon3x', 'logo', 'logo2x', 'logo3x']
    },
    {
        fileName: 'DCBLN24-QLUKT-1-passbook.pkpass',
        passType: PKPassType.PKPass,
        style: PKPassStyle.EventTicket,
        displayName: 'droidcon Berlin 2024',
        barcodeFormat: PKBarcodeFormat.QR,
        rendererFormat: 'QRCode',
        imageKeys: ['icon', 'logo']
    },
    {
        fileName: 'Pass-Example-Generic.pkpass',
        passType: PKPassType.PKPass,
        style: PKPassStyle.Generic,
        displayName: 'Company Staff ID',
        barcodeFormat: PKBarcodeFormat.QR,
        rendererFormat: 'QRCode',
        imageKeys: ['icon', 'icon2x']
    },
    {
        fileName: 'charge_coupon.espass',
        passType: PKPassType.ESpass,
        style: PKPassStyle.EventTicket,
        displayName: 'car charger',
        barcodeFormat: PKBarcodeFormat.PDF417,
        rendererFormat: 'PDF417',
        imageKeys: ['icon']
    },
    {
        fileName: 'movie.espass',
        passType: PKPassType.ESpass,
        style: PKPassStyle.EventTicket,
        displayName: 'The Martian',
        barcodeFormat: PKBarcodeFormat.PDF417,
        rendererFormat: 'PDF417',
        imageKeys: ['footer', 'icon', 'strip']
    },
    {
        fileName: 'spaceport.espass',
        passType: PKPassType.ESpass,
        style: PKPassStyle.BoardingPass,
        displayName: 'Alpha Centauri',
        barcodeFormat: PKBarcodeFormat.Aztec,
        rendererFormat: 'Aztec',
        transitIcon: 'mdi-transit-connection-variant',
        imageKeys: ['footer', 'icon', 'logo']
    },
    {
        fileName: 'spaceship_boarding.espass',
        passType: PKPassType.ESpass,
        style: PKPassStyle.BoardingPass,
        displayName: 'Alpha Centauri',
        barcodeFormat: PKBarcodeFormat.Aztec,
        rendererFormat: 'Aztec',
        transitIcon: 'mdi-transit-connection-variant',
        imageKeys: ['footer', 'icon', 'logo']
    }
];

describe.each(OVERVIEW)('$fileName', ({ barcodeFormat, displayName, fileName, imageKeys, passType, rendererFormat, style, transitIcon }) => {
    it('is accepted as a pass file', () => {
        expect(isPKPassFile(fixturePath(fileName))).toBe(true);
    });

    it('is detected as the right format', () => {
        const pass = getPass(fileName);
        expect(pass.passType).toBe(passType);
        expect(getStoredPassFormat(pass)).toBe(passType);
    });

    it('has the expected style and display name', () => {
        const pass = getPass(fileName);
        expect(pass.getPassStyle()).toBe(style);
        expect(getPKPassDisplayName(pass)).toBe(displayName);
    });

    it('selects the expected primary barcode', () => {
        const barcode = getPass(fileName).getPrimaryBarcode();
        expect(barcode?.format).toBe(barcodeFormat);
        expect(barcode ? getBarcodeFormat(barcode) : undefined).toBe(rendererFormat);
    });

    it('gets the expected transit icon', () => {
        expect(getTransitIcon(getPass(fileName).getPassStructure()?.transitType)).toBe(transitIcon);
    });

    it('collects the image files sitting at the archive root', () => {
        const { extractedPath, pass } = parsed.get(fileName);
        expect(Object.keys(pass.images).sort()).toEqual(imageKeys);
        for (const imagePath of Object.values(pass.images)) {
            expect(imagePath.startsWith(extractedPath)).toBe(true);
            expect(fs.existsSync(imagePath)).toBe(true);
        }
    });

    it('only yields known text alignments', () => {
        for (const field of allFields(getPass(fileName))) {
            expect(['left', 'right', 'center', 'natural']).toContain(getFieldTextAlignment(field));
        }
    });
});

describe('Eurowings.pkpass', () => {
    it('keeps the boarding pass fields in their sections', () => {
        const structure = getPass('Eurowings.pkpass').getPassStructure();
        expect(structure.headerFields.map((field) => field.value)).toEqual(['B61', '12D']);
        expect(structure.primaryFields.map((field) => field.value)).toEqual(['CGN', 'DBV']);
        expect(structure.secondaryFields).toHaveLength(4);
        expect(structure.auxiliaryFields).toHaveLength(4);
        expect(structure.backFields).toHaveLength(6);
        expect(structure.transitType).toBe(PKPassTransitType.Air);
    });

    it('resolves field labels in the requested language', () => {
        const pass = getPass('Eurowings.pkpass');
        const [, , , tariff] = pass.getPassStructure().secondaryFields;
        expect(Object.keys(pass.passData._allLocalizations).sort()).toEqual(['de', 'en']);
        expect(pass.getLocalizedFieldLabel(tariff, 'en')).toBe('Fare');
        expect(pass.getLocalizedFieldLabel(tariff, 'de')).toBe('Tarif');
        expect(pass.getLocalizedFieldLabel(tariff, 'de-DE')).toBe('Tarif');
    });

    it('falls back to english for a language the pass does not ship', () => {
        const pass = getPass('Eurowings.pkpass');
        const [, , , tariff] = pass.getPassStructure().secondaryFields;
        expect(pass.getLocalizedFieldLabel(tariff, 'fr')).toBe('Fare');
    });

    it('shows the field key when the label is an empty string', () => {
        const pass = getPass('Eurowings.pkpass');
        const [info] = pass.getPassStructure().backFields;
        expect(info.label).toBe('');
        expect(pass.getLocalizedFieldLabel(info, 'en')).toBe('info');
    });

    it('aligns fields left unless the pass says otherwise', () => {
        const structure = getPass('Eurowings.pkpass').getPassStructure();
        const [gate] = structure.headerFields;
        const [name] = structure.secondaryFields;
        expect(getFieldTextAlignment(gate)).toBe('left');
        expect(getFieldTextAlignment(gate, 'right')).toBe('right');
        expect(getFieldTextAlignment(name, 'right')).toBe('left');
    });

    it('is neither expired nor voided', () => {
        const pass = getPass('Eurowings.pkpass');
        expect(pass.isExpired()).toBe(false);
        expect(pass.isVoided()).toBe(false);
    });

    it('exports to espass with header, visible then hidden fields', () => {
        const pass = getPass('Eurowings.pkpass');
        const espass = convertPKPassDataToEspassJson(pass, 'en');
        expect(espass).toMatchObject({
            type: 'BOARDING',
            description: 'Eurowings Boarding Pass',
            accentColor: '#FFFFFF',
            labelColor: '#AA0061',
            creator: 'M2DAP2XTGE',
            transitType: PKPassTransitType.Air
        });
        expect(espass.barCode).toEqual({ format: 'AZTEC', message: pass.getPrimaryBarcode().message, alternative_text: undefined });
        expect(espass.fields).toHaveLength(18);
        expect(espass.fields.slice(0, 3)).toEqual([
            { label: 'Gate', value: 'B61', hide: false, header: true },
            { label: 'Seat', value: '12D', hide: false, header: true },
            { label: 'Cologne-Bonn', value: 'CGN', hide: false }
        ]);
        expect(espass.fields.filter((field: any) => field.hide)).toHaveLength(6);
    });

    it('loses the field keys of header fields on an espass round trip', () => {
        const reimported = convertEspassToPKPassData(convertPKPassDataToEspassJson(getPass('Eurowings.pkpass'), 'en'));
        // header fields are copied as raw espass objects instead of being mapped like the others
        expect(reimported.boardingPass.headerFields[0]).toEqual({ label: 'Gate', value: 'B61', hide: false, header: true });
        expect(reimported.boardingPass.primaryFields[0].key).toBe('field_0');
    });
});

describe('Eurowings(1).pkpass (barcode but no boardingPass structure)', () => {
    it('falls back to the generic style with no structure at all', () => {
        const pass = getPass('Eurowings(1).pkpass');
        expect(pass.getPassStyle()).toBe(PKPassStyle.Generic);
        expect(pass.getPassStructure()).toBeUndefined();
        expect(allFields(pass)).toEqual([]);
    });

    it('still exposes the legacy barcode', () => {
        const pass = getPass('Eurowings(1).pkpass');
        expect(pass.passData.barcodes).toBeUndefined();
        expect(pass.getAllBarcodes()).toEqual([pass.passData.barcode]);
    });

    it('exports to an espass without fields', () => {
        const espass = convertPKPassDataToEspassJson(getPass('Eurowings(1).pkpass'), 'en');
        expect(espass).toMatchObject({ type: 'GENERIC', fields: [], barCode: { format: 'AZTEC' } });
        expect(espass).not.toHaveProperty('transitType');
    });
});

describe('Eurowings(2).pkpass (boardingPass structure but no barcode)', () => {
    it('has no barcode of any kind', () => {
        const pass = getPass('Eurowings(2).pkpass');
        expect(pass.getPrimaryBarcode()).toBeUndefined();
        expect(pass.getAllBarcodes()).toEqual([]);
    });

    it('exports to an espass without a barCode key', () => {
        const espass = convertPKPassDataToEspassJson(getPass('Eurowings(2).pkpass'), 'en');
        expect(espass.type).toBe('BOARDING');
        expect(espass.fields).toHaveLength(18);
        expect(espass).not.toHaveProperty('barCode');
    });
});

describe('2YRvwooZ8wswnTZZhBbCeR.pkpass (PassKit sample)', () => {
    it('prefers the barcodes array and does not duplicate the legacy barcode', () => {
        const pass = getPass('2YRvwooZ8wswnTZZhBbCeR.pkpass');
        expect(pass.passData.barcode).toBeDefined();
        expect(pass.passData.barcodes).toHaveLength(1);
        expect(pass.getAllBarcodes()).toHaveLength(1);
        expect(pass.getPrimaryBarcode()).toBe(pass.passData.barcodes[0]);
    });

    it('reads regional lproj folders such as en_gb and en_us', () => {
        const pass = getPass('2YRvwooZ8wswnTZZhBbCeR.pkpass');
        expect(Object.keys(pass.passData._allLocalizations).sort()).toEqual(['en', 'en_gb', 'en_us']);
        const [origin] = pass.getPassStructure().primaryFields;
        expect(pass.getLocalizedFieldLabel(origin, 'en-GB')).toBe('Springfield');
        expect(pass.getLocalizedFieldLabel(origin, 'fr')).toBe('Springfield');
        expect(pass.formatFieldValue(origin, 'en')).toBe('SPR');
    });

    it('aligns fields as declared', () => {
        const structure = getPass('2YRvwooZ8wswnTZZhBbCeR.pkpass').getPassStructure();
        expect(getFieldTextAlignment(structure.headerFields[0])).toBe('right');
        expect(getFieldTextAlignment(structure.auxiliaryFields[0])).toBe('left');
        expect(getFieldTextAlignment(structure.auxiliaryFields[2])).toBe('right');
    });

    it('turns expired once the expiration date has passed', () => {
        const pass = getPass('2YRvwooZ8wswnTZZhBbCeR.pkpass');
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-23T00:00:00Z'));
        expect(pass.isExpired()).toBe(false);
        vi.setSystemTime(new Date('2026-11-25T00:00:00Z'));
        expect(pass.isExpired()).toBe(true);
    });

    it('keeps the literal backslash-n sequences of the strings file', () => {
        const pass = getPass('2YRvwooZ8wswnTZZhBbCeR.pkpass');
        const baggage = pass.getPassStructure().backFields.find((field) => field.key === 'meta.baggageMessageIos');
        // a .strings escape should become a real newline
        expect(pass.formatFieldValue(baggage, 'en')).toContain('\\n\\n');
    });

    it('displays an ignoresTimeZone time as written', () => {
        const pass = getPass('2YRvwooZ8wswnTZZhBbCeR.pkpass');
        const boarding = pass.getPassStructure().auxiliaryFields[1];
        expect(boarding.value).toBe('2026-11-22T06:55:00-07:00');
        expect(pass.formatFieldValue(boarding, 'en')).toBe('6:55 AM');
    });

    it('exports formatted times to espass rather than the original timestamps', () => {
        const espass = convertPKPassDataToEspassJson(getPass('2YRvwooZ8wswnTZZhBbCeR.pkpass'), 'en');
        expect(espass.fields).toContainEqual({ label: 'BOARDING', value: '6:55 AM', hide: false });
        expect(espass.validTimespans[0].to).toBe('2026-11-24T21:15:00Z');
        expect(espass.accentColor).toBe('rgb(10,7,51)');
    });
});

describe('DCBLN24-QLUKT-1-passbook.pkpass (pretix event ticket)', () => {
    it('reads the event ticket sections and hex colours', () => {
        const pass = getPass('DCBLN24-QLUKT-1-passbook.pkpass');
        const structure = pass.getPassStructure();
        expect(structure.headerFields[0].value).toBe('2024-07-03 08:00');
        expect(structure.primaryFields[0].value).toBe('droidcon Berlin 2024');
        expect(structure.backFields).toHaveLength(8);
        expect(pass.passData).toMatchObject({ backgroundColor: '#0014e6', foregroundColor: '#ffffff', labelColor: '#7de1c3' });
        expect(pass.getPrimaryBarcode()).toMatchObject({ message: 'ca4phaix1ahkahD2eiVi5iepahxa6rei', altText: 'ca4phaix1ahkahD2eiVi5iepahxa6rei' });
    });

    it('keeps the location even though its relevantText is empty', () => {
        expect(getPass('DCBLN24-QLUKT-1-passbook.pkpass').passData.locations).toEqual([expect.objectContaining({ latitude: 52.5020814, longitude: 13.2686609, relevantText: '' })]);
    });

    it('exports to an espass of type EVENT with a QR barcode and its alt text', () => {
        const espass = convertPKPassDataToEspassJson(getPass('DCBLN24-QLUKT-1-passbook.pkpass'), 'en');
        expect(espass).toMatchObject({ type: 'EVENT', accentColor: '#0014e6', barCode: { format: 'QR', alternative_text: 'ca4phaix1ahkahD2eiVi5iepahxa6rei' } });
        expect(espass.fields[0]).toEqual({ label: 'Admission time', value: '2024-07-03 08:00', hide: false, header: true });
        expect(espass.fields).toHaveLength(1 + 1 + 1 + 3 + 8);
    });
});

describe('Pass-Example-Generic.pkpass (Apple style sample)', () => {
    it('keeps rgb() colour strings verbatim', () => {
        const { passData } = getPass('Pass-Example-Generic.pkpass');
        expect(passData).toMatchObject({ backgroundColor: 'rgb(90, 90, 90)', foregroundColor: 'rgb(255, 255, 255)', labelColor: 'rgb(255, 255, 255)' });
    });

    it('prefers the logo text over the organization name', () => {
        const { passData } = getPass('Pass-Example-Generic.pkpass');
        expect(passData.organizationName).toBe('Passbook Example Company');
        expect(getPKPassDisplayName(getPass('Pass-Example-Generic.pkpass'))).toBe('Company Staff ID');
    });

    it('has no lproj folder and therefore no localizations', () => {
        expect(getPass('Pass-Example-Generic.pkpass').passData._allLocalizations).toBeUndefined();
    });

    it('formats a dateStyle-only field as a short date', () => {
        const pass = getPass('Pass-Example-Generic.pkpass');
        const [expiry] = pass.getPassStructure().auxiliaryFields;
        expect(expiry.dateStyle).toBe('PKDateStyleShort');
        expect(pass.formatFieldValue(expiry, 'en')).toBe('12/31/2013');
    });

    it('exports a non-hex accent colour and the formatted expiry date to espass', () => {
        const espass = convertPKPassDataToEspassJson(getPass('Pass-Example-Generic.pkpass'), 'en');
        expect(espass).toMatchObject({ type: 'GENERIC', id: '0000001', accentColor: 'rgb(90, 90, 90)', barCode: { format: 'QR', alternative_text: 'Staff ID 0000001' } });
        expect(espass.fields).toContainEqual({ label: 'Expiry Date', value: '12/31/2013', hide: false });
        expect(espass.locations).toEqual([{ lat: '51.50506', lon: '-0.0196', name: 'Company Offices' }]);
    });
});

describe('charge_coupon.espass', () => {
    it('is read from main.json and keeps its id as serial number', () => {
        const { passData } = getPass('charge_coupon.espass');
        expect(fs.existsSync(nodePath.join(parsed.get('charge_coupon.espass').extractedPath, 'pass.json'))).toBe(false);
        expect(passData).toMatchObject({ serialNumber: '8cade31f-2a86-4d26-b212-c42a8a918fb2', passTypeIdentifier: 'espass.8cade31f-2a86-4d26-b212-c42a8a918fb2', teamIdentifier: 'espass' });
    });

    it('converts the #AARRGGBB accent colour to #RRGGBB', () => {
        expect(getPass('charge_coupon.espass').passData.backgroundColor).toBe('#2DFF00');
    });

    it('is typed EVENT so it becomes an event ticket, not a coupon, and has no transit type', () => {
        const pass = getPass('charge_coupon.espass');
        expect(pass.passData.eventTicket).toBeDefined();
        expect(pass.passData.coupon).toBeUndefined();
        expect(pass.getPassStructure().transitType).toBeUndefined();
    });

    it('splits visible fields into primary and moves hidden ones to the back', () => {
        const structure = getPass('charge_coupon.espass').getPassStructure();
        expect(structure.primaryFields).toEqual([
            { key: 'field_0', label: 'max', value: '100kWh' },
            { key: 'field_1', label: 'source', value: 'solar' }
        ]);
        expect(structure.backFields).toEqual([{ key: 'field_2', label: undefined, value: 'do not use for bitcoin mining' }]);
        expect(structure.secondaryFields).toBeUndefined();
    });

    it('drops empty locations and validTimespans', () => {
        const { passData } = getPass('charge_coupon.espass');
        expect(passData.locations).toBeUndefined();
        expect(passData.expirationDate).toBeUndefined();
        expect(getPass('charge_coupon.espass').isExpired()).toBe(false);
    });

    it('ignores the camelCase alternativeText key', () => {
        // the fixture value is empty so nothing is lost here, but a non-empty one would be
        expect(getPass('charge_coupon.espass').getPrimaryBarcode().altText).toBeUndefined();
        expect(convertEspassToPKPassData({ id: 'x', type: 'EVENT', fields: [], barCode: { format: 'QR', message: 'm', alternativeText: 'shown under the code' } }).barcode.altText).toBeUndefined();
    });

    it('turns a label-less field into a field_N label on export', () => {
        const espass = convertPKPassDataToEspassJson(getPass('charge_coupon.espass'), 'en');
        expect(espass.fields[2]).toEqual({ label: 'field_2', value: 'do not use for bitcoin mining', hide: true });
        expect(espass.barCode).toEqual({ format: 'PDF417', message: '9021c15d-c1a1-4adb-bdd1-5633cbd08ebb', alternative_text: undefined });
    });
});

describe('movie.espass', () => {
    it('converts the accent colour and maps PDF_417 to PDF417', () => {
        const pass = getPass('movie.espass');
        expect(pass.passData.backgroundColor).toBe('#0300FF');
        expect(pass.getPrimaryBarcode().format).toBe(PKBarcodeFormat.PDF417);
    });

    it('fills primary, secondary then the hidden notice at the back', () => {
        const structure = getPass('movie.espass').getPassStructure();
        expect(structure.primaryFields.map((field) => field.label)).toEqual(['screen', 'row']);
        expect(structure.secondaryFields.map((field) => field.value)).toEqual(['20', 'student']);
        expect(structure.secondaryFields[1].label).toBeUndefined();
        expect(structure.backFields).toHaveLength(1);
        expect(structure.backFields[0].label).toBe('notice');
    });

    it('ignores calendarTimespan, so the pass has no relevant date', () => {
        expect(getPass('movie.espass').passData.relevantDate).toBeUndefined();
    });

    it('does not survive a round trip unchanged because the unlabeled field gets a label', () => {
        const pass = getPass('movie.espass');
        const reimported = convertEspassToPKPassData(convertPKPassDataToEspassJson(pass, 'en'));
        expect(reimported.eventTicket.secondaryFields[1].label).toBe('field_3');
        expect(reimported.eventTicket.primaryFields).toEqual(pass.passData.eventTicket.primaryFields);
        expect(reimported.barcode).toEqual(pass.passData.barcode);
    });
});

describe.each(['spaceport.espass', 'spaceship_boarding.espass'] as const)('%s', (fileName) => {
    it('is a boarding pass with a generic transit type and an Aztec barcode', () => {
        const pass = getPass(fileName);
        expect(pass.getPassStyle()).toBe(PKPassStyle.BoardingPass);
        expect(pass.getPassStructure().transitType).toBe(PKPassTransitType.Generic);
        expect(pass.getPrimaryBarcode()).toMatchObject({ format: PKBarcodeFormat.Aztec, messageEncoding: 'iso-8859-1' });
    });

    it('spreads five visible fields over primary and secondary, three hidden ones to the back', () => {
        const structure = getPass(fileName).getPassStructure();
        expect(structure.primaryFields.map((field) => field.label)).toEqual(['Name', 'Launch Vehicle']);
        expect(structure.secondaryFields.map((field) => field.label)).toEqual(['TICKET ID', 'Destination', 'Reporting Time']);
        expect(structure.auxiliaryFields).toBeUndefined();
        expect(structure.backFields.map((field) => field.key)).toEqual(['field_5', 'field_6', 'field_7']);
        expect(structure.backFields.map((field) => field.value)).toEqual(['Spectroscopy', 'Radiometry', 'Heliophysics']);
    });

    it('parses the location and takes the expiration from validTimespans', () => {
        const pass = getPass(fileName);
        expect(pass.passData.locations).toEqual([{ latitude: 5.17103, longitude: -52.68723, relevantText: 'CSG Spaceport, Kourou' }]);
        expect(pass.passData.expirationDate).toBe('2023-01-01T00:30:00.00+00:00');
        expect(pass.isExpired()).toBe(true);
    });

    it('survives an espass round trip', () => {
        const pass = getPass(fileName);
        const espass = convertPKPassDataToEspassJson(pass, 'en');
        expect(espass).toMatchObject({ type: 'BOARDING', app: 'cardwallet', transitType: PKPassTransitType.Generic, barCode: { format: 'AZTEC' } });
        expect(convertEspassToPKPassData(espass)).toEqual(pass.passData);
    });

    it('replaces the original validTimespans start with the import date on export', () => {
        const pass = getPass(fileName);
        const [timespan] = convertPKPassDataToEspassJson(pass, 'en').validTimespans;
        expect(timespan.from).toBe(new Date(pass.createdDate).toISOString());
        expect(timespan.to).toBe('2023-01-01T00:30:00.00+00:00');
    });
});

describe('spaceport.espass versus spaceship_boarding.espass', () => {
    it('only differ by identity, passenger, barcode and accent colour', () => {
        const spaceport = getPass('spaceport.espass').passData;
        const spaceship = getPass('spaceship_boarding.espass').passData;
        expect(spaceport.serialNumber).not.toBe(spaceship.serialNumber);
        expect(spaceport.backgroundColor).toBe('#FF0F00');
        expect(spaceship.backgroundColor).toBe('#000000');
        expect(spaceport.boardingPass.primaryFields[0].value).toBe('Carl Sagan');
        expect(spaceship.boardingPass.primaryFields[0].value).toBe('Issac Newton');
        expect(spaceport.barcode.altText).toBe('5847084a');
        expect(spaceship.barcode.altText).toBe('2456ad35');
    });
});

describe('Eurowings.pkpasses (bundle)', () => {
    it('contains several passes but is not recognised as a pass file', () => {
        const entries = execFileSync('unzip', ['-Z1', fixturePath('Eurowings.pkpasses')], { encoding: 'utf8' })
            .trim()
            .split('\n');
        expect(entries.filter((entry) => entry.endsWith('.pkpass'))).toHaveLength(2);
        expect(isPKPassFile(fixturePath('Eurowings.pkpasses'))).toBe(false);
    });

    it('cannot be parsed when forced and leaves nothing behind', async () => {
        const targetFolder = newTargetFolder();
        await expect(extractAndParsePKPassFile(fixturePath('Eurowings.pkpasses'), targetFolder)).rejects.toThrow('No JSON descriptor found in pass file');
        expect(fs.readdirSync(targetFolder.path)).toEqual([]);
    });
});

describe('missing file', () => {
    it('is rejected before anything is extracted', async () => {
        await expect(extractAndParsePKPassFile(fixturePath('nope.pkpass'), newTargetFolder())).rejects.toThrow('Pass file not found');
    });
});

describe('formatFieldValue of a date field', () => {
    const getFormatter = () => getPass('Pass-Example-Generic.pkpass');

    it('shows the date then the time when it has both styles', () => {
        expect(getFormatter().formatFieldValue({ key: 'doors', value: '2026-11-22T18:30:00Z', dateStyle: 'PKDateStyleMedium', timeStyle: 'PKDateStyleShort' }, 'en')).toBe('Nov 22, 2026 6:30 PM');
    });

    it('shows a time as written when the field ignores the time zone, whatever the offset', () => {
        const field: any = { key: 'doors', value: '2026-11-22T18:30:00+05:30', timeStyle: 'PKDateStyleShort', ignoresTimeZone: true };
        expect(getFormatter().formatFieldValue(field, 'en')).toBe('6:30 PM');
        expect(getFormatter().formatFieldValue({ ...field, value: '2026-11-22T18:30:00Z' }, 'en')).toBe('6:30 PM');
    });

    it('leaves a date only value of an ignoresTimeZone field alone', () => {
        expect(getFormatter().formatFieldValue({ key: 'day', value: '2026-11-22', dateStyle: 'PKDateStyleMedium', ignoresTimeZone: true }, 'en')).toBe('Nov 22, 2026');
    });

    it('is the plain value when both styles are none', () => {
        expect(getFormatter().formatFieldValue({ key: 'x', value: 'B61', dateStyle: 'PKDateStyleNone', timeStyle: 'PKDateStyleNone' }, 'en')).toBe('B61');
    });
});
