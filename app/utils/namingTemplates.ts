import { ApplicationSettings } from '@nativescript/core';
import dayjs from 'dayjs';
import { FILENAME_DATE_FORMAT } from '~/utils/constants';

export const SETTINGS_NAMING_TEMPLATES = 'naming_templates';
export const SETTINGS_ACTIVE_NAMING_TEMPLATE_ID = 'active_naming_template_id';
export const SETTINGS_ACTIVE_NAMING_PATTERN = 'active_naming_pattern';
export const SETTINGS_DEFAULT_CUSTOM_TEXT = 'default_naming_custom_text';

export interface NamingTemplate {
    id: string;
    name: string;
    pattern: string;
    defaultCustomText?: string;
    targetRemoteFolder?: string;
}

export interface NamingPlaceholderInfo {
    label: string;
    token: string;
    description: string;
}

export const NAMING_PLACEHOLDERS: NamingPlaceholderInfo[] = [
    { label: 'YYYY-MM-DD', token: 'YYYY-MM-DD', description: 'Datum lang (z. B. 2026-11-24)' },
    { label: 'YY-MM-DD', token: 'YY-MM-DD', description: 'Datum kurz (z. B. 26-11-24)' },
    { label: 'DD.MM.YYYY', token: 'DD.MM.YYYY', description: 'Datum DE (z. B. 24.11.2026)' },
    { label: 'HH-mm', token: 'HH-mm', description: 'Uhrzeit (z. B. 12-45)' },
    { label: 'HH-mm-ss', token: 'HH-mm-ss', description: 'Uhrzeit mit Sekunden (z. B. 12-45-30)' },
    { label: '{freitext}', token: '{freitext}', description: 'Eigener Freitext / Notiz' },
    { label: 'SCAN', token: 'SCAN', description: 'Fester Text SCAN' },
    { label: '.', token: '.', description: 'Punkt-Trennzeichen' },
    { label: '_', token: '_', description: 'Unterstrich-Trennzeichen' },
    { label: '-', token: '-', description: 'Bindestrich-Trennzeichen' },
    { label: '{ordner}', token: '{ordner}', description: 'Name des Dokumentenordners' },
    { label: '{seiten}', token: '{seiten}', description: 'Anzahl der Seiten' },
    { label: '{nr}', token: '{nr}', description: 'Fortlaufende Nummer (001, 002, ...)' }
];

export const DEFAULT_NAMING_TEMPLATES: NamingTemplate[] = [
    {
        id: 'date_dot_custom_dot_time',
        name: 'YYYY-MM-DD.Freitext.HH-mm',
        pattern: 'YYYY-MM-DD.{freitext}.HH-mm'
    },
    {
        id: 'date_under_custom_under_time',
        name: 'YYYY-MM-DD_Freitext_HH-mm',
        pattern: 'YYYY-MM-DD_{freitext}_HH-mm'
    },
    {
        id: 'custom_first_ts',
        name: 'Freitext_YYYY-MM-DD_HH-mm',
        pattern: '{freitext}_YYYY-MM-DD_HH-mm'
    },
    {
        id: 'custom_dot_date',
        name: 'Freitext.YYYY-MM-DD',
        pattern: '{freitext}.YYYY-MM-DD'
    },
    {
        id: 'date_only_custom',
        name: 'YYYY-MM-DD_Freitext',
        pattern: 'YYYY-MM-DD_{freitext}'
    },
    {
        id: 'de_date_custom',
        name: 'DD.MM.YYYY_Freitext_HH-mm',
        pattern: 'DD.MM.YYYY_{freitext}_HH-mm'
    },
    {
        id: 'scan_short_ts_custom',
        name: 'YY-MM-DD_SCAN_HH-mm_Freitext',
        pattern: 'YY-MM-DD_SCAN_HH-mm_{freitext}'
    },
    {
        id: 'scan_short_ts',
        name: 'YY-MM-DD_SCAN_HH-mm',
        pattern: 'YY-MM-DD_SCAN_HH-mm'
    },
    {
        id: 'compact_iso_custom',
        name: 'YYYYMMDD_HHmmss_Freitext',
        pattern: 'YYYYMMDD_HHmmss_{freitext}'
    },
    {
        id: 'folder_date_custom',
        name: 'Ordner_YYYY-MM-DD_Freitext',
        pattern: '{ordner}_YYYY-MM-DD_{freitext}'
    },
    {
        id: 'custom_only',
        name: 'Nur Freitext',
        pattern: '{freitext}'
    }
];

