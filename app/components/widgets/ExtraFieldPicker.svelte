<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import dayjs from 'dayjs';
    import { formatDate } from '~/helpers/locale';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import { focusState } from '~/utils/svelte/actions';
    import { ExtraFieldType } from '~/models/OCRDocument';
    import { pickDate, showPopoverMenu } from '~/utils/ui';
    import { colors } from '~/variables';
</script>

<script lang="ts">
    let { colorOnSurfaceVariant, colorOutlineVariant } = $colors;
    $: ({ colorOnSurfaceVariant, colorOutlineVariant } = $colors);

    export let editing = false;
    /** the form is shown inside another sheet instead of its own: called with the result (undefined when cancelled) */
    export let onClose: (result?: any) => void = undefined;
    export let name = null;
    export let value = null;
    export let type: ExtraFieldType = ExtraFieldType.Date;
    let currentTime = value ? dayjs(value) : dayjs();
    let currentValue = value;
    let currentName = name;
    let currentType = type;
    let rootView;
    const tMargin = '4 0 4 0';

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
        if (onClose) {
            onClose();
            return;
        }
        rootView.nativeView.bindingContext.closeCallback();
    }

    async function add() {
        try {
            if (!currentName || (!currentValue && currentType !== ExtraFieldType.Date)) {
                throw new SilentError(lc('need_fill_fields'));
            }
            const result = {
                type: currentType,
                name: currentName,
                value: currentType === ExtraFieldType.Date ? currentTime.valueOf() : currentType === ExtraFieldType.Number ? parseFloat(currentValue) : currentValue
            };
            if (onClose) {
                onClose(result);
            } else {
                rootView.nativeView.bindingContext.closeCallback(result);
            }
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

<gesturerootview bind:this={rootView} rows="auto,auto" {...$$restProps}>
    <SheetHeader doneText={editing ? lc('edit') : lc('add')} onCancel={close} onDone={add} title={editing ? lc('edit_extra_field') : lc('add_extra_field')} />
    <stacklayout padding="0 16 16 16" row={1}>
        <gridlayout columns="*,auto">
            <textfield hint={lc('name')} margin={tMargin} text={currentName} use:focusState variant="outline" on:textChange={(e) => (currentName = e.value)} />
            <uibutton
                accessibilityLabel={lc('name')}
                class="icon-btn"
                col={1}
                color={colorOnSurfaceVariant}
                height={48}
                text="mdi-menu-down"
                variant="text"
                verticalAlignment="center"
                width={48}
                on:tap={selecteTemplateName}
            />
        </gridlayout>
        <textfield editable={false} hint={lc('type')} margin={tMargin} text={lc(currentType)} textTransform="uppercase" variant="outline" on:tap={(e) => selectType(e)} />
        {#if currentType === ExtraFieldType.Date}
            <!-- a date is picked, not typed: a tap field -->
            <textfield editable={false} hint={lc('value')} margin={tMargin} text={formatDate(currentTime, 'LL')} variant="outline" on:tap={(e) => selectDate(e)} />
        {:else}
            <textview
                hint={lc('value')}
                keyboardType={getKeyboardType(currentType)}
                margin={tMargin}
                text={currentValue}
                use:focusState
                variant="outline"
                on:textChange={(e) => (currentValue = e.value)}
            />
        {/if}
    </stacklayout>
</gesturerootview>
