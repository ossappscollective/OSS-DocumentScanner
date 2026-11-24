<script lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { confirm, prompt } from '@nativescript-community/ui-dialogs';
    import type { TextField } from '@nativescript-community/ui-textfield';
    import { ApplicationSettings } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { onMount } from 'svelte';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { lc } from '~/helpers/locale';
    import type { OCRDocument } from '~/models/OCRDocument';
    import { DOCUMENT_NAME_FORMAT, SETTINGS_DOCUMENT_NAME_FORMAT } from '~/utils/constants';
    import { showSnack } from '~/utils/ui';
    import {
        NAMING_PLACEHOLDERS,
        NamingTemplate,
        addOrUpdateNamingTemplate,
        applyFreetextToPattern,
        deleteNamingTemplate,
        formatNamingTemplate,
        getActiveNamingPattern,
        getDefaultCustomText,
        getNamingTemplates,
        hasTemplateTokensOrPlaceholders,
        setActiveNamingPattern,
        setDefaultCustomText
    } from '~/utils/namingTemplates';
    import { colors, windowInset } from '~/variables';

    export let document: OCRDocument = null;
    export let initialPattern: string = null;
    export let title: string = null;

    $: ({ colorOnSurfaceVariant, colorPrimary } = $colors);

    let rootView;
    let patternTextField: NativeViewElementNode<TextField>;
    let customTextField: NativeViewElementNode<TextField>;

    const sampleDate = document?.createdDate ?? Date.now();
    const pageCount = document?.pages?.length ?? 1;
    let customText =
        (typeof document?.extra?.customText === 'string' ? document.extra.customText : '') ||
        getDefaultCustomText() ||
        '';
    const savedDocPattern = typeof document?.extra?.templatePattern === 'string' ? document.extra.templatePattern : '';
    const configuredGlobalPattern = ApplicationSettings.getString(SETTINGS_DOCUMENT_NAME_FORMAT, DOCUMENT_NAME_FORMAT);
    const defaultTemplatePattern =
        configuredGlobalPattern && configuredGlobalPattern !== 'L LTS'
            ? configuredGlobalPattern
            : getActiveNamingPattern('YYYY-MM-DD.{freetext}.HH-mm');

    let basePattern =
        savedDocPattern ||
        getActiveNamingPattern(
            initialPattern && /freetext|freitext/i.test(initialPattern)
                ? initialPattern
                : 'YYYY-MM-DD.{freetext}.HH-mm'
        );

    let pattern =
        initialPattern ||
        savedDocPattern ||
        (document && hasTemplateTokensOrPlaceholders(document.name) ? document.name : defaultTemplatePattern);

    // If opening for an existing document that already had a plain custom name (and no saved customText yet),
    // pre-fill customText with that plain name so the user's text is never lost.
    if (document && !customText && document.name && !hasTemplateTokensOrPlaceholders(document.name)) {
        const defaultDateTitle = formatNamingTemplate(DOCUMENT_NAME_FORMAT, { date: sampleDate, clean: false });
        if (document.name !== defaultDateTitle) {
            customText = document.name;
        }
    }

    if (customText) {
        pattern = applyFreetextToPattern(basePattern, customText);
    }

    let templates: NamingTemplate[] = getNamingTemplates();
    let selectedTemplateId: string = null;

    $: effectivePattern = customText.trim() ? applyFreetextToPattern(basePattern, customText.trim()) : pattern;

    $: effectiveResultClean = formatNamingTemplate(effectivePattern, {
        date: sampleDate,
        customText,
        pageCount,
        documentName: document?.name || 'Scan',
        clean: true
    });

    $: previewName = effectiveResultClean;

    $: resolvedDocumentName = formatNamingTemplate(effectivePattern, {
        date: sampleDate,
        customText,
        pageCount,
        documentName: document?.name || 'Scan',
        clean: false
    });

    $: valid = effectivePattern.trim().length > 0 && (document ? resolvedDocumentName.trim().length > 0 : true);

    function onCustomTextInput(newCustomText: string) {
        customText = newCustomText;
        pattern = customText.trim() ? applyFreetextToPattern(basePattern, customText.trim()) : basePattern;
        if (patternTextField?.nativeView && patternTextField.nativeView.text !== pattern) {
            patternTextField.nativeView.text = pattern;
        }
    }

    function onPatternInput(newPattern: string) {
        pattern = newPattern;
        basePattern = newPattern;
    }

    function selectTemplate(tpl: NamingTemplate) {
        selectedTemplateId = tpl.id;
        basePattern = tpl.pattern;
        if (tpl.defaultCustomText && !customText) {
            customText = tpl.defaultCustomText;
            if (customTextField?.nativeView) {
                customTextField.nativeView.text = customText;
            }
        }
        pattern = customText.trim() ? applyFreetextToPattern(basePattern, customText.trim()) : basePattern;
        if (patternTextField?.nativeView) {
            patternTextField.nativeView.text = pattern;
        }
    }

    function insertPlaceholder(token: string) {
        const isSeparatorToken = token === '.' || token === '_' || token === '-';
        const endsWithSeparator = /[._\-\s/]$/.test(basePattern);
        const nextBase =
            basePattern.length === 0 || isSeparatorToken || endsWithSeparator
                ? `${basePattern}${token}`
                : `${basePattern}.${token}`;
        basePattern = nextBase;
        pattern = customText.trim() ? applyFreetextToPattern(basePattern, customText.trim()) : basePattern;
        if (patternTextField?.nativeView) {
            patternTextField.nativeView.text = pattern;
        }
    }

    async function saveCurrentAsTemplate() {
        try {
            if (!pattern.trim()) {
                return;
            }
            const res = await prompt({
                title: lc('save_naming_template'),
                message: lc('save_naming_template_desc'),
                okButtonText: lc('save'),
                cancelButtonText: lc('cancel'),
                defaultText: pattern.trim()
            });
            if (res?.result && res.text?.trim()) {
                templates = addOrUpdateNamingTemplate({
                    name: res.text.trim(),
                    pattern: pattern.trim(),
                    defaultCustomText: customText.trim() || undefined
                });
            }
        } catch (error) {
            showError(error);
        }
    }

    async function removeTemplate(tpl: NamingTemplate) {
        try {
            const ok = await confirm({
                title: lc('delete'),
                message: `${tpl.name} (${tpl.pattern})`,
                okButtonText: lc('delete'),
                cancelButtonText: lc('cancel')
            });
            if (ok) {
                templates = deleteNamingTemplate(tpl.id);
                if (selectedTemplateId === tpl.id) {
                    selectedTemplateId = null;
                }
            }
        } catch (error) {
            showError(error);
        }
    }

    function close(result: any = false) {
        rootView.nativeView.bindingContext.closeCallback(result);
    }

    async function save() {
        if (!valid) {
            return;
        }
        try {
            const cleanBase = basePattern.trim() || pattern.trim();
            const cleanCustom = customText.trim();
            const finalPatternWithFreetext = cleanCustom ? applyFreetextToPattern(cleanBase, cleanCustom) : pattern.trim();
            setActiveNamingPattern(cleanBase);
            setDefaultCustomText(cleanCustom);
            if (document) {
                const nextName = resolvedDocumentName.trim();
                const nameChanged = nextName !== document.name;
                const extra = {
                    ...(document.extra || {}),
                    customText: cleanCustom,
                    templatePattern: cleanBase,
                    customRenamed: true
                };
                await document.save(
                    {
                        name: nextName,
                        extra,
                        ...(nameChanged ? { _synced: 0 } : {})
                    },
                    true,
                    true
                );
                showSnack({
                    message: cleanCustom ? `✅ ${nextName} (Freetext: ${cleanCustom})` : `✅ ${nextName}`
                });
                close(true);
            } else {
                showSnack({
                    message: cleanCustom ? `✅ ${previewName}.pdf (Freetext: ${cleanCustom})` : `✅ ${previewName}.pdf`
                });
                close(finalPatternWithFreetext);
            }
        } catch (error) {
            showError(error);
        }
    }

    // Focus the Freetext field first so the user can immediately type their custom word!
    onMount(() =>
        rootView.nativeView.once('shownInBottomSheet', () => {
            const field = customTextField?.nativeView || patternTextField?.nativeView;
            if (field) {
                field.setSelection(field.text?.length || 0);
                field.requestFocus();
            }
        })
    );
