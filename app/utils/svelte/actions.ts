import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
import type { Readable } from 'svelte/store';
import { CoreTypes, type View } from '@nativescript/core';

/** the row is laid out for the current selection mode: when it changes, the content slides from where it was (`shift`) instead of jumping */
export function selectionTransition(node: NativeViewElementNode<View>, { selectionMode, shift = 36 }: { selectionMode: Readable<boolean>; shift?: number }) {
    let initialized = false;
    const unsubscribe = selectionMode.subscribe((selecting) => {
        const view = node.nativeView;
        if (!initialized || !view) {
            initialized = true;
            return;
        }
        view.translateX = selecting ? -shift : shift;
        view.animate({ translate: { x: 0, y: 0 }, duration: 150, curve: CoreTypes.AnimationCurve.cubicBezier(0.2, 0.9, 0.3, 1.15) });
    });
    return { destroy: unsubscribe };
}
