// Generates the Android vector drawables of the icons of the Android map of app/utils/appIcons.ts.
// usage: node scripts/generate-android-icons.mjs <path of @mdi/svg/svg>   (npm pack @mdi/svg@7.4.47)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgFolder = process.argv[2];
if (!svgFolder || !existsSync(svgFolder)) {
    console.error('usage: node scripts/generate-android-icons.mjs <path of @mdi/svg/svg>');
    process.exit(1);
}

const source = readFileSync(join(root, 'app/utils/appIcons.ts'), 'utf8');
const androidIcons = source.slice(source.indexOf('    : {'));
const names = [...new Set([...androidIcons.matchAll(/: '([a-z0-9-]+)'/g)].map((match) => match[1]))];
const folders = ['documentscanner', 'cardwallet'].map((flavor) => join(root, 'App_Resources', flavor, 'Android/src/main/res/drawable'));

names.forEach((name) => {
    const svg = readFileSync(join(svgFolder, `${name}.svg`), 'utf8');
    const pathData = svg.match(/<path d="([^"]+)"/)?.[1];
    if (!pathData) {
        throw new Error(`no path in ${name}.svg`);
    }
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:tint="?attr/colorControlNormal"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="${pathData}" />
</vector>
`;
    folders.forEach((folder) => {
        mkdirSync(folder, { recursive: true });
        writeFileSync(join(folder, `ic_mdi_${name.replace(/-/g, '_')}.xml`), xml);
    });
});
console.log(`${names.length} icons written to ${folders.length} flavors`);
