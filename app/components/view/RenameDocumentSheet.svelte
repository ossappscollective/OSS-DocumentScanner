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
    import { appIcon } from '~/utils/appIcons';
    import { DOCUMENT_NAME_FORMAT, SETTINGS_DOCUMENT_NAME_FORMAT } from '~/utils/constants';
    import { showSnack } from '~/utils/ui';
    import {
        NAMING_PLACEHOLDERS,
        NamingTemplate,
        addOrUpdateNamingTemplate,
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

    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurfaceContainer } = $colors);

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

    let templates: NamingTemplate[] = getNamingTemplates();
    let selectedTemplateId: string = templates.find((t) => t.pattern === pattern)?.id ?? null;

    $: previewName = formatNamingTemplate(pattern, {
        date: sampleDate,
        customText,
        pageCount,
        documentName: document?.name || 'Scan',
        clean: true
    });

    $: resolvedDocumentName = formatNamingTemplate(pattern, {
        date: sampleDate,
        customText,
        pageCount,
        documentName: document?.name || 'Scan',
        clean: false
    });

    $: valid = pattern.trim().length > 0 && (document ? resolvedDocumentName.trim().length > 0 : true);

    function onCustomTextInput(newCustomText: string) {
        customText = newCustomText ?? '';
    }

    function clearCustomText() {
        customText = '';
        if (customTextField?.nativeView) {
            customTextField.nativeView.text = '';
        }
    }

    function onPatternInput(newPattern: string) {
        pattern = newPattern ?? '';
        selectedTemplateId = templates.find((t) => t.pattern === pattern)?.id ?? null;
    }

    function selectTemplate(tpl: NamingTemplate) {
        selectedTemplateId = tpl.id;
        pattern = tpl.pattern;
        if (tpl.defaultCustomText && !customText) {
            customText = tpl.defaultCustomText;
            if (customTextField?.nativeView) {
                customTextField.nativeView.text = customText;
            }
        }
        if (patternTextField?.nativeView) {
            patternTextField.nativeView.text = pattern;
        }
    }

    function insertPlaceholder(token: string) {
        const isSeparatorToken = token === '.' || token === '_' || token === '-';
        const endsWithSeparator = /[._\-\s/]$/.test(pattern);
        const nextPattern =
            pattern.length === 0 || isSeparatorToken || endsWithSeparator
                ? `${pattern}${token}`
                : `${pattern}.${token}`;
        pattern = nextPattern;
        selectedTemplateId = templates.find((t) => t.pattern === pattern)?.id ?? null;
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
                selectedTemplateId = templates.find((t) => t.pattern === pattern.trim())?.id ?? null;
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
            const cleanPattern = pattern.trim();
            const cleanCustom = customText.trim();
            setActiveNamingPattern(cleanPattern);
            setDefaultCustomText(cleanCustom);
            if (document) {
                const nextName = resolvedDocumentName.trim();
                const nameChanged = nextName !== document.name;
                const extra = {
                    ...(document.extra || {}),
                    customText: cleanCustom,
                    templatePattern: cleanPattern,
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
                showSnack({ message: nextName });
                close(true);
            } else {
                showSnack({ message: `${previewName}.pdf` });
                close(cleanPattern);
            }
        } catch (error) {
            showError(error);
        }
    }

    // Focus the Freetext field first so the user can immediately type their custom text
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

    <!-- Live Filename Preview Card -->
    <gridlayout
        backgroundColor={colorSurfaceContainer}
        borderColor={colorOutlineVariant}
        borderRadius={12}
        borderWidth={1}
        columns="*,auto"
        margin="4 16 10 16"
        padding="10 12"
        row={1}>
        <stacklayout verticalAlignment="center">
            <label color={colorOnSurfaceVariant} fontSize={11} fontWeight="600" text={lc('preview')} />
            <label
                color={colorPrimary}
                fontSize={14}
                fontWeight="bold"
                marginTop={2}
                text={document ? resolvedDocumentName : `${previewName}.pdf`}
                textWrap={true} />
        </stacklayout>
        <uibutton
            col={1}
            height={34}
            marginLeft={8}
            text={lc('save_as_template')}
            variant="text"
            verticalAlignment="center"
            on:tap={saveCurrentAsTemplate} />
    </gridlayout>

    <!-- Freetext Input -->
    <gridlayout margin="0 16 8 16" row={2}>
        <textfield
            bind:this={customTextField}
            accessibilityLabel={lc('freetext_label')}
            android:height={56}
            hint={lc('custom_text_placeholder')}
            ios:paddingRight={customText ? 44 : undefined}
            returnKeyType="done"
            text={customText}
            variant="outline"
            on:returnPress={save}
            on:textChange={(event) => onCustomTextInput(event['value'])} />
        {#if customText}
            <uibutton
                accessibilityLabel={lc('clear')}
                color={colorOnSurfaceVariant}
                height={44}
                horizontalAlignment="right"
                padding="0"
                variant="text"
                verticalAlignment="center"
                width={44}
                {...{ src: appIcon('clear') }}
                on:tap={clearCustomText} />
        {/if}
    </gridlayout>

    <!-- Template Pattern Input -->
    <textfield
        bind:this={patternTextField}
        accessibilityLabel={lc('template_pattern_label')}
        android:height={56}
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('template_pattern_hint')}
        margin="0 16 10 16"
        returnKeyType="done"
        row={3}
        text={pattern}
        variant="outline"
        on:returnPress={save}
        on:textChange={(event) => onPatternInput(event['value'])} />

    <!-- Saved & Default Presets -->
    <stacklayout margin="0 0 8 0" row={4}>
        <label color={colorOnSurfaceVariant} fontSize={12} fontWeight="600" margin="0 16 4 16" text={lc('naming_templates')} />
        <scrollview height={40} orientation="horizontal" scrollBarIndicatorVisible={false}>
            <stacklayout orientation="horizontal" padding="0 12">
                {#each templates as tpl (tpl.id)}
                    <uibutton
                        borderRadius={16}
                        fontSize={12}
                        height={32}
                        margin="2 4"
                        padding="0 12"
                        text={tpl.name}
                        variant={selectedTemplateId === tpl.id || pattern === tpl.pattern ? 'contained' : 'outline'}
                        on:tap={() => selectTemplate(tpl)}
                        on:longPress={() => removeTemplate(tpl)} />
                {/each}
            </stacklayout>
        </scrollview>
    </stacklayout>

    <!-- Placeholders -->
    <stacklayout margin="0 16 0 16" row={5}>
        <label color={colorOnSurfaceVariant} fontSize={12} fontWeight="600" margin="0 0 4 0" text={lc('placeholders')} />
        <wraplayout>
            {#each NAMING_PLACEHOLDERS as ph (ph.token)}
                <uibutton
                    borderRadius={14}
                    fontSize={12}
                    height={30}
                    margin="0 6 6 0"
                    padding="0 10"
                    text={ph.label}
                    variant="outline"
                    on:tap={() => insertPlaceholder(ph.token)} />
            {/each}
        </wraplayout>
        <label color={colorOnSurfaceVariant} fontSize={11} margin="2 0 0 0" opacity={0.8} text={lc('tap_placeholder_to_insert')} textWrap={true} />
    </stacklayout>
</gesturerootview>
