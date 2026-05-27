import { expect, test } from 'vitest';
import { filterNonTrashedDocuments, filterTrashedDocuments, isDocumentTrashed, markAsRestored, markAsTrashed } from './trashUtils';

// isDocumentTrashed

test('isDocumentTrashed returns false for a document without trashedDate', () => {
    expect(isDocumentTrashed({})).toBe(false);
});

test('isDocumentTrashed returns false when trashedDate is null', () => {
    expect(isDocumentTrashed({ trashedDate: null })).toBe(false);
});

test('isDocumentTrashed returns false when trashedDate is 0', () => {
    expect(isDocumentTrashed({ trashedDate: 0 })).toBe(false);
});

test('isDocumentTrashed returns true when trashedDate is a positive timestamp', () => {
    expect(isDocumentTrashed({ trashedDate: 1000000 })).toBe(true);
});

// filterNonTrashedDocuments

test('filterNonTrashedDocuments returns all documents when none are trashed', () => {
    const docs = [{ id: 'a' }, { id: 'b', trashedDate: null }, { id: 'c', trashedDate: 0 }];
    expect(filterNonTrashedDocuments(docs)).toEqual(docs);
});

test('filterNonTrashedDocuments excludes trashed documents', () => {
    const docs = [{ id: 'a' }, { id: 'b', trashedDate: 1000000 }, { id: 'c' }];
    expect(filterNonTrashedDocuments(docs)).toEqual([{ id: 'a' }, { id: 'c' }]);
});

test('filterNonTrashedDocuments returns empty array when all documents are trashed', () => {
    const docs = [{ id: 'a', trashedDate: 1000000 }, { id: 'b', trashedDate: 2000000 }];
    expect(filterNonTrashedDocuments(docs)).toEqual([]);
});

// filterTrashedDocuments

test('filterTrashedDocuments returns only trashed documents', () => {
    const docs = [{ id: 'a' }, { id: 'b', trashedDate: 1000000 }, { id: 'c', trashedDate: null }];
    expect(filterTrashedDocuments(docs)).toEqual([{ id: 'b', trashedDate: 1000000 }]);
});

test('filterTrashedDocuments returns empty array when no documents are trashed', () => {
    const docs = [{ id: 'a' }, { id: 'b', trashedDate: null }];
    expect(filterTrashedDocuments(docs)).toEqual([]);
});

// markAsTrashed

test('markAsTrashed sets trashedDate to the provided timestamp', () => {
    const doc = { id: 'a', trashedDate: null as number | null };
    const result = markAsTrashed(doc, 9999);
    expect(result.trashedDate).toBe(9999);
});

test('markAsTrashed does not mutate the original document', () => {
    const doc = { id: 'a', trashedDate: null as number | null };
    markAsTrashed(doc, 9999);
    expect(doc.trashedDate).toBeNull();
});

test('markAsTrashed uses current timestamp when none is provided', () => {
    const before = Date.now();
    const doc = { id: 'a' };
    const result = markAsTrashed(doc);
    const after = Date.now();
    expect(result.trashedDate).toBeGreaterThanOrEqual(before);
    expect(result.trashedDate).toBeLessThanOrEqual(after);
});

// markAsRestored

test('markAsRestored clears trashedDate', () => {
    const doc = { id: 'a', trashedDate: 1000000 };
    const result = markAsRestored(doc);
    expect(result.trashedDate).toBeNull();
});

test('markAsRestored does not mutate the original document', () => {
    const doc = { id: 'a', trashedDate: 1000000 };
    markAsRestored(doc);
    expect(doc.trashedDate).toBe(1000000);
});

test('a document trashed then restored is no longer trashed', () => {
    const doc = { id: 'a', trashedDate: null as number | null };
    const trashed = markAsTrashed(doc, 1000000);
    expect(isDocumentTrashed(trashed)).toBe(true);
    const restored = markAsRestored(trashed);
    expect(isDocumentTrashed(restored)).toBe(false);
});

// round-trip: filter consistency

test('filterNonTrashedDocuments and filterTrashedDocuments partition the full list', () => {
    const docs = [{ id: 'a' }, { id: 'b', trashedDate: 1000000 }, { id: 'c', trashedDate: null }, { id: 'd', trashedDate: 2000000 }];
    const active = filterNonTrashedDocuments(docs);
    const trashed = filterTrashedDocuments(docs);
    expect(active.length + trashed.length).toBe(docs.length);
    expect(active.every((d) => !isDocumentTrashed(d))).toBe(true);
    expect(trashed.every((d) => isDocumentTrashed(d))).toBe(true);
});
