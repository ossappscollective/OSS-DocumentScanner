<script lang="ts">
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { prompt } from '@nativescript-community/ui-dialogs';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import { showError } from '@shared/utils/showError';
    import { Writable, get } from 'svelte/store';
    import FormTextField from '~/components/common/FormTextField.svelte';
    import RemoteFolderField from '~/components/settings/sync/RemoteFolderField.svelte';
    import TestConnectionButton from '~/components/settings/sync/TestConnectionButton.svelte';
    import { lc } from '~/helpers/locale';
    import {
        LUH_SEAFILE_WEBDAV_URL,
        WebdavDirectoryEntry,
        WebdavSyncOptions,
        createWebdavSubdirectory,
        listWebdavDirectories,
        normalizeRemoteFolder,
        normalizeWebdavUrl,
        testWebdavConnection
    } from '~/services/sync/webdav/Webdav';
    import { ALERT_OPTION_MAX_HEIGHT } from '~/utils/constants';
    import { getSettingsRowProps } from '~/utils/settingsRows';
    import { showAlertOptionSelect, showPopoverMenu, showSnack } from '~/utils/ui';
    import { colors } from '~/variables';
    import { AuthType } from '~/webdav';

    $: ({ authType } = $store);
    $: ({ colorError, colorOnSurfaceVariant } = $colors);
    $: authRowProps = getSettingsRowProps({ position: 'only' }, $colors, __IOS__);
    const fieldMargin = '4 16 4 16';

    export let store: Writable<WebdavSyncOptions>;
    let testing = false;
    let loadingFolders = false;
    let testConnectionSuccess = 0;
    let currentBrowsePath = '/';
    let remoteDirectories: WebdavDirectoryEntry[] = [];

    $: isSeafileServer = /seafile|\/(?:seaf)?dav(?:\/|$)/i.test($store.remoteURL || '');
    $: showSeafileRootWarning = isSeafileServer && (!$store.remoteFolder || $store.remoteFolder === '/');
    $: parentBrowsePath =
        currentBrowsePath && currentBrowsePath !== '/'
            ? currentBrowsePath.slice(0, currentBrowsePath.lastIndexOf('/')) || '/'
            : null;

    function applyEndpointPreset(preset: 'seafile_dav' | 'seafile_seafdav' | 'nextcloud') {
        const raw = ($store.remoteURL || '').trim();
        if (!raw) {
            if (preset === 'seafile_dav') {
                $store.remoteURL = LUH_SEAFILE_WEBDAV_URL;
            } else if (preset === 'seafile_seafdav') {
                $store.remoteURL = 'https://seafile.example.com/seafdav';
            } else {
                $store.remoteURL = 'https://cloud.example.com/remote.php/dav/files/' + ($store.username || 'USERNAME');
            }
        } else {
            let base = raw;
            if (!/^https?:\/\//i.test(base)) {
                base = 'https://' + base;
            }
            const withoutProto = base.replace(/^https?:\/\//i, '');
            const slashIdx = withoutProto.indexOf('/');
            const origin = slashIdx === -1 ? base : base.slice(0, base.length - withoutProto.slice(slashIdx).length);
            if (preset === 'seafile_dav') {
                $store.remoteURL = `${origin}/dav`;
            } else if (preset === 'seafile_seafdav') {
                $store.remoteURL = `${origin}/seafdav`;
            } else {
                const userPart = ($store.username || '').trim() || 'USERNAME';
                $store.remoteURL = `${origin}/remote.php/dav/files/${userPart}`;
            }
        }
        if (!$store.authType) {
            $store.authType = AuthType.Password;
        }
        testConnectionSuccess = 0;
    }

    async function selectAuthentication(event) {
        try {
            const options = [
                {
                    id: AuthType.Password,
                    name: lc('password')
                },
                {
                    id: AuthType.None,
                    name: lc('none')
                },
                {
                    id: AuthType.Token,
                    name: lc('token')
                }
            ];
            await showPopoverMenu({
                options,
                anchor: event.object,
                onClose: (value) => {
                    $store.authType = value.id;
                }
            });
        } catch (error) {
            showError(error);
        }
    }

    function ensureCredentialsPresent(data: WebdavSyncOptions) {
        if (!data.remoteURL?.trim()) {
            throw new SilentError(lc('need_fill_fields'));
        }
        const hasSavedAuth = !!data.headers?.Authorization;
        if (!hasSavedAuth) {
            if ((data.authType || AuthType.Password) === AuthType.Password && !data.password?.length) {
                throw new SilentError(lc('missing_webdav_password'));
            } else if (data.authType === AuthType.Token && !data.token?.length) {
                throw new SilentError(lc('missing_webdav_password'));
            }
        }
    }

    async function loadRemoteFolders(pathToBrowse = '/') {
        try {
            const data = get(store);
            ensureCredentialsPresent(data);
            loadingFolders = true;
            const normalizedUrl = normalizeWebdavUrl(data.remoteURL);
            if (normalizedUrl !== data.remoteURL) {
                $store.remoteURL = normalizedUrl;
            }
            remoteDirectories = await listWebdavDirectories({ ...data, remoteURL: normalizedUrl }, pathToBrowse);
            currentBrowsePath = pathToBrowse;
            testConnectionSuccess = 1;
        } catch (error) {
            showError(error);
        } finally {
            loadingFolders = false;
        }
    }

    async function promptCreateSubfolder(basePath = $store.remoteFolder || currentBrowsePath || '/') {
        try {
            const data = get(store);
            ensureCredentialsPresent(data);
            const cleanBase = normalizeRemoteFolder(basePath);
            const folderPrompt = await prompt({
                title: lc('create_new_subfolder'),
                message: `${lc('remote_folder')}: ${cleanBase}`,
                okButtonText: lc('create'),
                cancelButtonText: lc('cancel'),
                defaultText: ''
            });
            if (folderPrompt?.result && folderPrompt.text?.trim()) {
                const subName = folderPrompt.text.trim().replace(/^\/+|\/+$/g, '');
                const targetPath = cleanBase === '/' ? `/${subName}` : `${cleanBase}/${subName}`;
                const createdPath = await createWebdavSubdirectory(get(store), targetPath);
                $store.remoteFolder = createdPath;
                await loadRemoteFolders(cleanBase);
                showSnack({ message: `${lc('remote_folder')}: ${createdPath}` });
            }
        } catch (error) {
            showError(error);
        }
    }

    async function openRemoteFolderPicker(startPath = $store.remoteFolder || '/') {
        try {
            const browsePath = startPath && startPath.startsWith('/') ? startPath : '/';
            await loadRemoteFolders(browsePath);

            const parentPath =
                currentBrowsePath && currentBrowsePath !== '/'
                    ? currentBrowsePath.slice(0, currentBrowsePath.lastIndexOf('/')) || '/'
                    : null;

            const options = [
                ...(currentBrowsePath && currentBrowsePath !== '/'
                    ? [
                          {
                              name: `✅ ${lc('use_this_folder')}: ${currentBrowsePath}`,
                              data: { action: 'select', path: currentBrowsePath },
                              boxType: 'circle',
                              type: 'checkbox',
                              value: $store.remoteFolder === currentBrowsePath
                          }
                      ]
                    : []),
                ...(parentPath
                    ? [
                          {
                              name: `⬆️ ${lc('parent_folder')} (${parentPath})`,
                              data: { action: 'browse', path: parentPath },
                              boxType: 'circle',
                              type: 'checkbox',
                              value: false
                          }
                      ]
                    : []),
                {
                    name: `➕ ${lc('create_new_subfolder')}`,
                    data: { action: 'create', path: currentBrowsePath },
                    boxType: 'circle',
                    type: 'checkbox',
                    value: false
                },
                ...remoteDirectories.map((dir) => ({
                    name: `📁 ${dir.name} (${dir.path})`,
                    data: { action: 'folder', path: dir.path, name: dir.name },
                    boxType: 'circle',
                    type: 'checkbox',
                    value: $store.remoteFolder === dir.path
                }))
            ];

            const result = await showAlertOptionSelect(
                {
                    height: Math.min(options.length * 56, ALERT_OPTION_MAX_HEIGHT),
                    rowHeight: 56,
                    options
                },
                {
                    title: `${lc('select_remote_folder')} (${currentBrowsePath})`
                }
            );

            const choice = result?.data;
            if (!choice) {
                return;
            }

            if (choice.action === 'select') {
                $store.remoteFolder = choice.path;
            } else if (choice.action === 'browse') {
                await openRemoteFolderPicker(choice.path);
            } else if (choice.action === 'create') {
                await promptCreateSubfolder(currentBrowsePath);
            } else if (choice.action === 'folder') {
                $store.remoteFolder = choice.path;
                await loadRemoteFolders(choice.path);
            }
        } catch (error) {
            showError(error);
        }
    }

    async function testConnection() {
        try {
            const data = get(store);
            ensureCredentialsPresent(data);
            const normalizedUrl = normalizeWebdavUrl(data.remoteURL);
            if (normalizedUrl !== data.remoteURL) {
                $store.remoteURL = normalizedUrl;
            }
            if (!$store.remoteFolder) {
                $store.remoteFolder = '/';
            }
            testing = true;
            const result = await testWebdavConnection({ ...data, remoteURL: normalizedUrl } as any);
            testConnectionSuccess = result ? 1 : -1;
            if (result) {
                try {
                    const startFolder = $store.remoteFolder && $store.remoteFolder !== '/' ? $store.remoteFolder : '/';
                    await loadRemoteFolders(startFolder);
                } catch (_e) {
                    try {
                        await loadRemoteFolders('/');
                    } catch (_e2) {
                        // Connection succeeded even if directory listing at root is restricted
                    }
                }
            }
        } catch (error) {
            showError(error);
        } finally {
            testing = false;
        }
    }

    export async function validateSave() {
        if ($store.remoteURL) {
            $store.remoteURL = normalizeWebdavUrl($store.remoteURL);
        }
        if ($store.remoteURL) {
            $store.remoteFolder = normalizeRemoteFolder($store.remoteFolder);
        }
        if ($store.remoteURL && testConnectionSuccess === 0 && !$store.headers?.Authorization) {
            await testConnection();
        }
        if ($store.remoteURL && $store.remoteFolder && (testConnectionSuccess > 0 || $store.headers?.Authorization)) {
            return true;
        } else {
            return false;
        }
    }
</script>

<stacklayout padding="4 0 8 0">
    <FormTextField
        autocapitalizationType="none"
        keyboardType="url"
        label={lc('server_address')}
        margin={fieldMargin}
        returnKeyType="next"
        text={$store.remoteURL}
        onChange={(event) => {
            $store.remoteURL = event.value;
            testConnectionSuccess = 0;
        }} />

    <wraplayout margin="0 16 4 16">
        <uibutton
            height={30}
            margin="0 6 4 0"
            text={lc('seafile_append_seafdav')}
            variant={/\/seafdav$/i.test($store.remoteURL || '') ? 'contained' : 'outline'}
            on:tap={() => applyEndpointPreset('seafile_seafdav')} />
        <uibutton
            height={30}
            margin="0 6 4 0"
            text={lc('seafile_luh_preset')}
            variant={/\/dav$/i.test($store.remoteURL || '') ? 'contained' : 'outline'}
            on:tap={() => applyEndpointPreset('seafile_dav')} />
        <uibutton
            height={30}
            margin="0 6 4 0"
            text={lc('nextcloud_preset')}
            variant={/\/remote\.php\/dav/i.test($store.remoteURL || '') ? 'contained' : 'outline'}
            on:tap={() => applyEndpointPreset('nextcloud')} />
    </wraplayout>

    <ListItemAutoSize item={{ title: lc('authentication'), rightValue: (authType || AuthType.Password).toUpperCase() }} {...authRowProps} on:tap={selectAuthentication} />
    {#if authType === AuthType.Token}
        <FormTextField
            autocapitalizationType="none"
            autocorrect={false}
            label={lc('token')}
            margin={fieldMargin}
            onChange={(event) => ($store.token = event.value)}
            returnKeyType="next"
            text={$store.token} />
    {:else if (authType || AuthType.Password) === AuthType.Password}
        <FormTextField
            autocapitalizationType="none"
            autocorrect={false}
            label={lc('username')}
            margin={fieldMargin}
            onChange={(event) => ($store.username = event.value)}
            returnKeyType="next"
            text={$store.username} />
        <FormTextField
            autocapitalizationType="none"
            autocorrect={false}
            hint={lc('password_not_saved')}
            label={lc('password')}
            margin={fieldMargin}
            onChange={(event) => ($store.password = event.value)}
            returnKeyType="next"
            secure={true}
            text={$store.password} />
    {/if}
    <TestConnectionButton success={testConnectionSuccess} {testing} on:tap={testConnection} />

    <RemoteFolderField {store} onTrailingTap={() => openRemoteFolderPicker($store.remoteFolder || '/')} on:returnPress={testConnection} />

    {#if showSeafileRootWarning}
        <label
            color={colorError}
            fontSize={12}
            margin="0 16 6 16"
            text={lc('seafile_root_folder_warning')}
            textWrap={true} />
    {/if}

    <gridlayout columns="*,auto" margin="0 16 6 16">
        <uibutton
            height={36}
            isEnabled={!loadingFolders}
            text={loadingFolders ? lc('loading') : `📁 ${lc('select_remote_folder_from_list')}`}
            variant="outline"
            on:tap={() => openRemoteFolderPicker($store.remoteFolder || '/')} />
        <uibutton
            col={1}
            height={36}
            isEnabled={!loadingFolders}
            marginLeft={8}
            text={`➕ ${lc('create_new_subfolder')}`}
            variant="outline"
            on:tap={() => promptCreateSubfolder($store.remoteFolder || currentBrowsePath || '/')} />
    </gridlayout>

    {#if remoteDirectories.length > 0 || currentBrowsePath !== '/'}
        <label color={colorOnSurfaceVariant} fontSize={12} margin="2 16 4 16" text={`${lc('existing_folders')} (${currentBrowsePath}):`} />
        <wraplayout margin="0 16 4 16">
            {#if parentBrowsePath}
                <uibutton
                    height={32}
                    margin="0 6 6 0"
                    text={`⬆️ ${parentBrowsePath}`}
                    variant="outline"
                    on:tap={() => {
                        $store.remoteFolder = parentBrowsePath;
                        loadRemoteFolders(parentBrowsePath);
                    }} />
            {/if}
            {#each remoteDirectories as dir (dir.path)}
                <uibutton
                    height={32}
                    margin="0 6 6 0"
                    text={`📁 ${dir.name}`}
                    variant={$store.remoteFolder === dir.path ? 'contained' : 'outline'}
                    on:tap={() => {
                        $store.remoteFolder = dir.path;
                        loadRemoteFolders(dir.path);
                    }} />
            {/each}
        </wraplayout>
    {/if}
</stacklayout>
