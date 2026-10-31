# Crop view and export menu

> Where this file and `cardwallet-design-rules.md` disagree, the rules file wins. Mockup: `cardwallet-crop-export.html` (crop in four states, the menu in five contexts, iOS and Android, light and dark).

Values are pt (iOS) and dp (Android) for a 393 / 412 wide screen, like the rest of the system (rules, section 0). The mockup is drawn 300 wide: take the numbers from here.

Two parts:

1. **Crop view** (`CropEditView.svelte`, `CropView.svelte`): the editor where the four corners of a page are adjusted.
2. **Export menu**: one native menu (PDF, images, passes, share) opened from the export button of each screen. It replaces the two popovers `showPDFPopoverMenu` and `showImagePopoverMenu`, which opened at the wrong place.

---

## 1. Crop view

### 1.1 What it is

An editor. Like the camera it is **dark in both app themes** (forced dark: `overrideUserInterfaceStyle = dark` on iOS, a dark page on Android, light status bar content). The page is shown aspect fit on a dark holder, with a quad (four corners) over it. Nothing else changes with the app theme.

Behavior kept from today (the design draws on it, it is not new):

- Touch **anywhere near** a handle. The closest of nine anchors wins: 4 corners, 4 edge midpoints, and the center of the quad (moves all four corners). There is no dead zone and no minimum distance.
- The drag is **relative**: the handle moves by 0.8 x the finger distance (`MAGNIFIER_SENSITIVITY`, a setting), so it never jumps under the finger. This is why the magnifier is useful and why the hint says "the closest handle moves".
- A move that would make the quad concave is ignored (the handle stops). A corner never leaves the image.
- One undo step per completed drag (touch down to touch up with a change). A new change clears the redo stack.

### 1.2 Layout

Top to bottom, a grid with constant sizes and one star row, never a size computed from a measured view (CLAUDE.md, layouts are declarative):

| Row | iOS | Android |
| --- | --- | --- |
| Top bar | System bar buttons, 44 tall, at the top safe edge. Page content starts 8 below. | Top app bar, 64 tall, flat (no lift, no tonal fill), under the status inset. Page content starts 8 below. |
| Holder | `*` row. 12 from both sides | `*` row. 12 from both sides |
| Hint | 40 tall row, 8 below the holder | 40 tall row, 8 below the holder |
| Bottom | System toolbar (glass), 54 tall, 8 below the hint, at the bottom safe edge | Bottom padding = navigation inset + 16. No toolbar, no FAB |

- **Hint row is always reserved** (40), so the holder never changes size when the hint hides.
- **Holder:** a rounded rectangle, color `#26262A`, on the screen color `#0E0E10`. Radius from the shape rule: clamp(8, 0.18 x shorter side, 28) = **28** (the shorter side is 369 / 388). The holder carries the background, the image does not round itself.
- **Image:** aspect fit, centered, **16 minimum inset inside the holder**, square corners (the corners of the image are the data being cropped, never round them). A transparent image shows the holder gray. The image sits 28 from the screen edge, so the 44 hit area of a corner on the image edge stays fully on screen (22 + 6).
- Code: `padding` in `CropView.svelte` goes from 20 to 16 and the holder is a `gridlayout` with `margin=12`, `borderRadius=28`, `backgroundColor=#26262A` around the image view and the canvas.

### 1.3 Colors

| Role | Value | Note |
| --- | --- | --- |
| Screen | `#0E0E10` | Both platforms, both themes. Today `visualState` is `black` |
| Holder | `#26262A` | Already in `CropView.svelte` (not white, rules 24) |
| Outside the outline | `#0000008C` (black 55%) | Dim, drawn with an even-odd path over the holder |
| Accent | iOS: app accent at L 68 (`#8AB4FF` for the blue seed). Android: tone 80 (`#ADC6FF`) | "Accent lightened for dark", the transparent sheet roles of `cardwallet-card-view.md` |
| Handle ring | `#FFFFFF` | Keeps the handle visible on a light page |
| Text and icons | iOS `#FFFFFF`; Android `#E2E2E9` | On-surface of the dark roles |
| Hint | `#FFFFFFB3` (white 70%) | |
| Glass (iOS) | System glass, forced dark | Close and undo / redo buttons, the toolbar |

