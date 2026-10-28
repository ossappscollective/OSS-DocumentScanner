import { beforeEach, vi } from 'vitest';

/**
 * In-memory stand-in for the native preferences store. Reads fall back to the
 * caller's default value while a key is unset, so code that only reads settings
 * behaves exactly as it would with defaults, while tests that need a specific
 * configuration can write to it through `ApplicationSettings.setX`.
 *
 * The store is cleared before every test (see `beforeEach` below) so settings
 * written by one test cannot leak into another.
 */
const settingsStore = new Map<string, string | number | boolean>();

function readSetting<T>(key: string, defaultValue?: T): T | undefined {
    return settingsStore.has(key) ? (settingsStore.get(key) as T) : defaultValue;
}

beforeEach(() => {
    settingsStore.clear();
});

/**
 * Global mock for @nativescript/core so that modules that import NativeScript
 * types and helpers at the top level (e.g. ApplicationSettings, Screen) can be
 * loaded in a Node/Vitest environment without a device runtime.
 */
vi.mock('@nativescript/core', async () => ({
    ApplicationSettings: {
        getString: vi.fn((key: string, defaultValue?: string) => readSetting(key, defaultValue)),
        getBoolean: vi.fn((key: string, defaultValue?: boolean) => readSetting(key, defaultValue)),
        getNumber: vi.fn((key: string, defaultValue?: number) => readSetting(key, defaultValue)),
        setString: vi.fn((key: string, value: string) => settingsStore.set(key, value)),
        setBoolean: vi.fn((key: string, value: boolean) => settingsStore.set(key, value)),
        setNumber: vi.fn((key: string, value: number) => settingsStore.set(key, value)),
        remove: vi.fn((key: string) => settingsStore.delete(key)),
        hasKey: vi.fn((key: string) => settingsStore.has(key))
    },
    // the real color class: it only needs the shared parsing helpers
    Color: (await vi.importActual<any>('@nativescript/core/color/color-common')).ColorBase,
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
    restartApp: vi.fn(),
    getISO3Language: vi.fn((locale: string) => locale)
}));

/**
 * Localization. Translation lookups echo their key so assertions can stay
 * readable and do not depend on the shipped locale files.
 */
vi.mock('@nativescript-community/l', () => {
    const translate = (key: string) => key;
    return {
        l: translate,
        lc: translate,
        lt: translate,
        lu: (key: string) => key.toUpperCase(),
        capitalize: (value: string) => (value ? value[0].toUpperCase() + value.slice(1) : value),
        loadLocaleJSON: vi.fn(),
        overrideNativeLocale: vi.fn(),
        titlecase: (value: string) => value
    };
});

/**
 * Native image/OCR/barcode processing. Only the shapes imported by app code are
 * provided; tests that exercise these paths should mock them per-test.
 */
vi.mock('plugin-nativeprocessor', () => ({
    cropDocumentFromFile: vi.fn(),
    ocrDocumentFromFile: vi.fn(),
    detectQRCodeFromFile: vi.fn(),
    generateQRCodeImage: vi.fn(),
    getSVGFromQRCode: vi.fn(),
    getColorPalette: vi.fn(),
    processFromFile: vi.fn()
}));

/**
 * HTTP client: unmocked it pulls in native request bindings.
 */
vi.mock('@nativescript-community/https', () => ({
    request: vi.fn(),
    createRequest: vi.fn(),
    setCache: vi.fn(),
    clearCache: vi.fn()
}));

vi.mock('@nativescript/core/connectivity', () => ({
    connectionType: { none: 0, wifi: 1, mobile: 2, ethernet: 3, bluetooth: 4, vpn: 5 },
    getConnectionType: vi.fn(() => 1),
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn()
}));

/**
 * Rich-text/font helpers, only reached for display formatting.
 */
vi.mock('@nativescript-community/text', () => ({
    createNativeAttributedString: vi.fn((data: unknown) => data),
    init: vi.fn()
}));

/**
 * Native key/value preferences store used by the settings layer.
 */
vi.mock('@nativescript-community/preferences', () => {
    const values = new Map<string, unknown>();
    return {
        Preferences: class Preferences {
            getValue(key: string, defaultValue?: unknown) {
                return values.has(key) ? values.get(key) : defaultValue;
            }
            setValue(key: string, value: unknown) {
                values.set(key, value);
            }
            remove(key: string) {
                values.delete(key);
            }
        }
    };
});

/**
 * Canvas drawing primitives, imported at module level by the pass/barcode
 * rendering helpers. Only construction needs to succeed for import-time code;
 * tests that actually draw should mock these per-test.
 */
vi.mock('@nativescript-community/ui-canvas', () => ({
    Align: { LEFT: 'left', CENTER: 'center', RIGHT: 'right' },
    LayoutAlignment: { ALIGN_NORMAL: 0, ALIGN_CENTER: 1, ALIGN_OPPOSITE: 2 },
    Canvas: class Canvas {
        drawText() {}
        drawRect() {}
        getWidth() {
            return 0;
        }
        getHeight() {
            return 0;
        }
    },
    Paint: class Paint {
        setColor() {}
        setTextSize() {}
        setTextAlign() {}
        measureText() {
            return 0;
        }
    },
    Rect: class Rect {
        constructor(
            public left = 0,
            public top = 0,
            public right = 0,
            public bottom = 0
        ) {}
    },
    StaticLayout: class StaticLayout {
        getHeight() {
            return 0;
        }
        draw() {}
    }
}));

vi.mock('@nativescript-community/ui-label', () => ({
    Label: class Label {}
}));

vi.mock('@nativescript-community/ui-svg/canvas', () => ({
    SVG: class SVG {},
    SVGView: class SVGView {}
}));

vi.mock('@nativescript-community/ui-dialogs', () => ({
    alert: vi.fn(),
    confirm: vi.fn(),
    prompt: vi.fn(),
    action: vi.fn(),
    login: vi.fn()
}));

vi.mock('@nativescript-community/gesturehandler', () => ({
    GestureHandlerTouchEvent: 'gestureHandlerTouchEvent',
    GestureHandlerStateEvent: 'gestureHandlerStateEvent',
    GestureState: { UNDETERMINED: 0, FAILED: 1, BEGAN: 2, CANCELLED: 3, ACTIVE: 4, END: 5 },
    HandlerType: { PAN: 'PAN', TAP: 'TAP', PINCH: 'PINCH' },
    Manager: { getInstance: vi.fn(() => ({ createGestureHandler: vi.fn() })) },
    install: vi.fn()
}));

vi.mock('plugin-zip', () => ({
    zip: vi.fn(),
    unzip: vi.fn()
}));

vi.mock('@akylas/nativescript-inappbrowser', () => ({
    default: { open: vi.fn(), close: vi.fn(), openAuth: vi.fn(), isAvailable: vi.fn(() => false) },
    InAppBrowser: { open: vi.fn(), close: vi.fn(), openAuth: vi.fn(), isAvailable: vi.fn(() => false) }
}));

/**
 * Image pipeline: only the cache-eviction surface is used by app code.
 */
vi.mock('@nativescript-community/ui-image', () => ({
    getImagePipeline: vi.fn(() => ({
        evictFromCache: vi.fn(),
        evictFromMemoryCache: vi.fn(),
        evictFromDiskCache: vi.fn()
    })),
    ImagePipeline: class ImagePipeline {},
    initialize: vi.fn(),
    shutDown: vi.fn()
}));
