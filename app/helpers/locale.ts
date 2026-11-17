import { getISO3Language } from '@akylas/nativescript-app-utils';
import { capitalize, l, lc, lcp, loadLocaleJSON, lp, lt, lu, overrideNativeLocale, pluralKey } from '@nativescript-community/l';
import { Application, ApplicationSettings, Device, File, Utils } from '@nativescript/core';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import UTC from 'dayjs/plugin/utc';
import { derived, get, writable } from 'svelte/store';
import { prefs } from '@shared/services/preferences';
import { showError } from '@shared/utils/showError';
import { createGlobalEventListener, globalObservable } from '@shared/utils/svelte/ui';
import { toTesseractLanguage } from '~/utils/iso3';
import { showAlertOptionSelect } from '~/utils/ui';

import { ALERT_OPTION_MAX_HEIGHT, DEFAULT_LOCALE, SETTINGS_LANGUAGE } from '~/utils/constants';
import { clearCurrentLocale, deviceLanguage, getActualLanguage, getCurrentLocale, getSavedLanguage } from '@shared/helpers/lang';
const supportedLanguages = SUPPORTED_LOCALES;
dayjs.extend(LocalizedFormat);
dayjs.extend(UTC);

export let lang;
export const $lang = writable(null);
let default24Clock = false;
if (__ANDROID__) {
    default24Clock = android.text.format.DateFormat.is24HourFormat(Utils.ad.getApplicationContext());
}
export let clock_24 = ApplicationSettings.getBoolean('clock_24', default24Clock) || default24Clock;
export const clock_24Store = writable(null);

export const onLanguageChanged = createGlobalEventListener(SETTINGS_LANGUAGE);
export const onTimeChanged = createGlobalEventListener('time');

async function loadDayjsLang(newLang: string) {
    const toLoad = newLang.replace('_', '-').toLowerCase();
    DEV_LOG && console.log('loadDayjsLang', newLang, toLoad);
    try {
        await import(`dayjs/locale/${toLoad}.js`);
        dayjs.locale(toLoad);
        DEV_LOG && console.log('dayjs loaded', toLoad, dayjs().format('llll'));
    } catch (err) {
        if (toLoad.indexOf('-') !== -1) {
            loadDayjsLang(toLoad.split('-')[0]);
        } else {
            DEV_LOG && console.error(lang, `~/dayjs/${toLoad}`, err, err.stack);
        }
    }
}

$lang.subscribe((newLang: string) => {
    lang = newLang;
    if (!lang) {
        return;
    }
    DEV_LOG && console.log('changed lang', lang, Device.region);
    loadDayjsLang(lang);
    try {
        // const localeData = require(`~/i18n/${lang}.json`);
        loadLocaleJSON(lang, `~/i18n/${lang}.json`, `~/i18n/${FALLBACK_LOCALE}.json`);
    } catch (err) {
        console.error(lang, `~/i18n/${lang}.json`, File.exists(`~/i18n/${lang}.json`), err, err.stack);
    }
    globalObservable.notify({ eventName: SETTINGS_LANGUAGE, data: lang });
});
function setLang(newLang) {
    let actualNewLang = getActualLanguage(newLang);
    DEV_LOG && console.log('setLang', newLang, actualNewLang);
    if (__IOS__) {
        overrideNativeLocale(actualNewLang);
        clearCurrentLocale();
    } else {
        // Application.android.foregroundActivity?.recreate();
        try {
            let appLocale: androidx.core.os.LocaleListCompat;
            if (newLang === 'auto') {
                appLocale = androidx.core.os.LocaleListCompat.getEmptyLocaleList();
            } else {
                const langs = [...new Set([actualNewLang, actualNewLang.split('_')[0]])].join(',');
                DEV_LOG && console.log('forLanguageTags', langs);
                appLocale = androidx.core.os.LocaleListCompat.forLanguageTags(langs);
                const strLangTags = appLocale
                    .toLanguageTags()
                    .split(',')
                    .filter((s) => s !== 'und');
                if (strLangTags.length !== appLocale.size()) {
                    appLocale = androidx.core.os.LocaleListCompat.forLanguageTags(strLangTags.join(','));
                }
            }
            DEV_LOG && console.log('appLocale', appLocale.toLanguageTags(), actualNewLang);
            // Call this on the main thread as it may require Activity.restart()
            androidx.appcompat.app.AppCompatDelegate['setApplicationLocales'](appLocale);
            clearCurrentLocale();
            // TODO: check why getEmptyLocaleList does not reset the locale to system
            actualNewLang = getActualLanguage(newLang);
        } catch (error) {
            console.error(error, error.stack);
        }
    }
    $lang.set(actualNewLang);
}

// const rtf = new Intl.RelativeTimeFormat('es');

