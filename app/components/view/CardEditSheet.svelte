<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { TextField } from '@nativescript-community/ui-textfield';
    import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { showError } from '@shared/utils/showError';
    import dayjs from 'dayjs';
    import { ExtraFieldType, OCRDocument } from '~/models/OCRDocument';
    import { qrcodeService } from '~/services/qrcode';
    import { shortcutService } from '~/services/shortcuts';
    import { appIcon } from '~/utils/appIcons';
    import { pickColor } from '~/utils/ui';
    import { colors } from '~/variables';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';

    interface CodeRow {
        id: number;
        pageIndex: number;
        original: any;
        text: string;
        scale: number;
        error?: string;
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
    let { colorBackground, colorError, colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurface } = $colors;
    $: ({ colorBackground, colorError, colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurface } = $colors);

    export let document: OCRDocument;
    let rootView;

    let name = document.name;
    let color: string = typeof document.extra?.color === 'string' ? document.extra.color : null;
    let codes: CodeRow[] = [];
    document.pages.forEach((page, pageIndex) => {
        (page.qrcode || []).forEach((qrcode) => {
            codes.push({ id: codes.length, pageIndex, original: qrcode, text: qrcode.text, scale: qrcode.scale ?? 1, removed: false });
        });
    });
    let fields: FieldRow[] = Object.keys(document.extra || {})
        .filter((key) => key !== 'color' && key !== 'pkpass' && typeof document.extra[key] === 'object')
        .map((key) => ({ key, name: key, extra: { ...(document.extra[key] as any) }, removed: false }));

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
            { type: 'add' }
        ];
    }
    rebuild();
    const itemTemplateSelector = (item) => item.type;

    function close(result?: boolean) {
        rootView.nativeView.bindingContext.closeCallback(result);
    }

    async function onCodeText(code: CodeRow, text: string, field: unknown) {
        code.text = text;
        try {
            const svg = await qrcodeService.getQRCodeSVG({ ...code.original, text }, 100, 'black');
            code.error = svg?.length ? undefined : lc('unsupported_barcode_value');
        } catch (error) {
            code.error = lc('unsupported_barcode_value');
        }
        // the error is set on the field itself: the rows are not built again while typing
        if (field instanceof TextField) {
            field.error = code.error;
        }
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
    function formatValue(extra) {
        return extra?.type === ExtraFieldType.Date ? dayjs(extra.value).format(extra.format || 'LL') : (extra?.value ?? '');
    }
    async function editField(field?: FieldRow) {
        try {
            const ExtraFieldPicker = (await import('~/components/widgets/ExtraFieldPicker.svelte')).default;
            const result = await showBottomSheet({
                parent: rootView,
                skipCollapsedState: true,
                view: ExtraFieldPicker,
                props: { editing: !!field, ...(field?.extra || {}) }
            });
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
        } catch (error) {
            showError(error);
        }
    }
    function removeField(field: FieldRow) {
        field.removed = true;
        rebuild();
    }

    async function save() {
        try {
            const pagesChanged = new Set<number>();
            codes.forEach((code) => {
                if (code.removed || code.text !== code.original.text || (code.scale ?? 1) !== (code.original.scale ?? 1)) {
                    pagesChanged.add(code.pageIndex);
                }
            });
            for (const pageIndex of pagesChanged) {
                const qrcode = codes
                    .filter((code) => code.pageIndex === pageIndex && !code.removed)
                    .map((code) => ({ ...code.original, text: code.text, ...(code.scale !== 1 || code.original.scale ? { scale: code.scale } : {}) }));
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

<gesturerootview bind:this={rootView} backgroundColor={__IOS__ ? colorBackground : colorSurface} rows="auto,*">
    <gridlayout columns="auto,*,auto" padding="12 16 8 16">
        <uibutton text={lc('cancel')} variant="text" on:tap={() => close(false)} />
        <label col={1} color={colorOnSurface} fontSize={17} fontWeight="bold" text={lc('edit')} textAlignment="center" verticalAlignment="center" />
        <uibutton col={2} text={lc('save')} variant="contained" on:tap={save} />
    </gridlayout>
    <collectionview row={1} {itemTemplateSelector} items={listItems}>
        <Template key="name" let:item>
            <textfield hint={lc('name')} margin="4 16 4 16" text={name} variant={__IOS__ ? 'none' : 'filled'} on:textChange={(e) => (name = e.value)} />
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
            <gridlayout columns="*,auto" margin="2 16 2 16">
                <textfield error={item.code.error} hint={lc('barcode')} text={item.code.text} variant={__IOS__ ? 'none' : 'filled'} on:textChange={(e) => onCodeText(item.code, e.value, e.object)} />
                <uibutton col={1} color={colorError} variant="text" {...{ src: appIcon('delete') }} on:tap={() => removeCode(item.code)} />
            </gridlayout>
        </Template>

        <Template key="field" let:item>
            <ListItemAutoSize fontSize={17} item={{ title: item.field.name, subtitle: formatValue(item.field.extra) }} on:tap={() => editField(item.field)}>
                <uibutton col={1} color={colorError} variant="text" {...{ src: appIcon('delete') }} on:tap={() => removeField(item.field)} />
            </ListItemAutoSize>
        </Template>

        <Template key="add" let:item>
            <uibutton margin="8 16 24 16" text={lc('add_extra_field')} variant={__IOS__ ? 'tinted' : 'text'} on:tap={() => editField()} />
        </Template>
    </collectionview>
</gesturerootview>
