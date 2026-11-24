<script lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import CActionBar from '@shared/components/CActionBar.svelte';
    import { TextField } from '@nativescript-community/ui-textfield';
    import { lc } from '~/helpers/locale';
    import { DocFolder, OCRDocument } from '~/models/OCRDocument';
    import { shortcutService } from '~/services/shortcuts';
    import { showError } from '@shared/utils/showError';
    import { SHEET_PAN_SOFT_INPUT_MODE } from '~/utils/constants';
    import { formatNamingTemplate, hasTemplateTokensOrPlaceholders } from '~/utils/namingTemplates';
    import { colors } from '~/variables';

    let { colorBackground } = $colors;
    $: ({ colorBackground } = $colors);

    export let document: OCRDocument = null;
    export let folder: DocFolder = null;
    export let editingTitle = false;
    export let labelsDefaultVisualState = null;
    export let buttonsDefaultVisualState = null;
    export let onSave = null;
    export let onRenameSuccessful = null;
    export let onGoBack = null;
    export let autoFocus = true;
    let editingTitleTextField: NativeViewElementNode<TextField>;

    async function saveDocumentTitle(event) {
        try {
            const rawValue = (editingTitleTextField.nativeElement.text || '').trim();
            const customText = (typeof document?.extra?.customText === 'string' ? document.extra.customText : '') || '';
            const newValue =
                document && hasTemplateTokensOrPlaceholders(rawValue)
                    ? formatNamingTemplate(rawValue, {
                          date: document.createdDate,
                          customText,
                          pageCount: document.pages?.length,
                          documentName: document.name,
                          clean: false
                      })
                    : rawValue;
            if (onSave) {
                onSave(newValue);
            } else {
                editingTitleTextField.nativeElement.clearFocus();
                const target = document || folder;
                const nameChanged = document && newValue !== document.name;
                await target.save(
                    {
                        name: newValue,
                        ...(nameChanged ? { _synced: 0 } : {})
                    },
                    true,
                    true
                );
                if (CARD_APP && document) {
                    shortcutService.updateShortcuts(document);
                }
                onRenameSuccessful?.(document || folder);
            }
            editingTitle = false;
        } catch (error) {
            showError(error);
        }
    }
    async function onTextFieldFocus(event) {
        try {
            if (!autoFocus) {
                return;
            }
            const textField = event.object as TextField;
            textField.setSelection(textField.text.length);
            textField.requestFocus();
        } catch (error) {
            showError(error);
        }
    }

    async function selectNamingTemplate(event) {
        try {
            if (!document) {
                return;
            }
            const RenameDocumentSheet = (await import('~/components/view/RenameDocumentSheet.svelte')).default;
            const saved = await showBottomSheet({
                view: RenameDocumentSheet,
                windowSoftInputMode: SHEET_PAN_SOFT_INPUT_MODE,
                ignoreTopSafeArea: true,
                props: { document }
            });
            if (saved) {
                if (editingTitleTextField?.nativeElement) {
                    editingTitleTextField.nativeElement.text = document.name;
                }
                editingTitle = false;
                onRenameSuccessful?.(document);
            }
        } catch (error) {
            showError(error);
        }
    }

    function onInnerGoBack() {
        onGoBack?.();
        editingTitle = false;
    }
</script>

<CActionBar backgroundColor={colorBackground} {buttonsDefaultVisualState} {labelsDefaultVisualState} modalWindow={true} onGoBack={onInnerGoBack} orceCanGoBack={true} title={null} {...$$restProps}>
    <gridlayout slot="center" col={1} columns="*,auto,auto">
        <textfield
            bind:this={editingTitleTextField}
            backgroundColor="transparent"
            defaultVisualState={labelsDefaultVisualState}
            android:padding="4 0 4 0"
            text={(document || folder).name}
            verticalTextAlignment="center"
            on:returnPress={saveDocumentTitle}
            on:layoutChanged={onTextFieldFocus}
        />
        {#if document}
            <uibutton class="actionBarButton" col={1} defaultVisualState={buttonsDefaultVisualState} text="mdi-file-document-edit-outline" variant="text" on:tap={selectNamingTemplate} />
        {/if}
        <uibutton class="actionBarButton" col={2} defaultVisualState={buttonsDefaultVisualState} text="mdi-content-save" variant="text" on:tap={saveDocumentTitle} />
    </gridlayout>
    <slot />
</CActionBar>
