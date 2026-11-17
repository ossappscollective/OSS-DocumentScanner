import { describe, expect, it } from 'vitest';
import { nextIconRotation, toSurfaceRotation } from './cameraOrientation';

describe('nextIconRotation', () => {
    it('counter rotates by the device angle', () => {
        expect(nextIconRotation(0, 90)).toBe(-90);
        expect(nextIconRotation(0, 270)).toBe(90);
        expect(nextIconRotation(0, 0)).toBe(0);
    });

    it('takes the short way instead of spinning back', () => {
        // from 270 degrees of counter rotation back to portrait is a quarter turn, not a 270 one
        expect(nextIconRotation(-270, 0)).toBe(-360);
        expect(nextIconRotation(-90, 180)).toBe(-180);
    });

    it('turns clockwise for a half turn', () => {
        expect(nextIconRotation(-90, 270)).toBe(90);
        expect(nextIconRotation(0, 180)).toBe(180);
    });

    it('does not move when the target is the current angle modulo 360', () => {
        expect(nextIconRotation(-360, 0)).toBe(-360);
        expect(nextIconRotation(450, 270)).toBe(450);
    });
});

describe('toSurfaceRotation', () => {
    it('maps the clockwise device angle to android Surface.ROTATION_*', () => {
        expect(toSurfaceRotation(0)).toBe(0);
        expect(toSurfaceRotation(90)).toBe(3);
        expect(toSurfaceRotation(180)).toBe(2);
        expect(toSurfaceRotation(270)).toBe(1);
    });
});
