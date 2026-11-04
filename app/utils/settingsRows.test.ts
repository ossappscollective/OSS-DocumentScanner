import { Color } from '@nativescript/core';
import { describe, expect, it } from 'vitest';
import { getSettingsIconProps, getSettingsRowProps } from './settingsRows';

const colors = {
    colorSurfaceContainerLow: '#f3f3f3',
    colorOutlineVariant: '#cccccc',
    colorPrimary: '#006a65',
    colorPrimaryContainer: '#9ef2eb',
    colorOnPrimaryContainer: '#00201e'
};

describe('getSettingsRowProps', () => {
    it('iOS: an inset grouped card with square inner corners and separators inside the group', () => {
        const first = getSettingsRowProps({ position: 'first', title: 'a' }, colors, true);
        expect(first.backgroundColor).toBe('#f3f3f3');
        expect(first.borderTopLeftRadius).toBe(18);
        expect(first.borderBottomLeftRadius).toBe(0);
        expect(first.showBottomLine).toBe(true);
        expect(first.marginBottom).toBe(0);
        expect(getSettingsRowProps({ position: 'last' }, colors, true).showBottomLine).toBe(false);
        expect(getSettingsRowProps({ position: 'only' }, colors, true).showBottomLine).toBe(false);
    });

    it('iOS: the separator starts under the title when the row has an icon', () => {
        expect(getSettingsRowProps({ position: 'first', icon: 'mdi-camera' }, colors, true).lineInset).toBe(58);
        expect(getSettingsRowProps({ position: 'first' }, colors, true).lineInset).toBe(16);
    });

    it('Android: segmented rows, 6 between rows, a 2 gap, no separator', () => {
        const middle = getSettingsRowProps({ position: 'middle' }, colors, false);
        expect(middle.borderTopLeftRadius).toBe(6);
        expect(middle.marginBottom).toBe(2);
        expect(middle.showBottomLine).toBe(false);
        const last = getSettingsRowProps({ position: 'last' }, colors, false);
        expect(last.borderBottomLeftRadius).toBe(20);
        expect(last.marginBottom).toBe(0);
    });

    it('is 52 tall on iOS and 64 tall (72 with supporting text) on Android', () => {
        // title line = font size x 1.3, the row = line + 2 x padding
        const height = (props) => props.fontSize * props.lineHeightFactor + 2 * props.verticalPadding;
        expect(height(getSettingsRowProps({ position: 'only' }, colors, true))).toBeCloseTo(52, 0);
        expect(height(getSettingsRowProps({ position: 'only' }, colors, false))).toBeCloseTo(64, 0);
        const withSupportingText = getSettingsRowProps({ position: 'only', description: 'more' }, colors, false);
        expect(withSupportingText.verticalPadding).toBeLessThan(getSettingsRowProps({ position: 'only' }, colors, false).verticalPadding);
    });

    it('shows a chevron on iOS rows that open a page, never on Android', () => {
        expect(getSettingsRowProps({ id: 'sub_settings' }, colors, true).chevron).toBeTruthy();
        expect(getSettingsRowProps({ id: 'sub_settings' }, colors, false).chevron).toBeUndefined();
        expect(getSettingsRowProps({ id: 'setting' }, colors, true).chevron).toBeUndefined();
    });
});

describe('getSettingsIconProps', () => {
    it('iOS: a 30 circle, the accent at 16% behind an accent glyph', () => {
        const props = getSettingsIconProps(colors, true);
        expect(props.width).toBe(30);
        expect(props.height).toBe(30);
        expect(props.borderRadius).toBe(15);
        expect(props.color).toBe('#006a65');
        const wash = new Color(props.backgroundColor);
        expect([wash.r, wash.g, wash.b, wash.a]).toEqual([0, 106, 101, 41]);
    });

    it('Android: a 40 circle in the primary container', () => {
        const props = getSettingsIconProps(colors, false);
        expect(props.width).toBe(40);
        expect(props.borderRadius).toBe(20);
        expect(props.backgroundColor).toBe('#9ef2eb');
        expect(props.color).toBe('#00201e');
    });
});
