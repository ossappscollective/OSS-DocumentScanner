import { ApplicationSettings } from '@nativescript/core';
import type { OCRDocument } from '~/models/OCRDocument';
import { DOCUMENT_NAME_FORMAT, FILENAME_DATE_FORMAT, FILENAME_USE_DOCUMENT_NAME, SETTINGS_DOCUMENT_NAME_FORMAT, SETTINGS_FILE_NAME_FORMAT, SETTINGS_FILE_NAME_USE_DOCUMENT_NAME } from '~/utils/constants';
import { FormatNamingOptions, formatNamingTemplate, getDefaultCustomText, hasTemplateTokensOrPlaceholders } from '~/utils/namingTemplates';
export { restartApp } from '@akylas/nativescript-app-utils';
export * from '~/utils/namingTemplates';

// type Many<T> = T | T[];
export function pick<T extends object, U extends keyof T>(object: T, ...props: U[]): Pick<T, U> {
    return props.reduce((o, k) => ((o[k] = object[k]), o), {} as any);
}
export function omit<T extends object, U extends keyof T>(object: T, ...props: U[]): Omit<T, U> {
    return Object.keys(object)
        .filter((key) => (props as string[]).indexOf(key) < 0)
        .reduce((newObj, key) => Object.assign(newObj, { [key]: object[key] }), {} as any);
}

export function cleanFilename(str, wsRep = (w) => '_') {
    return str.replace(/[\x00-\x1F\x7F"*/<>?\\:|]+/g, wsRep).replace(/\s/g, wsRep);
}
export function getFormatedDateForFilename(
    value?: number,
    dateFormat = ApplicationSettings.getString(SETTINGS_FILE_NAME_FORMAT, FILENAME_DATE_FORMAT),
    clean = true,
    extraOptions?: Omit<FormatNamingOptions, 'date' | 'clean'>
) {
    return formatNamingTemplate(dateFormat, {
        date: value,
        clean,
        customText: extraOptions?.customText ?? getDefaultCustomText(),
        ...extraOptions
    });
}

export function getFileNameForDocument(
    document?: OCRDocument,
    useDocumentName = ApplicationSettings.getBoolean(SETTINGS_FILE_NAME_USE_DOCUMENT_NAME, FILENAME_USE_DOCUMENT_NAME),
    date?: number,
    dateFormat?: string,
    extraOptions?: Omit<FormatNamingOptions, 'date' | 'clean'>
) {
    const docDate = date ?? document?.createdDate;
    const savedCustomText = typeof document?.extra?.customText === 'string' ? document.extra.customText.trim() : '';
    const defaultCustomText = getDefaultCustomText();
    const customRenamed = document?.extra?.customRenamed === true;
    const effectiveDateFormat = dateFormat || ApplicationSettings.getString(SETTINGS_FILE_NAME_FORMAT, FILENAME_DATE_FORMAT);
    const hasCustomExportTemplate = !!(effectiveDateFormat && effectiveDateFormat !== 'timestamp' && effectiveDateFormat !== 'L LTS');
    const customText = extraOptions?.customText ?? (savedCustomText || defaultCustomText);
    const pageCount = extraOptions?.pageCount ?? document?.pages?.length;

    // If the user configured a custom naming template or default freetext in Settings/Sync Settings
    // and this document wasn't manually renamed per-document, format using the template + freetext!
    if (useDocumentName === true && document?.name && (customRenamed || (!hasCustomExportTemplate && !defaultCustomText))) {
        if (hasTemplateTokensOrPlaceholders(document.name)) {
            return formatNamingTemplate(document.name, {
                date: docDate,
                clean: true,
                customText,
                pageCount,
                documentName: document.name,
                appendCustomTextIfMissingPlaceholder: false,
                ...extraOptions
            });
        }
        return cleanFilename(document.name);
    }
    const formatToUse =
        hasCustomExportTemplate
            ? effectiveDateFormat
            : ApplicationSettings.getString(SETTINGS_DOCUMENT_NAME_FORMAT, DOCUMENT_NAME_FORMAT) !== 'L LTS'
              ? ApplicationSettings.getString(SETTINGS_DOCUMENT_NAME_FORMAT, DOCUMENT_NAME_FORMAT)
              : effectiveDateFormat;
    return getFormatedDateForFilename(docDate, formatToUse, true, {
        customText,
        pageCount,
        documentName: document?.name,
        ...extraOptions
    });
}

export function getRealPath(src: string) {
    return src;
}

type SortOrder = 'ASC' | 'DESC';
export function sortByKey<T = any>(data: T[], sort: string): T[] {
    const [rawKey, rawOrder] = sort.trim().split(/\s+/);

    const key = rawKey as keyof T;
    const order: SortOrder = (rawOrder?.toUpperCase() as SortOrder) || 'ASC';
    const direction = order === 'DESC' ? -1 : 1;

    return [...data].sort((a, b) => {
        const aValue = a[key];
        const bValue = b[key];

        if (aValue == null) return -1 * direction;
        if (bValue == null) return 1 * direction;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return (aValue - bValue) * direction;
        }

        // Fallback to string comparison
        return String(aValue).localeCompare(String(bValue)) * direction;
    });
}

export function ellipsize(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;

    if (maxLength <= 1) return '…';

    return str.slice(0, maxLength - 1) + '…';
}
