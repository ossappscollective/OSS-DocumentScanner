<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import type { MenuItem } from '@nativescript-community/ui-menu';
    import { Color, FormattedString, ObservableArray, Span } from '@nativescript/core';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import { type RowPosition, updateRowPositions } from '@shared/utils/groupedRows';
    import { showError } from '@shared/utils/showError';
    import { goBack, showModal as showModalBase } from '@shared/utils/svelte/ui';
    import CardIcon from '~/components/common/CardIcon.svelte';
    import ModalFrame from '~/components/common/ModalFrame.svelte';
    import { appIcon } from '~/utils/appIcons';
    import { getChipWash } from '~/utils/cardColors';
    import { lc, onLanguageChanged } from '~/helpers/locale';
    import { onThemeChanged } from '~/helpers/theme';
    import { syncService } from '~/services/sync';
    import { LocalFolderImageSyncServiceOptions } from '~/services/sync/local/LocalFolderImageSyncService';
    import { SERVICES_SYNC_COLOR, SERVICES_SYNC_ICONS_COLORS, SYNC_TYPES } from '~/services/sync/types';
    import { createWebdavConfig } from '~/services/sync/webdav/Webdav';
    import { WebdavDataSyncOptions } from '~/services/sync/webdav/WebdavDataSyncService';
    import { getDirectoryName, hideLoading, requestNotificationPermission } from '~/utils/ui';
    import { getSettingsRowProps } from '~/utils/settingsRows';
    import { colors, fontScale, fonts, windowInset } from '~/variables';
    type Item = BaseSyncServiceOptions & { title?: string; description?: string; syncColor?: string };
    // the pages of the services have a native app bar, which needs a frame in a modal
    const showModal = (options: { page: unknown; fullscreen: boolean; props: Record<string, unknown> }): Promise<any> =>
        showModalBase({ ...options, page: ModalFrame, props: { page: options.page, ...options.props } });

    import { BaseSyncServiceOptions } from '~/services/sync/BaseSyncService';
    import type { PaperlessNgxSyncOptions } from '~/services/sync/paperless/PaperlessNgx';
    import { SERVICES_SYNC_TITLES } from '~/services/sync/ui';

    const settingsPages: Record<SYNC_TYPES, () => Promise<{ default: unknown }>> = {
        folder_image: () => import('~/components/settings/sync/local/FolderImageSyncSettings.svelte'),
        folder_pdf: () => import('~/components/settings/sync/local/FolderPDFSyncSettings.svelte'),
        webdav_data: () => import('~/components/settings/sync/webdav/WebdavSyncSettings.svelte'),
        webdav_image: () => import('~/components/settings/sync/webdav/WebdavSyncSettings.svelte'),
        webdav_pdf: () => import('~/components/settings/sync/webdav/WebdavSyncSettings.svelte'),
        onedrive_data: () => import('~/components/settings/sync/OAuthSyncSettings.svelte'),
        onedrive_image: () => import('~/components/settings/sync/OAuthSyncSettings.svelte'),
        onedrive_pdf: () => import('~/components/settings/sync/OAuthSyncSettings.svelte'),
        gdrive_data: () => import('~/components/settings/sync/OAuthSyncSettings.svelte'),
        gdrive_image: () => import('~/components/settings/sync/OAuthSyncSettings.svelte'),
        gdrive_pdf: () => import('~/components/settings/sync/OAuthSyncSettings.svelte'),
        paperless_pdf: () => import('~/components/settings/sync/paperless/PaperlessNgxPDFSyncSettings.svelte')
    };
</script>