### 1.4 Crop overlay

| Part | Value |
| --- | --- |
| Outline | 2 solid, accent, round joins. Today 2 as well |
| Corner handle | Circle, 24 overall: accent disc 20 with a 2 white ring. Filled (today an outlined circle of radius 10) |
| Edge handle | Capsule, 6 thick, length min(30% of the edge, 48), accent, 1 white ring (8 overall). Today an outlined 10 x min(30%, 90) rectangle |
| Hit area | Corner 44 x 44. Edge max(44, length) x 44. The center anchor is the whole inside of the quad. The nearest anchor wins when areas overlap |
| Grabbed corner | x 1.25 (30 overall) plus a halo of 44 in the accent at 28% (`#8AB4FF47`), 100 ms |
| Grabbed edge | Capsule 6 to 8 thick, its two corners x 1.25, no halo |
| Moving all | The inside of the quad tinted accent 12% (`#8AB4FF1F`), all corners x 1.25 |
| Radii (shape rule) | Handles are marks: round (circle, capsule = height / 2). The holder 28. The magnifier is a circle |

### 1.5 Magnifier

Shown **only while a single corner is dragged** (not for an edge or move all), as today.

| Property | Value |
| --- | --- |
| Size | 100 round (`ZOOOM_GLASS_SIZE` 50 is its radius) |
| Zoom | 2x of the full resolution image, the dragged corner at the crosshair (center) |
| Ring | 2, accent. Level 3 shadow (0 4 12, 20% black) |
| Crosshair | Two lines, 1, `#FFFFFFE6`, arms 12 each side (today 10, in the accent, which disappears on a blue page) |
| Position | Top-left of the holder, 8 from its edges (center at 58, 58). Slides to the **top-right** (same inset, 150 ms) when the touch started in the first 180 x 180 of the holder or the dragged corner is within 50 of the magnifier center. This is the behavior in `drawZoomGlass`; the first proposal said "follows the finger", which the code does not do and which would hide the corner |
| Appear / disappear | 100 ms fade, scale 0.9 to 1 on appear. No scale with Reduce Motion |

### 1.6 Hint

- Text: "Drag near a corner or an edge. The closest handle moves." (replaces `crop_edit_doc`, which is longer and says "touch the screen" without saying what moves).
- Role: secondary, centered, max 2 lines then ellipsis. iOS Subheadline 15; Android Body Medium 14. Color `#FFFFFFB3`.
- It is a row of the screen, not a label over the image and not the bar subtitle.
- It stays visible. While a handle is dragged it fades to 0 in 100 ms (the row stays reserved) and comes back in 150 ms on release.

### 1.7 Bars and controls

**iOS** (the system bars, `ui-appbar`, forced dark):

| Control | Spec |
| --- | --- |
| Close | Left, system glass circle, 44, icon `close` 22. Discards the crop. No confirmation (undo is the safety net, as today) |
| Undo, redo | Right, one glass capsule, 44 tall, two 44 wide buttons, icons `undo`, `redo` 22. Disabled 45% (`#FFFFFF73`) |
| Full image | System toolbar, left, **text** button "full image", Body 17 regular, white. Disabled 45% when the quad is already the full image |
| Done | System toolbar, trailing end, **prominent** tinted button, text "done" Body 17 semibold, 44 tall pill, white on the app accent. The main action is trailing (rules 20). Always enabled: with no change it closes without a result |

**Android** (edit mode, rules 20: every action in the top bar, no bottom bar, no FAB):

