import { describe, expect, it, vi } from 'vitest';
import type { View } from '@nativescript/core';
import { measureWidth } from './safeArea';

// 2 pixels per dip
vi.mock('@nativescript/core', () => ({ Application: {}, Utils: { layout: { toDeviceIndependentPixels: (pixels: number) => pixels / 2 } } }));

const viewOf = (measuredWidth: number) => ({ getMeasuredWidth: () => measuredWidth }) as unknown as View;

describe('measureWidth', () => {
    it('gives the measured width in dips', () => {
        expect(measureWidth(viewOf(780), undefined)).toBe(390);
    });
    it('keeps the current width when the view moved by 1 dip or less', () => {
        expect(measureWidth(viewOf(782), 390)).toBe(390);
    });
    it('takes the new width when the view moved by more than 1 dip', () => {
        expect(measureWidth(viewOf(784), 390)).toBe(392);
    });
    it('keeps the current width when the view is not measured', () => {
        expect(measureWidth(viewOf(0), 390)).toBe(390);
        expect(measureWidth(undefined, 390)).toBe(390);
        expect(measureWidth(undefined, undefined)).toBeUndefined();
    });
});
