<script lang="ts">
    import { AWebView } from '@nativescript-community/ui-webview';
    import { Page } from '@nativescript/core';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { onMount } from 'svelte';
    import CActionBar from './common/CActionBar.svelte';
    import { lc } from '~/helpers/locale';
    import { colors, windowInset } from '~/variables';

    $: ({ colorOnSurfaceVariant } = $colors);

    export let url: string;
    export let redirectUri: string;

    let page: NativeViewElementNode<Page>;
    let webView: NativeViewElementNode<AWebView>;
    let loading = true;

    function onCancel() {
        closeModal({ cancelled: true });
    }

    function onLoadStarted(args) {
        const loadUrl = args.url;
        DEV_LOG && console.log('OAuth WebView: Load started:', loadUrl);

        // Check if this is the redirect URI
        if (loadUrl && loadUrl.startsWith(redirectUri)) {
            DEV_LOG && console.log('OAuth WebView: Redirect detected:', loadUrl);
            // Cancel the navigation and close with the URL
            args.object.stopLoading();
            closeModal({ url: loadUrl });
        }
    }

    function onLoadFinished(args) {
        loading = false;
        DEV_LOG && console.log('OAuth WebView: Load finished:', args.url);
    }

    onMount(() => {
        DEV_LOG && console.log('OAuth WebView: Mounting with URL:', url);
    });
</script>

<page bind:this={page} id="oauthwebview" actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,*">
        <gridlayout row={1} android:marginBottom={$windowInset.bottom}>
            <awebview
                bind:this={webView}
                src={url}
                userAgent="Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Mobile Safari/537.36"
                on:loadFinished={onLoadFinished}
                on:loadStarted={onLoadStarted}
            />
            <activityindicator busy={loading} visibility={loading ? 'visible' : 'collapse'} />
        </gridlayout>
        <CActionBar canGoBack={false} modalWindow={true} title={lc('authentication')}>
            <uibutton text={lc('cancel')} variant="text" verticalAlignment="middle" on:tap={onCancel} />
        </CActionBar>
    </gridlayout>
</page>