| Control | Spec |
| --- | --- |
| Close | Navigation icon, 48 target, `close` 24, 4 from the edge. Discards |
| Title | "crop", Title Large 22 `#E2E2E9`, left aligned after the close icon |
| Undo, redo | Icon buttons 48, `undo`, `redo` 24. Disabled 38% (`#E2E2E961`), no ripple |
| Done | Text button, Label Large 14 medium, accent tone 80, 40 tall, 12 padding, 48 target. Pressed: state layer 10% accent |
| More | `more` 24, 48 target, menu with one item "Full image" (`full_image`, Body Large 16). `disabled` when the quad is already the full image |

Room check on 412: close 48 + title + undo 48 + redo 48 + done about 64 + more 48 = 256 + title, so about 150 left for "crop".

### 1.8 States

| State | What shows |
| --- | --- |
| Default | Quad on the detected page. Undo and redo disabled. Hint visible. No magnifier |
| Dragging a corner | Grabbed corner x 1.25 with halo, magnifier on, hint faded out. Undo and redo unchanged until release |
| Undo available | After a release with a change: undo enabled, redo disabled |
| Redo available | After an undo: redo enabled (undo enabled if the stack is not empty) |
| Full image | The quad animates to the full rectangle (250 ms, ease in out) and is **one undo step** (today `resetCrop` sets the quad without one, which makes an accidental tap unrecoverable). Then the button is disabled |
| Pressed | iOS: the system highlight on glass, text buttons scale 0.97 and 85% opacity (rules 10). Android: state layer 10% |
| Disabled | iOS 45%, Android 38%, no press feedback (rules 10) |
| Light and dark app theme | Identical (forced dark) |
| E-ink | `isEInk` keeps today's white: screen and holder `#FFFFFF` with a 1 black border, outline `#000000` 3, handles filled black with a 2 white ring, no dim (the outside is washed with `#FFFFFF99`), no animation |
| Reduce Motion | The magnifier does not scale, the quad jumps to the full rectangle, fades are 150 ms |

### 1.9 Motion and haptics

| Motion | Value |
| --- | --- |
| Grab (halo and scale) | 100 ms |
| Magnifier appear, disappear | 100 ms |
| Magnifier slide to the other corner | 150 ms, cubic-bezier(0.2, 0.9, 0.3, 1.15) (rules 11) |
| Full image | 250 ms ease in out |
| Hint fade | 100 ms out, 150 ms in |
| Haptics | iOS: selection tick on grab, light impact on "full image". Android: `CLOCK_TICK` on grab |

### 1.10 Accessibility

Handles are drawn on a canvas, so a screen reader cannot reach them. "Full image" and "done" are real controls. A per-corner nudge (accessibility actions on the canvas) is not designed here.

### 1.11 Mapping to the code

- `CropEditView.svelte`: replace `CActionBar`, the check `uibutton` and the hint label by an `appPage` with an `appBar`, as `DocumentEdit.svelte` does.
  - iOS: `appBarItem` close (left), undo and redo (right, `isEnabled` from `cropItem.undos.length` / `redos.length`), `bottomItems = [{ text: lc('full_image'), onTap: resetCrop, enabled: !isFullImage }, { spacer: true }, { text: lc('done'), prominent: true, onTap: onRecropTapFinish }]`.
  - Android: navigation button close, title `lc('crop')`, `appBarItem` undo, redo, a text-only `appBarItem` done (check the show-as-action flag so the text shows), and `more` with `menu=[{ title: lc('full_image'), icon: appIcon('full_image'), disabled: isFullImage, onSelect: resetCrop }]`.
  - The hint is a `label` in the row above the toolbar, with a constant height of 40. `visualState` becomes `#0E0E10`.
- `resetCrop` pushes an undo entry (export an `applyQuad(quad)` from `CropView` that does `undos.push(...)`, clears `redos`, and dispatches `undosChanged`).
- `CropView.svelte` drawing: holder `gridlayout`, `padding` 16; corners and edge handles in FILL style with a white ring paint; an even-odd `Path` for the dim; the grabbed state from `closestCornerQuadIndex`; crosshair arms 12 in white. The hit logic (`getQuadAndCornerClosestToPoint`) stays as is.
- Strings: `crop_edit_doc` gets the new hint; add `full_image`, `done` (if missing), `undo`, `redo`.

