import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    // Compile-time globals injected by webpack's DefinePlugin (see the `defines`
    // object in app.webpack.config.js). They must be mirrored here or any module
    // referencing one fails at import time with a ReferenceError.
    define: {
        __IOS__: false,
        __ANDROID__: false,
        __APP_ID__: JSON.stringify('com.akylas.documentscanner'),
        __APP_VERSION__: JSON.stringify('0.0.0-test'),
        __APP_BUILD_NUMBER__: 0,
        __INAPP_PURCHASE_ID_PREFIX__: JSON.stringify('1'),
        CARD_APP: false,
        DEV_LOG: false,
        NO_CONSOLE: false,
        TNS_ENV: JSON.stringify('test'),
        SUPPORTED_LOCALES: JSON.stringify(['en', 'fr']),
        SUPPORTED_COLOR_THEMES: JSON.stringify(['default']),
        FALLBACK_LOCALE: JSON.stringify('en'),
        DEFAULT_THEME: JSON.stringify('default'),
        START_ON_CAM: false,
        SENTRY_ENABLED: false,
        SENTRY_DSN: JSON.stringify(''),
        SENTRY_PREFIX: JSON.stringify(''),
        MDI_FONT_FAMILY: JSON.stringify('mdi'),
        PLAY_STORE_BUILD: false,
        GOOGLE_OAUTH_CLIENT_ID: JSON.stringify('test-google-client-id'),
        GOOGLE_OAUTH_CLIENT_SECRET: JSON.stringify('test-google-client-secret'),
        ONEDRIVE_OAUTH_CLIENT_ID: JSON.stringify('test-onedrive-client-id'),
        ONEDRIVE_OAUTH_CLIENT_SECRET: JSON.stringify('test-onedrive-client-secret'),
        GIT_URL: JSON.stringify('https://github.com/ossappscollective/OSS-DocumentScanner'),
        SUPPORT_URL: JSON.stringify('https://github.com/ossappscollective/OSS-DocumentScanner/issues'),
        STORE_LINK: JSON.stringify(''),
        STORE_REVIEW_LINK: JSON.stringify(''),
        SPONSOR_URL: JSON.stringify('https://github.com/sponsors/farfromrefug')
    },
    resolve: {
        alias: [
            // Mirror the tsconfig path aliases so test imports resolve correctly
            { find: /^~\/(.*)$/, replacement: path.resolve(__dirname, 'app/$1') },
            { find: /^@shared\/(.*)$/, replacement: path.resolve(__dirname, 'tools/app/$1') },
            // `@nativescript-community/l` relies on webpack to resolve its platform suffixed
            // entries (`localize.android.js` / `localize.ios.js`, `localizenative.*.js`): there is
            // no plain `localize.js` on disk. Map both to a concrete file so a test that unmocks
            // the plugin exercises the real localization code. The iOS native variant is picked
            // because it needs no `@nativescript/core` import.
            { find: /^@nativescript-community\/l$/, replacement: path.resolve(__dirname, 'node_modules/@nativescript-community/l/localize.common.js') },
            { find: /^\.\/localizenative$/, replacement: path.resolve(__dirname, 'node_modules/@nativescript-community/l/localizenative.ios.js') }
        ],
        // NativeScript resolves `foo` to `foo.common.ts` / `foo.android.ts` /
        // `foo.ios.ts`. Reproduce that here, preferring the shared `.common`
        // implementation so tests exercise cross-platform code.
        extensions: ['.common.ts', '.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
    },
    test: {
        globals: true,
        environment: 'node',
        // Filename/date formatting is timezone sensitive: pin it so a test that
        // passes locally cannot fail on a differently configured CI runner.
        env: {
            TZ: 'UTC'
        },
        include: ['app/**/*.test.ts'],
        setupFiles: ['./vitest.setup.ts'],
        // the real Color class of core (see vitest.setup.ts) imports its helpers without extension
        server: { deps: { inline: [/@nativescript\/core\/(color|utils)/] } },
        // Tell vitest to use the test-specific tsconfig that includes *.test.ts files
        typecheck: {
            tsconfig: './tsconfig.test.json'
        }
    }
});
