import { EventData, Frame, View } from '@nativescript/core';

// a full width horizontal pager takes the touches of the screen edge: make it wait for the iOS swipe back gesture
export function allowSwipeBack(event: EventData) {
    if (!__IOS__) {
        return;
    }
    const popGesture = Frame.topmost()?.ios?.controller?.interactivePopGestureRecognizer;
    const nativeView = (event.object as View)?.nativeViewProtected;
    if (popGesture && nativeView?.panGestureRecognizer) {
        nativeView.panGestureRecognizer.requireGestureRecognizerToFail(popGesture);
    }
}
