import { Application, EventData, View } from '@nativescript/core';

/** Android: the dialog window of a bottom sheet has its own status bar style: it must keep the one of the page. Use it as the loaded handler of the root of the sheet */
export function keepStatusBarStyle(event: EventData) {
    if (!__ANDROID__) {
        return;
    }
    setTimeout(() => {
        try {
            let owner = event.object as View & { _bottomSheetWindow?: android.view.Window };
            while (owner && !owner._bottomSheetWindow) {
                owner = owner.parent as typeof owner;
            }
            const window = owner?._bottomSheetWindow;
            const activityWindow = Application.android.foregroundActivity?.getWindow();
            if (window && activityWindow) {
                const light = androidx.core.view.WindowCompat.getInsetsController(activityWindow, activityWindow.getDecorView()).isAppearanceLightStatusBars();
                androidx.core.view.WindowCompat.getInsetsController(window, window.getDecorView()).setAppearanceLightStatusBars(light);
            }
        } catch {
            // keep the default style
        }
    }, 0);
}
