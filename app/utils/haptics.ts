import { Application } from '@nativescript/core';

function androidFeedback(constant: number) {
    Application.android?.foregroundActivity?.getWindow()?.getDecorView()?.performHapticFeedback(constant);
}

/** iOS: selection tick. Android: CLOCK_TICK */
export function hapticTick() {
    if (__IOS__) {
        UISelectionFeedbackGenerator.new().selectionChanged();
    } else {
        // HapticFeedbackConstants.CLOCK_TICK: the class is not in the native metadata of the app
        androidFeedback(4);
    }
}

/** iOS: light impact. Nothing on Android */
export function hapticImpact() {
    if (__IOS__) {
        UIImpactFeedbackGenerator.alloc().initWithStyle(UIImpactFeedbackStyle.Light).impactOccurred();
    }
}

/** iOS: Reduce Motion. Android: the system already scales the durations of the animations (Settings is not in the native metadata of the app) */
export function isReduceMotion() {
    return __IOS__ ? UIAccessibilityIsReduceMotionEnabled() : false;
}

