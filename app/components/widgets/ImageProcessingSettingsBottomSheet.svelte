<svelte:options accessors />

<script lang="ts">
    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { showMenu } from '@nativescript-community/ui-menu';
    import { Switch } from '@nativescript-community/ui-switch';
    import { ApplicationSettings, View } from '@nativescript/core';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Writable } from 'svelte/store';
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
    import { colors, screenHeightDips, windowInset } from '~/variables';
    import ListItem from '@shared/components/ListItem.svelte';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import SettingsSlider from '@shared/components/SettingsSlider.svelte';

    // technique for only specific properties to get updated on store change
    // the glass sheet is always dark, like the camera it covers
    $: textColor = glass ? 'white' : colorOnSurface;
    $: secondaryColor = glass ? 'rgba(255, 255, 255, 0.6)' : colorOnSurfaceVariant;
    $: separatorColor = glass ? 'rgba(255, 255, 255, 0.2)' : colorOutlineVariant;
    $: groupColor = glass ? 'rgba(255, 255, 255, 0.12)' : colorSurface;
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

    let collectionView: NativeViewElementNode<CollectionView>;

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

    function refreshCollectionView() {
        collectionView?.nativeView?.refreshVisibleItems();
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

    const maxHeight = 40 + OPTIONS.length * 60 + 40 + TRANSFORMS.length * 70 + 2 * 100 + 40 + FILTER_ROW_HEIGHT + 20;
    const maxScreenHeight = screenHeightDips - $windowInset.top - $windowInset.bottom;

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
        { id: 'brightness', title: lc('brightness'), min: -100, max: 500, defaultValue: 0 },
        { id: 'contrast', title: lc('contrast'), min: 0, max: 400, defaultValue: 100 }
    ];
    function getAdjustmentValue(id: string, currentBrightness: number, currentContrast: number) {
        return Math.round(id === 'brightness' ? Math.max(-1, Math.min(currentBrightness ?? DEFAULT_BRIGHTNESS, 5)) * 100 : Math.max(0, Math.min(currentContrast ?? DEFAULT_CONTRAST, 4)) * 100);
    }
    function setAdjustmentValue(id: string, value: number) {
        if (id === 'brightness') {
            brightness = value / 100;
        } else {
            contrast = value / 100;
        }
    }
</script>

