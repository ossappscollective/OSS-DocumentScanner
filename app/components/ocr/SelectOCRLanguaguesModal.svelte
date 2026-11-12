<script lang="ts">
    import { closePopover } from '@nativescript-community/ui-popover/svelte';
    import { TextField, Utils } from '@nativescript/core';
    import { onDestroy, onMount } from 'svelte';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { lc } from '~/helpers/locale';
    import { colors, fonts } from '~/variables';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { OCRLanguages, ocrService } from '~/services/ocr';
    import { showError } from '@shared/utils/showError';
    import MiniSearch from '@shared/utils/minisearch';
    import { localizedLanguage } from '~/utils/ui';
    import PopoverBackgroundView from '@shared/components/PopoverBackgroundView.svelte';
    // technique for only specific properties to get updated on store change
    $: ({ colorPrimary, colorSurfaceContainer } = $colors);

    let textField: NativeViewElementNode<TextField>;
    export let width = 300;
    export let height = 50;
    export let query: string = null;

    export let selectedLanguages = [];

    const downloaded = ocrService.downloadedLanguages;

    const fullItems = ocrService.availableLanguages.map((l) => ({
        id: l,
        name: localizedLanguage(l, OCRLanguages),
        available: selectedLanguages.indexOf(l) !== -1,
        downloaded: downloaded.indexOf(l) !== -1
    }));
    const miniSearch = new MiniSearch<{ id: string; name: string }>({
        fields: ['name', 'id'], // fields to index for full-text search
        storeFields: ['name', 'available', 'downloaded', 'id'],
        processTerm: (term) => term.toLowerCase(), // index term processing
        searchOptions: {
            processTerm: (term) => term.toLowerCase(),
            prefix: true,
            fuzzy: 0.2
        }
    });
    miniSearch.addAll(fullItems);

    function onTextChange(e) {
        const query = e.value;
        search(query);
    }
    async function search(q: string) {
        try {
            if (q?.length) {
                items = miniSearch.search(q) as any;
            } else {
                items = fullItems;
            }
        } catch (err) {
            showError(err);
        }
    }

    let items = fullItems;

    function close(item) {
        unfocus();
        closePopover(item.id);
    }
    function focus() {
        setTimeout(() => {
            textField?.nativeView?.requestFocus();
        }, 200);
    }
    function unfocus() {
        textField?.nativeView?.clearFocus();
    }
    onMount(() => {
        if (query) {
            search(query);
        }
    });
    onDestroy(() => {
        unfocus();
    });
    function blurTextField(event?) {
        Utils.dismissSoftInput(event?.object.nativeViewProtected || textField?.nativeView?.nativeViewProtected);
    }
</script>

<PopoverBackgroundView rows="auto,340" {width}>
    <textfield
        bind:this={textField}
        floating="false"
        {height}
        hint={lc('search')}
        returnKeyType="search"
        row={0}
        text={query}
        variant="outline"
        on:unloaded={blurTextField}
        on:textChange={onTextChange}
        on:loaded={focus}
    />
    <collectionview {items} row={1} rowHeight={56}>
        <Template let:item>
            <gridlayout columns="auto,*,auto" padding={16} rippleColor={colorPrimary} on:tap={() => close(item)}>
                <label fontFamily={$fonts.mdi} fontSize={30} paddingRight={10} text="mdi-check" verticalAlignment="middle" visibility={item.available ? 'visible' : 'collapse'} />
                <label col={1} fontSize={17} text={item.name} verticalTextAlignment="middle" />
                <label col={2} fontFamily={$fonts.mdi} fontSize={30} paddingLeft={10} text="mdi-download" verticalAlignment="middle" visibility={item.downloaded ? 'visible' : 'collapse'} />
            </gridlayout>
        </Template>
    </collectionview>
</PopoverBackgroundView>
