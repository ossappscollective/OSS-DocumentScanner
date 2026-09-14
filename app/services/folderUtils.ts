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
