/** the tesseract model of the ISO3 language of the platform and the language tag it comes from */
export function toTesseractLanguage(iso3: string, languageTag = '') {
    switch (iso3) {
        case 'nob':
            return 'nor';
        case 'zho': {
            const traditional = /hant/i.test(languageTag) || (!/hans/i.test(languageTag) && /[-_](tw|hk|mo)/i.test(languageTag));
            return traditional ? 'chi_tra' : 'chi_sim';
        }
        default:
            return iso3;
    }
}
