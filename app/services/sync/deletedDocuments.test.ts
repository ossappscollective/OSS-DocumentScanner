import { expect, test } from 'vitest';
import { mergeDeletedDocumentTombstones, mergeTombstones } from './deletedDocuments';

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

// folders are tombstoned the same way, with numeric ids

test('creates tombstones for deleted folder ids', () => {
    const [result] = mergeTombstones<number>([], [12, 34], 1234);
    expect(result).toEqual([
        { id: 12, deletedDate: 1234 },
        { id: 34, deletedDate: 1234 }
    ]);
});

test('keeps the newest deleted date for an existing folder tombstone', () => {
    const [result] = mergeTombstones<number>([{ id: 12, deletedDate: 2000 }], [12], 1000);
    expect(result).toEqual([{ id: 12, deletedDate: 2000 }]);
});

test('does not drop the folder id 0', () => {
    const [result] = mergeTombstones<number>([], [0, null as any], 100);
    expect(result).toEqual([{ id: 0, deletedDate: 100 }]);
});