export interface FormatNamingOptions {
    date?: number | Date;
    customText?: string;
    folderName?: string;
    pageCount?: number;
    counter?: number;
    documentName?: string;
    clean?: boolean;
    appendCustomTextIfMissingPlaceholder?: boolean;
}

export function cleanTemplateFilename(str: string, wsRep: (w: string) => string = () => '_'): string {
    return str.replace(/[\x00-\x1F\x7F"*/<>?\\:|]+/g, wsRep).replace(/\s/g, wsRep);
}

const PURE_DAYJS_LOCALIZED_FORMATS = new Set(['L', 'LL', 'LLL', 'LLLL', 'l', 'll', 'lll', 'llll', 'LT', 'LTS', 'L LTS', 'L LT', 'll LT', 'll LTS']);

export function hasTemplateTokensOrPlaceholders(pattern?: string): boolean {
    if (!pattern) {
        return false;
    }
    if (/\{[^}]+\}/.test(pattern)) {
        return true;
    }
    if (/(?:^|[^A-Za-zäöüßÄÖÜ])(freitext|freitxt|frei[-_ ]?text|customtext)(?=$|[^A-Za-zäöüßÄÖÜ])/i.test(pattern)) {
        return true;
    }
    return /(?:^|[^A-Z])(YYYYMMDD|YYMMDD|YYYY|YY|JJJJ|JJ|MM|DD|TT|HHmmss|HHmm|HH|SSS)(?=$|[^A-Z])|(?:^|[^a-z])(mm|ss)(?=$|[^a-z])/.test(pattern);
}

export function getDefaultCustomText(): string {
    try {
        return ApplicationSettings.getString(SETTINGS_DEFAULT_CUSTOM_TEXT, '') || '';
    } catch (_e) {
        return '';
    }
}

export function setDefaultCustomText(text: string): void {
    try {
        ApplicationSettings.setString(SETTINGS_DEFAULT_CUSTOM_TEXT, (text || '').trim());
    } catch (_e) {
        // ignore in test env if ApplicationSettings is mocked readonly
    }
}

export function getActiveNamingPattern(fallback = 'YYYY-MM-DD.{freitext}.HH-mm'): string {
    try {
        return ApplicationSettings.getString(SETTINGS_ACTIVE_NAMING_PATTERN, '') || fallback;
    } catch (_e) {
        return fallback;
    }
}

export function setActiveNamingPattern(pattern: string): void {
    try {
        if (pattern && pattern.trim()) {
            ApplicationSettings.setString(SETTINGS_ACTIVE_NAMING_PATTERN, pattern.trim());
        }
    } catch (_e) {
        // ignore
    }
}

/**
 * Formats a naming pattern supporting:
 * - Curly-brace placeholders: {YYYY}, {YY}, {MM}, {DD}, {HH}, {mm}, {ss}, {SSS},
 *   {timestamp}, {iso}, {date}, {time}, {freitext}/{text}/{custom}, {ordner}/{folder},
 *   {seiten}/{pages}, {nr}/{counter}, {name}
 * - Direct date/time tokens mixed with arbitrary literal text (e.g. "YY-MM-DD_SCAN_HH-mmFrei text")
 *   without corrupting literal words like "SCAN" or "Frei text".
 * - Standard dayjs localized formats (e.g. "L LTS", "lll").
 */
export function formatNamingTemplate(pattern?: string, options: FormatNamingOptions = {}): string {
    const {
        appendCustomTextIfMissingPlaceholder = true,
        clean = true,
        counter,
        customText = '',
        date,
        documentName = '',
        folderName = '',
        pageCount
    } = options;

    const rawPattern = (pattern ?? FILENAME_DATE_FORMAT).trim();
    const d = dayjs(date);
    const trimmedCustomText = customText?.trim() || '';

    if (!rawPattern || rawPattern === 'timestamp') {
        const base = String(d.valueOf());
        const combined = trimmedCustomText && appendCustomTextIfMissingPlaceholder ? `${base}_${trimmedCustomText}` : base;
        return clean ? cleanTemplateFilename(combined) : combined;
    }

    if (rawPattern === 'iso') {
        const base = d.toISOString();
        const combined = trimmedCustomText && appendCustomTextIfMissingPlaceholder ? `${base}_${trimmedCustomText}` : base;
        return clean ? cleanTemplateFilename(combined) : combined;
    }

    if (PURE_DAYJS_LOCALIZED_FORMATS.has(rawPattern) && !hasTemplateTokensOrPlaceholders(rawPattern)) {
        const base = d.format(rawPattern);
        const combined = trimmedCustomText && appendCustomTextIfMissingPlaceholder ? `${base}_${trimmedCustomText}` : base;
        return clean ? cleanTemplateFilename(combined) : combined;
    }

    const tokenValues: Record<string, string> = {
        YYYYMMDD: d.format('YYYYMMDD'),
        YYMMDD: d.format('YYMMDD'),
        HHmmss: d.format('HHmmss'),
        HHmm: d.format('HHmm'),
        YYYY: d.format('YYYY'),
        YY: d.format('YY'),
        JJJJ: d.format('YYYY'),
        JJ: d.format('YY'),
        MM: d.format('MM'),
        DD: d.format('DD'),
        TT: d.format('DD'),
        HH: d.format('HH'),
        mm: d.format('mm'),
        ss: d.format('ss'),
        SSS: d.format('SSS'),
        date: d.format('YYYY-MM-DD'),
        datum: d.format('YYYY-MM-DD'),
        time: d.format('HH-mm'),
        zeit: d.format('HH-mm'),
        timestamp: String(d.valueOf()),
        iso: d.toISOString(),
        freitext: trimmedCustomText,
        freitxt: trimmedCustomText,
        'frei-text': trimmedCustomText,
        frei_text: trimmedCustomText,
        'frei text': trimmedCustomText,
        customtext: trimmedCustomText,
        text: trimmedCustomText,
        custom: trimmedCustomText,
        notiz: trimmedCustomText,
        note: trimmedCustomText,
        titel: trimmedCustomText,
        title: trimmedCustomText,
        ordner: folderName?.trim() || '',
        folder: folderName?.trim() || '',
        seiten: pageCount !== undefined && pageCount !== null ? String(pageCount) : '',
        pages: pageCount !== undefined && pageCount !== null ? String(pageCount) : '',
        nr: counter !== undefined && counter !== null ? String(counter).padStart(3, '0') : '',
        counter: counter !== undefined && counter !== null ? String(counter).padStart(3, '0') : '',
        name: documentName?.trim() || ''
    };

    const CUSTOM_TEXT_KEYS = new Set(['freitext', 'freitxt', 'frei-text', 'frei_text', 'frei text', 'customtext', 'text', 'custom', 'notiz', 'note', 'titel', 'title']);
    let usedCustomPlaceholder = false;
    let hadEmptyPlaceholder = false;

    // Protect explicit [...] escaped blocks and {...} placeholders using temporary markers
    const segments: string[] = [];
    const SaveSegment = (val: string): string => {
        const idx = segments.length;
        segments.push(val);
        return `\x01SEG_${idx}_\x01`;
    };

    // 1. Handle [escaped] literal blocks (dayjs syntax compatibility)
    let working = rawPattern.replace(/\[([^\]]*)\]/g, (_match, inner) => SaveSegment(inner));

    // 2. Handle {placeholder} blocks
    working = working.replace(/\{([^}]+)\}/g, (_match, rawKey) => {
        const key = rawKey.trim();
        const lowerKey = key.toLowerCase();
        if (CUSTOM_TEXT_KEYS.has(lowerKey)) {
            usedCustomPlaceholder = true;
        }
        if (key in tokenValues) {
            const val = tokenValues[key];
            if (!val) hadEmptyPlaceholder = true;
            return SaveSegment(val);
        }
        if (lowerKey in tokenValues) {
            const val = tokenValues[lowerKey];
            if (!val) hadEmptyPlaceholder = true;
            return SaveSegment(val);
        }
        // Fallback: if someone wrote a custom dayjs format inside {fmt}, e.g. {YYYY_MM_DD}
        if (/^[YMDHmsS\-_/:. ]+$/.test(key)) {
            return SaveSegment(d.format(key));
        }
        // Otherwise treat unknown {SomeText} as literal user text in braces
        return SaveSegment(key);
    });

    // 2b. Support unbraced "Freitext" / "Freitxt" / "Frei-Text" / "CustomText" token (e.g. "YYYY-MM-DD.Freitext.HH-mm")
    working = working.replace(/(^|[^A-Za-zäöüßÄÖÜ\x01])(freitext|freitxt|frei[-_ ]?text|customtext)(?=$|[^A-Za-zäöüßÄÖÜ\x01])/gi, (_m, prefix) => {
        usedCustomPlaceholder = true;
        if (!trimmedCustomText) {
            hadEmptyPlaceholder = true;
        }
        return prefix + SaveSegment(trimmedCustomText);
    });

    // 3. Replace unbraced date/time tokens (YYYYMMDD, YYMMDD, HHmmss, HHmm, YYYY, YY, JJJJ, JJ, MM, DD, TT, HH, SSS, mm, ss)
    const upperTokenRe = /(^|[^A-Z\x01])(YYYYMMDD|YYMMDD|HHmmss|HHmm|YYYY|YY|JJJJ|JJ|MM|DD|TT|HH|SSS)(?=$|[^A-Z\x01])/g;
    working = working.replace(upperTokenRe, (_m, prefix, token) => prefix + SaveSegment(tokenValues[token]));
    working = working.replace(upperTokenRe, (_m, prefix, token) => prefix + SaveSegment(tokenValues[token]));

    // Lowercase tokens (mm, ss): not preceded or followed by another letter
    const lowerTokenRe = /(^|[^A-Za-zäöüßÄÖÜ\x01])(mm|ss)(?=$|[^A-Za-zäöüßÄÖÜ\x01])/g;
    working = working.replace(lowerTokenRe, (_m, prefix, token) => prefix + SaveSegment(tokenValues[token]));
    working = working.replace(lowerTokenRe, (_m, prefix, token) => prefix + SaveSegment(tokenValues[token]));

    // Restore segments
    let result = working.replace(/\x01SEG_(\d+)_\x01/g, (_m, idxStr) => segments[Number(idxStr)] ?? '');

    // 4. Append customText if provided and no {freitext}/Freitext placeholder was in the pattern
    if (trimmedCustomText && !usedCustomPlaceholder && appendCustomTextIfMissingPlaceholder) {
        const sep = result.includes('.') && !result.includes('_') ? '.' : '_';
        result = result ? `${result}${sep}${trimmedCustomText}` : trimmedCustomText;
    }

    // 5. If any placeholder resolved to empty string, clean up dangling duplicate separators (e.g. ".." -> ".", "__" -> "_", "._" -> ".")
    if (hadEmptyPlaceholder) {
        result = result
            .replace(/\.{2,}/g, '.')
            .replace(/_{2,}/g, '_')
            .replace(/-{2,}/g, '-')
            .replace(/([._-])[._-]+/g, '$1')
            .replace(/^[._-]+|[._-]+$/g, '');
    }

    return clean ? cleanTemplateFilename(result) : result;
}

