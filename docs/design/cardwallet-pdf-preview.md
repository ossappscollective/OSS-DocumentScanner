# PDF preview (Cardwallet and Document Scanner)

> Where this file and `cardwallet-design-rules.md` disagree, the rules file wins. Mockup: `cardwallet-pdf-preview.html`. Status: proposal, replaces `app/components/pdf/PDFPreview.svelte` (wrapped by `PDFPreviewModal.svelte`).

Values are pt (iOS) and dp (Android) for a 393 / 412 wide screen, like the rest of the system (rules, section 0). The mockup is drawn 300 wide: take the numbers from here.

## 1. What the screen is

A live preview of the **sheets of the PDF** (not the rendered file): one pager page per sheet, drawn with the current layout options. It answers one question, "what will my PDF look like", and offers the way to change the layout and to export.

- **Entry points:** the PDF export menu (action `preview`, `showPDFPopoverMenu`) as a full screen modal; the scanner activity (`CameraScanToPDF`, `saveFunction` mode) as a pushed page.
- **Features kept from today:** orientation, paper size (full, A4, A3, letter), color or black and white, pages per sheet (1 to 6), margins, transparent OCR text, export, open, print (Android), share, link to the PDF export settings, sheet counter.
- **Features moved:** image quality, password and folder are not preview options (they do not change what is seen); they are in the export sheet (section 24 of the rules) and in Settings, reachable from the last row of the layout sheet.
- **Features changed:** the filename prompt becomes the export sheet; the top drawer with six text fields becomes the layout sheet; open, print and share go to the more menu.

## 2. Anatomy: native or custom

| Part | iOS | Android | Kind |
| --- | --- | --- | --- |
| Top bar | `appBar` size small, translucent, title and subtitle | `appBar` small, title and subtitle | **Native** |
| Close | left bar item, `close` | navigation button, `close` | Native |
| Black and white toggle | right bar item, tinted when on | right bar item, toggled container when on | Native item, state drawn by the app |
| More menu | `UIMenu` on the right bar item | M3 Expressive menu | Native |
| Pager of sheets | `pager` | `pager` | **Custom view** (paper, grid, images) |
| Counter pill | label | label | Custom, same as the page edit |
| Bottom actions | `appBar` `bottomItems` (system toolbar, glass) | `fabHolder`: small tonal FAB and extended FAB | iOS native, Android custom views |
| Layout sheet | `showBottomSheet`, transparent | `showBottomSheet`, transparent | Native sheet, custom content |
| Progress, blocking card, snackbar, toast | system progress view, glass card, glass capsule | wavy progress, surface card, snackbar | Existing helpers |

## 3. Top bar (rules, section 20)

| Slot | Content |
| --- | --- |
| Left | `close` (a modal, so close and not back). iOS: 44 glass bar button, icon 22. Android: 24 icon in a 48 target |
| Title | "PDF preview". iOS Headline 17 semibold, centered. Android Title Large 22, left aligned after the close icon |
| Subtitle | The layout summary: "Full size", or "A4 · 2 per sheet", "Letter · landscape · 4 per sheet" (orientation only when landscape, "per sheet" only when more than 1). iOS 12 secondary, Android Label Medium 12 secondary. One line, tail ellipsis. It follows the options live |
| Right 1 | **Black and white toggle** (a state of the output, so always visible, never in a menu). Off: plain icon. On: iOS accent icon on an accent 15% circle (32, inside the glass pill); Android M3 toggle icon button 40 with the accentContainer fill and onContainer icon. It is the only color option: the layout sheet has no color row |
| Right 2 | The one **more menu** (section 7) |

- iOS: the two right items share one glass pill; the pill and the close button are system glass.
- The title area gets what is left; the subtitle truncates before the title does.
- In the empty and error states the toggle and the more menu are hidden.
- No document name in the bar: the file name is chosen in the export sheet.

## 4. Pager and sheet

- **Pager:** horizontal, one page per sheet, neighbors peek 16, gap 8, the current page is the screen width minus 48 (345 on 393). Swipe changes the sheet, haptic selection on iOS.
- **Vertical room:** from 16 below the bar to 8 above the counter. Counter and controls reserve, from the bottom: inset + 16 + control height (iOS toolbar 44, Android FAB 56) + 12 + counter 28 + 8. The sheet keeps its ratio: width = min(page width, available height x ratio), centered in its page.
- **Paper:** a white sheet, `#FFFFFF` light and `#E8E8EA` dark (not pure white at night), whatever the theme otherwise. Radius 6 (a real page corner, like the page edit screen, not the container formula). iOS: level 1 shadow (0 2 10, 18% black). Android: no shadow, 1 outline in outlineVariant (`#C4C6D0` light, `#43474E` dark).
- **Ratio** (width / height in portrait; landscape is the inverse):

