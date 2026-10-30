<script lang="ts">
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { type EventData, type PropertyChangeData, View } from '@nativescript/core';
    import { colors } from '~/variables';

    /** the name of the field: the hint of the empty field, the caption above the field once it has a value, its accessibility label */
    export let label: string;
    export let text: string = '';
    /** a text view (a value which can take several lines) instead of a single line */
    export let multiline = false;
    // the placement in the parent, the other attributes (keyboardType, editable, error...) are the ones of the field
    export let margin: string = undefined;
    export let col: number = undefined;
    export let colSpan: number = undefined;
    export let row: number = undefined;
    let { colorOnSurfaceVariant } = $colors;
    $: ({ colorOnSurfaceVariant } = $colors);

    /** the native events (the plain forwarded svelte events are typed as DOM events) */
    export let onChange: (event: PropertyChangeData) => void = undefined;
    export let onTap: (event: EventData) => void = undefined;
    /** an icon button inside the end of the field (a menu of values...) */
    export let trailingIcon: string = undefined;
    export let onTrailingTap: (view: View) => void = undefined;

    $: hasValue = !!text?.length;
    $: containerMargin = margin ?? (__IOS__ ? '0 0 8 0' : '4 0');
    // a tap listener only while there is a handler: a tap gesture on a field which is typed in prevents its focus
    function tap(node: NativeViewElementNode<View>, handler?: (event: EventData) => void) {
        let current = handler;
        let attached = false;
        const listener = (event: EventData) => current?.(event);
        const sync = () => {
            if (current && !attached) {
                node.addEventListener('tap', listener);
                attached = true;
            } else if (!current && attached) {
                node.removeEventListener('tap', listener);
                attached = false;
            }
        };
        sync();
        return {
            update(newHandler?: (event: EventData) => void) {
                current = newHandler;
                sync();
            },
            destroy() {
                if (attached) {
                    node.removeEventListener('tap', listener);
                }
            }
        };
    }
    function trailingTap(event: EventData) {
        if (event.object instanceof View) {
            onTrailingTap?.(event.object);
        }
    }
    function track(event: PropertyChangeData) {
        text = event.value;
        onChange?.(event);
    }
</script>

<!--
    iOS: a caption row (14 + 2) is always reserved above the 48 capsule and shows the label once the field has a value: the height never changes when the user
    types or focuses, fields are 8 apart (72 pitch). Android: the native outlined field floats its hint on the outline.
-->
<stacklayout {col} {colSpan} margin={containerMargin} {row}>
    <label color={colorOnSurfaceVariant} fontSize={11} height={14} ios:marginBottom={2} ios:marginLeft={16} opacity={hasValue ? 1 : 0} text={label} visibility={__IOS__ ? 'visible' : 'collapsed'} />
    <gridlayout>
        {#if multiline}
            <textview accessibilityLabel={label} hint={label} {text} variant="outline" {...$$restProps} on:textChange={track} use:tap={onTap} />
        {:else}
            <textfield
                accessibilityLabel={label}
                android:height={56}
                hint={label}
                {...__IOS__ && trailingIcon ? { paddingRight: 48 } : {}}
                {text}
                variant="outline"
                {...$$restProps}
                on:textChange={track}
                use:tap={onTap}
            />
        {/if}
        {#if trailingIcon}
            <uibutton
                accessibilityLabel={label}
                color={colorOnSurfaceVariant}
                height={48}
                horizontalAlignment="right"
                padding="0"
                variant="text"
                verticalAlignment="center"
                width={48}
                {...{ src: trailingIcon }}
                on:tap={trailingTap}
            />
        {/if}
    </gridlayout>
</stacklayout>
