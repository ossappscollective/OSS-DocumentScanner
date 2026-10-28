<svelte:options accessors />

<script lang="ts">
    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { showMenu } from '@nativescript-community/ui-menu';
    import { Switch } from '@nativescript-community/ui-switch';
    import { ApplicationSettings, EventData, View } from '@nativescript/core';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Writable, get } from 'svelte/store';
    import { lc } from '~/helpers/locale';
    import { MatricesTypes, Matrix } from '~/utils/color_matrix';
    import {
        DEFAULT_BRIGHTNESS,
        DEFAULT_COLORMATRIX,
        DEFAULT_COLORTYPE,
        DEFAULT_CONTRAST,
        DEFAULT_TRANSFORM,
        FILTER_COL_WIDTH,
        FILTER_ROW_HEIGHT,
        SETTINGS_CAMERA_USER_DEFINED_RESOLUTION,
        SETTINGS_DEFAULT_BRIGHTNESS,
        SETTINGS_DEFAULT_COLORMATRIX,
        SETTINGS_DEFAULT_COLORTYPE,
        SETTINGS_DEFAULT_CONTRAST,
        SETTINGS_DEFAULT_TRANSFORM,
        TRANSFORMS_SPLIT
    } from '~/utils/constants';
    import { TRANSFORMS } from '~/utils/localized_constant';
    import { showError } from '@shared/utils/showError';
    import { ColorMatricesTypes, getColorMatrix, showMatrixLevelPopover } from '~/utils/ui';
    import { colors, windowInset } from '~/variables';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import SettingsSlider from '@shared/components/SettingsSlider.svelte';
    import GlassSliderRow from './GlassSliderRow.svelte';

    // technique for only specific properties to get updated on store change
    // the glass sheet is always dark, like the camera it covers
    $: textColor = glass ? 'white' : colorOnSurface;
    $: secondaryColor = glass ? '#ffffff99' : colorOnSurfaceVariant;
    $: separatorColor = glass ? '#ffffff33' : colorOutlineVariant;
    $: groupColor = glass ? '#ffffff1f' : colorSurface;
    $: ({ colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurface } = $colors);

    export let showCameraSettings = false;
    /** iOS 26 sheet drawn as glass (shown with `transparent`): the content must not paint an opaque background */
    export let glass = false;

    export let transforms = ApplicationSettings.getString(SETTINGS_DEFAULT_TRANSFORM, DEFAULT_TRANSFORM).split(TRANSFORMS_SPLIT);
    export let colorType = ApplicationSettings.getString(SETTINGS_DEFAULT_COLORTYPE, DEFAULT_COLORTYPE) as MatricesTypes;
    export let contrast = ApplicationSettings.getNumber(SETTINGS_DEFAULT_CONTRAST, DEFAULT_CONTRAST);
    export let brightness = ApplicationSettings.getNumber(SETTINGS_DEFAULT_BRIGHTNESS, DEFAULT_BRIGHTNESS);
    // export let colorMatrix = JSON.parse(ApplicationSettings.getString(SETTINGS_DEFAULT_COLORMATRIX, DEFAULT_COLORMATRIX));

    export let colorMatrix: Matrix;
    try {
        colorMatrix = JSON.parse(ApplicationSettings.getString(SETTINGS_DEFAULT_COLORMATRIX, DEFAULT_COLORMATRIX));
    } catch (error) {
        colorMatrix = null;
        ApplicationSettings.remove(SETTINGS_DEFAULT_COLORMATRIX);
    }

    export let cameraOptionsStore: Writable<{ aspectRatio: string; stretch: string; viewsize: string; pictureSize: string }>;
    export let resolutions: { pictureSize: string; aspectRatio: string }[] = null;
    export let currentResolution: { pictureSize: string; aspectRatio: string } = null;

    $: DEV_LOG && showCameraSettings && console.log('cameraOptions', JSON.stringify($cameraOptionsStore));
    if (showCameraSettings) {
        DEV_LOG && console.log('CameraSettingsBottomSheet', JSON.stringify(currentResolution), JSON.stringify(resolutions));
    }

    // $: ({ aspectRatio, stretch, viewsize, pictureSize } = $cameraOptionsStore);

    let listView: NativeViewElementNode<CollectionView>;
    let filtersView: CollectionView;

    const filters = ColorMatricesTypes.map((k) => ({
        ...k,
        text: lc(k.id),
        colorType: k.id
    }));

    function addOrRemoveTransform(transform: string) {
        const index = transforms.indexOf(transform);
        if (index !== -1) {
            transforms.splice(index, 1);
        } else {
            transforms.push(transform);
        }
        transforms = transforms.filter((s) => !!s && s.length);
        DEV_LOG && console.log('addOrRemoveTransform', transforms);
    }

    function onFiltersLoaded(event: EventData) {
        if (event.object instanceof CollectionView) {
            filtersView = event.object;
        }
    }
    function refreshCollectionView() {
        filtersView?.refreshVisibleItems();
    }

    function setColorType(type) {
        colorType = type;
        colorMatrix = getColorMatrix(type);
        refreshCollectionView();
    }
    function onColorMatrixChange(type, value, refreshCV = false) {
        colorType = type;
        colorMatrix = getColorMatrix(colorType, value);
        if (refreshCV) {
            refreshCollectionView();
        }
    }
    async function setColorMatrixLevels(item, event) {
        try {
            const currentValue = 1;
            DEV_LOG && console.log('setColorMatrixLevels', currentValue, colorMatrix);
            onColorMatrixChange(item.colorType, currentValue, true);
            await showMatrixLevelPopover({
                item,
                anchor: event.object,
                currentValue,
                onChange(value) {
                    if (colorMatrix?.[0] || 1 !== value) {
                        onColorMatrixChange(item.colorType, value);
                    }
                }
            });
        } catch (err) {
            showError(err);
        }
    }
    function isCurrentColorType(i) {
        return colorType === i.colorType;
    }

    function updateCameraOption(option: string, value, item) {
        if (!showCameraSettings) {
            return;
        }
        DEV_LOG && console.log('updateOption', option, value, item);
        cameraOptionsStore.update((state) => {
            state[option] = value;
            if (option === 'pictureSize') {
                state['aspectRatio'] = item.aspectRatio;
            } else if (option === 'aspectRatio') {
                state['pictureSize'] = null;
            }

            return state;
        });
        listView?.nativeView?.refreshVisibleItems();
    }

    const OPTIONS: any[] = showCameraSettings
        ? [
              {
                  id: 'stretch',
                  title: lc('camera_preview_stretch'),
                  default: 'aspectFit',
                  options: {
                      aspectFit: { name: lc('aspect_fit') },
                      aspectFill: { name: lc('aspect_fill') }
                  }
              },
              {
                  id: 'viewsize',
                  title: lc('camera_view_size'),
                  default: 'limited',
                  options: {
                      full: { name: lc('full') },
                      limited: { name: lc('limited') }
                  }
              }
          ]
              .concat(
                  __ANDROID__
                      ? [
                            {
                                id: 'aspectRatio',
                                title: lc('aspect_ratio'),
                                default: '4:3',
                                options: {
                                    '4:3': { name: '4:3' },
                                    '16:9': { name: '16:9' }
                                }
                            }
                        ]
                      : ([] as any)
              )
              .concat(
                  __ANDROID__ && currentResolution && resolutions
                      ? [
                            {
                                id: 'pictureSize',
                                title: lc('picture_size'),
                                default: currentResolution.pictureSize,
                                options: resolutions.reduce((acc, current) => {
                                    acc[current.pictureSize] = { ...current, name: `${current.pictureSize} (${current.aspectRatio})` };
                                    return acc;
                                }, {})
                            }
                        ]
                      : ([] as any)
              )
        : [];

    function selectOption(item, event) {
        const currentValue = $cameraOptionsStore[item.id] || item.default;
        showMenu({
            anchor: event.object instanceof View ? event.object : null,
            items: Object.keys(item.options).map((key) => ({
                title: item.options[key].name,
                checked: key === currentValue,
                onSelect: () => {
                    if (item.id === 'pictureSize') {
                        ApplicationSettings.setBoolean(SETTINGS_CAMERA_USER_DEFINED_RESOLUTION, true);
                    }
                    updateCameraOption(item.id, key, item.options[key]);
                }
            }))
        });
    }

    let checkboxTapTimer;
    function clearCheckboxTimer() {
        if (checkboxTapTimer) {
            clearTimeout(checkboxTapTimer);
            checkboxTapTimer = null;
        }
    }
    function onCheckedChanged(item, event) {
        clearCheckboxTimer();
        addOrRemoveTransform(item.id);
    }
    function onTransformTap(item, event) {
        const checkboxView: CheckBox | Switch = (event.object as View).getViewById('checkbox');
        clearCheckboxTimer();
        checkboxTapTimer = setTimeout(() => {
            checkboxView.checked = !checkboxView.checked;
        }, 10);
    }

    function onCloseBottomSheet() {
        ApplicationSettings.setString(SETTINGS_DEFAULT_COLORTYPE, colorType);
        if (contrast !== DEFAULT_BRIGHTNESS) {
            ApplicationSettings.setNumber(SETTINGS_DEFAULT_CONTRAST, contrast);
        } else {
            ApplicationSettings.remove(SETTINGS_DEFAULT_CONTRAST);
        }
        if (brightness !== DEFAULT_BRIGHTNESS) {
            ApplicationSettings.setNumber(SETTINGS_DEFAULT_BRIGHTNESS, brightness);
        } else {
            ApplicationSettings.remove(SETTINGS_DEFAULT_BRIGHTNESS);
        }
        if (colorMatrix) {
            ApplicationSettings.setString(SETTINGS_DEFAULT_COLORMATRIX, JSON.stringify(colorMatrix));
        } else {
            ApplicationSettings.remove(SETTINGS_DEFAULT_COLORMATRIX);
        }
        ApplicationSettings.setString(SETTINGS_DEFAULT_TRANSFORM, transforms.join(TRANSFORMS_SPLIT));
    }
    const ADJUSTMENTS = [
        { id: 'brightness', title: lc('brightness'), icon: 'mdi-brightness-5', min: -100, max: 500, defaultValue: 0 },
        { id: 'contrast', title: lc('contrast'), icon: 'mdi-contrast-box', min: 0, max: 400, defaultValue: 100 }
    ];
    function getAdjustmentValue(id: string) {
        return Math.round(id === 'brightness' ? Math.max(-1, Math.min(brightness ?? DEFAULT_BRIGHTNESS, 5)) * 100 : Math.max(0, Math.min(contrast ?? DEFAULT_CONTRAST, 4)) * 100);
    }
    function setAdjustmentValue(id: string, value: number) {
        if (id === 'brightness') {
            brightness = value / 100;
        } else {
            contrast = value / 100;
        }
    }

    function getOptionValue(item) {
        const state = get(cameraOptionsStore);
        return item.options[state[item.id] || item.default]?.name || state[item.id];
    }
    // the rows of a group share one rounded background on iOS
    const GROUP_RADIUS = { single: 12, first: '12 12 0 0', middle: 0, last: '0 0 12 12' };
    function getGroupProps(item) {
        return __IOS__ ? { margin: '0 16', backgroundColor: groupColor, borderRadius: GROUP_RADIUS[item.group] } : {};
    }
    function getRowItem(item, extra = {}) {
        return {
            ...item,
            color: textColor,
            subtitleColor: secondaryColor,
            showBottomLine: __IOS__ && (item.group === 'first' || item.group === 'middle'),
            ...extra
        };
    }
    function buildItems() {
        const result = [];
        const addGroup = (title: string, rows: any[]) => {
            result.push({ type: 'sectionheader', title });
            rows.forEach((row, index) => result.push({ ...row, group: rows.length === 1 ? 'single' : index === 0 ? 'first' : index === rows.length - 1 ? 'last' : 'middle' }));
        };
        if (showCameraSettings) {
            addGroup(
                lc('camera_settings'),
                OPTIONS.map((option) => ({ ...option, type: 'option' }))
            );
        }
        addGroup(
            lc('transformations'),
            TRANSFORMS.map((transform) => ({ ...transform, type: __IOS__ ? 'switch' : 'checkbox' }))
        );
        addGroup(
            lc('adjustments'),
            ADJUSTMENTS.map((adjustment) => ({ ...adjustment, type: 'slider' }))
        );
        result.push({ type: 'sectionheader', title: lc('filters') }, { type: 'filters' });
        return result;
    }
    const listItems = buildItems();
    const itemTemplateSelector = (item) => item.type;
