import { describe, expect, it } from 'vitest';
import { ZOOM_SLIDER_STEPS, clampZoom, percentToZoom, zoomToPercent } from './cameraZoom';

// Pixel 7: the rear logical camera exposes the ultra wide lens as a sub 1x zoom ratio
const PIXEL_MIN = 0.7;
const PIXEL_MAX = 16;

describe('zoomToPercent', () => {
    it('maps the range bounds to the slider bounds', () => {
        expect(zoomToPercent(PIXEL_MIN, PIXEL_MIN, PIXEL_MAX)).toBe(0);
        expect(zoomToPercent(PIXEL_MAX, PIXEL_MIN, PIXEL_MAX)).toBe(ZOOM_SLIDER_STEPS);
    });

    it('clamps out of range zoom values', () => {
        expect(zoomToPercent(0.1, PIXEL_MIN, PIXEL_MAX)).toBe(0);
        expect(zoomToPercent(50, PIXEL_MIN, PIXEL_MAX)).toBe(ZOOM_SLIDER_STEPS);
    });

    it('returns 0 for a degenerate range', () => {
        expect(zoomToPercent(1, 1, 1)).toBe(0);
        expect(zoomToPercent(1, 0, 16)).toBe(0);
        expect(zoomToPercent(NaN, PIXEL_MIN, PIXEL_MAX)).toBe(0);
    });
});

describe('percentToZoom', () => {
    it('round trips with zoomToPercent', () => {
        for (const zoom of [0.7, 0.85, 1.5, 4, 16]) {
            const percent = zoomToPercent(zoom, PIXEL_MIN, PIXEL_MAX);
            expect(percentToZoom(percent, PIXEL_MIN, PIXEL_MAX, 1)).toBeCloseTo(zoom, 5);
        }
    });

    it('snaps to the neutral zoom near 1x', () => {
        const percent = zoomToPercent(0.99, PIXEL_MIN, PIXEL_MAX);
        expect(percentToZoom(percent, PIXEL_MIN, PIXEL_MAX, 1)).toBe(1);
    });

    it('reaches an exact neutral zoom from an integer slider step on any range', () => {
        // the Android slider is a SeekBar: only integer steps are reachable
        const ranges = [
            [PIXEL_MIN, PIXEL_MAX, 1],
            [0.5, 30, 2],
            [1, 8, 1],
            [0.6, 100, 1]
        ];
        for (const [minZoom, maxZoom, neutralZoom] of ranges) {
            const zooms = Array.from({ length: ZOOM_SLIDER_STEPS + 1 }, (_, step) => percentToZoom(step, minZoom, maxZoom, neutralZoom));
            expect(zooms).toContain(neutralZoom);
        }
    });

    it('does not snap values away from the neutral zoom', () => {
        const percent = zoomToPercent(2, PIXEL_MIN, PIXEL_MAX);
        expect(percentToZoom(percent, PIXEL_MIN, PIXEL_MAX, 1)).toBeCloseTo(2, 5);
    });

    it('does not snap steps further than one step from the neutral zoom', () => {
        const neutralPercent = zoomToPercent(1, PIXEL_MIN, PIXEL_MAX);
        expect(percentToZoom(neutralPercent - 1, PIXEL_MIN, PIXEL_MAX, 1)).not.toBe(1);
        expect(percentToZoom(neutralPercent + 1, PIXEL_MIN, PIXEL_MAX, 1)).not.toBe(1);
    });

    it('falls back to the neutral zoom for a degenerate range', () => {
        expect(percentToZoom(50, 1, 1, 1)).toBe(1);
        expect(percentToZoom(NaN, PIXEL_MIN, PIXEL_MAX, 1)).toBe(1);
    });
});

describe('clampZoom', () => {
    it('keeps an in range value', () => {
        expect(clampZoom(2, PIXEL_MIN, PIXEL_MAX, 1)).toBe(2);
    });

    it('clamps a stored value below the device minimum', () => {
        expect(clampZoom(0.3, PIXEL_MIN, PIXEL_MAX, 1)).toBe(PIXEL_MIN);
    });

    it('clamps a stored value above the device maximum', () => {
        expect(clampZoom(40, PIXEL_MIN, PIXEL_MAX, 1)).toBe(PIXEL_MAX);
    });

    it('falls back to the neutral zoom for a non finite value', () => {
        expect(clampZoom(NaN, PIXEL_MIN, PIXEL_MAX, 1)).toBe(1);
    });

    it('keeps the value when the range is not usable yet', () => {
        expect(clampZoom(2, 1, 1, 1)).toBe(2);
    });
});