---

## 2. Export menu

### 2.1 Principles

1. **One menu, one function.** `getExportMenu(options): MenuItem[]` builds every export menu. Only the pages and the documents change what it holds. No popover, no anchor to a whole page, no `closePopover`.
2. **The button owns the menu.** The menu opens from the export button of the bar (iOS `UIMenu` on the item, Android M3 menu of `ui-menu` anchored to the button), so it always opens at the button.
3. **Complete titles.** "Share PDF", never "Share" under a "PDF" header: VoiceOver and TalkBack read the title of a row, not its section. So there are **no section titles**, only separators (an inline group on iOS, a segment on Android).
4. **Order of sections:** PDF first in both apps, then images, then settings. A pass section comes first when passes are involved.
5. **Hidden, not disabled** when an item cannot apply (rules 20). `disabled` is kept for two cases (2.7).
6. **No destructive item.** Exporting never deletes anything (the "delete originals" option is not offered here).
7. **iOS lists the first item nearest the button** when the menu opens above it (a bottom toolbar): UIKit reverses the order by default. The code order is the reading order top to bottom; the mockup draws what the user sees on iOS.

### 2.2 Items

`MenuItem` fields used: `id`, `title`, `subtitle`, `icon`, `disabled`, `separator`. Subtitle works on both platforms (UIAction subtitle on iOS 15+; the Android rows draw a second line at 0.8 x 16 sp in onSurfaceVariant), although `index-common.ts` of `ui-menu` documents it as iOS only: fix that comment.

| id | Title | Subtitle | Icon id | Platform | Result |
| --- | --- | --- | --- | --- | --- |
| `preview_pdf` | Preview PDF | | `preview` | both | Full screen PDF preview (`cardwallet-pdf-preview.md`) |
| `export_pdf` | Export PDF… | | `save_to_folder` | both | The export sheet (folder, file name, quality, password), then the "exporting" card, then the "PDF saved" snackbar or toast with "open" |
| `export_pdf_one` | Export as one PDF… | "%1$s pages in one file" | `save_to_folder` | several documents | Same sheet, one file with all the pages |
| `export_pdf_each` | Export a PDF per document… | "%1$s documents" | `save_to_folder` | several documents | The sheet without the file name, one PDF per document, in sequence, then the "PDFs saved" snackbar |
| `share_pdf` | Share PDF | | `share` | both | "exporting" card, then the system share sheet |
| `print_pdf` | Print PDF | | `print` | Android | "exporting" card, then the system print dialog (iOS prints from the PDF preview) |
| `export_images` | Export images (one: Export image) | | `save_to_folder` | both | Folder picker if none is stored (Android keeps it, iOS asks each time), a file name prompt for a single image, then the "exporting" card and a snackbar |
| `save_gallery` | Save to gallery | | `save_gallery` | both | Permission request if needed, then the "exporting" card |
| `share_images` | Share images (one: Share image) | | `share` | both | The system share sheet with the files (transformed images are rendered first) |
| `export_as_pkpass` | Export as PKPass | | `save_to_folder` | pass | Folder picker if needed, then the "Passbooks exported" snackbar |
| `export_as_espass` | Export as ESpass | | `save_to_folder` | pass | Same |
| `share_as_pkpass` | Share as PKPass | | `share` | pass | The system share sheet |
| `share_as_espass` | Share as ESpass | | `share` | pass | Same |
| `pdf_settings` | PDF export settings | | `settings` | both | Opens Settings at the PDF export section |
| `set_export_directory` | Export folder | the folder name, or "Please select the export folder" | `folder` | Android | Folder picker, stores it, **exports nothing** |

Notes:

