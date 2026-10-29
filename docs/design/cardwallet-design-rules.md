# Design rules: complete reference (Cardwallet and Document Scanner)

Exact values for every component and state, so implementers do not need to ask. Companion to `cardwallet-card-view.md` (principles, card view, card list, components). Where the two disagree, **this file wins**. Written for both apps: most rules are shared; the Document Scanner differences are in section 17.

## 0. Units and how to read the mockups

- Sizes are device points (iOS) and dp (Android), for a 393 pt (iOS) or 412 dp (Android) wide screen, unless a number is marked "mockup".
- The HTML mockups draw a 300 wide frame and show it scaled down, so their text, rows and chips look larger relative to the frame than they are on a device. Never copy mockup pixels for text, icons, chips, buttons, rows or fields: use the device values in this file.
- Proportional sizes derive from the screen: a pager page is the screen width minus 48 (16 margin, 8 gap, 24 peek); a grid tile is (screen width minus 32 minus 12) divided by 2, at ratio 1.58.
- The mockups use Tabler icons as stand-ins. The real icons are in section 13.

## 1. Shape rule (one rule for everything)

**Marks and controls are round; containers are rounded rectangles.**

| Round (circle or pill) | Rounded rectangle |
| --- | --- |
| Selection badge, checkbox, radio, switch | Tiles, thumbnails, pager pages, code tile |
| Buttons (pill), icon buttons, chips (pill) | Sheets, dialogs, menus, snackbars |
| Folder icon background, avatar, stamp (when collapsed) | Text fields (iOS capsule and Android notched outlined follow their own spec) |
| Segmented control ends | List groups (outer corners) |

- **One exception: the Android FAB** keeps the M3 Expressive squircle, corner radius = height / 3.
- Consequences: the Android checkbox is a circle with a check (not a rounded square); Android chips are pills (not 8 radius); a selection marker is a circle everywhere.
- **Container radius from size:** radius = clamp(8, 0.18 x shorter side, 28). Grid tile 174 x 110 gives 20; stacked tile 361 x 228 gives 28; pager page and code tile give 28; list thumbnail 96 x 60 gives 11. Pills are height / 2.

## 2. FAB and floating controls

