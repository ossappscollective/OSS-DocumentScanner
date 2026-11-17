<script lang="ts">
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import type { PersistentBottomSheet } from '@nativescript-community/ui-persistent-bottomsheet';
    import { getIOSBottomInset } from '~/utils/safeArea';
    import { isLandscape } from '~/variables';

    /** the persistent sheet, in portrait only */
    export let sheet: NativeViewElementNode<PersistentBottomSheet> = null;
    /** landscape: the panel takes half of the width, or nothing */
    export let panelOpen = true;
    // iOS: the panel goes under the home indicator like the sheet does in portrait
    const bottomInset = getIOSBottomInset();
</script>

<!-- a page and its sheet: in portrait the sheet goes up from the bottom of the page, in landscape it is a panel on its left, the page keeps the right side (its next page shows on the free side) -->
{#if $isLandscape}
    <gridlayout columns={panelOpen ? '*,*' : '0,*'} height="100%" width="100%">
        <gridlayout col={0} ios:marginBottom={-bottomInset}>
            <slot name="sheet" />
        </gridlayout>
        <gridlayout col={1}>
            <slot name="content" />
        </gridlayout>
    </gridlayout>
{:else}
    <bottomsheet bind:this={sheet} {...$$restProps} on:animated on:stepIndexChange on:layoutChanged>
        <slot name="content" />
        <slot name="sheet" />
    </bottomsheet>
{/if}
