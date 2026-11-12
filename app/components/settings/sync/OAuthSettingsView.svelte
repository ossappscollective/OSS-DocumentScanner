<script lang="ts">
    import { SilentError } from '@akylas/nativescript-app-utils/error';
    import { showError } from '@shared/utils/showError';
    import { Writable } from 'svelte/store';
    import RemoteFolderField from '~/components/settings/sync/RemoteFolderField.svelte';
    import { lc } from '~/helpers/locale';
    import { OAuthProvider, OAuthTokens } from '~/services/sync/OAuthHelper';
    import { performOAuthFlow } from '~/services/sync/OAuthHelperUI';
    import { getRowCorners } from '~/utils/groupedRows';
    import { colors } from '~/variables';

    $: ({ colorError, colorOnSurface, colorSurfaceContainerLow } = $colors);

    export let store: Writable<any>;
    export let provider: OAuthProvider;
    export let testConnection: (tokens: OAuthTokens) => Promise<boolean>;

    let authenticating = false;
    let testing = false;
    let testConnectionSuccess = 0;
    $: isAuthenticated = !!$store.accessToken;

    async function authenticate() {
        try {
            authenticating = true;
            const tokens = await performOAuthFlow(provider);
            DEV_LOG && console.log('authenticate', tokens);
            if (tokens) {
                $store.accessToken = tokens.accessToken;
                $store.refreshToken = tokens.refreshToken;
                $store.expiresAt = tokens.expiresAt;
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
    <stacklayout backgroundColor={colorSurfaceContainerLow} margin="0 16 0 16" padding="12 16 12 16" {...getRowCorners('only', __IOS__)}>
        <gridlayout columns="*,auto" rows="auto">
            <label color={colorOnSurface} fontSize={__IOS__ ? 17 : 16} text={isAuthenticated ? lc('authenticated') : lc('not_authenticated')} textWrap={true} verticalAlignment="center" />
            <uibutton col={1} text={isAuthenticated ? lc('re_authenticate') : lc('authenticate')} variant={isAuthenticated ? 'outline' : 'contained'} verticalAlignment="center" on:tap={authenticate} />
        </gridlayout>

        <gridlayout columns="auto,auto,*" marginTop={8} visibility={isAuthenticated ? 'visible' : 'collapsed'}>
            <label color={colorOnSurface} text={lc('connection_status')} verticalAlignment="center" />
            <label
                class="mdi"
                col={1}
                color={testConnectionSuccess > 0 ? 'green' : colorError}
                fontSize={24}
                marginLeft={8}
                text={testConnectionSuccess > 0 ? 'mdi-check-circle' : 'mdi-alert-circle'}
                verticalAlignment="center"
                visibility={testConnectionSuccess !== 0 ? 'visible' : 'collapse'}
            />
            <uibutton col={2} horizontalAlignment="right" text={lc('test_connection')} variant="outline" on:tap={testConnectionAction} />
        </gridlayout>
    </stacklayout>
    <RemoteFolderField {store} />
</stacklayout>