- **Android scan FAB:** extended, 56 tall, radius 18 (squircle), horizontal padding 20, icon 24, gap 10, label Label Large (14 sp, medium). Tonal: accentContainer fill, onContainer content. It is the only extended FAB on the screen.
- **Android add FAB:** small, 40 x 40, radius 12, tonal, placed 12 above the scan FAB, right edges aligned.
- **Position:** 16 from the right edge and 16 above the navigation or gesture inset. Content bottom padding is inset + 88.
- **Collapse:** the extended FAB collapses to a 56 icon-only FAB (same radius) when the list scrolls down and extends when it scrolls up or reaches the top; spring, 300 ms. It hides in selection mode.
- **iOS:** no FAB. The camera is a 48 circle of system glass to the right of the search capsule.
- **Elevation rule:** controls that float over scrolling content use level 3 elevation (soft shadow, 0 4 12, 20% black): FAB, floating toolbar, menus, snackbars, and the top edge of stacked tiles. In-flow surfaces (plate, tiles, list groups, sheets' content) have no shadow. On iOS, glass carries its own depth; no extra shadow except menus and stacked tiles.

## 3. Chips on tiles

| Property | iOS | Android |
| --- | --- | --- |
| Height | 22 | 22 |
| Padding | 8 horizontal; icon-only 22 x 22 | 8 horizontal; icon-only 22 x 22 |
| Text | 11, semibold | Label Small, 11 sp, medium |
| Icon | 12 | 12 |
| Gap icon to text | 4 | 4 |
| Radius | 11 (pill) | 11 (pill) |
| Fill | Regular glass: white 70% (light) or dark gray 66% (dark), 1 border of white 85% or 20%, system blur | accentContainer at 94% |
| Content | label color | onContainer |
| Margin to tile edge | 8 | 8 |

- **Title chip:** one line, ellipsis, max width tile width - 16 - info pill width. It is alone in its corner and never merges.
- **Info pill (merge rule):** page count, code glyph and favorite merge into ONE pill, 22 tall, whenever two or more are present. Segments in this order: page count (stack icon + number), code (qr or barcode icon), favorite (star). Segments are separated by a 1 hairline (white 35% on glass, onContainer 20% on tonal); each text segment has 8 padding, each icon segment is 22 wide. A single item is shown as a normal chip. Maximum 3 segments, same on iOS and Android.
- **Placement:** title chip bottom-left in the grid and top-left in the stacked styles. Info pill top-right in every style.
- **Tight space:** the info pill keeps its width; the title chip shrinks to a minimum of 3 characters, then hides.

## 4. Title: chip or inside the tile

- **Photo (or code on a photo):** the title is a chip (section 3). An auto-named card shows a chip with the localized short date.
- **No photo (name only, name and code):** the title is inside the tile on the card color fill, in the contrast color (white on dark colors, black on light ones).
  - Grid and columns: centered, bold, up to 2 lines, auto-fit between 14 and 22.
  - Stacked styles (cardholder, full): top-left, 20 bold, one line.
  - A code glyph (qr or barcode, 18, 75% opacity) sits bottom-right inside the tile.
  - List thumbnail: the title centered, 11 bold, up to 2 lines.
- The title is never drawn as bare text over a photo.

## 5. Selection

- **Marker:** circle, 22 on tiles (top-left), 24 as a leading mark on rows. Selected: accent fill, check icon 14, 2 ring in the surface color (white on iOS photo tiles, page color elsewhere). Unselected in selection mode: empty circle with a 1.5 outline in secondary color (rows only; tiles show nothing until selected).
- **Selected tile scales to 95%** in the grid (columns) only, spring 150 ms. Stacked tiles do not scale (they overlap); list rows show a tonal row highlight instead. With Reduce Motion or e-ink there is no scale.
- **Chevron:** hidden in selection mode on card rows and folder rows; the leading marker appears and the thumbnail moves right by 36 (spring).
- **Folders can be selected** like cards, with the same markers.
- **iOS selection mode:** the title becomes "3 selected" with a Done pill (glass) top-right; Select all is in the more menu. The search capsule and camera button are replaced by the system toolbar (glass): Share, Favorite, Move to folder, Delete. Delete uses the system red tint. Use the system toolbar (ui-appbar bottom items), not a custom view.
- **Android selection mode:** a contextual top app bar replaces the search bar (M3 contextual action bar): accentContainer fill (the status bar matches), close icon on the left, the count as title (22 sp), actions on the right: Favorite, Move to folder, Delete, then an overflow with Select all and Share. No bottom toolbar, and the FAB is hidden. Back exits selection. Delete asks for confirmation with a red text action.

## 6. Folders

- **Icon:** outline folder glyph, 20, inside a 32 circle. Circle fill: accent at 16% (light) or 22% (dark) on iOS; accentContainer on Android. Glyph color: accent on iOS; onContainer on Android.
- **Horizontal style:** a scrolling row above the cards, tiles 132 x 54, radius 16, 8 between tiles, 16 side margin. Surface: row color on iOS, surfaceContainerLow on Android. Content: icon circle, name 13 semibold, count 11 secondary.
- **Vertical style:** grouped rows, 52 tall, side margin 16 (same as the card list). iOS: one inset grouped container, radius 18, hairlines inset 60 from the left. Android: segmented group, 20 outer corners on the first and last row only, 6 between, 2 gap. Content: icon circle, name 16 medium, count secondary, chevron (iOS only, hidden in selection).
- **In the columns style,** vertical folders span the full width (both columns) above the grid.
- **Card rows in the list style** follow the same grouping: first and last corners only. A row knows its position through its index; if the list cannot supply it, wrap the rows in one rounded container (iOS) or compute the corners from the index (Android).

## 7. Placeholder art in the mockups

The darker band at the bottom of some photo tiles in the mockups is a drawn horizon, a placeholder for a real photo. It is not a design element and must not be implemented. A photo tile is the photo alone.

## 8. List rows (card list, list style)

- **Row:** 72 tall, 12 horizontal padding. Thumbnail 96 x 60 (ratio 1.6), radius 11. Title, subtitle, then trailing items.
- **Title:** iOS 17 semibold (Headline); Android 16 sp medium (Title Medium); one line, ellipsis. An auto-named card uses the full localized date and time.
- **Subtitle:** 14 secondary. Photo count when there are photos ("2 photos"), followed by a 16 code icon when the card has a code (qr or barcode glyph). **Never the word "code".** Name-only cards have no subtitle and the title centers vertically.
- **No-photo thumbnail:** the color tile with the title inside (section 4), not a bare color.
- **Trailing:** favorite star (16, accent) when favorite. Chevron on iOS only, hidden in selection. Android rows have no chevron.
- This is bigger than the mockup looks on a device: the earlier mockup values (66 row, 88 x 56 thumbnail, 15 title) were mockup pixels, not device values.

## 9. Typography scale

| Role | iOS (text style) | Android (M3 role) |
| --- | --- | --- |
| Card name, large | Large Title 34 bold | Display Medium Emphasized |
| Screen title | Large Title 34 bold | Title Large 22 |
| Row and folder title | Headline 17 semibold | Title Medium 16 medium |
| Body, field value | Body 17 | Body Large 16 |
| Secondary, subtitle | Subheadline 15 | Body Medium 14 |
| Footnote, helper, caption | Footnote 13 and Caption 12 | Label Medium 12 |
| Button, menu item | Body 17 semibold / Body 17 | Label Large 14 medium / Body Large 16 |
| Chip text on tiles | Caption 2, 11 semibold | Label Small 11 medium |

iOS uses Dynamic Type; Android scales with font scale. Layouts must survive 200%.

## 10. States (every component)

| State | iOS | Android |
| --- | --- | --- |
| Pressed | Scale 0.97 and opacity 0.85, 100 ms; system controls use their own highlight | State layer 10% of the content color; ripple on lists and buttons |
| Hover and focus (keyboard, pointer) | Focus ring 2 accent, offset 2, on iPad and keyboard navigation | State layer 8% hover, 10% focus; focus ring 2 accent for keyboard |
| Disabled | 45% opacity, no press feedback | Content 38%, container 12% |
| Error | Red 1.5 ring or text, an icon, helper text; never color alone | Error role: outline 2, icon, helper text |
| Selected | Accent fill with check, or accent tint 12% | accentContainer fill with check |
| Dark | Dark roles from the Tokens table; code tile stays white | Same |
| E-ink | No color, no glass, no shadow, no animation. 1 black border on containers, selected = 3 border plus a check, text black on white, icons black | Same |

## 11. Motion

| Motion | Value |
| --- | --- |
| Press feedback | 100 ms |
| Selection scale, chip merge, row marker slide | Spring, 150 ms |
| Menu open | 150 ms, scale from the anchor (section 14) |
| Sheet present and detent change | System spring (iOS); M3 Expressive spatial spring, about 350 ms (Android) |
| Ambient backdrop and page color crossfade | 250 ms |
| FAB collapse and extend | Spring, 300 ms |
| Reduce Motion, remove animations, e-ink | 150 ms fade, or none on e-ink |

## 12. Snackbars, toasts and progress

- **Android snackbar:** inverseSurface container, radius 16, 16 side margin, 48 tall (single line) up to 68 (two lines), message 14 sp, optional text action in inversePrimary, 4 s (6 s with an action such as Undo). It sits 12 above the FAB or the top of the floating toolbar, never under it.
- **iOS toast:** a glass capsule, 44 tall, text 15, optional action in accent, 3 s (5 s with an action). It sits 12 above the toolbar or search capsule.
- **Linear progress:** 4 tall pill track, accent fill. Android uses the M3 Expressive wavy style (amplitude 3, wavelength 40); iOS uses the system progress view.
- **Circular progress:** iOS system activity indicator (medium); Android wavy circular, 48.
- **Blocking operations** (import, export, OCR): a centered card, radius 24, surface (Android) or glass (iOS), 24 padding, spinner 32 and a 15 label, input blocked, dim 32%. **Non-blocking** work (sync, thumbnails) uses a linear progress under the top bar and no dim.

## 13. Icons

- **One set per platform, one id table:** `app/utils/appIcons.ts` maps an app icon id to an SF Symbol (iOS) and an MDI name (Android, loaded as `res://ic_mdi_*` vector drawables; iOS `sys://`). Tabler in the mockups is a stand-in only.
- **Style:** outline by default; filled only for an "on" state (favorite_on). Sizes: 24 in bars and buttons (22 on iOS bars), 20 in menus and rows, 18 in fields, 12 on tile chips.
- **Naming:** `snake_case`, semantic (what it does, not what it looks like).
- **Changes needed:** `folder` on Android must be `folder-outline`; add the ids in the second table.

**Current icon ids** (generated from `app/utils/appIcons.ts`; that file is the source of truth)

| Id | SF Symbol (iOS) | MDI (Android) |
| --- | --- | --- |
| `add` | `plus` | `plus` |
| `arrow_back` | `chevron.backward` | `arrow-left` |
| `batch` | `photo.on.rectangle` | `image-multiple` |
| `brightness` | `sun.max` | `brightness-6` |
| `camera` | `camera` | `camera` |
| `check` | `checkmark` | `check` |
| `chevron` | `chevron.right` | `chevron-right` |
| `close` | `xmark` | `close` |
| `color` | `paintbrush` | `palette` |
| `crop` | `crop` | `crop` |
| `delete` | `trash` | `delete` |
| `delete_originals` | `photo.badge.minus` | `image-remove` |
| `delete_permanently` | `trash.slash` | `delete-forever` |
| `edit` | `square.and.pencil` | `pencil` |
| `empty_trash` | `trash.slash` | `delete-empty` |
| `favorite` | `star` | `star` |
| `favorite_off` | `star` | `star-outline` |
| `favorite_on` | `star.fill` | `star` |
| `flash_auto` | `bolt.badge.automatic.fill` | `flash-auto` |
| `flash_off` | `bolt.slash.fill` | `flash-off` |
| `flash_on` | `bolt.fill` | `flash` |
| `folder` | `folder` | `folder` |
| `fullscreen` | `arrow.up.left.and.arrow.down.right` | `fullscreen` |
| `image` | `photo` | `image` |
| `import_file` | `doc.badge.plus` | `file-document-plus-outline` |
| `import_image` | `photo.badge.plus` | `image-plus-outline` |
| `info` | `info.circle` | `information-outline` |
| `more` | `ellipsis` | `dots-vertical` |
| `move_folder` | `folder` | `folder-swap` |
| `ocr` | `text.viewfinder` | `text-recognition` |
| `open` | `arrow.up.forward.square` | `open-in-new` |
| `pages` | `square.on.square` | `layers-outline` |
| `pdf` | `doc.richtext` | `file-pdf-box` |
| `qrcode` | `qrcode` | `qrcode` |
| `rename` | `pencil` | `rename` |
| `restore` | `arrow.uturn.backward` | `restore` |
| `rotate_left` | `rotate.left` | `rotate-left` |
| `rotate_right` | `rotate.right` | `rotate-right` |
| `select` | `checkmark.circle` | `check-circle-outline` |
| `select_all` | `checkmark.circle` | `select-all` |
| `settings` | `gearshape` | `cog` |
| `share` | `square.and.arrow.up` | `share-variant` |
| `switch_camera` | `arrow.triangle.2.circlepath.camera` | `camera-flip` |
| `sync` | `arrow.triangle.2.circlepath` | `autorenew` |
| `torch` | `flashlight.on.fill` | `flashlight` |
| `transform` | `wand.and.stars` | `auto-fix` |
| `trash` | `trash` | `trash-can-outline` |
| `tune` | `slider.horizontal.3` | `tune` |
| `view_style` | `square.grid.2x2` | `view-dashboard` |
| `wallet` | `wallet.bifold` | `wallet-outline` |

**Ids to add or change**

| Id | SF Symbol (iOS) | MDI (Android) | Use |
| --- | --- | --- | --- |
| `folder` (change) | `folder` | `folder-outline` | Folder icon is always outline |
| `barcode` | `barcode` | `barcode` | Code glyph for linear barcodes |
| `search` | `magnifyingglass` | `magnify` | Search field, search capsule |
| `clear` | `xmark.circle.fill` | `close-circle` | Clear button in fields |
| `chevron_down` | `chevron.down` | `chevron-down` | Select fields |
| `error` | `exclamationmark.circle` | `alert-circle-outline` | Field and form errors |
| `new_folder` | `folder.badge.plus` | `folder-plus-outline` | New folder row |


## 14. Menus

- **Android animation origin:** the popup scales from the anchor, not from the top-left: pivot at the anchor's nearest corner (top-right for the overflow button), 0.8 to 1 plus fade, 150 ms. If the menu plugin cannot set the origin, that is a plugin bug to fix there.
- **iOS:** the system menu already animates from the button.
- Everything else about menus is in `cardwallet-card-view.md` (Menus).

## 15. Sheets, safe areas and dialogs

- **Bottom safe area:** every sheet and every scrolling screen ends with bottom padding = system inset (Android navigation or gesture bar, iOS home indicator) + 16, so the last item is never under the gesture area. A sheet footer, if any, sits above the inset.
- **Keyboard:** a focused field stays at least 16 above the keyboard. iOS sheets expand to the large detent when the keyboard opens; Android sheets use adjustResize and scroll.
- **iOS alert (UIAlertController):** the system alert, which is glass on iOS 26. Title, optional message, optional native text field. Cancel on the left, regular weight; the default action on the right, bold; a destructive action in the system red. For a text prompt the field is focused when the alert appears and the keyboard opens; Return runs the default action. Do not build a custom alert.
- **Android dialog (M3):** width min(312, screen - 48), radius 28, container surfaceContainerHigh, 24 padding. Title 24 sp, message 14 sp secondary, notched outlined field full width and focused on open (the dialog moves above the keyboard), actions right-aligned text buttons: Cancel, then the primary action; a destructive action uses the error color.
- **Which to use:** short confirmation or one name prompt (Rename, New folder) is an alert or dialog. **Move to folder** is a sheet with a list of folders (grouped rows, current folder checked, a search field when there are more than 8 folders) and a New folder row at the end; it is not an alert.

## 16. Remaining components

- **Settings rows:** iOS inset grouped, row 52 tall (min 44), leading icon in a 30 circle (accent 16% fill, icon 17 in accent) when the row has an icon, title 17, trailing value in secondary, switch or chevron; section header Footnote uppercase secondary, footer Footnote. Android: segmented groups (28 outer, 6 inner, 2 gap), row 64 tall (72 with supporting text), leading icon 24 in a 40 circle (accentContainer), title Body Large, supporting text Body Medium secondary, trailing switch or value; section header Label Large in the accent.
- **Switch, checkbox, radio in lists:** the switch is trailing; a checkbox is a leading 24 circle (both platforms); a radio is trailing on iOS rows with a check instead (single choice uses a trailing check on iOS, a leading radio on Android settings rows).
- **Pickers:** color picker is a grid of 40 round swatches, 6 per row, selected has a 2 ring and a check, a custom color at the end. Date and time use the system pickers (iOS compact or graphical in a sheet; Android M3 modal pickers). Folder picker is the sheet in section 15.
- **Empty states, loading, errors:** an icon in a glass circle (iOS) or a shape (Android), a title (Title 2 / Title Large), one line of help, one prominent action. Errors use the Error state in section 10 plus a Retry action.
- **Toolbars:** iOS system toolbar (glass), Android floating toolbar with the edit FAB (card view) or the contextual bar (selection).
- **Haptics (iOS):** selection on page and picker changes, light success on copy, warning on destructive confirmation. Android uses the system haptic feedback on long press and selection.

## 17. Document Scanner differences

Most rules are shared. The scanner feels more like a document app:

- **Accent:** the app seed, not a per-card color (documents have no card color).
- **Tile ratio:** the page ratio (1 : 1.41 portrait) instead of 1.58; the grid shows 2 columns of portrait tiles, list thumbnails are 56 x 72.
- **Titles:** documents always have a page image, so the title is always a chip (section 3). An auto-named document shows the localized date.
- **No code zone, no code glyph.** The info pill has the page count and the favorite only.
- **Surfaces:** calmer: no ambient backdrop on lists, neutral page background, the camera and edit screens use the transparent sheet appearance over the live image.
- **Edit tools and camera controls** are glass controls over the image on iOS and tonal controls on Android, never over the document itself.
- This section is a proposal: confirm with the scanner screens when they are designed.

## 18. Implementation status

| Rule | Status |
| --- | --- |
| 1 Shape rule | Specified; Android checkbox and chips need changing |
| 2 FAB | Specified; implemented FAB to be checked against the values |
| 3 Chips and merge rule | Specified, not implemented |
| 4 Title placement | Specified; grid no-photo title is now centered |
| 5 Selection | Specified; Android contextual bar and iOS system toolbar to build |
| 6 Folders | Specified; Android folder icon must be outline |
| 7 Placeholder art | Do not implement |
| 8 List rows | Specified; row and thumbnail sizes changed |
| 9 Radius rule | Specified |
| 10 States | Specified |
| 11 Motion | Specified |
| 12 Snackbars and progress | Specified, not implemented |
| 13 Icons | Specified; folder and new ids to add |
| 14 Menu origin | Specified; may need a plugin fix |
| 15 Safe areas and dialogs | Specified |
| 16 Remaining components | Specified |
| 17 Document Scanner | Proposal |
