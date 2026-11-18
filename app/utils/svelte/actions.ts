import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
import { get, type Readable } from 'svelte/store';
import { CollectionView } from '@nativescript-community/ui-collectionview';
import { CoreTypes, type View, type ViewBase } from '@nativescript/core';
import { nextIconRotation } from '~/utils/cameraOrientation';
import { orientationDegrees } from '~/variables';

function slideRow(view: View, selecting: boolean, shift: number) {
    view.translateX = selecting ? -shift : shift;
    view.animate({ translate: { x: 0, y: 0 }, duration: 150, curve: CoreTypes.AnimationCurve.cubicBezier(0.2, 0.9, 0.3, 1.15) });
}

/** keeps the view upright while the device turns: the layout stays as is, only the view rotates around its center */
export function counterRotate(node: NativeViewElementNode<View>) {
    let rotation = nextIconRotation(0, get(orientationDegrees));
    if (node.nativeView) {
        node.nativeView.rotate = rotation;
    }
    const unsubscribe = orientationDegrees.subscribe((degrees) => {
        const next = nextIconRotation(rotation, degrees);
        if (next !== rotation) {
            rotation = next;
            node.nativeView?.animate({ rotate: rotation, duration: 250 });
        }
    });
    return { destroy: unsubscribe };
}

/** the row is laid out for the current selection mode: when it changes, the content slides from where it was (`shift`) instead of jumping */
export function selectionTransition(node: NativeViewElementNode<View>, { selectionMode, shift = 36 }: { selectionMode: Readable<boolean>; shift?: number }) {
    let initialized = false;
    // iOS lays the row out when the cell is bound again, not when the store changes: slide then (the cell view is the child of the collection view)
    let pending: { selecting: boolean; time: number };
    let cellView: ViewBase;
    const onBinded = () => {
        const view = node.nativeView;
        if (pending && view && Date.now() - pending.time < 500) {
            slideRow(view, pending.selecting, shift);
        }
        pending = null;
    };
    const unsubscribe = selectionMode.subscribe((selecting) => {
        const view = node.nativeView;
        if (!initialized || !view) {
            initialized = true;
            return;
        }
        if (__IOS__) {
            if (!cellView) {
                cellView = view;
                while (cellView.parent && !(cellView.parent instanceof CollectionView)) {
                    cellView = cellView.parent;
                }
                cellView.on('binded', onBinded);
            }
            pending = { selecting, time: Date.now() };
        } else {
            slideRow(view, selecting, shift);
        }
    });
    return {
        destroy: () => {
            unsubscribe();
            cellView?.off('binded', onBinded);
        }
    };
}
