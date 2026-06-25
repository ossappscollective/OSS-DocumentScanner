import { expect, test } from 'vitest';
import { mergeDeletedDocumentTombstones } from './deletedDocuments';

// The function returns a tuple: [tombstoneArray, hasChanged].

test('creates tombstones for deleted document ids', () => {
    const [result] = mergeDeletedDocumentTombstones([], ['doc-a'], 1234);
    expect(result).toEqual([{ id: 'doc-a', deletedDate: 1234 }]);
});

test('de-duplicates deleted document ids', () => {
    const [result] = mergeDeletedDocumentTombstones([], ['doc-a', 'doc-a'], 1234);
    expect(result).toEqual([{ id: 'doc-a', deletedDate: 1234 }]);
});

test('preserves the newest deleted date for an existing tombstone', () => {
    const [keepOld] = mergeDeletedDocumentTombstones([{ id: 'doc-a', deletedDate: 2000 }], ['doc-a'], 1000);
    expect(keepOld).toEqual([{ id: 'doc-a', deletedDate: 2000 }]);

    const [takeNew] = mergeDeletedDocumentTombstones([{ id: 'doc-a', deletedDate: 1000 }], ['doc-a'], 2000);
    expect(takeNew).toEqual([{ id: 'doc-a', deletedDate: 2000 }]);
});

test('reports hasChanged = true when new entries are added', () => {
    const [, hasChanged] = mergeDeletedDocumentTombstones([], ['doc-b'], 1000);
    expect(hasChanged).toBe(true);
});

test('merges tombstones from multiple ids without duplicates', () => {
    const [result] = mergeDeletedDocumentTombstones([], ['doc-a', 'doc-b', 'doc-a'], 500);
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(['doc-a', 'doc-b']);
});

test('ignores entries with missing or empty ids', () => {
    const [result] = mergeDeletedDocumentTombstones([], [null as any, '', 'doc-c'], 100);
    expect(result).toEqual([{ id: 'doc-c', deletedDate: 100 }]);
});

