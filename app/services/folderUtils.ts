export interface FolderLike {
    id: number;
    name: string;
    count?: number;
}

export function isFolderDescendant(folderName: string, parentName: string) {
    return folderName.startsWith(parentName + '/');
}

export function collectFoldersToDelete<T extends FolderLike>(allFolders: T[], targets: FolderLike[]): T[] {
    const targetIds = new Set(targets.map((target) => target.id));
    return allFolders.filter((folder) => targetIds.has(folder.id) || targets.some((target) => isFolderDescendant(folder.name, target.name)));
}

export function filterEmptyFolders<T extends FolderLike>(folders: T[]): T[] {
    return folders.filter((folder) => !folder.count);
}

export function folderAncestorNames(name: string): string[] {
    const parts = name.split('/');
    const ancestors: string[] = [];
    for (let index = 1; index < parts.length; index++) {
        const ancestor = parts.slice(0, index).join('/');
        if (ancestor.length) {
            ancestors.push(ancestor);
        }
    }
    return ancestors;
}

// the folder list groups by first path component, so "a/b" without an "a" row is never shown
export function missingFolderAncestors(existingNames: string[], names: string[]): string[] {
    const known = new Set(existingNames);
    const missing: string[] = [];
    names.forEach((name) => {
        folderAncestorNames(name).forEach((ancestor) => {
            if (!known.has(ancestor)) {
                known.add(ancestor);
                missing.push(ancestor);
            }
        });
    });
    return missing;
}

export interface RemoteFolder {
    id: number;
    name: string;
    color?: string;
    modifiedDate?: number;
}

function isRemoteFolder(value: Partial<RemoteFolder> | null): value is RemoteFolder {
    return typeof value?.id === 'number' && typeof value?.name === 'string';
}

// 1.14.x pushed folders to the remote as JSON strings: parse them back, drop what is not a folder and
// keep the newest of duplicates. `changed` tells the remote file needs rewriting.
export function normalizeRemoteFolders(entries: (Partial<RemoteFolder> | string | null)[]): { folders: RemoteFolder[]; changed: boolean } {
    const byId = new Map<number, RemoteFolder>();
    let changed = false;
    entries.forEach((entry) => {
        let folder: Partial<RemoteFolder> | null = null;
        if (typeof entry === 'string') {
            changed = true;
            try {
                folder = JSON.parse(entry);
            } catch {
                return;
            }
        } else {
            folder = entry;
        }
        if (!isRemoteFolder(folder)) {
            changed = true;
            return;
        }
        const existing = byId.get(folder.id);
        if (existing) {
            changed = true;
        }
        if (!existing || (existing.modifiedDate ?? 0) < (folder.modifiedDate ?? 0)) {
            byId.set(folder.id, folder);
        }
    });
    return { folders: Array.from(byId.values()), changed };
}
