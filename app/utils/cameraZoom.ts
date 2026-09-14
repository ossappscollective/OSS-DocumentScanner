// on Android the slider is a SeekBar: progress is an int, so raw zoom ratios can not be used
export const ZOOM_SLIDER_STEPS = 100;

const NEUTRAL_SNAP_STEPS = 0.75;

function hasUsableRange(minZoom: number, maxZoom: number) {
    return Number.isFinite(minZoom) && Number.isFinite(maxZoom) && minZoom > 0 && maxZoom > minZoom;
}

// half window, in zoom ratio: wider than half a slider step so an integer step always lands on the neutral zoom
function neutralSnapRatio(minZoom: number, maxZoom: number) {
    return Math.pow(maxZoom / minZoom, NEUTRAL_SNAP_STEPS / ZOOM_SLIDER_STEPS);
}

export function clampZoom(zoom: number, minZoom: number, maxZoom: number, neutralZoom: number) {
    if (!Number.isFinite(zoom)) {
        return neutralZoom;
    }
    if (!hasUsableRange(minZoom, maxZoom)) {
        return zoom;
    }
    return Math.min(Math.max(zoom, minZoom), maxZoom);
}

export function zoomToPercent(zoom: number, minZoom: number, maxZoom: number) {
    if (!hasUsableRange(minZoom, maxZoom) || !Number.isFinite(zoom)) {
        return 0;
    }
    const clamped = Math.min(Math.max(zoom, minZoom), maxZoom);
    return (Math.log(clamped / minZoom) / Math.log(maxZoom / minZoom)) * ZOOM_SLIDER_STEPS;
}

export function percentToZoom(percent: number, minZoom: number, maxZoom: number, neutralZoom: number) {
    if (!hasUsableRange(minZoom, maxZoom) || !Number.isFinite(percent)) {
        return neutralZoom;
    }
    const clampedPercent = Math.min(Math.max(percent, 0), ZOOM_SLIDER_STEPS);
    const zoom = minZoom * Math.pow(maxZoom / minZoom, clampedPercent / ZOOM_SLIDER_STEPS);
    const snapRatio = neutralSnapRatio(minZoom, maxZoom);
    if (Number.isFinite(neutralZoom) && zoom > neutralZoom / snapRatio && zoom < neutralZoom * snapRatio) {
        return neutralZoom;
    }
    return zoom;
}