| Paper | Size in points | Ratio |
| --- | --- | --- |
| Full | the page image itself, rotation applied | per page; no margin, no grid |
| A4 | 595 x 842 | 0.707 |
| A3 | 842 x 1191 | 0.707 (same shape as A4, so it looks the same) |
| Letter | 612 x 792 | 0.773 |

- **Grid** (pages per sheet n; ignored with Full, which is always 1): n = 1 one cell. n = 2 portrait: 1 column x 2 rows; landscape: 2 columns x 1 row. n = 3 to 6 portrait: 2 columns x ceil(n / 2) rows; landscape: the opposite. An odd n above 2 gives the last page a double cell (it spans the 2 cells of its row in portrait, of its column in landscape). Order: row by row (portrait) or column by column (landscape).
- **Margins:** each cell is inset by `page_padding x sheet width / paper width in points` on its 4 sides (paper width = 595 A4, 842 A3, 612 letter; the long side in landscape). The exporter applies the margin in points per page, so the preview is exact; a neighbor gap is twice the margin.
- **Images:** aspect fit inside the cell, page rotation and page color matrix applied (as in the exporter), black and white applies the grayscale matrix, crossfade 250 ms when toggled. The OCR text layer is invisible in a PDF, so it is not drawn.
- **Counter pill:** "2 / 5" counts sheets. 28 tall, 12 horizontal padding, 13 text (Footnote), radius 14. iOS fill `#7676801F` (flat, a glass pill is unreadable over the page color), Android secondaryContainer. Centered, 12 above the control row. Hidden for one sheet, while loading, while a snackbar or toast shows, and in the empty and error states. It replaces the accent `PageIndicator` of today.

## 5. Bottom actions (rules, section 20)

| | iOS | Android |
| --- | --- | --- |
| Secondary: **layout** | System toolbar item, `tune`, 44 target, left | Small tonal FAB, 40 round, `tune`, 12 to the left of the main FAB, centered on it |
| Main: **export** | Prominent bar item at the trailing end: text "export" (Body 17 semibold) with `export` icon, tinted with the accent | Extended FAB, 56 tall, full round, padding 20, icon 24, gap 10, "export" Label Large 14 medium, accent fill, onAccent content, level 3 |
| Position | System toolbar, glass, above the home indicator | 16 from the right edge and 16 above the inset |

- In `saveFunction` mode (scanner activity) the main action reads "save" with `check`, and the more menu is removed. Nothing is persisted as a default in this mode (as today).
- Android keeps its FAB here because the layout sheet is not an edit mode that changes the whole screen (rule 20 hides the FAB in edit modes). The FAB does not collapse (the pager is horizontal).
- While the layout sheet is open the toolbar and FABs sit under it and come back when it closes. Disabled while loading (45% iOS, 38% Android).
- **Export** opens the export sheet (`ExportPDFOptionsSheet`: folder, file name, JPEG quality, password), then the blocking "exporting" card, then the "PDF saved: name" snackbar (Android, 6 s) or toast (iOS, 5 s) with the action "open".

## 6. Layout sheet

The transparent sheet of the page edit and the camera (card view doc, Sheets; rules 22 and 24): no dim, forced dark, grabber 36 x 5, detents half and large, content on the on-glass roles (text white, secondary white 68%, fill white 14%, separator white 22%, tonal white 18%, accent lightened). iOS floats with 6 inset and 26 radius, Android has 28 top corners. Glass base 55% rising to 72% (the page behind is mostly white paper, so expect 72%). Fallback (Reduce Transparency, power saving, e-ink): opaque, app roles.

- **Opens** from the layout button. **Closes** with a swipe down, Android back, or the system dismiss. No Save: every change applies live and closing keeps it.
- **At the half detent** the sheet shows the header and the four layout rows; the OCR row and the settings row are below, reached by scrolling or the large detent. The pager shrinks and moves up (300 ms ease in out) to keep the sheet visible above it, and goes back on close (same behavior as the page edit).
- **Header:** title "page layout" (existing string), iOS centered Headline 17 semibold with a trailing glass pill **Reset** (28 tall); Android Title Medium left with a text button Reset (Label Large 14 medium, accent). Reset puts the six layout keys back to `DEFAULT_PDF_OPTIONS` (not quality, password, folder); disabled (45% / 38%) when nothing differs. No Cancel and no Done.
- **Group:** one card, radius 16 (iOS) or 20 (Android), fill white 14%, 16 side margin, hairlines inset 14 in white 22%. Rows 52 tall (iOS min 44), 14 padding, label Body 17 (iOS) or Body Large 16 (Android).

