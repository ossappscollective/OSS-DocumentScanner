import { describe, expect, it } from 'vitest';
import { type FolderLike, collectFoldersToDelete, filterEmptyFolders, folderAncestorNames, isFolderDescendant, missingFolderAncestors, normalizeRemoteFolders } from './folderUtils';

// Folders are tags whose hierarchy only exists in the name ("work/2024"), so
// deleting a folder must take its descendants with it — and nothing else.

const work: FolderLike = { id: 1, name: 'work', count: 2 };
const work2024: FolderLike = { id: 2, name: 'work/2024', count: 1 };
const work2024Q1: FolderLike = { id: 3, name: 'work/2024/q1', count: 0 };
const workshop: FolderLike = { id: 4, name: 'workshop', count: 3 };
const home: FolderLike = { id: 5, name: 'home' };

const folders: FolderLike[] = [work, work2024, work2024Q1, workshop, home];

describe('isFolderDescendant', () => {
    it('requires a separator so sibling prefixes do not match', () => {
        expect(isFolderDescendant('workshop', 'work')).toBe(false);
        expect(isFolderDescendant('work/2024', 'work')).toBe(true);
    });

    it('does not consider a folder its own descendant', () => {
        expect(isFolderDescendant('work', 'work')).toBe(false);
    });
});

describe('collectFoldersToDelete', () => {
    it('takes the whole subtree of a target', () => {
        expect(collectFoldersToDelete(folders, [work])).toEqual([work, work2024, work2024Q1]);
    });

    it('leaves folders sharing only a name prefix alone', () => {
        expect(collectFoldersToDelete(folders, [work])).not.toContain(workshop);
    });

    it('returns each folder once when targets overlap', () => {
        expect(collectFoldersToDelete(folders, [work, work2024])).toEqual([work, work2024, work2024Q1]);
    });

    it('handles a leaf target', () => {
        expect(collectFoldersToDelete(folders, [home])).toEqual([home]);
    });

    it('returns nothing without targets', () => {
        expect(collectFoldersToDelete(folders, [])).toEqual([]);
    });
});

describe('filterEmptyFolders', () => {
    it('keeps folders without documents, including those with no count', () => {
        expect(filterEmptyFolders(folders)).toEqual([work2024Q1, home]);
    });
});

describe('folderAncestorNames', () => {
    it('lists every parent from the shallowest', () => {
        expect(folderAncestorNames('work/2024/q1')).toEqual(['work', 'work/2024']);
    });

    it('returns nothing for a top level folder', () => {
        expect(folderAncestorNames('work')).toEqual([]);
    });

    it('never returns an empty ancestor', () => {
        expect(folderAncestorNames('/work/2024')).toEqual(['/work']);
        expect(folderAncestorNames('work/')).toEqual(['work']);
    });
});

describe('missingFolderAncestors', () => {
    it('reports the parents a folder list never declares', () => {
        expect(missingFolderAncestors(['work/2024'], ['work/2024'])).toEqual(['work']);
    });

    it('stays quiet when every parent exists', () => {
        expect(missingFolderAncestors(['work', 'work/2024'], ['work/2024'])).toEqual([]);
    });

    it('reports a missing parent only once across folders', () => {
        expect(missingFolderAncestors([], ['work/2024', 'work/2025'])).toEqual(['work']);
    });

    it('reports intermediate levels too, shallowest first', () => {
        expect(missingFolderAncestors([], ['work/2024/q1'])).toEqual(['work', 'work/2024']);
    });
});

// Remote folders.json written by 1.14.x holds folders as JSON strings; a string
// has no id, so it never matched a local folder and was passed to create().

describe('normalizeRemoteFolders', () => {
    const stored = { id: 1, name: 'work', modifiedDate: 10 };

    it('keeps well formed entries untouched and reports no change', () => {
        expect(normalizeRemoteFolders([stored])).toEqual({ folders: [stored], changed: false });
    });

    it('parses entries stored as JSON strings', () => {
        expect(normalizeRemoteFolders([JSON.stringify(stored)])).toEqual({ folders: [stored], changed: true });
    });

    it('drops entries that are not a folder', () => {
        expect(normalizeRemoteFolders(['not json', '{"name":"no id"}', null, { id: 2 }])).toEqual({ folders: [], changed: true });
    });

    it('keeps the newest entry when a string and an object share an id', () => {
        const newer = { ...stored, name: 'work2', modifiedDate: 20 };
        expect(normalizeRemoteFolders([JSON.stringify(stored), newer])).toEqual({ folders: [newer], changed: true });
        expect(normalizeRemoteFolders([newer, JSON.stringify(stored)])).toEqual({ folders: [newer], changed: true });
    });
});
