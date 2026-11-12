import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSwitchRowTap } from './switchRow';

describe('createSwitchRowTap', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('toggles after 10ms when the row is tapped', () => {
        const toggle = vi.fn();
        createSwitchRowTap().onRowTap(toggle);
        vi.advanceTimersByTime(9);
        expect(toggle).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(toggle).toHaveBeenCalledTimes(1);
    });
    it('does not toggle when the switch changed by itself in the meantime', () => {
        const toggle = vi.fn();
        const rowTap = createSwitchRowTap();
        rowTap.onRowTap(toggle);
        rowTap.cancel();
        vi.advanceTimersByTime(50);
        expect(toggle).not.toHaveBeenCalled();
    });
    it('toggles once for two taps in a row', () => {
        const toggle = vi.fn();
        const rowTap = createSwitchRowTap();
        rowTap.onRowTap(toggle);
        rowTap.onRowTap(toggle);
        vi.advanceTimersByTime(50);
        expect(toggle).toHaveBeenCalledTimes(1);
    });
    it('can be cancelled with nothing pending', () => {
        expect(() => createSwitchRowTap().cancel()).not.toThrow();
    });
});