| Row | Control | Values |
| --- | --- | --- |
| Paper size | Own line under the label. iOS: system segmented control, 32 tall, full width. Android: connected button group, 40 tall, 2 gap, 20 / 6 corners, selected tonal (white 18%) with a check | Full, A4, A3, Letter |
| Orientation | Trailing, 200 wide, same control | Portrait, Landscape |
| Pages per sheet | iOS: label, the value in secondary (Subheadline 15) and the system stepper. Android: minus and plus buttons, 40 round, white 14%, with the value between | 1 to 6 |
| Margins | Label, the value on the right ("10 pt", secondary at the default, accent otherwise, a tap resets it), then the slider (iOS system, Android M3). Row 68 tall | 0 to 50 pt, step 1, default 10 |

- **Full paper size:** Orientation, Pages per sheet and Margins stay visible at 45% (iOS) or 38% (Android) content opacity, no press feedback, and a helper line under the group: "Each sheet has the size of its page. Orientation, pages per sheet and margins do not apply." (Footnote 13 on iOS, Label Medium 12 on Android, white 68%). Switching back to A4 restores the values.
- **Transparent OCR text:** a switch row (trailing, iOS 51 x 31, Android M3 52 x 32), supporting text "searchable text layer in the PDF". Only present when some page has OCR data. In its own group, 8 below.
- **Last row:** "Image quality, password, folder", leading `settings` 18, a trailing chevron on iOS only. It closes the sheet and opens the PDF export settings (Settings, `pdf_export`). 8 below the OCR group.
- **Dynamic Type or font scale above 150%:** the paper size segmented control becomes a select row (the platform menu, rules section 14), the same for orientation.
- **Bottom:** inset + 16 padding (rules, section 15).

## 7. More menu

| Item | Icon id | Platform | Action |
| --- | --- | --- | --- |
| Share | `share` | both | Export to temp, then the share sheet |
| Open in another app | `open` | both | Export to temp, then `openFile` |
| Print | `print` | both (iOS to build: system print controller) | Export to temp, then `printPDF` |

iOS: system menu, trailing icons. Android: M3 Expressive menu, 28 container, 6 padding, one segment, rows 48 with a leading icon 20. Nothing destructive, so no red. Each item shows the blocking "exporting" card until the temp file exists; an empty result shows the empty state error (`no_pages_in_pdf`).

## 8. States (rules, section 10)

| State | Behavior |
| --- | --- |
| Default | Sheet 1 of the document, counter, bars. The first sheet is selected |
| Loading sheets (non blocking) | Each image cell is a skeleton (rgba 120 120 128 at 14%, no shimmer) until its image decodes, then fades in 150 ms. A linear progress under the bar (4 tall pill, accent; iOS system progress view, Android wavy amplitude 3, wavelength 40) shows when the work lasts more than 400 ms, determinate from the images decoded. The counter hides, export and layout are disabled |
| Exporting (blocking) | Export, open, share, print: the centered card of rules section 12 (radius 24, 24 padding, spinner 32, 15 label "exporting", glass on iOS, surface on Android), dim 32%, input blocked |
| Exported | Snackbar (Android) or toast (iOS) "PDF saved: name" with "open", 12 above the control row; the counter hides while it shows |
| Empty | No pages: icon `pdf` in a 88 glass circle (iOS) or a 96 shape with the 32 / 10 notch corner (Android), icon 40; title "nothing to preview" (Title 2 22 bold / Title Large 22); one line, Subheadline 15 / Body Medium 14 secondary, 280 max; one prominent action "close" (44 capsule / 40 filled pill). Spacing 24, 8, 24. No toolbar, no FAB, no toggle, no menu |
| Error | The preview could not be built (image missing or unreadable): same layout, `error` icon in the error color, the message of the error as the line, prominent **Retry** and a text **Close** under it. Never color alone: icon and text |
| Export error | Unchanged: `showError` |
| Pressed | iOS 0.97 and 0.85 opacity, 100 ms (bar items use the system highlight); Android state layer 10% and ripple |
| Disabled | 45% iOS, content 38% and container 12% Android |
| Dark | Dark roles; paper `#E8E8EA`; images are not dimmed |
| E-ink | No glass, shadow or animation. Sheet has a 1 black border, the toggle on has a 3 border and a check, counter has a 1 border, the layout sheet is opaque white with black borders |
| Landscape device, tablet | The pager fits the height, the sheet and the bars keep their values; the layout sheet is at most 420 wide (right aligned) |