- The old "open" item (export to temp, open in another app) and "print" are in the more menu of the PDF preview (`cardwallet-pdf-preview.md`, section 7). Share and print stay here as shortcuts that do not need the preview.
- The folder **reset** icon on the Android folder row is kept as the `trailingAction` of the item (see decision 5). The PDF folder row of the old PDF popover is gone: the export sheet already has a folder row.
- iOS has no `set_export_directory`: the code stores no folder on iOS (every export asks), as today.

### 2.3 Items per context

An item is **hidden** when its section does not apply:

- PDF section: only when `pdf !== false` and some page has an image and the document is not a pass.
- Pass section: only in the card app and when some page is a pass. The pass items act on the pass pages of the selection only.
- Images section: only when some page has an image file.
- Settings: `pdf_settings` with the PDF section, `set_export_directory` (Android) with the images or pass section.
- The whole button is hidden when the menu would be empty (a card with codes only; `canBeExportedToPDF`).

The contexts. "A" is Android only.

| # | Context | Section 1 | Section 2 | Section 3 |
| --- | --- | --- | --- | --- |
| 1 | **Card view, document with photos** (Cardwallet), all pages or the selected ones | Images: `export_images`, `save_gallery`, `share_images` | PDF: `preview_pdf`, `export_pdf`, `share_pdf`, A `print_pdf` | `pdf_settings`, A `set_export_directory` |
| 2 | **Card view, a pass** (PKPass) | Pass: `export_as_pkpass`, `export_as_espass`, `share_as_pkpass`, `share_as_espass` | Images (only if the pass has an image): `export_images`, `save_gallery`, `share_images`, all singular | A `set_export_directory` |
| 3 | **Document** (Document Scanner, "a PDF document"), all pages or the selected pages | PDF: `preview_pdf`, `export_pdf`, `share_pdf`, A `print_pdf` | Images: `export_images`, `save_gallery`, `share_images` | `pdf_settings`, A `set_export_directory` |
| 4 | **Page edit**, the current page (`pdf: false`) | Images, singular: `export_images`, `save_gallery`, `share_images` | A `set_export_directory` | |
| 5 | **Several documents selected** (list), bulk | PDF: `preview_pdf`, `export_pdf_one`, `export_pdf_each`, `share_pdf`, A `print_pdf` | Images (all pages): `export_images`, `save_gallery`, `share_images` | `pdf_settings`, A `set_export_directory` |

- One selected document is context 3 with `pages` = its pages.
- The order of the PDF section follows the flow: look at it, save it, send it, print it.
- Singular: `export_images` and `share_images` read "Export image" and "Share image" when `pages.length === 1` (plural keys, `lcp`).
- Number of rows: context 1 has 9 rows on Android (7 on iOS), the largest is context 5 with 10. The Android menu is `ScrollView`-based and is limited to the screen height minus 16; it scrolls if needed.

### 2.4 Skin of each platform

**iOS: the system menu.** Nothing is drawn by the app. The app controls titles, subtitles, icons, `disabled`, the sections (`separator` starts an inline group).

| Property | Value |
| --- | --- |
| Row | System: 44 minimum, Body 17, trailing icon, the system makes a row taller for a subtitle (Footnote, secondary) |
| Sections | Inline groups, the system gap |
| Width | System, 250 to 300 depending on content and Dynamic Type |
| Direction | Opens above a bottom toolbar item (first item nearest the button), below a top bar item |
| Motion | The system morph from the button (rules 14) |

**Android: M3 Expressive menu (`ui-menu`).** Values from `menu-popup.android.ts`:

| Property | Value |
| --- | --- |
| Container | surfaceContainer, radius 28, padding 6, elevation as the other menus (rules 2, level 3) |
| Section | A segment: rows 48 minimum, 20 outer corners, 6 inner corners, 2 gap between rows, 6 between sections |
| Row | 16 horizontal padding, icon leading 20, gap 12, title Body Large 16, subtitle 12.8 sp onSurfaceVariant under it (max 2 lines, ellipsis), ripple 12% of the content color |
| Disabled | Content 38%, no click, no ripple |
| Width | Content width, min 180, max min(280, screen - 16), 8 from the screen edges (the popup is clamped) |
| Direction | `placement { vertical, horizontal }` set by the caller (2.5) |
| Motion | Scale 0.8 to 1 plus fade, 150 ms, pivot at the anchor corner (rules 14) |