/**
 * Ensures that if multiple documents produce the same filename on a remote target
 * (e.g. two scans within the same minute using YY-MM-DD_SCAN_HH-mm), a numeric suffix
 * (_001, _002, ...) is appended so existing files of other documents are never overwritten.
 */
export function resolveUniqueFilename(baseName: string, takenNames: Iterable<string>, ext: string = '.pdf'): string {
    const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
    const takenSet = new Set(Array.from(takenNames, (n) => n.toLowerCase()));
    const candidateFull = (name: string) => (name.toLowerCase().endsWith(normalizedExt.toLowerCase()) ? name.toLowerCase() : (name + normalizedExt).toLowerCase());
    const stripExt = (name: string) => (name.toLowerCase().endsWith(normalizedExt.toLowerCase()) ? name.slice(0, -normalizedExt.length) : name);

    const cleanBase = stripExt(baseName);
    if (!takenSet.has(candidateFull(cleanBase))) {
        return cleanBase;
    }

    let counter = 1;
    while (counter < 10000) {
        const suffixed = `${cleanBase}_${String(counter).padStart(3, '0')}`;
        if (!takenSet.has(candidateFull(suffixed))) {
            return suffixed;
        }
        counter++;
    }
    return `${cleanBase}_${Date.now()}`;
}