## 9. Typography

| Role | iOS | Android |
| --- | --- | --- |
| Title | Headline 17 semibold | Title Large 22 |
| Subtitle | 12 secondary | Label Medium 12 |
| Counter | Footnote 13 | Label Large 13 |
| Main action | Body 17 semibold | Label Large 14 medium |
| Sheet title | Headline 17 semibold | Title Medium 16 medium |
| Row label | Body 17 | Body Large 16 |
| Row value, supporting | Subheadline 15 | Body Medium 14 |
| Helper | Footnote 13 | Label Medium 12 |
| Menu item | Body 17 | Body Large 16 |
| Empty and error title | Title 2 22 bold | Title Large 22 |
| Empty and error line | Subheadline 15 | Body Medium 14 |

Dynamic Type and font scale to 200%: the bars and the sheet scroll, nothing is clipped.

## 10. Colors and roles

The accent is the app accent (this is not the card view, so no card color).

| Role | iOS | Android |
| --- | --- | --- |
| Page | systemGroupedBackground (`#F2F2F7`, `#000000`) | surface (`#F9F9FF`, `#111318`) |
| Paper | `#FFFFFF`, `#E8E8EA` | same |
| Toggle on | accent 15% fill, accent icon | accentContainer, onContainer |
| Counter | `#7676801F`, label | secondaryContainer, onSecondaryContainer |
| Main action | accent, onAccent (white) | accent (primary), onPrimary |
| Layout FAB | system glass | secondaryContainer, onSecondaryContainer, level 3 |
| Menu | system | surfaceContainer, level 3 |
| Error | system red (`#D70015`, `#FF453A`) | error (`#BA1A1A`, `#FFB4AB`) |
| Snackbar | glass capsule | inverseSurface, inversePrimary action |
| Layout sheet | on-glass roles (card view doc, Sheets) | same |

## 11. Motion (rules, section 11)

| Motion | Value |
| --- | --- |
| Modal present | System full screen cover (iOS), the existing modal transition (Android) |
| Sheet present, detent change | System spring (iOS), expressive spatial spring about 350 ms (Android) |
| Pager shrinks above the layout sheet | 300 ms ease in out, back on close |
| Layout change (paper, orientation, per sheet) | The sheet resizes in 250 ms ease in out, the cells crossfade in 150 ms |
| Margins slider | Live, no animation |
| Black and white | Image crossfade 250 ms |
| Skeleton to image | 150 ms fade |
| Toggle, counter, snackbar | Press 100 ms; the counter fades 150 ms |
| Reduce Motion, e-ink | 150 ms fade, none on e-ink |

Haptics (iOS): selection on sheet change and on stepper and segment changes, light success when the PDF is saved, warning on error.

## 12. Icons (rules, section 13)

Existing ids: `close`, `more`, `tune`, `export`, `share`, `open`, `settings`, `check`, `pdf`, `error`, `chevron`.

| Id (new) | SF Symbol (iOS) | MDI (Android) | Use |
| --- | --- | --- | --- |
| `black_white` | `circle.lefthalf.filled` | `contrast-circle` | The black and white toggle |
| `print` | `printer` | `printer` | Print (Android menu) |
| `remove` | `minus` | `minus` | Stepper minus (Android; `add` is the plus) |

Android drawables to generate for both apps (`App_Resources/*/Android/src/main/res/drawable/`): `ic_mdi_contrast_circle.xml`, `ic_mdi_printer.xml`, `ic_mdi_minus.xml`. In the mockup Tabler stands in (`circle-half-2`, `printer`, `minus`).

## 13. Strings

Existing (`app/i18n/en.json`): `pdf_preview` (change to "PDF preview"), `page_layout`, `paper_size`, `orientation`, `portrait`, `landscape`, `full`, `a4`, `a3`, `letter`, `items_per_page`, `page_padding`, `black_white`, `draw_ocr_text`, `export`, `exporting`, `open`, `print`, `share`, `save`, `cancel`, `pdf_saved`, `no_pages_in_pdf`.

New: `reset`, `pdf_layout_full_hint` (the helper line), `pdf_ocr_text_desc` ("searchable text layer in the PDF"), `pdf_more_settings` ("image quality, password, folder"), `pdf_preview_empty` and `pdf_preview_empty_desc`, `pdf_preview_error`, `retry`, `open_in_another_app`, `close`, `pages_per_sheet_summary` (plural: "%d per sheet").

## 14. Mapping to the code

`PDFPreviewModal.svelte` stays: a `frame` around the page (needed to push Settings from a modal). Everything else is `PDFPreview.svelte`.

