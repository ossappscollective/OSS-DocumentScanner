<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import dayjs from 'dayjs';
    import { formatDate } from '~/helpers/locale';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import type { SelectedIndexChangedEventData } from '@nativescript/core';
    import { ExtraFieldType } from '~/models/OCRDocument';
    import { pickDate } from '~/utils/ui';
</script>

<script lang="ts">
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

    const types = Object.values(ExtraFieldType);
    function onTypeChanged(event: SelectedIndexChangedEventData) {
        currentType = types[event.newIndex];
    }
    const nameTemplates = [
        { id: 'valid_from', name: lc('valid_from'), type: ExtraFieldType.Date },
        { id: 'expire_on', name: lc('expire_on'), type: ExtraFieldType.Date },
        { id: 'balance', name: lc('balance'), type: ExtraFieldType.Number },
        { id: 'notes', name: lc('notes'), type: ExtraFieldType.String }
    ];
    function selectTemplate(template: (typeof nameTemplates)[number]) {
        currentName = template.name;
        currentType = template.type;
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
        <textfield hint={lc('name')} margin={tMargin} text={currentName} variant="outline" on:textChange={(e) => (currentName = e.value)} />
        <!-- usual names: a tap fills the name and the type -->
        <scrollview marginBottom={8} orientation="horizontal">
            <stacklayout orientation="horizontal">
                {#each nameTemplates as template (template.id)}
                    <uibutton height={32} marginRight={8} text={template.name} variant="outline" on:tap={() => selectTemplate(template)} />
                {/each}
            </stacklayout>
        </scrollview>
        <!-- the type is one of 3 values: a segmented control, not a drop down -->
        <segmentedbar margin={tMargin} selectedIndex={types.indexOf(currentType)} on:selectedIndexChanged={onTypeChanged}>
            {#each types as type (type)}
                <segmentedbaritem title={lc(type)} />
            {/each}
        </segmentedbar>
        <textview
            editable={currentType !== ExtraFieldType.Date}
            fontSize={17}
            hint={lc('value')}
            keyboardType={getKeyboardType(currentType)}
            margin={tMargin}
            minHeight={currentType === ExtraFieldType.Date ? 48 : 84}
            text={currentType === ExtraFieldType.Date ? formatDate(currentTime, 'LL') : currentValue}
            variant="outline"
            on:textChange={(e) => (currentValue = e.value)}
            on:tap={(e) => selectDate(e)}
        />
    </stacklayout>
</gesturerootview>
