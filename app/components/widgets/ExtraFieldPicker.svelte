<script context="module" lang="ts">
    import { lc } from '@nativescript-community/l';
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import dayjs from 'dayjs';
    import { formatDate } from '~/helpers/locale';
    import FormTextField from '~/components/common/FormTextField.svelte';
    import SheetHeader from '~/components/common/SheetHeader.svelte';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { showMenu } from '@nativescript-community/ui-menu';
    import type { SegmentedBar, SelectedIndexChangedEventData, View } from '@nativescript/core';
    import { appIcon } from '~/utils/appIcons';
    import { onMount } from 'svelte';
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
    export let kind: string = undefined;
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
    // a date and a typed value do not share their text: the field starts empty when it changes from one to the other
    function setType(newType: ExtraFieldType) {
        if (newType === currentType) {
            return;
        }
        if (newType === ExtraFieldType.Date || currentType === ExtraFieldType.Date) {
            currentValue = '';
        }
        currentType = newType;
    }
    // the first selection is not drawn when it is set before the items exist (the property already has its value, the native control is not updated)
    let typesBar: NativeViewElementNode<SegmentedBar>;
    onMount(() =>
        setTimeout(() => {
            const index = types.indexOf(currentType);
            if (__IOS__) {
                typesBar.nativeView.ios.selectedSegmentIndex = index;
            } else {
                // MaterialButtonToggleGroup: the button of the first selection
                const group = typesBar.nativeView.android as com.google.android.material.button.MaterialButtonToggleGroup;
                group.check(group.getChildAt(index).getId());
            }
        }, 50)
    );
    function onTypeChanged(event: SelectedIndexChangedEventData) {
        setType(types[event.newIndex]);
    }
    const nameTemplates = [
        { id: 'valid_from', name: lc('valid_from'), type: ExtraFieldType.Date },
        { id: 'expire_on', name: lc('expire_on'), type: ExtraFieldType.Date },
        { id: 'balance', name: lc('balance'), type: ExtraFieldType.Number },
        { id: 'notes', name: lc('notes'), type: ExtraFieldType.String }
    ];
    async function showNames(anchor: View) {
        try {
            await showMenu({
                anchor,
                items: nameTemplates.map((template) => ({ title: template.name, subtitle: lc(template.type), onSelect: () => selectTemplate(template) }))
            });
        } catch (error) {
            showError(error);
        }
    }
    function selectTemplate(template: (typeof nameTemplates)[number]) {
        currentName = template.name;
        setType(template.type);
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
            const currentKind = nameTemplates.find((template) => template.name === currentName)?.id ?? (currentName === name ? kind : undefined);
            const result = {
                type: currentType,
                name: currentName,
                ...(currentKind ? { kind: currentKind } : {}),
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
        <!-- the usual names are in a menu: each shows its type -->
        <FormTextField label={lc('name')} onTrailingTap={showNames} trailingIcon={appIcon('chevron_down')} bind:text={currentName} />
        <!-- the type is one of 3 values: a segmented control, not a drop down -->
        <segmentedbar margin={tMargin} selectedIndex={types.indexOf(currentType)} bind:this={typesBar} on:selectedIndexChanged={onTypeChanged}>
            {#each types as type (type)}
                <segmentedbaritem title={lc(type)} />
            {/each}
        </segmentedbar>
        <FormTextField
            editable={currentType !== ExtraFieldType.Date}
            fontSize={17}
            keyboardType={getKeyboardType(currentType)}
            label={lc('value')}
            minHeight={currentType === ExtraFieldType.Date ? 48 : 84}
            multiline={true}
            text={currentType === ExtraFieldType.Date ? formatDate(currentTime, 'LL') : currentValue}
            onChange={(e) => currentType !== ExtraFieldType.Date && (currentValue = e.value)}
            onTap={currentType === ExtraFieldType.Date ? selectDate : undefined}
        />
    </stacklayout>
</gesturerootview>