</script>

<gesturerootview bind:this={rootView} padding="0 0 {$windowInset.bottom + 16} 0" rows="auto,auto,auto,auto,auto,auto">
    <SheetHeader doneEnabled={valid} doneText={lc('save')} onCancel={() => close()} onDone={save} title={title || lc('rename')} />

    <textfield
        bind:this={customTextField}
        hint={lc('custom_text_placeholder')}
        margin="0 16 4 16"
        returnKeyType="done"
        row={1}
        text={customText}
        variant="outline"
        on:returnPress={save}
        on:textChange={(event) => onCustomTextInput(event['value'])} />

    <textfield
        bind:this={patternTextField}
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('template_pattern_hint')}
        margin="4 16 4 16"
        returnKeyType="done"
        row={2}
        text={pattern}
        variant="outline"
        on:returnPress={save}
        on:textChange={(event) => onPatternInput(event['value'])} />

    <gridlayout columns="*,auto" margin="2 16 4 16" row={3}>
        <label color={colorPrimary} fontSize={13} fontWeight="bold" text={`${lc('preview')}: ${previewName}.pdf`} textWrap={true} verticalAlignment="center" />
        <uibutton col={1} height={30} text={lc('save_as_template')} variant="text" on:tap={saveCurrentAsTemplate} />
    </gridlayout>

    <scrollview height={40} margin="0 12 4 12" orientation="horizontal" row={4}>
        <stacklayout orientation="horizontal">
            {#each templates as tpl (tpl.id)}
                <uibutton
                    height={32}
                    margin="2 4"
                    text={tpl.name}
                    variant={selectedTemplateId === tpl.id || pattern === tpl.pattern ? 'contained' : 'outline'}
                    on:tap={() => selectTemplate(tpl)}
                    on:longPress={() => removeTemplate(tpl)} />
            {/each}
        </stacklayout>
    </scrollview>

    <stacklayout margin="2 16 0 16" row={5}>
        <label color={colorOnSurfaceVariant} fontSize={11} margin="0 0 4 0" text={lc('tap_placeholder_to_insert')} />
        <wraplayout>
            {#each NAMING_PLACEHOLDERS as ph (ph.token)}
                <uibutton height={30} margin="0 5 5 0" text={ph.label} variant="outline" on:tap={() => insertPlaceholder(ph.token)} />
            {/each}
        </wraplayout>
    </stacklayout>
</gesturerootview>