Menus are always opaque (`cardwallet-card-view.md`, Menus). Light and dark follow the app theme (the mockup has both).

### 2.5 Where the menu opens

The button is the icon `export` (rules 13, `square.and.arrow.up` on iOS, `export-variant` on Android), with the label "export" for accessibility.

| Screen | iOS | Android | Placement |
| --- | --- | --- | --- |
| **Card view** (no selection) | Bottom toolbar item at the left, `{ icon: export, menu }`, the "edit" prominent item stays at the right. A pass has no edit, so the toolbar is the export item alone | The small tonal FAB (40) to the left of the Edit FAB, `showMenu` on tap | Android: `{ vertical: 'above', horizontal: 'end' }`. iOS: above, system |
| **Card view, pages selected** | The bottom selection toolbar: the "share images" item becomes this export item | The contextual top bar: the "share images" action becomes this export action, before favorite | iOS above. Android `{ vertical: 'below', horizontal: 'end' }` |
| **Page edit** | Top bar right, in the glass pill, before more | Top bar action, before more | Below the bar, `end` |
| **Document** (Scanner) | Top bar right, replacing the PDF button; with pages selected, the bottom selection toolbar | Top bar action replacing the PDF button; with pages selected, the contextual bar | iOS below (bar) or above (toolbar). Android below, `end` |
| **Document list, selection** | The bottom system toolbar item (rules 5), replacing "export PDF" and "share images" | The contextual top bar action, replacing the same two | iOS above. Android below, `end` (while the custom `SelectionToolbar` is still used: `{ vertical: 'above', horizontal: 'start' }`) |

While the menu is open the button keeps the system highlight (iOS) or its state layer (Android). The selection is kept until the item finishes (`onDone` unselects after a share, as `runSelectionOption('share')` does now).

### 2.6 What happens on select

The menu closes first (system behavior), then:

- **A sheet:** `export_pdf`, `export_pdf_one`, `export_pdf_each` open the export sheet (`ExportPDFOptionsSheet`, rules 24): Cancel / "export settings" / Export, with the folder row, the file name (not for a PDF per document), the quality and the password.
- **A picker:** `set_export_directory`, and any folder-based export without a stored folder (Android), open the folder picker (SAF). Cancel gives the snackbar "Please select the export folder".
- **A system sheet:** the `share_*` items open the share sheet, `print_pdf` the print dialog.
- **A screen:** `preview_pdf` the PDF preview, `pdf_settings` Settings.
- **Blocking work** shows the centered "exporting" card (rules 12) and ends with the snackbar (Android) or toast (iOS): "PDF saved: name" with "open", "PDFs saved", "Passbooks exported".
- Errors go to `showError`, as now.

### 2.7 Disabled and destructive

- **Destructive:** none.
- **Disabled, case 1:** `save_gallery` on iOS when access to the photo library was refused: `disabled: true` and the subtitle "Allow photo access in Settings". The mockup shows the state in the anatomy block. Optional: it needs a permission check when the menu is built. Without it the item stays enabled and asks the permission when tapped, as now.
- **Disabled, case 2:** the "Full image" item of the crop view when the quad is already the full image (1.7).
- Everything else is hidden when it cannot apply.

### 2.8 Icons

Ids live in `app/utils/appIcons.ts` (rules 13). Same action, same icon on every screen. `export` and `share` already exist (`export` is `export-variant` on Android). New ids:

