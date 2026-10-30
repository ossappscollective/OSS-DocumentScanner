import { Color, IOSHelper, View } from '@nativescript/core';
import { showSnack } from './index.common';
export * from './index.common';

export function showToast(text: string) {
    showSnack({ message: text });
}

export function showToolTip(tooltip: string, view?: View) {
    showSnack({ message: tooltip });
}
export function checkIfCaonBackButtonnGoBack(view: View, callback) {
    // Android only for now
    callback();
}

export function onAndroidNewItent() {}

@NativeClass
class UIPopoverPresentationControllerDelegateImpl extends NSObject implements UIPopoverPresentationControllerDelegate {
    static ObjCProtocols = [UIPopoverPresentationControllerDelegate];
    private _options: any;

    static initWithOptions(options) {
        const delegate = new UIPopoverPresentationControllerDelegateImpl();
        delegate._options = options;
        return delegate;
    }

    adaptivePresentationStyleForPresentationControllerTraitCollection(controller: UIPresentationController, traitCollection): UIModalPresentationStyle {
        return UIModalPresentationStyle.None;
    }

    popoverPresentationControllerDidDismissPopover(popoverPresentationController: UIPopoverPresentationController): void {
        if (this._options.onDismiss) {
            this._options.onDismiss();
        }
    }

    popoverPresentationControllerShouldDismissPopover(popoverPresentationController: UIPopoverPresentationController): any {
        return this._options?.outsideTouchable;
    }
}

@NativeClass
class ColorPickerImpl extends NSObject {
    onDone;
    public static initWithOnDone(onDone): ColorPickerImpl {
        const handler = ColorPickerImpl.new() as ColorPickerImpl;
        handler.onDone = onDone;
        return handler;
    }

    public dismissViewController(sender: any): void {
        if (this.onDone) {
            this.onDone(sender);
        }
    }

    public static ObjCExposedMethods = {
        dismissViewController: { returns: interop.types.void, params: [] }
    };
}

@NativeClass
class PickerController extends UIColorPickerViewController {
    onDismiss?: Function;
    static create(onDismiss): PickerController {
        const result = super.new() as PickerController;
        result.onDismiss = onDismiss;
        return result;
    }

    viewDidDisappear(animated: boolean): void {
        super.viewDidDisappear(animated);
        this.onDismiss?.();
    }
}

@NativeClass
class ColorPickerDelegate extends NSObject implements UIColorPickerViewControllerDelegate {
    static ObjCProtocols = [UIColorPickerViewControllerDelegate];

    onChange;
    onDismiss;
    static initWithChangeDismiss(onChange, onDismiss) {
        const delegate = ColorPickerDelegate.new() as ColorPickerDelegate;
        delegate.onChange = onChange;
        delegate.onDismiss = onDismiss;
        return delegate;
    }

    colorPickerViewControllerDidSelectColorContinuously(colorViewCntroller) {
        const uiColor: UIColor = colorViewCntroller.selectedColor;
        const components = CGColorGetComponents(uiColor.CGColor);
        const red = Math.round(components[0] * 255);
        const green = Math.round(components[1] * 255);
        const blue = Math.round(components[2] * 255);
        const alpha = Math.round(components[3] * 255);
        this.onChange(new Color(alpha, red, green, blue));
    }
    colorPickerViewControllerDidFinish() {
        this.onDismiss();
    }
}

export async function pickColor(color: Color | string, { alpha, anchor }: { alpha?: boolean; anchor?: View } = {}) {
    return new Promise<Color>((resolve, reject) => {
        try {
            let resolved = false;
            function resolveWithValue(value) {
                if (!resolved) {
                    resolved = true;
                    resolve(value);
                }
            }
            const picker = PickerController.create(() => resolveWithValue(null));
            if (color) {
                if (!(color instanceof Color)) {
                    color = new Color(color as any);
                }
                // colorSelectionController['color'] = color.ios;
                picker.selectedColor = color.ios;
            }
            let currentColor: Color;
            const delegate = ColorPickerDelegate.initWithChangeDismiss(
                (color) => (currentColor = color),
                () => resolveWithValue(currentColor)
            );
            picker.delegate = delegate;

            let parentWithController = IOSHelper.getParentWithViewController(anchor);
            if (!parentWithController) {
                throw new Error('missing_parent_controller');
            }
            let parentController = parentWithController.viewController;
            // we loop to ensure we are showing from the top presented view controller
            while (parentController.presentedViewController) {
                parentController = parentController.presentedViewController;
                parentWithController = parentWithController['_modal'] || parentWithController;
            }
            parentWithController.viewController.presentModalViewControllerAnimated(picker, true);
        } catch (err) {
            reject(err);
        }
    });
}