export function formatDate(date: number | string | dayjs.Dayjs, formatStr: string = 'dddd LT') {
    if (date) {
        if (!date['format']) {
            date = dayjs(date);
        }

        if (clock_24 && formatStr.indexOf('LT') >= 0) {
            formatStr.replace(/LT/g, 'HH:mm');
        } else if (clock_24 && formatStr.indexOf('LTS') >= 0) {
            // formatStr = 'HH:mm:ss';
            formatStr.replace(/LTS/g, 'HH:mm:ss');
        }
        return capitalize((date as dayjs.Dayjs).format(formatStr));
    }
    return '';
}
export function formatTime(date: number | dayjs.Dayjs | string | Date, formatStr: string = 'LT') {
    if (date) {
        if (!date['format']) {
            date = dayjs(date);
        }
        if (clock_24 && formatStr === 'LT') {
            formatStr = 'HH:mm';
        } else if (clock_24 && formatStr === 'LTS') {
            formatStr = 'HH:mm:ss';
        }
        return (date as dayjs.Dayjs).format(formatStr);
    }
    return '';
}

prefs.on('key:language', () => {
    const newLanguage = getSavedLanguage();
    DEV_LOG && console.log('language changed', lang, getActualLanguage(newLanguage), newLanguage);
    // on pref change we are updating
    // if "auto" then getActualLanguage will return lang value and we still need to update
    if (newLanguage !== 'auto' && getActualLanguage(newLanguage) === lang) {
        return;
    }
    setLang(newLanguage);
});

prefs.on('key:clock_24', () => {
    const newValue = ApplicationSettings.getBoolean('clock_24', default24Clock);
    // DEV_LOG && console.log('clock_24 changed', newValue);
    clock_24 = newValue;
    clock_24Store.set(newValue);
    // we fake a language change to update the UI
    globalObservable.notify({ eventName: SETTINGS_LANGUAGE, data: lang, clock_24: true });
});

export function getLocaleDisplayName(locale?, canReturnEmpty = false) {
    if (__IOS__) {
        const localeStr = (getCurrentLocale(lang) as NSLocale).displayNameForKeyValue(NSLocaleIdentifier, locale || lang);
        return localeStr ? capitalize(localeStr) : canReturnEmpty ? undefined : locale || lang;
    } else {
        return capitalize(java.util.Locale.forLanguageTag(locale || lang).getDisplayName(getCurrentLocale(lang) as java.util.Locale));
    }
}
export function getCurrentISO3Language() {
    return toTesseractLanguage(getISO3Language(lang), lang);
}
async function internalSelectLanguage() {
    // try {
    const actions = SUPPORTED_LOCALES;
    const currentLanguage = getSavedLanguage();
    let selectedIndex = -1;
    const options = [{ name: lc('auto'), data: 'auto' }].concat(actions.map((k) => ({ name: getLocaleDisplayName(k.replace('_', '-')), data: k }))).map((d, index) => {
        const selected = currentLanguage === d.data;
        if (selected) {
            selectedIndex = index;
        }
        return {
            ...d,
            boxType: 'circle',
            type: 'checkbox',
            value: selected
        };
    });
    return showAlertOptionSelect(
        {
            height: Math.min(actions.length * 56, ALERT_OPTION_MAX_HEIGHT),
            rowHeight: 56,
            selectedIndex,
            options
        },
        {
            title: lc('select_language')
        }
    );
}
export async function selectLanguage() {
    try {
        const result = await internalSelectLanguage();
        if (result?.data) {
            DEV_LOG && console.log('selectLanguage', result.data);
            ApplicationSettings.setString(SETTINGS_LANGUAGE, result.data);
        }
    } catch (err) {
        showError(err);
    }
}

// TODO: on android 13 check for per app language, we dont need to store it
setLang(deviceLanguage);

if (__ANDROID__) {
    Application.android.on(Application.android.activityStartedEvent, () => {
        // on android after switching to auto we dont get the actual language
        // before an activity restart
        const lang = ApplicationSettings.getString(SETTINGS_LANGUAGE, DEFAULT_LOCALE);
        if (lang === 'auto') {
            const actualNewLang = getActualLanguage(lang);
            if (actualNewLang !== get($lang)) {
                $lang.set(actualNewLang);
            }
        }
    });
}

export { l, lc, lcp, lp, lt, lu, pluralKey };
export const sl = derived([$lang], () => l);
export const slc = derived([$lang], () => lc);
export const slt = derived([$lang], () => lt);
export const slu = derived([$lang], () => lu);
export const slp = derived([$lang], () => lp);
export const slcp = derived([$lang], () => lcp);
// export const sconvertDuration = derived([$lang], () => convertDuration);
export const scformatDate = derived($lang, () => formatDate);
export const scformatTime = derived([$lang, clock_24Store], () => formatTime);
export const sgetLocaleDisplayName = derived([$lang], () => getLocaleDisplayName);

export { cleanFilename, getFileNameForDocument, getFormatedDateForFilename } from '~/utils/utils';