| Id | SF Symbol (iOS) | MDI (Android) | Use |
| --- | --- | --- | --- |
| `preview` | `eye` | `eye-outline` | Preview PDF |
| `print` | `printer` | `printer-outline` | Print PDF |
| `save_to_folder` | `square.and.arrow.down` | `folder-download-outline` | Export PDF, images, passes |
| `save_gallery` | `photo.badge.arrow.down` | `image-multiple-outline` | Save to gallery |
| `undo` | `arrow.uturn.backward` | `undo` | Crop |
| `redo` | `arrow.uturn.forward` | `redo` | Crop |
| `full_image` | `arrow.up.left.and.down.right.and.arrow.up.right.and.down.left` | `arrow-expand-all` | Crop, Android more menu |

Existing ids reused: `export`, `share`, `settings`, `folder` (Export folder), `close`, `more`, `crop`. Check each SF Symbol name on device (SF Symbols 5 and 6 names from memory) and run `scripts/generate-android-icons.mjs` for the five new MDI names. The mockup uses Tabler stand-ins (`eye`, `printer`, `folder-down`, `photo-down`, `share-3`, `settings`, `folder`).

### 2.9 Strings

Existing keys to reuse: `export_as_pkpass`, `export_as_espass`, `share_as_pkpass`, `share_as_espass`, `pdf_export_settings`, `export_folder`, `please_choose_export_folder`, `documents_count`. To change: `save_gallery` ("save image to gallery" becomes "Save to gallery"), `crop_edit_doc` (new hint). To add: `preview_pdf`, `export_pdf`, `export_pdf_one`, `export_pdf_each`, `pages_in_one_file` (plural), `share_pdf`, `print_pdf`, `export_images` and `share_images` singular variants, `full_image`, `undo`, `redo`. Case follows the style of `en.json` (the mockup uses sentence case).

### 2.10 Mapping to the code

Today (`app/utils/ui/index.common.ts`) two functions open a popover: `showPDFPopoverMenu({ pages, document, documents, anchor, popoverOptions })` and `showImagePopoverMenu(pages, anchor, popoverOptions)`. Both keep a local `exportDirectory`, an `ObservableArray` of rows, an `onRightIconTap` for the reset icon, and a big `onClose` switch that calls `closePopover()` first. They return nothing useful (PDF) or `Promise<boolean>` "did something" (images).

**Target:**

```ts
export interface ExportMenuOptions {
    pages: { page: OCRPage; document: OCRDocument }[];
    documents: OCRDocument[];
    document?: OCRDocument; // set when the pages are those of one document
    pdf?: boolean; // default true; false on the page edit screen and for a pass
    images?: boolean; // default true
    onDone?: (item: MenuItem) => void; // after a share or an export ran (callers unselect)
}
export function getExportMenu(options: ExportMenuOptions): MenuItem[];
```

1. **Pure builder.** `getExportMenu` returns `MenuItem[]` (sync). It computes the sections from the options (2.3), puts `{ separator: true }` between them, and gives every item `id`, `title`, `subtitle`, `icon: appIcon(...)` and `onSelect`. Section order uses `CARD_APP` (images before PDF in Cardwallet, a pass section first). The section logic can live in a sibling pure module (like `exportUtils.ts`) so Vitest can test it: given pages and flags, which ids in which order.
2. **Bodies become functions.** Each `case` of the two `onClose` switches becomes a module function: `previewPDF`, `exportPDF`, `exportPDFPerDocument`, `sharePDF`, `printPDF`, `exportImages`, `saveToGallery`, `shareImages`, `exportPass`, `sharePass`, `openPDFSettings`, `pickExportDirectory`. Each is wrapped by one `runExportAction(id, fn, onDone)` doing `try { await fn() ; onDone?.(item) } catch { showError } finally { hideLoading() }`.
3. **The folder state** is two helpers, `getExportDirectory('pdf' | 'image')` and `pickExportDirectory('pdf' | 'image')`, over `ApplicationSettings` (and the iOS bookmark that is stored today). Gone: `updateDirectoryName`, the `ObservableArray`, `options.setItem(0, ...)`, `onRightIconTap` and the reset.
4. **No more popover.** Remove `closePopover()` calls, the `anchor` and `popoverOptions` parameters and the `showPopoverMenu` use here (`ui-popover` stays for `SelectionToolbar`). The `didDoSomething` result becomes `onDone`.
5. **Callers:**

