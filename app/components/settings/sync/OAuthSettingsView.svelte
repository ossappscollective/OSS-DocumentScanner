<script lang="ts">
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import { Writable } from 'svelte/store';
    import RemoteFolderTextField from '~/components/common/RemoteFolderTextField.svelte';
    import { lc } from '~/helpers/locale';
    import { OAuthProvider, OAuthTokens, refreshAccessToken } from '~/services/sync/OAuthHelper';
    import { performOAuthFlow } from '~/services/sync/OAuthHelperUI';
    import { ONEDRIVE_PROVIDER } from '~/services/sync/onedrive/OneDrive';
    import { colors } from '~/variables';

    $: ({ colorError, colorOnError, colorOnSurfaceVariant, colorSecondary } = $colors);

    const variant = 'outline';

    export let store: Writable<any>;
    export let provider: OAuthProvider;
    export let testConnection: (tokens: OAuthTokens) => Promise<boolean>;

    let authenticating = false;
    let testing = false;
    let testConnectionSuccess = 0;
    let isAuthenticated = false;

    $: {
        // Check if we have tokens
        isAuthenticated = !!$store.accessToken;
    }

    async function authenticate() {
        try {
            authenticating = true;
            const tokens = await performOAuthFlow(provider);
            DEV_LOG && console.log('authenticate', tokens);
            if (tokens) {
                $store.accessToken = tokens.accessToken;
                $store.refreshToken = tokens.refreshToken;
                $store.expiresAt = tokens.expiresAt;

                isAuthenticated = true;
                testConnectionSuccess = 1;
            }
        } catch (error) {
            showError(error);
            testConnectionSuccess = -1;
        } finally {
            authenticating = false;
        }
    }

    async function testConnectionAction() {
        try {
            if (!$store.accessToken) {
                throw new SilentError(lc('not_authenticated'));
            }
            // const tokens = await refreshAccessToken(ONEDRIVE_PROVIDER, $store.refreshToken);

            testing = true;
            const tokens: OAuthTokens = {
                accessToken: $store.accessToken,
                refreshToken: $store.refreshToken,
                expiresAt: $store.expiresAt
            };
            const result = await testConnection(tokens);
            testConnectionSuccess = result ? 1 : -1;
        } catch (error) {
            showError(error);
            testConnectionSuccess = -1;
        } finally {
            testing = false;
        }
    }

    export async function validateSave() {
        if (!$store.accessToken) {
            throw new SilentError(lc('not_authenticated'));
        }
        if (!$store.remoteFolder?.length) {
            throw new SilentError(lc('missing_remote_folder'));
        }
        return true;
    }
</script>

<stacklayout>
    <gridlayout columns="*,auto" rows="auto">
        <label color={colorOnSurfaceVariant} fontSize={13} padding="0 16 0 16" text={isAuthenticated ? lc('authenticated') : lc('not_authenticated')} textWrap={true} verticalAlignment="center" />
        <uibutton
            col={1}
            margin="0 16 0 0"
            text={isAuthenticated ? lc('re_authenticate') : lc('authenticate')}
            variant={isAuthenticated ? 'outline' : 'contained'}
            verticalAlignment="center"
            on:tap={authenticate}
        />
    </gridlayout>

    <gridlayout columns="auto,auto,*" margin="10 16" visibility={isAuthenticated ? 'visible' : 'collapsed'}>
        <label text={lc('connection_status')} verticalAlignment="center" />
        <label
            class="mdi"
            col={1}
            color={testConnectionSuccess > 0 ? 'green' : colorError}
            fontSize={24}
            text={testConnectionSuccess > 0 ? 'mdi-check-circle' : 'mdi-alert-circle'}
            verticalAlignment="center"
            visibility={testConnectionSuccess !== 0 ? 'visible' : 'collapse'}
        />
        <uibutton col={2} horizontalAlignment="right" text={lc('test_connection')} variant="outline" on:tap={testConnectionAction} />
    </gridlayout>
    <RemoteFolderTextField hint={lc('remote_folder')} margin="20 4 10 4" text={$store.remoteFolder} {variant} on:textChange={(e) => ($store.remoteFolder = e['value'])} />
</stacklayout>
