import { Color, Font, ImageSource } from '@nativescript/core';
import { get } from 'svelte/store';
import { colors, fonts } from '~/variables';

const ICON_SIZE = 24;

// app icon id -> SF Symbol on iOS, MDI glyph on Android (the other platform's names are not bundled)
const ICONS: Record<string, string> = __IOS__
    ? {
          add: 'plus',
          arrow_back: 'chevron.backward',
          camera: 'camera',
          color: 'paintbrush',
          delete: 'trash',
          delete_originals: 'photo.badge.minus',
          delete_permanently: 'trash.slash',
          empty_trash: 'trash.slash',
          favorite: 'star',
          fullscreen: 'arrow.up.left.and.arrow.down.right',
          import_file: 'doc.badge.plus',
          import_image: 'photo.badge.plus',
          more: 'ellipsis',
          move_folder: 'folder',
          ocr: 'text.viewfinder',
          open: 'arrow.up.forward.square',
          pdf: 'doc.richtext',
          rename: 'pencil',
          restore: 'arrow.uturn.backward',
          select: 'checkmark.circle',
          select_all: 'checkmark.circle',
          settings: 'gearshape',
          share: 'square.and.arrow.up',
          sync: 'arrow.triangle.2.circlepath',
          transform: 'wand.and.stars',
          trash: 'trash',
          view_style: 'square.grid.2x2'
      }
    : {
          add: 'mdi-plus',
          arrow_back: 'mdi-arrow-left',
          camera: 'mdi-camera',
          color: 'mdi-palette',
          delete: 'mdi-delete',
          delete_originals: 'mdi-image-remove',
          delete_permanently: 'mdi-delete-forever',
          empty_trash: 'mdi-delete-empty',
          favorite: 'mdi-star',
          fullscreen: 'mdi-fullscreen',
          import_file: 'mdi-file-document-plus-outline',
          import_image: 'mdi-image-plus-outline',
          more: 'mdi-dots-vertical',
          move_folder: 'mdi-folder-swap',
          ocr: 'mdi-text-recognition',
          open: 'mdi-open-in-new',
          pdf: 'mdi-file-pdf-box',
          rename: 'mdi-rename',
          restore: 'mdi-restore',
          select: 'mdi-check-circle-outline',
          select_all: 'mdi-select-all',
          settings: 'mdi-cog',
          share: 'mdi-share-variant',
          sync: 'mdi-autorenew',
          transform: 'mdi-auto-fix',
          trash: 'mdi-trash-can-outline',
          view_style: 'mdi-view-dashboard'
      };

export type AppIconId = keyof typeof ICONS;

/** the icon of an app id for the app bar and the menus: `sys://` symbol on iOS, ImageSource rendered from the MDI font on Android */
export function appIcon(id: string) {
    const name = ICONS[id];
    if (!name) {
        return undefined;
    }
    if (__IOS__) {
        return `sys://${name}`;
    }
    return ImageSource.fromFontIconCodeSync(name, new Font(get(fonts).mdi, ICON_SIZE), new Color(get(colors).colorOnSurface));
}