{#if __IOS__}
    <gesturerootview backgroundColor={glass ? 'transparent' : colorBackground} rows="*" on:closedBottomSheet={onCloseBottomSheet}>
        <scrollview>
            <stacklayout padding="0 16 24 16">
                {#if showCameraSettings}
                    <label color={secondaryColor} fontSize={13} margin="20 16 6 16" text={lc('camera_settings').toUpperCase()} />
                    <stacklayout backgroundColor={groupColor} borderRadius={12}>
                        {#each OPTIONS as item, index (item.id)}
                            {#if index > 0}
                                <stacklayout backgroundColor={separatorColor} height={0.5} marginLeft={16} />
                            {/if}
                            <gridlayout columns="*,auto" height={44} padding="0 16" on:tap={(e) => selectOption(item, e)}>
                                <label color={textColor} fontSize={17} text={item.title} verticalAlignment="center" />
                                <stacklayout col={1} orientation="horizontal" verticalAlignment="center">
                                    <label
                                        color={secondaryColor}
                                        fontSize={17}
                                        text={item.options[$cameraOptionsStore[item.id] || item.default]?.name || $cameraOptionsStore[item.id]}
                                        verticalAlignment="center" />
                                    <image height={14} marginLeft={6} src="sys://chevron.up.chevron.down" tintColor={secondaryColor} width={12} />
                                </stacklayout>
                            </gridlayout>
                        {/each}
                    </stacklayout>
                {/if}
                <label color={secondaryColor} fontSize={13} margin="20 16 6 16" text={lc('transformations').toUpperCase()} />
                <stacklayout backgroundColor={groupColor} borderRadius={12}>
                    {#each TRANSFORMS as item, index (item.id)}
                        {#if index > 0}
                            <stacklayout backgroundColor={separatorColor} height={0.5} marginLeft={16} />
                        {/if}
                        <gridlayout columns="*,auto" minHeight={52} padding="8 16" on:tap={(e) => onTransformTap(item, e)}>
                            <stacklayout verticalAlignment="center">
                                <label color={textColor} fontSize={17} text={item.name} />
                                <label color={secondaryColor} fontSize={13} text={item.subtitle} textWrap={true} visibility={item.subtitle ? 'visible' : 'collapse'} />
                            </stacklayout>
                            <switch id="checkbox" checked={transforms.indexOf(item.id) !== -1} col={1} marginLeft={12} verticalAlignment="center" on:checkedChange={(e) => onCheckedChanged(item, e)} />
                        </gridlayout>
                    {/each}
                </stacklayout>
                <label color={secondaryColor} fontSize={13} margin="20 16 6 16" text={lc('adjustments').toUpperCase()} />
                <stacklayout backgroundColor={groupColor} borderRadius={12}>
                    {#each ADJUSTMENTS as item, index (item.id)}
                        {#if index > 0}
                            <stacklayout backgroundColor={separatorColor} height={0.5} marginLeft={16} />
                        {/if}
                        <gridlayout columns="*,auto" padding="10 16" rows="auto,auto">
                            <label color={textColor} fontSize={17} text={item.title} verticalAlignment="center" />
                            <label
                                col={1}
                                color={getAdjustmentValue(item.id, brightness, contrast) === item.defaultValue ? secondaryColor : colorPrimary}
                                fontSize={17}
                                text={(getAdjustmentValue(item.id, brightness, contrast) / 100).toFixed(2)}
                                verticalAlignment="center"
                                on:tap={() => setAdjustmentValue(item.id, item.defaultValue)} />
                            <slider
                                colSpan={2}
                                maxValue={item.max}
                                minValue={item.min}
                                row={1}
                                stepSize={1}
                                value={getAdjustmentValue(item.id, brightness, contrast)}
                                on:valueChange={(e) => setAdjustmentValue(item.id, e.value)} />
                        </gridlayout>
                    {/each}
                </stacklayout>
                <label color={secondaryColor} fontSize={13} margin="20 16 6 16" text={lc('filters').toUpperCase()} />
                <collectionview bind:this={collectionView} colWidth={76} height={100} items={filters} orientation="horizontal">
                    <Template let:item>
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
                            <label
                                color={isCurrentColorType(item) ? colorPrimary : secondaryColor}
                                fontSize={11}
                                marginTop={4}
                                row={1}
                                text={item.text}
                                textAlignment="center" />
                        </gridlayout>
                    </Template>
                </collectionview>
            </stacklayout>
        </scrollview>
    </gesturerootview>
{:else}
<gesturerootview padding="10 10 0 10" rows={!showCameraSettings && maxHeight < maxScreenHeight ? 'auto' : '*'} on:closedBottomSheet={onCloseBottomSheet}>
    <scrollview>
        <stacklayout>
            {#if showCameraSettings}
                <label class="sectionHeader" text={lc('camera_settings')} />
                {#each OPTIONS as item (item.id)}
                    <ListItemAutoSize fontSize={17} item={{ title: item.title, rightValue: item.options[$cameraOptionsStore[item.id] || item.default]?.name || $cameraOptionsStore[item.id] }} on:tap={(e) => selectOption(item, e)} />
                {/each}
            {/if}
            <label class="sectionHeader" text={lc('transformations')} />
            <stacklayout>
                {#each TRANSFORMS as item (item.id)}
                    <ListItem columns="*,auto" fontWeight="normal" height={70} {item} on:tap={(e) => onTransformTap(item, e)}>
                        {#if __IOS__}
                            <switch id="checkbox" checked={transforms.indexOf(item.id) !== -1} col={2} marginRight={10} verticalAlignment="center" on:checkedChange={(e) => onCheckedChanged(item, e)} />
                        {:else}
                            <checkbox id="checkbox" checked={transforms.indexOf(item.id) !== -1} col={2} verticalAlignment="center" on:checkedChange={(e) => onCheckedChanged(item, e)} />
                        {/if}
                    </ListItem>
                {/each}
                <SettingsSlider
                    defaultValue={0}
                    fontSize={17}
                    formatter={(value) => (value / 100).toFixed(0)}
                    icon="mdi-brightness-5"
                    max={500}
                    min={-100}
                    onChange={(value) => (brightness = value / 100)}
                    step={__IOS__ ? 1 : undefined}
                    title={lc('brightness')}
                    value={Math.round(Math.max(-1, Math.min(brightness ?? DEFAULT_BRIGHTNESS, 5)) * 100)}
                    valueFormatter={(value) => (value / 100).toFixed(2)} />
                <SettingsSlider
                    defaultValue={100}
                    fontSize={17}
                    formatter={(value) => (value / 100).toFixed(0)}
                    icon="mdi-contrast-box"
                    max={400}
                    min={0}
                    onChange={(value) => (contrast = value / 100)}
                    step={__IOS__ ? 1 : undefined}
                    title={lc('contrast')}
                    value={Math.round(Math.max(0, Math.min(contrast ?? DEFAULT_CONTRAST, 4)) * 100)}
                    valueFormatter={(value) => (value / 100).toFixed(2)} />
            </stacklayout>
            <label class="sectionHeader" text={lc('filters')} />
            <collectionview bind:this={collectionView} colWidth={FILTER_COL_WIDTH} height={FILTER_ROW_HEIGHT} items={filters} orientation="horizontal">
                <Template let:item>
                    <gridlayout padding={2} on:tap={() => setColorType(item.colorType)} on:longPress={(event) => setColorMatrixLevels(item, event)}>
                        <image
                            borderColor={colorPrimary}
                            borderRadius={4}
                            borderWidth={isCurrentColorType(item) ? 3 : 0}
                            colorMatrix={getColorMatrix(item.colorType)}
                            src="~/assets/images/filter_color.png"
                        />
                        <label
                            backgroundImage="linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 90%, rgba(0,0,0,0) 100%)"
                            ios:selectable={true}
                            borderRadius="0 0 4 4"
                            color="white"
                            fontSize={11}
                            fontWeight="500"
                            text={item.text}
                            textAlignment="center"
                            verticalAlignment="bottom"
                        />
                    </gridlayout>
                </Template>
            </collectionview>
        </stacklayout>
    </scrollview>
</gesturerootview>
{/if}
