<script lang="ts">
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { closeBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { HorizontalPosition, VerticalPosition } from '@nativescript-community/ui-popover';
    import { showPopover } from '@nativescript-community/ui-popover/svelte';
    import { SegmentedBar } from '@nativescript-community/ui-segmentedbar';
    import { EventData, View, verticalAlignmentProperty } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { lc } from '~/helpers/locale';
    import { OCRLanguages, ocrService } from '~/services/ocr';
    import { colors, fonts } from '~/variables';
    import { getRowCorners } from '~/utils/groupedRows';
    import SheetHeader from '../common/SheetHeader.svelte';
    import Chip from '../widgets/Chip.svelte';
    import { checkOrDownloadOCRLanguages, localizedLanguage } from '~/utils/ui';

    // technique for only specific properties to get updated on store change
    $: ({ colorOnPrimary, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorPrimary, colorSurfaceContainer, colorSurfaceContainerLow } = $colors);
    $: secondaryColor = colorOnSurfaceVariant;

    let collectionView: NativeViewElementNode<CollectionView>;
    let downloaded = ocrService.downloadedLanguages;
    export let languages = ocrService.languagesArray;
    export let onlySettings = false;
    export let showDownloadButton = false;
    export let dataType: string = ocrService.dataType;
    async function addLanguages(event) {
        try {
            const SearchModal = (await import('~/components/ocr/SelectOCRLanguaguesModal.svelte')).default;
            // const result: any = await showModal({ page: Settings, fullscreen: true, props: { position } });
            const anchorView = event.object as View;
            const result: any = await showPopover({
                backgroundColor: colorSurfaceContainer,
                vertPos: VerticalPosition.ALIGN_BOTTOM,
                horizPos: HorizontalPosition.ALIGN_RIGHT,
                view: SearchModal,
                anchor: anchorView,
                props: {
                    selectedLanguages: languages
                }
            });
            if (result) {
                ocrService.addLanguages(result);
                languages.push(result);
                languages = languages;
            }
        } catch (error) {
            showError(error);
        }
    }

    async function removeLanguage(key: string) {
        try {
            ocrService.removeLanguages(key);
            languages.splice(languages.indexOf(key), 1);
            languages = languages;
        } catch (error) {
            showError(error);
        }
    }
    const qualities = ocrService.qualities;

    async function setDataType(value) {
        dataType = value;
        ocrService.dataType = dataType as any;
        downloaded = ocrService.downloadedLanguages;
        languages = languages;
    }

    function onQualityChanged(event: EventData) {
        if (event.object instanceof SegmentedBar) {
            setDataType(qualities[event.object.selectedIndex]);
        }
    }

    function startOrCloseOCR() {
        closeBottomSheet(onlySettings ? { languages, dataType } : true);
    }

    async function downloadLanguages() {
        try {
            await checkOrDownloadOCRLanguages({
                dataType,
                languages,
                shouldConfirm: false
            });
            downloaded = ocrService.downloadedLanguages;
        } catch (error) {
            showError(error);
        }
    }
</script>

<gesturerootview id="ocrSettingsBottomSheet" rows="auto">
    {#if onlySettings}
        <stacklayout backgroundColor={colorSurfaceContainerLow} margin="0 16 0 16" padding="14 16 14 16" {...getRowCorners('last', __IOS__)}>
            <label color={colorOnSurface} fontSize={__IOS__ ? 17 : 16} text={lc('quality')} />
            <wraplayout marginTop={8}>
                {#each qualities as quality (quality)}
                    <gridlayout
                        backgroundColor={dataType === quality ? colorPrimary : undefined}
                        borderColor={colorOutline}
                        borderRadius={8}
                        borderWidth={dataType === quality ? 0 : 1}
                        columns="auto,auto"
                        height={32}
                        margin="0 8 8 0"
                        paddingLeft={dataType === quality ? 8 : 12}
                        paddingRight={12}
                        rippleColor={colorPrimary}
                        on:tap={() => setDataType(quality)}
                    >
                        <label
                            color={dataType === quality ? colorOnPrimary : colorOnSurface}
                            fontFamily={$fonts.mdi}
                            fontSize={16}
                            marginRight={4}
                            text="mdi-check"
                            verticalAlignment="middle"
                            visibility={dataType === quality ? 'visible' : 'collapse'}
                        />
                        <label
                            col={1}
                            color={dataType === quality ? colorOnPrimary : colorOnSurface}
                            fontSize={14}
                            fontWeight={dataType === quality ? 'bold' : 'normal'}
                            text={lc(quality)}
                            verticalAlignment="middle"
                        />
                    </gridlayout>
                {/each}
            </wraplayout>
            <gridlayout columns="*,auto" marginTop={8}>
                <label color={colorOnSurface} fontSize={__IOS__ ? 17 : 16} text={lc('languages')} verticalAlignment="middle" />
                <uibutton class="icon-btn" col={1} text="mdi-plus" variant="text" verticalAlignment="middle" on:tap={addLanguages} />
            </gridlayout>
            <wraplayout marginTop={4}>
                {#each languages as language (language)}
                    <Chip rightIcon={downloaded.indexOf(language) !== -1 ? 'mdi-download' : null} text={localizedLanguage(language, OCRLanguages)} on:tap={() => removeLanguage(language)} />
                {/each}
            </wraplayout>
            {#if showDownloadButton}
                <uibutton horizontalAlignment="right" marginTop={8} text={lc('download')} on:tap={downloadLanguages} />
            {/if}
        </stacklayout>
    {:else}
        <stacklayout>
            <SheetHeader doneText={lc('start')} onCancel={() => closeBottomSheet(false)} onDone={startOrCloseOCR} title={lc('ocr')} />
            <stacklayout padding="0 16 24 16">
                <label color={secondaryColor} fontSize={__IOS__ ? 13 : 14} margin="8 16 8 16" text={__IOS__ ? lc('quality').toUpperCase() : lc('quality')} />
                <segmentedbar marginBottom={8} selectedIndex={qualities.indexOf(dataType)} on:selectedIndexChanged={onQualityChanged}>
                    {#each qualities as quality (quality)}
                        <segmentedbaritem title={lc(quality)} variant="outline" />
                    {/each}
                </segmentedbar>
                <gridlayout columns="*,auto" margin="16 0 0 0">
                    <label color={secondaryColor} fontSize={__IOS__ ? 13 : 14} margin="0 16 0 16" text={__IOS__ ? lc('languages').toUpperCase() : lc('languages')} verticalAlignment="middle" />
                    <uibutton col={1} height={32} padding="0 12" text={`+ ${lc('add')}`} variant="outline" on:tap={addLanguages} />
                </gridlayout>
                <wraplayout marginTop={8}>
                    {#each languages as language (language)}
                        <Chip rightIcon={downloaded.indexOf(language) !== -1 ? 'mdi-download' : null} text={localizedLanguage(language, OCRLanguages)} on:tap={() => removeLanguage(language)} />
                    {/each}
                </wraplayout>
            </stacklayout>
        </stacklayout>
    {/if}
</gesturerootview>
