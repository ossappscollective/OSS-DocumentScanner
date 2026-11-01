import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateTween, createTween, easeInOut, easeSlide, linear } from './tween';

describe('easings', () => {
    it.each([linear, easeInOut, easeSlide])('start at 0 and end at 1', (ease) => {
        expect(ease(0)).toBeCloseTo(0, 2);
        expect(ease(1)).toBeCloseTo(1, 2);
    });
    it('easeSlide overshoots', () => {
        expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(easeSlide))).toBeGreaterThan(1);
    });
});

describe('animateTween', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('jumps to the value without duration', () => {
        const onUpdate = vi.fn();
        const onEnd = vi.fn();
        const tween = createTween(0, onUpdate, onEnd);
        animateTween(tween, 5, 0);
        expect(tween.value).toBe(5);
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('reaches the value on the frames', () => {
        vi.useFakeTimers();
        const frames: (() => void)[] = [];
        vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback));
        const onEnd = vi.fn();
        const tween = createTween(0, undefined, onEnd);
        animateTween(tween, 10, 100, linear);
        vi.advanceTimersByTime(50);
        frames.shift()();
        expect(tween.value).toBeCloseTo(5, 5);
        expect(onEnd).not.toHaveBeenCalled();
        vi.advanceTimersByTime(60);
        frames.shift()();
        expect(tween.value).toBe(10);
        expect(onEnd).toHaveBeenCalledTimes(1);
        expect(frames).toHaveLength(0);
    });
});
