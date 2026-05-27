/**
 * Pure helper functions for the trash system.
 * These are free of NativeScript/DB dependencies and can be unit-tested directly.
 */

export interface TrashedEntry {
    trashedDate?: number | null;
}

/**
 * Returns true if the document has been moved to trash.
 */
export function isDocumentTrashed(doc: TrashedEntry): boolean {
    return doc.trashedDate != null && doc.trashedDate > 0;
}

/**
 * Filters out trashed documents, returning only those visible in the main list.
 */
export function filterNonTrashedDocuments<T extends TrashedEntry>(docs: T[]): T[] {
    return docs.filter((doc) => !isDocumentTrashed(doc));
}

/**
 * Returns only the trashed documents (visible in the trash view).
 */
export function filterTrashedDocuments<T extends TrashedEntry>(docs: T[]): T[] {
    return docs.filter((doc) => isDocumentTrashed(doc));
}

/**
 * Returns a copy of the entry with trashedDate set to the given timestamp (default: now).
 */
export function markAsTrashed<T extends TrashedEntry>(doc: T, trashedDate = Date.now()): T {
    return { ...doc, trashedDate };
}

/**
 * Returns a copy of the entry with trashedDate cleared (restored from trash).
 */
export function markAsRestored<T extends TrashedEntry>(doc: T): T {
    return { ...doc, trashedDate: null };
}
