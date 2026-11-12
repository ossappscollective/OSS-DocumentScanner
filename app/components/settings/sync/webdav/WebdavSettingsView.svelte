<script lang="ts">
    import { showError } from '@shared/utils/showError';
    import { Writable, get } from 'svelte/store';
    import { lc } from '~/helpers/locale';
    import { WebdavSyncOptions, testWebdavConnection } from '~/services/sync/webdav/Webdav';

    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import ListItemAutoSize from '@shared/components/ListItemAutoSize.svelte';
    import FormTextField from '~/components/common/FormTextField.svelte';
    import { getSettingsRowProps } from '~/utils/settingsRows';
    import { appIcon } from '~/utils/appIcons';
    import { showPopoverMenu } from '~/utils/ui';
    import { colors } from '~/variables';
    import { AuthType } from '~/webdav';

    $: ({ colorError, colorOnError, colorSecondary } = $colors);
    $: ({ authType } = $store);
    $: authRowProps = getSettingsRowProps({ position: 'only' }, $colors, __IOS__);
    const fieldMargin = '4 16 4 16';

    export let store: Writable<WebdavSyncOptions>;
    let testing = false;
    let testConnectionSuccess = 0;

    async function selectAuthentication(event) {
        try {
            // const OptionSelect = (await import('~/components/OptionSelect.svelte')).default;
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

    async function testConnection() {
        try {
            const data = get(store);
            if (data.authType === AuthType.Password && !data.password?.length) {
                throw new SilentError(lc('missing_webdav_password'));
            } else if (data.authType === AuthType.Token && !data.token?.length) {
                throw new SilentError(lc('missing_webdav_password'));
            }
            testing = true;
            const result = await testWebdavConnection(data as any);
            testConnectionSuccess = result ? 1 : -1;
        } catch (error) {
            showError(error);
        } finally {
            testing = false;
        }
    }

    export async function validateSave() {
        if ($store.remoteURL && testConnectionSuccess === 0 && !$store.headers?.Authorization) {
            await testConnection();
        }
        if ($store.remoteURL && $store.remoteFolder && (testConnectionSuccess > 0 || $store.headers.Authorization)) {
            return true;
        } else {
            return false;
        }
    }
</script>

<stacklayout padding="4 0 4 0">
    <FormTextField
        autocapitalizationType="none"
        keyboardType="url"
        label={lc('server_address')}
        margin={fieldMargin}
        returnKeyType="next"
        text={$store.remoteURL}
        onChange={(event) => ($store.remoteURL = event.value)} />
    <ListItemAutoSize item={{ title: lc('authentication'), rightValue: (authType || AuthType.Password).toUpperCase() }} {...authRowProps} on:tap={selectAuthentication} />
    {#if authType === AuthType.Token}
        <FormTextField
            autocapitalizationType="none"
            autocorrect={false}
            label={lc('token')}
            margin={fieldMargin}
            returnKeyType="next"
            text={$store.token}
            onChange={(event) => ($store.token = event.value)} />
    {:else if (authType || AuthType.Password) === AuthType.Password}
        <FormTextField
            autocapitalizationType="none"
            autocorrect={false}
            label={lc('username')}
            margin={fieldMargin}
            returnKeyType="next"
            text={$store.username}
            onChange={(event) => ($store.username = event.value)} />
        <FormTextField
            autocapitalizationType="none"
            autocorrect={false}
            hint={lc('password_not_saved')}
            label={lc('password')}
            margin={fieldMargin}
            returnKeyType="next"
            secure={true}
            text={$store.password}
            onChange={(event) => ($store.password = event.value)} />
    {/if}
    <gridlayout columns="*,*" margin="8 16 8 16" rows="auto">
        <gridlayout col={1} columns="auto" horizontalAlignment="right" rows="auto" verticalAlignment="middle">
            <uibutton
                backgroundColor={testConnectionSuccess < 0 ? colorError : testConnectionSuccess > 0 ? 'lightgreen' : colorSecondary}
                color={colorOnError}
                text={testConnectionSuccess < 0 ? lc('failed') : testConnectionSuccess > 0 ? lc('successful') : lc('test')}
                verticalAlignment="middle"
                visibility={testing ? 'hidden' : 'visible'}
                on:tap={testConnection}
            />
            <activityindicator busy={testing} height={20} horizontalAlignment="center" verticalAlignment="middle" visibility={testing ? 'visible' : 'hidden'} />
        </gridlayout>
    </gridlayout>
    <label class="settingsSectionHeader" text={lc('remote_folder')} />
    <FormTextField
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('remote_folder_desc')}
        label={lc('remote_folder')}
        margin="4 16 16 16"
        returnKeyType="done"
        showLabel={false}
        text={$store.remoteFolder}
        trailingIcon={appIcon('folder')}
        onChange={(event) => ($store.remoteFolder = event.value)}
        on:returnPress={testConnection} />
</stacklayout>