| File | Today | Target |
| --- | --- | --- |
| `CardView.svelte` | `exportDocument()` calls `showImagePopoverMenu` or `showPDFPopover`; a "share images" selection item; `getAnchor()` returns the page | `$: exportMenu = getExportMenu({ pages: nbSelected > 0 ? getSelectedPages() : geAllPages(), documents: [document], document, pdf: !isPKPassDocument, onDone: unselectAll })`. iOS: `getBottomItems` and `getSelectionBottomItems` use `{ icon: appIcon('export'), menu: exportMenu }` instead of `onTap`. Android: the small FAB `on:tap={(e) => showMenu({ anchor: e.object, items: exportMenu, placement: { vertical: 'above', horizontal: 'end' } })}`; the selection `appBarItem` for share becomes `<appBarItem icon={appIcon('export')} menu={exportMenu} />`. Delete `getAnchor`, `showPDFPopover`, `exportDocument`, and the `'share'` case of `runSelectionOption` |
| `DocumentEdit.svelte` | `showImageExportPopover` with `getAnchor()` | `<appBarItem icon={appIcon('export')} menu={exportMenu} />` with `$: exportMenu = getExportMenu({ pages: [{ page: items.getItem(currentIndex), document }], documents: [document], document, pdf: false })`; it follows `currentIndex`. Delete `showImageExportPopover` and `getAnchor` |
| `DocumentView.svelte` | `showPDFPopover` on the PDF `actionBarButton`; `'pdf'` and `'share'` selection actions | One export button: `on:tap={(e) => showMenu({ anchor: e.object, items: getExportMenu({ pages: nbSelected > 0 ? getSelectedPages() : allPages, documents: [document], document, onDone: unselectAll }), placement: { vertical: 'below', horizontal: 'end' } })}`. In `getSelectionToolbarOptions` the entries `pdf` and `share` become one `export` entry |
| `MainList.svelte` | `'pdf'` and `'share'` selection actions, each `showPDFPopoverMenu` / `showImagePopoverMenu` after `await getSelectedPagesAndPossibleSingleDocument()` | One `'export'` action: `const [pages, document, documents] = await getSelectedPagesAndPossibleSingleDocument(); showMenu({ anchor: event.object, items: getExportMenu({ pages, document, documents, onDone: unselectAll }), placement: { vertical: 'above', horizontal: 'start' } })` for the custom toolbar. With the native selection bars (rules 5), `menu` on the item, built reactively from the selection |

6. **Menu items are built when the selection or the page changes** (reactive statements) for `menu` properties, and on tap for `showMenu`. After `set_export_directory` the subtitle is stale until the menu is rebuilt: reassign `exportMenu` from `onDone`, or build on tap.
7. **`ui-menu` changes:** the `subtitle` comment in `index-common.ts` ("iOS only") is wrong, Android draws it. Nothing else is needed (sections, subtitle, icon, disabled, placement exist).
8. **Tests:** a Vitest test of the pure section builder (ids and order for the five contexts, both platforms) in the same way as `exportUtils.ts`.

---

## 3. Decisions

1. **PDF first in both apps.** The PDF section comes before the images section in Cardwallet and in the Document Scanner. A pass section still comes first when passes are involved.
2. **"PDF export settings" stays in the menu:** the Open action exports to a temp file without going through the export sheet, so the settings need their own entry.
3. **Page edit has no PDF section** (`pdf: false`): the menu is about the current page, and the page edit more menu has no PDF export item either.
4. **The list selection toolbar has one export button:** "Export PDF" and "share images" are merged into it.
5. **The folder reset stays on the Android folder row,** as a `trailingAction` of the menu item (`ui-menu` gets it: a trailing icon on Android, a second action right after the item on iOS, where the folder row does not exist anyway).
