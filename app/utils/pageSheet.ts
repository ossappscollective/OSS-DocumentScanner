import type { View } from '@nativescript/core';

export interface PageFitInput {
    /** the height of the view which holds the page and the sheet (dip) */
    containerHeight: number;
    /** where the room of the page starts in the container */
    roomTop: number;
    /** the height of the page itself, not of the view which shows it */
    pageHeight: number;
    /** the center of the page in the container */
    pageCenter: number;
    /** the center of the view which is scaled, in the container: it is scaled around it (default: the center of the container) */
    viewCenter?: number;
    /** the height of the sheet at its largest step */
    sheetHeight: number;
    margin?: number;
}
export interface PageFit {
    scale: number;
    translateY: number;
}

/** how a page is scaled and moved so that it stays fully visible above a sheet of `sheetHeight` */
export function getPageFit({ containerHeight, margin = 16, pageCenter, pageHeight, roomTop, sheetHeight, viewCenter = containerHeight / 2 }: PageFitInput): PageFit {
    const visible = containerHeight - sheetHeight - roomTop - margin;
    const scale = Math.max(0.1, Math.min(1, visible / pageHeight));
    return { scale, translateY: roomTop + visible / 2 - (viewCenter + scale * (pageCenter - viewCenter)) };
}

/** the page follows the sheet: no sheet is the page as it is, the whole sheet is the fit */
export function interpolatePageFit(fit: PageFit, progress: number): PageFit {
    return { scale: 1 + (fit.scale - 1) * progress, translateY: fit.translateY * progress + 0 };
}

export interface PageSheetTarget {
    target: View;
    fit: PageFit;
}

/**
 * the translation function of a persistent sheet: the sheet and the pages it leaves room to move together, whether the sheet is dragged or animated.
 * A page is a `target` of the sheet: the plugin sets its values on the drag and animates them with the sheet.
 * The keys must not be properties of the sheet itself (`page` is its Page): the plugin applies the values to that property too.
 */
export function createPageSheetTranslation(getTargets: () => PageSheetTarget[], getFollowers: () => View[] = () => []) {
    return (delta: number, max: number, progress: number) => {
        const result: Record<string, unknown> = { bottomSheet: { translateY: delta } };
        getTargets().forEach(({ fit, target }, index) => {
            const { scale, translateY } = interpolatePageFit(fit, progress);
            result[`previewPage${index}`] = { target, scaleX: scale, scaleY: scale, translateY };
        });
        // the views which float over the content (a button) go up with the sheet
        getFollowers().forEach((target, index) => {
            result[`follower${index}`] = { target, translateY: delta };
        });
        return result;
    };
}

/** puts a page at its fit, or as it is without one */
export function setPageFit(view: View, fit?: PageFit) {
    view.scaleX = view.scaleY = fit?.scale ?? 1;
    view.translateY = fit?.translateY ?? 0;
}
