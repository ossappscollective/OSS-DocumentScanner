<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import dayjs from 'dayjs';
    import { formatDate } from '~/helpers/locale';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { ExtraFieldType } from '~/models/OCRDocument';
    import { pickDate, showPopoverMenu } from '~/utils/ui';
    import { colors } from '~/variables';
</script>

<script lang="ts">
    let { colorOnSurfaceVariant } = $colors;
    $: ({ colorOnSurfaceVariant } = $colors);

    export let editing = false;
    export let name = null;
    export let value = null;
    export let type: ExtraFieldType = ExtraFieldType.Date;
    let currentTime = value ? dayjs(value) : dayjs();
    let currentValue = value;
    let currentName = name;
    let currentType = type;
    let rootView;

    async function selectDate(e) {
        try {
            if (currentType === ExtraFieldType.Date) {
                const dayStart = currentTime.startOf('d');
                const date = await pickDate(currentTime);
                if (date && dayStart.valueOf() !== date) {
                    currentTime = dayjs(date);
                }
            }
        } catch (error) {
            showError(error);
        }
    }

    async function selectType(event) {
        try {
            // const OptionSelect = (await import('~/components/OptionSelect.svelte')).default;
            const options = Object.keys(ExtraFieldType).map((k) => ({ name: lc(ExtraFieldType[k]), id: k }));
            await showPopoverMenu({
                options,
                anchor: event.object,
                onClose: (item) => {
                    currentType = ExtraFieldType[item.id];
                }
            });
        } catch (error) {
            showError(error);
        }
    }
    async function selecteTemplateName(event) {
        try {
            // const OptionSelect = (await import('~/components/OptionSelect.svelte')).default;
            const options = [
                {
                    id: 'valid_from',
                    name: lc('valid_from'),
                    type: ExtraFieldType.Date
                },
                {
                    id: 'expire_on',
                    name: lc('expire_on'),
                    type: ExtraFieldType.Date
                },
                {
                    id: 'balance',
                    name: lc('balance'),
                    type: ExtraFieldType.Number
                },
                {
                    id: 'notes',
                    name: lc('notes'),
                    type: ExtraFieldType.String
                }
            ];
            await showPopoverMenu({
                options,
                anchor: event.object,
                onClose: (item) => {
                    currentName = item.name;
                    currentType = item.type;
                }
            });
        } catch (error) {
            showError(error);
        }
    }

    function close() {
        rootView.nativeView.bindingContext.closeCallback();
    }

    async function add() {
        try {
            if (!currentName || (!currentValue && currentType !== ExtraFieldType.Date)) {
                throw new SilentError(lc('need_fill_fields'));
            }
            rootView.nativeView.bindingContext.closeCallback({
                type: currentType,
                name: currentName,
                value: currentType === ExtraFieldType.Date ? currentTime.valueOf() : currentType === ExtraFieldType.Number ? parseFloat(currentValue) : currentValue
            });
        } catch (error) {
            showError(error);
        }
    }

    function getKeyboardType(type: ExtraFieldType) {
        switch (type) {
            case ExtraFieldType.Number:
                return 'number';

            case ExtraFieldType.Date:
                return 'datetime';

            case ExtraFieldType.String:
                return 'url';

            default:
                break;
        }
    }
</script>

<gesturerootview bind:this={rootView} class="cardFormSheet" rows="auto,auto">
    <SheetHeader doneText={editing ? lc('edit') : lc('add')} onCancel={close} onDone={add} title={editing ? lc('edit_extra_field') : lc('add_extra_field')} />
    <stacklayout class="cardFormGroup" row={1}>
        <ListItemAutoSize columns="auto,*,auto" fontSize={17} item={{ title: lc('name') }} showBottomLine={true}>
            <textfield col={1} floating={false} hint={lc('name')} text={currentName} textAlignment="right" variant="none" verticalAlignment="center" on:textChange={(e) => (currentName = e.value)} />
            <uibutton class="icon-btn" col={2} color={colorOnSurfaceVariant} text="mdi-menu-down" variant="text" verticalAlignment="middle" on:tap={selecteTemplateName} />
        </ListItemAutoSize>
        <ListItemAutoSize fontSize={17} item={{ title: lc('type'), rightValue: lc(currentType) }} showBottomLine={true} on:tap={(e) => selectType(e)} />
        <ListItemAutoSize columns="auto,*" fontSize={17} item={{ title: lc('value') }}>
            <textview
                col={1}
                editable={currentType !== ExtraFieldType.Date}
                hint={lc('value')}
                keyboardType={getKeyboardType(currentType)}
                text={currentType === ExtraFieldType.Date ? formatDate(currentTime, 'LL') : currentValue}
                textAlignment="right"
                variant="none"
                on:textChange={(e) => (currentValue = e.value)}
                on:tap={(e) => selectDate(e)}
            />
        </ListItemAutoSize>
    </stacklayout>
</gesturerootview>
