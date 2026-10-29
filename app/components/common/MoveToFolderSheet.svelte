<script lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import type { TextField } from '@nativescript-community/ui-textfield';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { lc } from '~/helpers/locale';
    import { DocFolder } from '~/models/OCRDocument';
    import { colors, windowInset } from '~/variables';

    const MAX_CHIPS = 12;

    let { colorOnSurfaceVariant } = $colors;
    $: ({ colorOnSurfaceVariant } = $colors);

    /** every folder the documents can go to */
    export let folders: DocFolder[];
    /** the folder the documents are in now, undefined at the root */
    export let currentFolder: DocFolder = undefined;

    let rootView;
    let textfield: NativeViewElementNode<TextField>;
    let name = '';

    $: lowerName = name.trim().toLowerCase();
    $: suggestions = folders.filter((folder) => folder.id !== currentFolder?.id && (!lowerName || folder.name.toLowerCase().includes(lowerName))).slice(0, MAX_CHIPS);

    function close(folderName?: string) {
        rootView.nativeView.bindingContext.closeCallback(folderName);
    }
    // an empty name removes the documents from their folder
    const move = (folderName = name) => close(folderName.trim());
    // the sheet is not shown yet
    const focus = () => setTimeout(() => textfield?.nativeView?.requestFocus(), 400);
</script>

<gesturerootview bind:this={rootView} padding="0 0 {$windowInset.bottom + 16} 0" rows="auto,auto,auto,auto">
    <SheetHeader doneText={lc('move')} onCancel={() => close()} onDone={() => move()} title={lc('move_folder')} />
    <textfield
        bind:this={textfield}
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('folder')}
        margin="0 16"
        returnKeyType="done"
        row={1}
        text={name}
        variant="outline"
        on:loaded={focus}
        on:returnPress={() => move()}
        on:textChange={(e) => (name = e['value'])}
    />
    <label color={colorOnSurfaceVariant} fontSize={13} margin="4 20 0 20" row={2} text={lc('move_folder_desc')} textWrap={true} />
    <wraplayout margin="8 16 0 16" row={3} visibility={suggestions.length ? 'visible' : 'collapsed'}>
        {#each suggestions as folder (folder.id)}
            <uibutton height={32} margin="0 8 8 0" text={folder.name} variant="outline" on:tap={() => move(folder.name)} />
        {/each}
    </wraplayout>
</gesturerootview>
