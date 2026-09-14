export interface TombstoneEntry<Id extends string | number = string> {
    id: Id;
    deletedDate: number;
}

export type DeletedDocumentEntry = TombstoneEntry<string>;
export type DeletedFolderEntry = TombstoneEntry<number>;

function isValidId(id: string | number) {
    return id !== null && id !== undefined && id !== '';
}

export function mergeTombstones<Id extends string | number>(entries: TombstoneEntry<Id>[] = [], ids: Id[], deletedDate = Date.now()) {
    const tombstones = new Map<Id, TombstoneEntry<Id>>();
    let hasChanged = false;

    entries.forEach((entry) => {
        if (!entry || !isValidId(entry.id)) {
            return;
        }
        const existing = tombstones.get(entry.id);
        if (!existing || existing.deletedDate < entry.deletedDate) {
            tombstones.set(entry.id, { id: entry.id, deletedDate: entry.deletedDate });
            hasChanged = true;
        }
    });

    ids.forEach((id) => {
        if (!isValidId(id)) {
            return;
        }
        const existing = tombstones.get(id);
        if (!existing || existing.deletedDate < deletedDate) {
            tombstones.set(id, { id, deletedDate });
            hasChanged = true;
        }
    });

    return [Array.from(tombstones.values()), hasChanged] as [TombstoneEntry<Id>[], boolean];
}

export function mergeDeletedDocumentTombstones(entries: DeletedDocumentEntry[] = [], ids: string[], deletedDate = Date.now()) {
    return mergeTombstones(entries, ids, deletedDate);
}
