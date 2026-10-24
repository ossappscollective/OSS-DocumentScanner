const timelineEnabled = !!process.env['NS_TIMELINE'];
const sentryEnabled = !!process.env['NS_SENTRY'];
const loggingEnabled = !!process.env['NS_LOGGING'];
const playstoreBuild = !!process.env['PLAY_STORE_BUILD'];

const id = process.env['APP_ID'];
const CARD_APP = id === 'com.akylas.cardwallet';
// the akylas runtime lacks the Mac Catalyst fixes of @nativescript/ios 9.1
const catalystBuild = process.argv.includes('catalyst');
module.exports = {
    ignoredNativeDependencies: [].concat(sentryEnabled ? [] : ['@nativescript-community/sentry']).concat(playstoreBuild ? [] : ['@akylas/nativescript-inapp-purchase']),
    id: id || 'com.akylas.documentscanner',
    appResourcesPath: process.env['APP_RESOURCES'] || 'App_Resources/documentscanner',
    buildPath: process.env['APP_BUILD_PATH'] || 'build/documentscanner',
    corePackageName: '@akylas/nativescript',
    webpackPackageName: '@akylas/nativescript-webpack',
    webpackConfigPath: 'app.webpack.config.js',
    projectName: process.env['PROJECT_NAME'],
    appPath: 'app',
    forceLog: loggingEnabled,
    profiling: timelineEnabled ? 'timeline' : undefined,
    i18n: {
        defaultLanguage: 'en'
    },
    ios: {
        runtimePackageName: catalystBuild ? '@nativescript/ios' : '@akylas/nativescript-ios-runtime'
    },
    android: {
        ignoredNativeDependencies: ['@akylas/nativescript-inapp-purchase'],
        plugins: {
            'plugin-nativeprocessor': {
                // based on the app the plugin is built with our without qrcode.
                // so both apps cant use the same aar. we use a suffix to differentiate them
                aarSuffix: CARD_APP ? '-cardwallet' : '-documentscanner'
            }
        },
        runtimePackageName: '@nativescript/android-quickjs-ng',
        gradleVersion: '8.14.3',
        markingMode: 'none',
        codeCache: true,
        // for cardwallet we enable qrcode. and then we filter aar to only use the one we want
        gradleArgs: CARD_APP ? ['-PwithQRCode', '-PaarIgnoreFilter=**/*documentscanner*'] : ['-PaarIgnoreFilter=**/*cardwallet*'],
        enableMultithreadedJavascript: false,
        handleTimeZoneChanges: true,
        ...(loggingEnabled
            ? {
                  forceLog: true,
                  maxLogcatObjectSize: 40096
              }
            : {})
    },
    cssParser: 'rework',
    hooks: [
        {
            type: 'after-prepareNativeApp',
            script: 'tools/scripts/after-prepareNativeApp.js'
        }
    ]
};
