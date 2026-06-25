import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: {
        // NativeScript compile-time globals used throughout the app
        __IOS__: false,
        __ANDROID__: false,
        CARD_APP: false,
        DEV_LOG: false
    },
    resolve: {
        alias: [
            // Mirror the tsconfig path aliases so test imports resolve correctly
            { find: /^~\/(.*)$/, replacement: path.resolve(__dirname, 'app/$1') },
            { find: /^@shared\/(.*)$/, replacement: path.resolve(__dirname, 'tools/app/$1') }
        ]
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['app/**/*.test.ts'],
        setupFiles: ['./vitest.setup.ts'],
        // Tell vitest to use the test-specific tsconfig that includes *.test.ts files
        typecheck: {
            tsconfig: './tsconfig.test.json'
        }
    }
});