- **Remove:** `CActionBar`, the `drawer` and its `topDrawer` `wraplayout` (six `textfield`, the checkbox and `tapForCheckBox`), the bottom `uibutton` row, `selectOption`, `selectSilderOption`, `tMargin` / `tPadding` / `tWidth` / `tHeight`, `showPDFSettings`.
- **Bars:** switch to `appPage` and `appBar` as in `DocumentEdit.svelte` (`size="small"`, `ios:translucent`, `title`, `subtitle`, `bottomItems`). Items: `navigationButton` (Android) or a left `appBarItem` (iOS) for close; an `appBarItem` for the toggle (icon `black_white`, state tint from `color === 'black_white'`); an `appBarItem` with `menu` for more (build the items with `appIcon`, `getMoreMenu`-style, Print on Android only). iOS `bottomItems`: `[{ icon: appIcon('tune'), onTap: showLayout }, { spacer: true }, { text: lc('export'), icon: appIcon('export'), prominent: true, color: accent, onTap: exportPDF }]`. Android: the `fabHolder` of `CardView.svelte` (a small `uibutton` and a `uifloatingactionbutton`).
- **Layout sheet:** new `app/components/pdf/PDFLayoutSheet.svelte`, opened like `showAdjustments` (`showBottomSheet` with `detents: [{ fraction: 0.5 }, 'large']`, `disableDimBackground`, `grabber`, `largestUndimmedDetentIndex: 0`, `transparent`, dark `userInterfaceStyle`). It takes the options store, `hasOCRText`, an `onChange(key, value)` and `onReset`, and reuses the segmented control of `OCRSettingsBottomSheet`, `SettingsSlider` (min 0, max 50, step 1) and the glass role set. Add `SheetHeader` support for a title with a Reset action and no Cancel and Done.
- **Bug to fix on the way:** `selectSilderOption('page_padding')` calls `showSliderPopover` without min, max or step, so the slider runs 0 to 1 and `Math.round` gives 0 or 1: the margin cannot be set today. The new slider has an explicit range. `showSettings({ subSettingsOptions: 'pdf' })` uses a key that `getSubSettings` does not know (`pdf_export` and `pdf_import` do): use `pdf_export`.
- **Pager and sheet:** keep `pager`, `PDF_OPTIONS` (paper names) and the six templates. Change the sheet chrome (paper roles, radius 6, shadow on iOS, outline on Android, no `boxShadow` rgba), `PAGER_PEAKING` to 16 and the page width to screen minus 48, and the margin to `page_padding x sheet width / paper width` instead of `toDeviceIndependentPixels(page_padding)`. `getPageLayoutProps` must size from the bars-aware space, not `screenHeightDips`, which ignores them (constants and ratios only, no measured views).
- **Counter:** replace `PageIndicator` by the label of `DocumentEdit.svelte` (28, flat pill); worth extracting one shared `CounterPill.svelte` for both screens.
- **Export:** `exportPDF` swaps `prompt` for `askPDFExportOptions` (the export sheet, in `app/utils/ui/index.common.ts` but not exported yet: export it), keeps `showLoading`, and shows the snackbar or toast with "open". In `saveFunction` mode the main action is "save".
- **More menu:** `onPrintPDF` and `openPDF` stay; add share (`share({ file }, { mimetype: 'application/pdf' })` as in `showPDFPopoverMenu`). Check `filePath` before each and show the empty state error on none.
- **States:** wrap `refresh()` in try / catch for the error state; `pages.length === 0` for the empty state (today it renders "1/0"); a non-blocking progress under the bar for the loading state.
- **Icons:** add `black_white`, `print`, `remove` to `app/utils/appIcons.ts` and the three Android drawables in both `App_Resources`.
- **Persistence:** unchanged. Options are written to `default_export_options` on every change unless `saveFunction` is set.

## 15. Decisions

1. **Share is in the more menu,** with Open in another app and Print. Export is the main action.
2. **Black and white is in the top bar and also a row of the layout sheet** (a switch labeled "black and white", in sync with the top bar toggle). Neither is hidden by the other.
3. **Print and Open stay,** in the more menu next to Share: Share, Open in another app, Print. Print exists on both platforms (iOS: the system print controller with the exported file; today only Android prints, so iOS is to build).
4. **Margins:** 0 to 50 pt.
5. **Paper sizes:** full, A4, A3, A5 and letter. A5 is added to `PDF_OPTIONS` and the layout sheet (the exporter already handles it); A3 and A5 keep the shape of the paper in the preview (0.707 and 0.707 for A5 too: the same ratio as A4, so they look the same, and the margin is computed from the paper width: A5 420 pt wide).
