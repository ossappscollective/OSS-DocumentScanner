<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { ObservableArray, Page } from '@nativescript/core';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { Writable, get } from 'svelte/store';
    import SyncFoldersSettingsView from '~/components/settings/sync/SyncFoldersSettingsView.svelte';
    import SyncSettingsBar from '~/components/settings/sync/SyncSettingsBar.svelte';
    import SyncSettingsCollectionView from '~/components/settings/sync/SyncSettingsCollectionView.svelte';
    import { lc } from '~/helpers/locale';
    import { checkOrDownloadOCRLanguages, requestNotificationPermission, showSnack } from '~/utils/ui';

    let page: NativeViewElementNode<Page>;

    export let title: string;
    export let store: Writable<any>;
    export let items: ObservableArray<any>;
    export let updateItem;
    export let validateSave: () => Promise<boolean> = async () => true;
    export let onSaveError: Function = () =>
        showSnack({
            message: lc('need_fill_fields'),
            view: page.nativeView
        });

    async function save() {
        const result = get(store);
        DEV_LOG && console.log('save', JSON.stringify(result));
        if (await validateSave()) {
            if (__ANDROID__) {
                await requestNotificationPermission();
            }
            if (result.OCREnabled && result.OCRLanguages.length) {
                await checkOrDownloadOCRLanguages({
                    dataType: result.OCRDataType,
                    languages: result.OCRLanguages,
                    shouldConfirm: false
                });
            }
            closeModal(result);
        } else {
            onSaveError();
        }
    }
</script>

<appPage bind:this={page} {...$$restProps}>
    <SyncSettingsBar {title} onSave={save} />
    <gridlayout class="pageContent">
        <SyncSettingsCollectionView id="syncSettingsCollectionView" {items} bind:store bind:updateItem>
            <slot />
            <Template key="syncfolders" let:item>
                <SyncFoldersSettingsView position={item.position} {store} />
            </Template>
        </SyncSettingsCollectionView>
    </gridlayout>
</appPage>
