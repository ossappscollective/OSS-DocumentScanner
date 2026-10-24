<script lang="ts">
    import { showError } from '@shared/utils/showError';
    import { Writable, get } from 'svelte/store';
    import { lc } from '~/helpers/locale';
    import { WebdavSyncOptions, testWebdavConnection } from '~/services/sync/webdav/Webdav';

    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import RemoteFolderTextField from '~/components/common/RemoteFolderTextField.svelte';
    import { showPopoverMenu } from '~/utils/ui';
    import { colors } from '~/variables';
    import { AuthType } from '~/webdav';

    $: ({ colorError, colorOnError, colorOnSurfaceVariant, colorSecondary } = $colors);
    $: ({ authType } = $store);

    const variant = 'outline';
    export let store: Writable<WebdavSyncOptions>;
    let testing = false;
    let testConnectionSuccess = 0;
    function focusTextfield(id: string) {}

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

<stacklayout padding="4 10 4 10">
    <textfield
        autocapitalizationType="none"
        hint={lc('server_address')}
        keyboardType="url"
        margin="5 0 5 0"
        placeholder={lc('server_address') + ' https://...'}
        returnKeyType="next"
        text={$store.remoteURL}
        {variant}
        on:returnPress={() => focusTextfield('username')}
        on:textChange={(e) => ($store.remoteURL = e['value'])}
    />
    <gridLayout columns="auto,*">
        <textfield
            editable={false}
            hint={lc('authentication')}
            margin="5 4 5 0"
            text={authType || AuthType.Password}
            textTransform="uppercase"
            {variant}
            width={130}
            on:tap={(e) => selectAuthentication(e)}
        />
        <textfield
            autocapitalizationType="none"
            autocorrect={false}
            col={1}
            editable={authType === AuthType.Token}
            hint={lc('token')}
            margin="5 0 5 4"
            placeholder={lc('token')}
            returnKeyType="next"
            text={$store.token}
            {variant}
            on:returnPress={() => focusTextfield('username')}
            on:textChange={(e) => ($store.token = e['value'])}
        />
    </gridLayout>
    <textfield
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('username')}
        margin="5 0 5 0"
        placeholder={lc('username')}
        returnKeyType="next"
        row={1}
        text={$store.username}
        {variant}
        on:returnPress={() => focusTextfield('password')}
        on:textChange={(e) => ($store.username = e['value'])}
    />
    <textfield
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('password_not_saved')}
        margin="5 0 5 0"
        placeholder={lc('password')}
        placeholderColor="gray"
        returnKeyType="next"
        row={2}
        secure={true}
        text={$store.password}
        {variant}
        on:returnPress={() => focusTextfield('remote_folder')}
        on:textChange={(e) => ($store.password = e['value'])}
    />
    <RemoteFolderTextField columns="*" row={3} text={$store.remoteFolder} on:returnPress={testConnection} on:textChange={(e) => ($store.remoteFolder = e['value'])} />
    <gridlayout columns="*,*" row={4} rows="auto">
        <!-- <uibutton text={lc('save')} verticalAlignment="middle" on:tap={save} /> -->
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
</stacklayout>
