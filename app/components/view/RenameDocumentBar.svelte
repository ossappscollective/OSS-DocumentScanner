<script lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import type { TextField } from '@nativescript-community/ui-textfield';
    import { showError } from '@shared/utils/showError';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { lc } from '~/helpers/locale';
    import type { OCRDocument } from '~/models/OCRDocument';
    import { colors } from '~/variables';

    $: ({ colorBackground } = $colors);

    export let document: OCRDocument;
    export let onClose: () => void;
    let textfield: NativeViewElementNode<TextField>;
    let name = document.name;

    $: valid = name.trim().length > 0;

    async function save() {
        try {
            textfield?.nativeView?.clearFocus();
            await document.save({ name: name.trim() }, true, true);
            onClose();
        } catch (error) {
            showError(error);
        }
    }
    // the bar is not shown yet
    const focus = () =>
        setTimeout(() => {
            const field = textfield?.nativeView;
            field?.setSelection(field.text.length);
            field?.requestFocus();
        }, 300);
</script>

<!-- the name field takes the place of the title, the page stays under it -->
<stacklayout backgroundColor={colorBackground} verticalAlignment="top" {...$$restProps}>
    <SheetHeader doneEnabled={valid} doneText={lc('save')} onCancel={onClose} onDone={save} title="" />
    <textfield
        bind:this={textfield}
        hint={lc('name')}
        margin="0 16 8 16"
        returnKeyType="done"
        text={name}
        variant="outline"
        on:loaded={focus}
        on:returnPress={save}
        on:textChange={(event) => (name = event['value'])} />
</stacklayout>
