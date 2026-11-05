/** the default name of a document is a timestamp: a cell shows its date instead */
export function isAutoName(name?: string) {
    return !name || /\d+:\d+:\d+/.test(name);
}

/** the colors of the sync services of a document: the first `max`, then a count of the others */
export function getSyncDots(colors: string[], max: number) {
    return { shown: colors.slice(0, max), more: Math.max(0, colors.length - max) };
}

/** what the info pill of a tile holds: the page count (over one page) and the favorite, split by a divider */
export function getInfoPill(pageCount: number, favorite: boolean) {
    const pages = pageCount > 1;
    return { pages, favorite, divider: pages && favorite, visible: pages || favorite };
}

/** the radius of a tile from its size: 18% of the shorter side between 8 and 28 */
export function getTileRadius(width: number, height: number) {
    return Math.min(28, Math.max(8, Math.round(0.18 * Math.min(width, height))));
}