export function getNamingTemplates(): NamingTemplate[] {
    try {
        const raw = ApplicationSettings.getString(SETTINGS_NAMING_TEMPLATES, '');
        if (!raw) {
            return [...DEFAULT_NAMING_TEMPLATES];
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const validSaved = parsed.filter((t) => t && typeof t.id === 'string' && typeof t.pattern === 'string');
            const existingIds = new Set(validSaved.map((t) => t.id));
            const existingPatterns = new Set(validSaved.map((t) => t.pattern));
            const missingDefaults = DEFAULT_NAMING_TEMPLATES.filter((d) => !existingIds.has(d.id) && !existingPatterns.has(d.pattern));
            return [...missingDefaults, ...validSaved];
        }
    } catch (_e) {
        // ignore corrupted JSON and return defaults
    }
    return [...DEFAULT_NAMING_TEMPLATES];
}

export function saveNamingTemplates(templates: NamingTemplate[]): void {
    ApplicationSettings.setString(SETTINGS_NAMING_TEMPLATES, JSON.stringify(templates));
}

export function addOrUpdateNamingTemplate(template: Omit<NamingTemplate, 'id'> & { id?: string }): NamingTemplate[] {
    const current = getNamingTemplates();
    const id = template.id || `tpl_${Date.now()}`;
    const entry: NamingTemplate = {
        id,
        name: template.name?.trim() || template.pattern.trim(),
        pattern: template.pattern.trim(),
        ...(template.defaultCustomText ? { defaultCustomText: template.defaultCustomText } : {}),
        ...(template.targetRemoteFolder ? { targetRemoteFolder: template.targetRemoteFolder } : {})
    };
    const existingIdx = current.findIndex((t) => t.id === id);
    if (existingIdx >= 0) {
        current[existingIdx] = entry;
    } else {
        current.push(entry);
    }
    saveNamingTemplates(current);
    return current;
}

export function deleteNamingTemplate(id: string): NamingTemplate[] {
    const current = getNamingTemplates().filter((t) => t.id !== id);
    const finalTemplates = current.length > 0 ? current : [...DEFAULT_NAMING_TEMPLATES];
    saveNamingTemplates(finalTemplates);
    return finalTemplates;
}

export function resetNamingTemplatesToDefault(): NamingTemplate[] {
    const defaults = [...DEFAULT_NAMING_TEMPLATES];
    saveNamingTemplates(defaults);
    return defaults;
}
