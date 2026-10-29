import { ApplicationSettings } from '@nativescript/core';
import { prefs } from '@shared/services/preferences';
import { createGlobalEventListener, globalObservable } from '@shared/utils/svelte/ui';
import { writable } from 'svelte/store';
import { DEFAULT_DRAW_FOLDERS_BACKGROUND, SETTINGS_DRAW_FOLDERS_BACKGROUND, SETTINGS_START_ON_CAM } from './utils/constants';

export * from '@shared/variables';

import { deviceHasCamera } from '@nativescript-community/ui-cameraview';
import { setMenuColors } from '@nativescript-community/ui-menu';
import { colors, initVariables } from '@shared/variables';
import { withSystemColors } from '~/utils/iosSystemColors';

initVariables({
    onInitRootView: () => {
        hasCamera.set(deviceHasCamera());
    },
    keepSurfaceContainerHigh: __IOS__,
    tintWindow: __IOS__,
    getTheme: (colorTheme) => {
        const theme = require(`~/themes/${__APP_ID__}/${colorTheme}.json`);
        return __IOS__ ? withSystemColors(theme) : theme;
    }
});

if (__ANDROID__) {
    // the menus are drawn by ui-menu with the colors of the app theme
    colors.subscribe((current) => {
        if (current.colorSurfaceContainer) {
            setMenuColors({
                surface: current.colorSurfaceContainer,
                row: current.colorSurfaceContainerLow,
                selected: current.colorPrimaryContainer,
                onSelected: current.colorOnPrimaryContainer,
                onSurface: current.colorOnSurface,
                onSurfaceVariant: current.colorOnSurfaceVariant,
                accent: current.colorPrimary,
                onAccent: current.colorOnPrimary,
                outline: current.colorOutline,
                error: current.colorError
            });
        }
    });
}

export const startOnCam = ApplicationSettings.getBoolean(SETTINGS_START_ON_CAM, START_ON_CAM);

export const hasCamera = writable(true);

export const orientationDegrees = writable(0);
export const shouldListenForSensorOrientation = writable(false);

export const folderBackgroundColor = writable(DEFAULT_DRAW_FOLDERS_BACKGROUND);
prefs.on(`key:${SETTINGS_DRAW_FOLDERS_BACKGROUND}`, () => {
    const newValue = ApplicationSettings.getBoolean(SETTINGS_DRAW_FOLDERS_BACKGROUND, DEFAULT_DRAW_FOLDERS_BACKGROUND);
    folderBackgroundColor.set(newValue);
    globalObservable.notify({ eventName: SETTINGS_DRAW_FOLDERS_BACKGROUND, data: newValue });
});
export const onFolderBackgroundColorChanged = createGlobalEventListener(SETTINGS_DRAW_FOLDERS_BACKGROUND);