</script>

<gesturerootview rows="*" {...(__IOS__ ? { backgroundColor: glass ? 'transparent' : colorBackground } : { padding: '10 10 0 10' })} on:closedBottomSheet={onCloseBottomSheet}>
    <collectionview bind:this={listView} android:paddingBottom={$windowInset.bottom} {itemTemplateSelector} items={listItems}>
        <Template key="sectionheader" let:item>
            <label color={secondaryColor} text={__IOS__ ? item.title.toUpperCase() : item.title} {...(__IOS__ ? { fontSize: 13, margin: '20 32 6 32' } : { class: 'sectionHeader' })} />
        </Template>

        <Template key="option" let:item>
            <gridlayout {...getGroupProps(item)}>
                <ListItemAutoSize fontSize={17} item={getRowItem(item, { rightValue: () => getOptionValue(item) })} on:tap={(event) => selectOption(item, event)} />
            </gridlayout>
        </Template>

        <Template key="switch" let:item>
            <gridlayout {...getGroupProps(item)}>
                <ListItemAutoSize fontSize={17} item={getRowItem(item)} on:tap={(event) => onTransformTap(item, event)}>
                    <switch id="checkbox" checked={transforms.indexOf(item.id) !== -1} col={1} marginLeft={12} verticalAlignment="center" on:checkedChange={(event) => onCheckedChanged(item, event)} />
                </ListItemAutoSize>
            </gridlayout>
        </Template>

        <Template key="checkbox" let:item>
            <ListItemAutoSize fontSize={17} item={getRowItem(item)} on:tap={(event) => onTransformTap(item, event)}>
                <checkbox id="checkbox" checked={transforms.indexOf(item.id) !== -1} col={1} verticalAlignment="center" on:checkedChange={(event) => onCheckedChanged(item, event)} />
            </ListItemAutoSize>
        </Template>

        <Template key="slider" let:item>
            {#if __ANDROID__}
                <SettingsSlider
                    defaultValue={item.defaultValue}
                    fontSize={17}
                    formatter={(value) => (value / 100).toFixed(0)}
                    icon={item.icon}
                    max={item.max}
                    min={item.min}
                    onChange={(value) => setAdjustmentValue(item.id, value)}
                    title={item.title}
                    value={getAdjustmentValue(item.id)}
                    valueFormatter={(value) => (value / 100).toFixed(2)} />
            {:else}
                <gridlayout {...getGroupProps(item)}>
                    <GlassSliderRow
                        accentColor={colorPrimary}
                        defaultValue={item.defaultValue}
                        max={item.max}
                        min={item.min}
                        onChange={(value) => setAdjustmentValue(item.id, value)}
                        {secondaryColor}
                        {textColor}
                        title={item.title}
                        value={getAdjustmentValue(item.id)} />
                </gridlayout>
            {/if}
        </Template>

        <Template key="filters">
            <collectionview
                colWidth={__IOS__ ? 76 : FILTER_COL_WIDTH}
                height={__IOS__ ? 100 : FILTER_ROW_HEIGHT}
                items={filters}
                orientation="horizontal"
                on:loaded={onFiltersLoaded}>
                <Template let:item>
                    {#if __IOS__}
                        <gridlayout padding="4 4" rows="auto,auto" on:tap={() => setColorType(item.colorType)} on:longPress={(event) => setColorMatrixLevels(item, event)}>
                            <image
                                borderColor={colorPrimary}
                                borderRadius={8}
                                borderWidth={isCurrentColorType(item) ? 2.5 : 0}
                                colorMatrix={getColorMatrix(item.colorType)}
                                height={64}
                                src="~/assets/images/filter_color.png"
                                stretch="aspectFill"
                                width={64} />
                            <label color={isCurrentColorType(item) ? colorPrimary : secondaryColor} fontSize={11} marginTop={4} row={1} text={item.text} textAlignment="center" />
                        </gridlayout>
                    {:else}
                        <gridlayout padding={2} on:tap={() => setColorType(item.colorType)} on:longPress={(event) => setColorMatrixLevels(item, event)}>
                            <image
                                borderColor={colorPrimary}
                                borderRadius={4}
                                borderWidth={isCurrentColorType(item) ? 3 : 0}
                                colorMatrix={getColorMatrix(item.colorType)}
                                src="~/assets/images/filter_color.png" />
                            <label
                                backgroundImage="linear-gradient(0deg, #000000 0%, #00000066 90%, #00000000 100%)"
                                borderRadius="0 0 4 4"
                                color="white"
                                fontSize={11}
                                fontWeight="500"
                                text={item.text}
                                textAlignment="center"
                                verticalAlignment="bottom" />
                        </gridlayout>
                    {/if}
                </Template>
            </collectionview>
        </Template>
    </collectionview>
</gesturerootview>