<script lang="ts">
    // technique for only specific properties to get updated on store change
    $: ({ colorError, colorOnBackground, colorOnError, colorOnPrimaryContainer, colorOnSurface, colorOnSurfaceVariant, colorPrimary, colorPrimaryContainer } = $colors);

    let collectionView: NativeViewElementNode<CollectionView>;

    let items: ObservableArray<any>;

    export let type: 'pdf' | 'data' | 'image' = 'data';
    export let title = null;

    const dataSyncServices = syncService.getStoredSyncServices();

    const options: Item[] = dataSyncServices.filter((s) => s.type.endsWith(type));

    const isRow = (item) => !!item;
    const getRowProps = (item) => getSettingsRowProps({ ...item, description: item.subtitle }, $colors, __IOS__);
    // only the rows around a change get a new position, and only those are updated
    function updatePositions(from: number, to: number) {
        updateRowPositions((index) => items.getItem(index), items.length, isRow, from, to).forEach((index) => items.setItem(index, items.getItem(index)));
    }

    let empty = false;
    function refresh() {
        const newItems: Item[] = options || [];

        const preparedItems = newItems.map((item) => prepareItem(item));
        updateRowPositions((index) => preparedItems[index], preparedItems.length, isRow);
        items = new ObservableArray(preparedItems);
        empty = preparedItems.length === 0;
    }
    refresh();

    function prepareItem(item: Item, position?: RowPosition) {
        const iconData = SERVICES_SYNC_ICONS_COLORS[item.type.split('_')[0]];
        const { color, ...others } = item;
        DEV_LOG && console.log('prepareItem0', item.type, iconData);
        return { ...others, syncColor: color, title: getTitle(item), subtitle: getDescription(item), icon: iconData?.icon, iconColor: iconData?.color, iconFontFamily: iconData?.fontFamily, position };
    }
    // the page edits `data` and gives back the config, or nothing if cancelled
    async function editConfig(data: { type: SYNC_TYPES }) {
        const page = (await settingsPages[data.type]()).default;
        const result = await showModal({ page, fullscreen: true, props: { data } });
        if (result) {
            return data.type.startsWith('webdav') ? createWebdavConfig(result) : result;
        }
    }
    async function onItemTap(item: Item, event) {
        try {
            DEV_LOG && console.log('SyncListSettings', 'onItemTap', item);
            const configToUpdate = await editConfig(item);
            if (configToUpdate) {
                syncService.updateService(configToUpdate);
                const index = items.findIndex((d) => d.id === item.id);
                if (index !== -1) {
                    items.splice(index, 1, prepareItem(configToUpdate, items.getItem(index).position));
                }
            }
        } catch (err) {
            showError(err);
        }
    }
    async function deleteService(item: Item) {
        try {
            const removed = syncService.removeService(item);
            if (removed) {
                const index = items.findIndex((d) => d.id === item.id);
                if (index !== -1) {
                    items.splice(index, 1);
                    updatePositions(index - 1, index);
                    empty = items.length === 0;
                }
            }
        } catch (err) {
            showError(err);
        }
    }

    const isSyncType = (key: string): key is SYNC_TYPES => key in SERVICES_SYNC_TITLES;
    const serviceOptions = Object.keys(SERVICES_SYNC_TITLES)
        .filter(isSyncType)
        .filter((s) => s.endsWith(type))
        .map((s) => {
            const key = s.split('_')[0];
            const iconData = SERVICES_SYNC_ICONS_COLORS[key];
            return {
                data: s,
                icon: iconData?.icon,
                iconColor: iconData?.color,
                iconFontFamily: iconData?.fontFamily,
                name: SERVICES_SYNC_TITLES[s]
            };
        });

    // the menu of the add button: the glyph of each service in its color
    function getServiceIcon(option: (typeof serviceOptions)[number]) {
        const span = new Span();
        span.text = option.icon;
        span.fontFamily = option.iconFontFamily || $fonts.mdi;
        span.color = option.iconColor ? new Color(option.iconColor) : undefined;
        const icon = new FormattedString();
        icon.spans.push(span);
        return icon;
    }
    const addMenu: MenuItem[] = serviceOptions.map((option) => ({ id: option.data, title: option.name, icon: getServiceIcon(option), onSelect: () => onAdd(option.data) }));

    async function onAdd(serviceType: SYNC_TYPES) {
        try {
            if (__ANDROID__) {
                await requestNotificationPermission();
            }
            const configToAdd = await editConfig({ type: serviceType });
            if (configToAdd) {
                const data = syncService.addService(serviceType, configToAdd);
                DEV_LOG && console.log('adding item', data);
                items.push(prepareItem(data));
                updatePositions(items.length - 2, items.length - 1);
                empty = false;
            }
        } catch (err) {
            showError(err);
        } finally {
            hideLoading();
        }
    }
    onLanguageChanged(refresh);

    function refreshCollectionView() {
        collectionView?.nativeView?.refresh();
    }
    onThemeChanged(refreshCollectionView);

    function getTitle(item: Item) {
        const result = SERVICES_SYNC_TITLES[item.type];
        switch (item.type) {
            case 'gdrive_data':
            case 'gdrive_pdf':
            case 'gdrive_image':
                return 'Google Drive';
            case 'onedrive_data':
            case 'onedrive_pdf':
            case 'onedrive_image':
                return 'OneDrive';
            case 'paperless_pdf': {
                const serverUrl = (item as BaseSyncServiceOptions & PaperlessNgxSyncOptions).serverUrl;
                if (serverUrl) {
                    try {
                        const url = serverUrl.startsWith('http') ? serverUrl : 'https://' + serverUrl;
                        return result + url.split('//')[1].split('/')[0];
                    } catch (e) {
                        return result + serverUrl;
                    }
                }
                return 'Paperless-ngx';
            }
            case 'webdav_data':
            case 'webdav_pdf':
            case 'webdav_image':
                let url = (item as WebdavDataSyncOptions).remoteURL;
                if (!url.startsWith('http')) {
                    url = 'https://' + url;
                }
                return result + ': ' + url.split('//')[1].split('/')[0];
            case 'folder_image':
            case 'folder_pdf':
                return result;
            default:
                return item.title;
        }
    }
    function getDescription(item: Item) {
        switch (item.type) {
            case 'webdav_data':
            case 'gdrive_data':
            case 'onedrive_data':
                return (item as WebdavDataSyncOptions).remoteFolder;
            // case 'folder_image':
            //     return (item as LocalFolderImageSyncServiceOptions).localFolderPath;
            case 'folder_image':
            case 'folder_pdf':
                return getDirectoryName((item as LocalFolderImageSyncServiceOptions).localFolderPath);
            default:
                return item.description;
        }
    }

    function getSyncColor(item: Item) {
        return item.syncColor || SERVICES_SYNC_COLOR[item.type];
    }

    function drawerTranslationFunction(side, width, value, delta, progress) {
        const result = {
            mainContent: {
                translateX: -delta
            },
            rightDrawer: {
                translateX: width - delta
            },
            backDrop: {
                translateX: -delta,
                opacity: progress * 0.1
            }
        } as any;

        return result;
    }
