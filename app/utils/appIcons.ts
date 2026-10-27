import { Color, Font, ImageSource } from '@nativescript/core';
import { get } from 'svelte/store';
import { colors, fonts } from '~/variables';

const ICON_SIZE = 24;

// app icon id -> SF Symbol on iOS, MDI glyph on Android (the other platform's names are not bundled)
const ICONS: Record<string, string> = __IOS__
    ? {
          add: 'plus',
          arrow_back: 'chevron.backward',
          brightness: 'sun.max',
          camera: 'camera',
          check: 'checkmark',
          close: 'xmark',
          color: 'paintbrush',
          crop: 'crop',
          delete: 'trash',
          delete_originals: 'photo.badge.minus',
          delete_permanently: 'trash.slash',
          edit: 'pencil',
          empty_trash: 'trash.slash',
          favorite: 'star',
          favorite_off: 'star',
          favorite_on: 'star.fill',
          flash_auto: 'bolt.badge.automatic.fill',
          flash_off: 'bolt.slash.fill',
          flash_on: 'bolt.fill',
          fullscreen: 'arrow.up.left.and.arrow.down.right',
          import_file: 'doc.badge.plus',
          import_image: 'photo.badge.plus',
          info: 'info.circle',
          more: 'ellipsis',
          move_folder: 'folder',
          ocr: 'text.viewfinder',
          open: 'arrow.up.forward.square',
          pdf: 'doc.richtext',
          qrcode: 'qrcode',
          rename: 'pencil',
          restore: 'arrow.uturn.backward',
          rotate_left: 'rotate.left',
          rotate_right: 'rotate.right',
          select: 'checkmark.circle',
          select_all: 'checkmark.circle',
          settings: 'gearshape',
          share: 'square.and.arrow.up',
          switch_camera: 'arrow.triangle.2.circlepath.camera',
          sync: 'arrow.triangle.2.circlepath',
          torch: 'flashlight.on.fill',
          transform: 'wand.and.stars',
          trash: 'trash',
          tune: 'slider.horizontal.3',
          view_style: 'square.grid.2x2'
      }
    : {
          add: 'mdi-plus',
          arrow_back: 'mdi-arrow-left',
          brightness: 'mdi-brightness-6',
          camera: 'mdi-camera',
          check: 'mdi-check',
          close: 'mdi-close',
          color: 'mdi-palette',
          crop: 'mdi-crop',
          delete: 'mdi-delete',
          delete_originals: 'mdi-image-remove',
          delete_permanently: 'mdi-delete-forever',
          edit: 'mdi-pencil',
          empty_trash: 'mdi-delete-empty',
          favorite: 'mdi-star',
          favorite_off: 'mdi-star-outline',
          favorite_on: 'mdi-star',
          flash_auto: 'mdi-flash-auto',
          flash_off: 'mdi-flash-off',
          flash_on: 'mdi-flash',
          fullscreen: 'mdi-fullscreen',
          import_file: 'mdi-file-document-plus-outline',
          import_image: 'mdi-image-plus-outline',
          info: 'mdi-information-outline',
          more: 'mdi-dots-vertical',
          move_folder: 'mdi-folder-swap',
          ocr: 'mdi-text-recognition',
          open: 'mdi-open-in-new',
          pdf: 'mdi-file-pdf-box',
          qrcode: 'mdi-qrcode',
          rename: 'mdi-rename',
          restore: 'mdi-restore',
          rotate_left: 'mdi-rotate-left',
          rotate_right: 'mdi-rotate-right',
          select: 'mdi-check-circle-outline',
          select_all: 'mdi-select-all',
          settings: 'mdi-cog',
          share: 'mdi-share-variant',
          switch_camera: 'mdi-camera-flip',
          sync: 'mdi-autorenew',
          torch: 'mdi-flashlight',
          transform: 'mdi-auto-fix',
          trash: 'mdi-trash-can-outline',
          tune: 'mdi-tune',
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
