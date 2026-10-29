import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
import type { TextBase } from '@nativescript/core';

/** css has no `:focus`: the field gets the `focused` pseudo class while it has the focus */
export function focusState(node: NativeViewElementNode<TextBase>) {
    const onFocus = () => node.nativeView.addPseudoClass('focused');
    const onBlur = () => node.nativeView.deletePseudoClass('focused');
    node.addEventListener('focus', onFocus);
    node.addEventListener('blur', onBlur);
    return {
        destroy() {
            node.removeEventListener('focus', onFocus);
            node.removeEventListener('blur', onBlur);
        }
    };
}
