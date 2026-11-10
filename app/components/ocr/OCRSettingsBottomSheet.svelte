<script lang="ts">
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { closeBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
    import { HorizontalPosition, VerticalPosition } from '@nativescript-community/ui-popover';
    import { showPopover } from '@nativescript-community/ui-popover/svelte';
    import { confirm } from '@nativescript-community/ui-dialogs';
    import { SegmentedBar } from '@nativescript-community/ui-segmentedbar';
    import { EventData, View, verticalAlignmentProperty } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { filesize } from 'filesize';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { lc } from '~/helpers/locale';
    import { OCRLanguages, ocrService } from '~/services/ocr';
    import { colors } from '~/variables';
    import { getRowCorners } from '~/utils/groupedRows';
    import SheetHeader from '../common/SheetHeader.svelte';
    import Chip from '../widgets/Chip.svelte';
    import { checkOrDownloadOCRLanguages, localizedLanguage } from '~/utils/ui';

    // technique for only specific properties to get updated on store change
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorSurfaceContainer, colorSurfaceContainerLow } = $colors);
    $: secondaryColor = colorOnSurfaceVariant;

    let collectionView: NativeViewElementNode<CollectionView>;
    let downloaded = ocrService.downloadedLanguages;
    let installedModels = ocrService.getInstalledModels();
    export let languages = ocrService.languagesArray;
    export let onlySettings = false;
    export let showDownloadButton = false;
    export let showQualityTitle = true;
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

    async function deleteModel({ dataType: modelDataType, language }: { dataType: string; language: string }) {
        try {
            const confirmed = await confirm({
                cancelButtonText: lc('cancel'),
                message: lc('confirm_delete_ocr_model', localizedLanguage(language, OCRLanguages)),
                okButtonText: lc('delete'),
                title: lc('delete_ocr_model')
            });
            if (!confirmed) {
                return;
            }
            ocrService.deleteModel(modelDataType, language);
            downloaded = ocrService.downloadedLanguages;
            installedModels = ocrService.getInstalledModels();
        } catch (error) {
            showError(error);
        }
    }

    function onQualityChanged(event: EventData) {
        if (event.object instanceof SegmentedBar) {
            setDataType(qualities[event.object.selectedIndex]);
        }
    }

    function startOrCloseOCR() {
        closeBottomSheet(onlySettings ? { languages, dataType } : true);
    }

    let downloading = false;
    $: canDownload = !downloading && languages.some((language) => downloaded.indexOf(language) === -1);
    async function downloadLanguages() {
        if (downloading) {
            return;
        }
        downloading = true;
        try {
            await checkOrDownloadOCRLanguages({
                dataType,
                languages,
                shouldConfirm: false
            });
            downloaded = ocrService.downloadedLanguages;
            installedModels = ocrService.getInstalledModels();
        } catch (error) {
            showError(error);
        } finally {
            downloading = false;
        }
    }

    function getModelPosition(index: number, length: number) {
        return length === 1 ? 'only' : index === 0 ? 'first' : index === length - 1 ? 'last' : 'middle';
    }
</script>

<gesturerootview id="ocrSettingsBottomSheet" rows="auto">
    {#if onlySettings}
        <stacklayout>
            {#if showQualityTitle}
                <label class="settingsSectionHeader" text={lc('quality')} />
            {/if}
            <stacklayout backgroundColor={colorSurfaceContainerLow} margin="0 16 0 16" padding="14 16 14 16" {...getRowCorners('only', __IOS__)}>
                <segmentedbar selectedIndex={qualities.indexOf(dataType)} on:selectedIndexChanged={onQualityChanged}>
                    {#each qualities as quality (quality)}
                        <segmentedbaritem title={lc(quality)} variant="outline" />
                    {/each}
                </segmentedbar>
            </stacklayout>

            <gridlayout columns="*,auto">
                <label class="settingsSectionHeader" text={lc('languages')} verticalAlignment="bottom" />
                <uibutton class="icon-btn" col={1} marginRight={16} text="mdi-plus" variant="text" verticalAlignment="bottom" on:tap={addLanguages} />
            </gridlayout>
            <stacklayout backgroundColor={colorSurfaceContainerLow} margin="0 16 0 16" padding="14 16 14 16" {...getRowCorners('only', __IOS__)}>
                <wraplayout>
                    {#each languages as language (language)}
                        <Chip rightIcon={downloaded.indexOf(language) !== -1 ? 'mdi-download' : null} text={localizedLanguage(language, OCRLanguages)} on:tap={() => removeLanguage(language)} />
                    {/each}
                </wraplayout>
                {#if showDownloadButton}
                    <uibutton horizontalAlignment="right" isEnabled={canDownload} marginTop={8} opacity={canDownload ? 1 : 0.4} text={lc('download')} on:tap={downloadLanguages} />
                {/if}
            </stacklayout>

            {#if installedModels.length}
                <label class="settingsSectionHeader" text={lc('downloaded_models')} />
                {#each installedModels as model, index (model.dataType + model.language)}
                    <gridlayout
                        backgroundColor={colorSurfaceContainerLow}
                        columns="*,auto"
                        margin={`${index === 0 ? 0 : __IOS__ ? 1 : 2} 16 0 16`}
                        padding="8 8 8 16"
                        {...getRowCorners(getModelPosition(index, installedModels.length), __IOS__)}
                    >
                        <label color={colorOnSurface} fontSize={14} verticalAlignment="middle">
                            <span text={localizedLanguage(model.language, OCRLanguages)} />
                            <span color={colorOnSurfaceVariant} text={`\n${lc(model.dataType)} · ${filesize(model.size, { output: 'string' })}`} />
                        </label>
                        <uibutton class="icon-btn" col={1} text="mdi-delete" variant="text" verticalAlignment="middle" on:tap={() => deleteModel(model)} />
                    </gridlayout>
                {/each}
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
