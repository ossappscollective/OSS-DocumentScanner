import { describe, expect, it } from 'vitest';
import {
    DEFAULT_NAMING_TEMPLATES,
    addOrUpdateNamingTemplate,
    deleteNamingTemplate,
    formatNamingTemplate,
    getNamingTemplates,
    resetNamingTemplatesToDefault,
    resolveUniqueFilename
} from './namingTemplates';

describe('formatNamingTemplate', () => {
    // 2026-11-18T12:40:05.000Z in UTC
    const sampleTimestamp = Date.UTC(2026, 10, 18, 12, 40, 5);

    it('formats YY-MM-DD_SCAN_HH-mm without corrupting literal SCAN', () => {
        const result = formatNamingTemplate('YY-MM-DD_SCAN_HH-mm', { date: sampleTimestamp });
        expect(result).toBe('26-11-18_SCAN_12-40');
    });

    it('supports YY-MM-DD_SCAN_HH-mmFrei text directly as requested by user', () => {
        const result = formatNamingTemplate('YY-MM-DD_SCAN_HH-mmFrei text', { date: sampleTimestamp });
        expect(result).toBe('26-11-18_SCAN_12-40Frei_text');
    });

    it('supports dot-separated YYYY-MM-DD.Freetext.HH-mm with both unbraced Freetext/Freitext and literal text', () => {
        expect(
            formatNamingTemplate('YYYY-MM-DD.Freetext.HH-mm', {
                date: sampleTimestamp,
                customText: 'Rechnung'
            })
        ).toBe('2026-11-18.Rechnung.12-40');

        expect(
            formatNamingTemplate('YYYY-MM-DD.{freetext}.HH-mm', {
                date: sampleTimestamp,
                customText: 'Mietvertrag'
            })
        ).toBe('2026-11-18.Mietvertrag.12-40');

        expect(
            formatNamingTemplate('YYYY-MM-DD.DirectCustomName.HH-mm', {
                date: sampleTimestamp
            })
        ).toBe('2026-11-18.DirectCustomName.12-40');
    });

    it('collapses redundant dots when Freitext is empty in YYYY-MM-DD.Freitext.HH-mm', () => {
        expect(
            formatNamingTemplate('YYYY-MM-DD.Freitext.HH-mm', {
                date: sampleTimestamp,
                customText: ''
            })
        ).toBe('2026-11-18.12-40');
    });

    it('supports German date tokens (JJJJ-MM-TT) and compact tokens (YYYYMMDD_HHmmss)', () => {
        expect(formatNamingTemplate('JJJJ-MM-TT.Freitext.HH-mm', { date: sampleTimestamp, customText: 'Test' })).toBe('2026-11-18.Test.12-40');
        expect(formatNamingTemplate('YYYYMMDD_HHmmss', { date: sampleTimestamp })).toBe('20261118_124005');
    });

    it('replaces {freitext} placeholder and cleans spaces', () => {
        const result = formatNamingTemplate('YY-MM-DD_SCAN_HH-mm_{freitext}', {
            date: sampleTimestamp,
            customText: 'Mathe Klausur'
        });
        expect(result).toBe('26-11-18_SCAN_12-40_Mathe_Klausur');
    });

    it('collapses redundant underscores when {freitext} is empty', () => {
        const result = formatNamingTemplate('YYYY-MM-DD_LUH_{freitext}_HH-mm', {
            date: sampleTimestamp,
            customText: ''
        });
        expect(result).toBe('2026-11-18_LUH_12-40');
    });

    it('appends customText automatically when pattern has no {freitext} placeholder', () => {
        const result = formatNamingTemplate('YY-MM-DD_SCAN_HH-mm', {
            date: sampleTimestamp,
            customText: 'Laborbericht'
        });
        expect(result).toBe('26-11-18_SCAN_12-40_Laborbericht');
    });

    it('supports {ordner}, {seiten}, and {nr} placeholders', () => {
        const result = formatNamingTemplate('{ordner}_YYYY-MM-DD_{seiten}p_{nr}', {
            date: sampleTimestamp,
            folderName: 'Uni Hannover',
            pageCount: 4,
            counter: 7
        });
        expect(result).toBe('Uni_Hannover_2026-11-18_4p_007');
    });

    it('supports curly-brace date/time placeholders {YYYY}-{MM}-{DD}_{HH}-{mm}-{ss}', () => {
        const result = formatNamingTemplate('{YYYY}-{MM}-{DD}_{HH}-{mm}-{ss}', {
            date: sampleTimestamp
        });
        expect(result).toBe('2026-11-18_12-40-05');
    });
});

describe('resolveUniqueFilename', () => {
    it('returns the base name unchanged when not taken', () => {
        expect(resolveUniqueFilename('26-11-18_SCAN_12-40', ['other.pdf'], '.pdf')).toBe('26-11-18_SCAN_12-40');
    });

    it('appends _001, _002 when filename already exists on remote', () => {
        const existing = ['26-11-18_SCAN_12-40.pdf', '26-11-18_SCAN_12-40_001.pdf'];
        expect(resolveUniqueFilename('26-11-18_SCAN_12-40', existing, '.pdf')).toBe('26-11-18_SCAN_12-40_002');
    });
});

describe('NamingTemplates CRUD', () => {
    it('returns default templates initially', () => {
        const templates = getNamingTemplates();
        expect(templates.length).toBe(DEFAULT_NAMING_TEMPLATES.length);
        expect(templates[0].pattern).toBe('YYYY-MM-DD.{freetext}.HH-mm');
    });

    it('adds, updates, and deletes custom naming templates', () => {
        const afterAdd = addOrUpdateNamingTemplate({
            id: 'custom_uni',
            name: 'LUH Vorlesung',
            pattern: 'YY-MM-DD_LUH_HH-mm_{freitext}'
        });
        expect(afterAdd.some((t) => t.id === 'custom_uni')).toBe(true);

        const afterUpdate = addOrUpdateNamingTemplate({
            id: 'custom_uni',
            name: 'LUH Seminar',
            pattern: 'YYYY-MM-DD_Seminar_{freitext}'
        });
        expect(afterUpdate.find((t) => t.id === 'custom_uni')?.name).toBe('LUH Seminar');

        const afterDelete = deleteNamingTemplate('custom_uni');
        expect(afterDelete.some((t) => t.id === 'custom_uni')).toBe(false);

        resetNamingTemplatesToDefault();
    });
});
