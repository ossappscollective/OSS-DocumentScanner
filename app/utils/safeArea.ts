import { Application, Utils, View } from '@nativescript/core';

/** iOS: the bottom safe area (home indicator) of the window in dips. The views stop above it, a persistent sheet goes under it. 0 on Android */
export function getIOSBottomInset() {
    return __IOS__ ? Math.round(Application.ios.window?.safeAreaInsets.bottom ?? 0) : 0;
}

/** iOS: what is under a view at the bottom of the screen in dips: the home indicator, and a bottom toolbar when there is one. 0 on Android */
export function getIOSViewBottomInset(view: View) {
    return __IOS__ && view?.isLoaded ? Math.round(Utils.layout.toDeviceIndependentPixels(view.getSafeAreaInsets().bottom)) : 0;
}
