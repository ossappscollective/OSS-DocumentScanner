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

export interface SyncedService {
    type: string;
    color: string;
}

/** the sync services a document is on: `synced` is 1 for all of them, else a bit per service type */
export function getSyncedServices(synced: number, services: { type: string; color?: string }[], masks: { [type: string]: number }, defaultColors: { [type: string]: string }): SyncedService[] {
    return services.filter((service) => synced === 1 || (synced & masks[service.type]) !== 0).map((service) => ({ type: service.type, color: service.color || defaultColors[service.type] }));
}

/** the edge of a white page on the page color: a level 1 shadow on iOS, a 1 outline on Android and on e-ink */
export function getPaperEdge(ios: boolean, eInk: boolean, outlineColor: string): { boxShadow?: string; borderColor?: string; borderWidth?: number } {
    // 0x6C renders the 18% black of the design: iOS applies the alpha of the color twice
    return ios && !eInk ? { boxShadow: '0 2 10 #0000006C' } : { borderColor: outlineColor, borderWidth: 1 };
}
