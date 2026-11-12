import { Application, Utils, View } from '@nativescript/core';

/** iOS: the bottom safe area (home indicator) of the window in dips. The views stop above it, a persistent sheet goes under it. 0 on Android */
export function getIOSBottomInset() {
    return __IOS__ ? Math.round(Application.ios.window?.safeAreaInsets.bottom ?? 0) : 0;
}

/** iOS: what is under a view at the bottom of the screen in dips: the home indicator, and a bottom toolbar when there is one. 0 on Android */
export function getIOSViewBottomInset(view: View) {
    return __IOS__ && view?.isLoaded ? Math.round(Utils.layout.toDeviceIndependentPixels(view.getSafeAreaInsets().bottom)) : 0;
}

/** the measured width of a view in dips, or `current` when it did not move by more than 1 dip or is not measured yet */
export function measureWidth(view: View, current: number) {
    const width = Utils.layout.toDeviceIndependentPixels(view?.getMeasuredWidth() ?? 0);
    return width && Math.abs(width - (current ?? 0)) > 1 ? width : current;
}
