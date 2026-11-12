<script lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import type { TextField } from '@nativescript-community/ui-textfield';
    import { showError } from '@shared/utils/showError';
    import { onMount } from 'svelte';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { lc } from '~/helpers/locale';
    import type { OCRDocument } from '~/models/OCRDocument';
    import { windowInset } from '~/variables';

    export let document: OCRDocument;

    let rootView;
    let textfield: NativeViewElementNode<TextField>;
    let name = document.name;

    $: valid = name.trim().length > 0;

    function close(saved = false) {
        rootView.nativeView.bindingContext.closeCallback(saved);
    }
    async function save() {
        if (!valid) {
            return;
        }
        try {
            await document.save({ name: name.trim() }, true, true);
            close(true);
        } catch (error) {
            showError(error);
        }
    }
    // the keyboard opens once the sheet is shown, not while it comes in
    onMount(() =>
        rootView.nativeView.once('shownInBottomSheet', () => {
            const field = textfield?.nativeView;
            field?.setSelection(field.text.length);
            field?.requestFocus();
        })
    );
</script>

<gesturerootview bind:this={rootView} padding="0 0 {$windowInset.bottom + 16} 0" rows="auto,auto">
    <SheetHeader doneEnabled={valid} doneText={lc('save')} onCancel={() => close()} onDone={save} title={lc('rename')} />
    <textfield
        bind:this={textfield}
        hint={lc('name')}
        margin="0 16"
        returnKeyType="done"
        row={1}
        text={name}
        variant="outline"
        on:returnPress={save}
        on:textChange={(event) => (name = event['value'])} />
</gesturerootview>
