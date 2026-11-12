<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { showError } from '@shared/utils/showError';
    import { OCRDocument } from '~/models/OCRDocument';
    import { shortcutService } from '~/services/shortcuts';
    import { appIcon } from '~/utils/appIcons';
    import { formatExtraValue, getExtraFields } from '~/utils/extraFields';
    import { pickColor } from '~/utils/ui';
    import { colors } from '~/variables';
    import FormTextField from '~/components/common/FormTextField.svelte';
    import CardEditCodeRow from '~/components/view/CardEditCodeRow.svelte';
    import CardEditDeleteButton from '~/components/view/CardEditDeleteButton.svelte';

    interface CodeRow {
        pageIndex: number;
        original: any;
        text: string;
        removed: boolean;
    }
    interface FieldRow {
        key: string;
        name: string;
        extra: any;
        removed: boolean;
    }
</script>

<script lang="ts">
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary } = $colors);

    export let document: OCRDocument;
    let rootView;

    let name = document.name;
    let color: string = typeof document.extra?.color === 'string' ? document.extra.color : null;
    let codes: CodeRow[] = [];
    document.pages.forEach((page, pageIndex) => {
        (page.qrcode || []).forEach((qrcode) => {
            codes.push({ pageIndex, original: qrcode, text: qrcode.text, removed: false });
        });
    });
    let fields: FieldRow[] = getExtraFields(document.extra).map(({ name: key, extra }) => ({ key, name: key, extra: { ...extra }, removed: false }));

    // the rows are built again when the structure changes, never when a text is typed: the text fields keep their focus
    let listItems: any[] = [];
    function rebuild() {
        const visibleCodes = codes.filter((code) => !code.removed);
        const visibleFields = fields.filter((field) => !field.removed);
        listItems = [
            { type: 'name' },
            { type: 'color' },
            ...(visibleCodes.length ? [{ type: 'sectionheader', title: lc('barcode').toUpperCase() }, ...visibleCodes.map((code) => ({ type: 'code', code }))] : []),
            { type: 'sectionheader', title: lc('extra_fields').toUpperCase() },
            ...visibleFields.map((field) => ({ type: 'field', field })),
            // without any field the button of the header is far from the title of this section
            ...(visibleFields.length ? [] : [{ type: 'addfield' }])
        ];
    }
    rebuild();
    const itemTemplateSelector = (item) => item.type;

    function close(result?: boolean) {
        rootView.nativeView.bindingContext.closeCallback(result);
    }

    function removeCode(code: CodeRow) {
        code.removed = true;
        rebuild();
    }
    async function changeColor(event) {
        try {
            const result = await pickColor(color ?? colorPrimary, { anchor: event.object });
            if (result) {
                color = result.hex;
                rebuild();
            }
        } catch (error) {
            showError(error);
        }
    }
    // the form of a field replaces the content of this sheet: no second sheet over it
    let fieldForm: { field?: FieldRow; ExtraFieldPicker: any } = null;
    async function editField(field?: FieldRow) {
        try {
            const ExtraFieldPicker = (await import('~/components/widgets/ExtraFieldPicker.svelte')).default;
            fieldForm = { field, ExtraFieldPicker };
        } catch (error) {
            showError(error);
        }
    }
    function onFieldFormClose(result?: any) {
        const field = fieldForm?.field;
        fieldForm = null;
        if (!result) {
            return;
        }
        const { name: fieldName, ...others } = result;
        if (field) {
            field.name = fieldName;
            field.extra = others;
        } else {
            fields.push({ key: null, name: fieldName, extra: others, removed: false });
        }
        rebuild();
    }
    function removeField(field: FieldRow) {
        field.removed = true;
        rebuild();
    }

    async function save() {
        try {
            const pagesChanged = new Set<number>();
            codes.forEach((code) => {
                if (code.removed || code.text !== code.original.text) {
                    pagesChanged.add(code.pageIndex);
                }
            });
            for (const pageIndex of pagesChanged) {
                const qrcode = codes.filter((code) => code.pageIndex === pageIndex && !code.removed).map((code) => ({ ...code.original, text: code.text }));
                await document.updatePage(pageIndex, { qrcode }, false, false);
            }
            const extra = { ...(document.extra || {}) };
            fields.forEach((field) => {
                if (field.key) {
                    delete extra[field.key];
                }
            });
            fields.filter((field) => !field.removed).forEach((field) => (extra[field.name] = field.extra));
            if (color) {
                extra.color = color;
            }
            await document.save({ name: name?.length ? name : document.name, extra }, true);
            if (CARD_APP) {
                shortcutService.updateShortcuts(document);
            }
            close(true);
        } catch (error) {
            showError(error);
        }
    }
</script>

<gesturerootview bind:this={rootView} rows="auto,*">
    {#if fieldForm}
        <svelte:component this={fieldForm.ExtraFieldPicker} editing={!!fieldForm.field} name={fieldForm.field?.name} onClose={onFieldFormClose} rowSpan={2} {...fieldForm.field?.extra || {}} />
    {/if}
    <SheetHeader
        visibility={fieldForm ? 'collapse' : 'visible'}
        actionIcon={appIcon('add')}
        actionLabel={lc('add_extra_field')}
        doneText={lc('save')}
        onAction={() => editField()}
        onCancel={() => close(false)}
        onDone={save}
        title={lc('edit')}
    />
    <collectionview row={1} {itemTemplateSelector} items={listItems} paddingBottom={24} visibility={fieldForm ? 'collapse' : 'visible'}>
        <Template key="name" let:item>
            <FormTextField label={lc('name')} margin="0 16 8 16" bind:text={name} />
        </Template>

        <Template key="color" let:item>
            <gridlayout columns="*,auto" margin="8 16 8 16" padding="0 4 0 4" on:tap={changeColor}>
                <label color={colorOnSurface} fontSize={17} text={lc('color')} verticalAlignment="center" />
                <absolutelayout backgroundColor={color ?? colorPrimary} borderColor={colorOutlineVariant} borderRadius="50%" borderWidth={2} col={1} height={36} width={36} />
            </gridlayout>
        </Template>

        <Template key="sectionheader" let:item>
            <label color={colorOnSurfaceVariant} fontSize={13} margin="16 20 4 20" text={item.title} />
        </Template>

        <Template key="code" let:item>
            <CardEditCodeRow code={item.code} onRemove={() => removeCode(item.code)} />
        </Template>

        <Template key="field" let:item>
            <gridlayout columns="*,auto" margin="0 16">
                <FormTextField
                    editable={false}
                    label={item.field.name}
                    minHeight={48}
                    multiline={true}
                    margin="0 0 8 0"
                    text={formatExtraValue(item.field.extra) + ''}
                    onTap={() => editField(item.field)}
                />
                <CardEditDeleteButton col={1} on:tap={() => removeField(item.field)} />
            </gridlayout>
        </Template>

        <Template key="addfield" let:item>
            <uibutton height={44} margin="4 16 8 16" text={lc('add_extra_field')} variant="outline" on:tap={() => editField()} />
        </Template>
    </collectionview>
</gesturerootview>
