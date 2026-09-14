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
