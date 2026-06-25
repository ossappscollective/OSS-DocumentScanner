import { vi } from 'vitest';

/**
 * Global mock for @nativescript/core so that modules that import NativeScript
 * types and helpers at the top level (e.g. ApplicationSettings, Screen) can be
 * loaded in a Node/Vitest environment without a device runtime.
 */
vi.mock('@nativescript/core', () => ({
    ApplicationSettings: {
        getString: vi.fn((key: string, defaultValue?: string) => defaultValue),
        getBoolean: vi.fn((key: string, defaultValue?: boolean) => defaultValue),
        getNumber: vi.fn((key: string, defaultValue?: number) => defaultValue),
        setString: vi.fn(),
        setBoolean: vi.fn(),
        setNumber: vi.fn()
    },
    Screen: {
        mainScreen: {
            widthPixels: 1080,
            heightPixels: 1920,
            widthDIPs: 390,
            heightDIPs: 852
        }
    },
    knownFolders: {
        temp: () => ({ path: '/tmp' }),
        currentApp: () => ({ path: '/app' })
    },
    Observable: class Observable {
        on() {}
        off() {}
        notify() {}
        addEventListener() {}
        removeEventListener() {}
    },
    EventData: {},
    File: {
        exists: vi.fn(() => false),
        fromPath: vi.fn()
    },
    Folder: {
        exists: vi.fn(() => false),
        fromPath: vi.fn()
    },
    // Utilities exported directly from the core barrel
    isString: (v: unknown) => typeof v === 'string',
    isObject: (v: unknown) => v !== null && typeof v === 'object',
    wrapNativeException: (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
}));

/**
 * SDK_VERSION and other utilities re-exported from the core/utils sub-path.
 */
vi.mock('@nativescript/core/utils', () => ({
    SDK_VERSION: 30,
    isString: (v: unknown) => typeof v === 'string',
    isObject: (v: unknown) => v !== null && typeof v === 'object',
    wrapNativeException: (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
}));

/**
 * App-level utilities that depend on the NativeScript runtime.
 */
vi.mock('@akylas/nativescript-app-utils', () => ({
    restartApp: vi.fn()
}));
