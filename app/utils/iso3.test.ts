import { describe, expect, it } from 'vitest';
import { toTesseractLanguage } from './iso3';

describe('toTesseractLanguage', () => {
    it('keeps the languages tesseract names like the platform', () => {
        expect(toTesseractLanguage('eng', 'en')).toBe('eng');
        expect(toTesseractLanguage('fra', 'fr')).toBe('fra');
    });
    it('maps the bokmal to the norwegian model', () => {
        expect(toTesseractLanguage('nob', 'nb_NO')).toBe('nor');
        expect(toTesseractLanguage('nob', 'nb')).toBe('nor');
    });
    it('maps chinese to the simplified model by default', () => {
        expect(toTesseractLanguage('zho', 'zh_CN')).toBe('chi_sim');
        expect(toTesseractLanguage('zho', 'zh')).toBe('chi_sim');
        expect(toTesseractLanguage('zho', 'zh-Hans-CN')).toBe('chi_sim');
    });
    it('maps chinese to the traditional model by script or region', () => {
        expect(toTesseractLanguage('zho', 'zh_Hant')).toBe('chi_tra');
        expect(toTesseractLanguage('zho', 'zh-Hant-TW')).toBe('chi_tra');
        expect(toTesseractLanguage('zho', 'zh-TW')).toBe('chi_tra');
        expect(toTesseractLanguage('zho', 'zh-HK')).toBe('chi_tra');
    });
    it('keeps a simplified script whatever the region', () => {
        expect(toTesseractLanguage('zho', 'zh-Hans-HK')).toBe('chi_sim');
    });
});