</script>

<appPage id="syncSettingsPage">
    <appBar
        color={colorOnBackground}
        iosIconRenderingMode="alwaysTemplate"
        scrollBehavior="lift"
        scrollTargetId="syncCollectionView"
        size={__IOS__ ? 'large' : 'small'}
        {title}
        ios:translucent={true}>
        {#if __ANDROID__}
            <navigationButton {...{ 'android.systemIcon': 'ic_menu_back' }} on:tap={() => goBack()} />
        {/if}
        <appBarItem icon={appIcon('add')} ios.position="right" menu={addMenu} text={lc('add')} />
    </appBar>
    <gridlayout class="pageContent">
        <collectionview id="syncCollectionView" bind:this={collectionView} {items} android:paddingBottom={$windowInset.bottom}>
            <Template let:item>
                <swipemenu
                    gestureHandlerOptions={{
                        failOffsetYStart: -40,
                        failOffsetYEnd: 40,
                        minDist: 50
                    }}
                    rightSwipeDistance={0}
                    rows="*"
                    startingSide={item.startingSide}
                    translationFunction={drawerTranslationFunction}
                >
                    <ListItemAutoSize
                        borderLeftColor={getSyncColor(item)}
                        borderLeftWidth={5}
                        columns="auto,*,auto"
                        {item}
                        mainCol={1}
                        prop:mainContent
                        showBottomLine={false}
                        {...getRowProps(item)}
                        on:tap={(event) => onItemTap(item, event)}
                    >
                        <label
                            col={0}
                            color={item.iconColor || colorOnSurface}
                            fontFamily={item.iconFontFamily || $fonts.mdi}
                            fontSize={(item.iconFontSize || 24) * $fontScale}
                            paddingLeft="8"
                            text={item.icon}
                            verticalAlignment="center"
                            width={(item.iconFontSize || 24) * 2}
                        />
                    </ListItemAutoSize>
                    <label
                        class="mdi"
                        backgroundColor={colorError}
                        color={colorOnError}
                        prop:rightDrawer
                        fontSize={24}
                        rippleColor={colorOnError}
                        text="mdi-trash-can"
                        textAlignment="center"
                        verticalTextAlignment="middle"
                        width={80}
                        on:tap={(e) => deleteService(item)}
                    />
                </swipemenu>
            </Template>
        </collectionview>
        {#if empty}
            <stacklayout horizontalAlignment="center" marginBottom="15%" paddingLeft={36} paddingRight={36} verticalAlignment="center">
                <uisurface class="cardsEmptyIcon" android:variant="clear" backgroundColor={__IOS__ ? getChipWash(colorPrimary, 41) : colorPrimaryContainer}>
                    <CardIcon color={__IOS__ ? colorPrimary : colorOnPrimaryContainer} horizontalAlignment="center" size={40} src={appIcon('sync')} verticalAlignment="center" />
                </uisurface>
                <label textAlignment="center" textWrap={true}>
                    <span color={colorOnBackground} fontSize={20} fontWeight="bold" text={lc('no_sync_yet_title')} />
                    <span color={colorOnSurfaceVariant} fontSize={14} text={'\n' + lc('no_sync_yet_help')} />
                </label>
                {#each serviceOptions as option, index (option.data)}
                    <uibutton
                        height={44}
                        horizontalAlignment="center"
                        marginTop={index === 0 ? 20 : 8}
                        text={option.name}
                        variant={index === 0 ? 'contained' : 'text'}
                        on:tap={() => onAdd(option.data)} />
                {/each}
            </stacklayout>
        {/if}
    </gridlayout>
</appPage>
