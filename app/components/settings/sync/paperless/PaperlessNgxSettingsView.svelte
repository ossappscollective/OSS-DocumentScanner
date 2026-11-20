<script lang="ts">
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import { Writable, get } from 'svelte/store';
    import FormTextField from '~/components/common/FormTextField.svelte';
    import TestConnectionButton from '~/components/settings/sync/TestConnectionButton.svelte';
    import { lc } from '~/helpers/locale';
    import { acquireToken, testPaperlessConnection } from '~/services/sync/paperless/PaperlessNgx';
    import type { PaperlessNgxSyncOptions } from '~/services/sync/paperless/PaperlessNgx';

    export let store: Writable<PaperlessNgxSyncOptions & { token?: string }>;
    let testing = false;
    let testConnectionSuccess = 0;

    async function testConnection() {
        try {
            const data = get(store);
            if (!data.serverUrl?.length) {
                throw new SilentError(lc('missing_paperless_server_url'));
            }
            if (!data.token?.length && !(data.username?.length && data.password?.length)) {
                throw new SilentError(lc('missing_paperless_credentials'));
            }
            testing = true;
            testConnectionSuccess = 0;

            // If only username/password provided, acquire a token first
            if (!data.token && data.username && data.password) {
                const acquiredToken = await acquireToken({ serverUrl: data.serverUrl }, data.username, data.password);
                $store.token = acquiredToken;
                // Clear password from store so it is not persisted; the token is used going forward
                $store.password = '';
            }

            const result = await testPaperlessConnection(get(store));
            testConnectionSuccess = result ? 1 : -1;
        } catch (error) {
            showError(error);
            testConnectionSuccess = -1;
        } finally {
            testing = false;
        }
    }

    export async function validateSave() {
        const data = get(store);
        if (!data.serverUrl?.length) {
            return false;
        }
        // Must have a token OR credentials (we acquired a token already during test)
        if (!data.token?.length && !(data.username?.length && data.password?.length)) {
            return false;
        }
        if (testConnectionSuccess === 0) {
            await testConnection();
        }
        return testConnectionSuccess > 0;
    }
</script>

<stacklayout padding="4 0 4 0">
    <FormTextField
        autocapitalizationType="none"
        keyboardType="url"
        label={lc('server_address')}
        margin="4 16 4 16"
        onChange={(event) => {
            $store.serverUrl = event.value;
            testConnectionSuccess = 0;
        }}
        returnKeyType="next"
        text={$store.serverUrl} />

    <label fontSize={12} margin="2 16 6 18" opacity={0.7} text={lc('paperless_token_hint')} textWrap={true} />

    <FormTextField
        autocapitalizationType="none"
        autocorrect={false}
        label={lc('api_token')}
        margin="4 16 4 16"
        onChange={(event) => {
            $store.token = event.value;
            testConnectionSuccess = 0;
        }}
        returnKeyType="next"
        text={$store.token} />

    <label fontSize={12} margin="6 16 2 18" opacity={0.7} text={lc('or')} />

    <FormTextField
        autocapitalizationType="none"
        autocorrect={false}
        label={lc('username')}
        margin="4 16 4 16"
        onChange={(event) => {
            $store.username = event.value;
            testConnectionSuccess = 0;
        }}
        returnKeyType="next"
        text={$store.username} />
    <FormTextField
        autocapitalizationType="none"
        autocorrect={false}
        hint={lc('password_not_saved')}
        label={lc('password')}
        margin="4 16 4 16"
        onChange={(event) => {
            $store.password = event.value;
            testConnectionSuccess = 0;
        }}
        returnKeyType="done"
        secure={true}
        text={$store.password} />

    <TestConnectionButton success={testConnectionSuccess} {testing} on:tap={testConnection} />
</stacklayout>
