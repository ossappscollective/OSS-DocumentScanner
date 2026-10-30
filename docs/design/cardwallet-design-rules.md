# Design rules: complete reference (Cardwallet and Document Scanner)

Exact values for every component and state, so implementers do not need to ask. Companion to `cardwallet-card-view.md` (principles, card view, card list, components). Where the two disagree, **this file wins**. Written for both apps: most rules are shared; the Document Scanner differences are in section 17.

## 0. Units and how to read the mockups

- Sizes are device points (iOS) and dp (Android), for a 393 pt (iOS) or 412 dp (Android) wide screen, unless a number is marked "mockup".
- The HTML mockups draw a 300 wide frame, about 24% narrower than a 393 pt phone, so anything drawn at a standard size (text, rows, chips, buttons) looks about 30% larger relative to the screen than the same number does on a device. That is why the first implementation looked smaller than the mockup. Use the values in this file.
- **Decided:** the sizes that came from the mockup (list rows, thumbnails, tile chips, folder tiles, tile titles) are scaled by 1.31 (393 / 300) so a device looks like the mockup. Standard controls keep their platform sizes: buttons 44 and 40, fields 48 and 56, toolbars, switches, the 22 and 24 selection markers.
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
- **Container radius from size:** radius = clamp(8, 0.18 x shorter side, 28). Grid tile 174 x 110 gives 20; stacked tile 361 x 228 gives 28; pager page and code tile give 28; list thumbnail 116 x 72 gives 13. Pills are height / 2.

## 2. FAB and floating controls

- **Android scan FAB:** extended, 56 tall, radius 18 (squircle), horizontal padding 20, icon 24, gap 10, label Label Large (14 sp, medium). Tonal: accentContainer fill, onContainer content. It is the only extended FAB on the screen.
- **Android add FAB:** small, 40 x 40, radius 12, tonal, placed 12 above the scan FAB, right edges aligned.
- **Position:** 16 from the right edge and 16 above the navigation or gesture inset. Content bottom padding is inset + 88.
- **Collapse:** the extended FAB collapses to a 56 icon-only FAB (same radius) when the list scrolls down and extends when it scrolls up or reaches the top, with the Material ExtendedFloatingActionButton animation. It hides in selection mode.
- **iOS:** no FAB. The camera is a 48 circle of system glass to the right of the search capsule.
- **Elevation rule:** controls that float over scrolling content use level 3 elevation (soft shadow, 0 4 12, 20% black): FAB, floating toolbar, menus, snackbars, and the top edge of stacked tiles. In-flow surfaces (plate, tiles, list groups, sheets' content) have no shadow. On iOS, glass carries its own depth; no extra shadow except menus and stacked tiles.

## 3. Chips on tiles

| Property | iOS | Android |
| --- | --- | --- |
| Height | 28 | 28 |
| Padding | 10 horizontal; icon-only 28 x 28 | 10 horizontal; icon-only 28 x 28 |
| Text | 14, semibold | 14 sp, medium |
| Icon | 16 | 16 |
| Gap icon to text | 5 | 5 |
| Radius | 14 (pill) | 14 (pill) |
| Fill | Regular glass: white 70% (light) or dark gray 66% (dark), 1 border of white 85% or 20%, system blur | accentContainer at 94% |
| Content | label color | onContainer |
| Margin to tile edge | 10 | 10 |

- **Title chip:** one line, ellipsis, max width tile width - 20 - info pill width. It is alone in its corner and never merges.
- **Info pill (merge rule):** page count, code glyph and favorite merge into ONE pill, 28 tall, whenever two or more are present. Segments in this order: page count (stack icon + number), code (qr or barcode icon), favorite (star). Segments are separated by a 1 hairline (white 35% on glass, onContainer 20% on tonal); each text segment has 10 padding, each icon segment is 28 wide. A single item is shown as a normal chip. Maximum 3 segments, same on iOS and Android.
- **Placement:** title chip bottom-left in the grid and top-left in the stacked styles. Info pill top-right in every style.
- **Tight space:** the info pill keeps its width; the title chip shrinks to a minimum of 3 characters, then hides.

## 4. Title: chip or inside the tile

- **Photo (or code on a photo):** the title is a chip (section 3). An auto-named card shows a chip with the localized short date.
- **No photo (name only, name and code):** the title is inside the tile on the card color fill, in the contrast color (white on dark colors, black on light ones).
  - Grid and columns: centered, bold, up to 2 lines, auto-fit between 18 and 28.
  - Stacked styles (cardholder, full): top-left, 26 bold, one line.
  - A code glyph (qr or barcode, 18, 75% opacity) sits bottom-right inside the tile; in the stacked styles, where the bottom is covered, it is a segment of the info pill instead.
  - List thumbnail: the title centered, 14 bold, up to 2 lines.
- The title is never drawn as bare text over a photo.

## 5. Selection

- **Marker:** circle, 22 on tiles (top-left), 24 as a leading mark on rows. Selected: accent fill, check icon 14, 2 ring in the surface color (white on iOS photo tiles, page color elsewhere). Unselected in selection mode: empty circle with a 2 outline in secondary color (rows only; tiles show nothing until selected).
- **Selected tile scales to 95%** in the grid (columns) only, 150 ms. Stacked tiles do not scale (they overlap); list rows show a tonal row highlight instead. With Reduce Motion or e-ink there is no scale.
- **Chevron:** hidden in selection mode on card rows and folder rows; the leading marker appears and the thumbnail moves right by 36 over 150 ms (cubic-bezier 0.2, 0.9, 0.3, 1.15).
- **Folders can be selected** like cards, with the same markers.
- **iOS selection mode:** the title becomes "3 selected" with a Done pill (glass) top-right; Select all is in the more menu. The search capsule and camera button are replaced by the system toolbar (glass): Share, Favorite, Move to folder, Delete. Delete uses the system red tint. Use the system toolbar (ui-appbar bottom items), not a custom view.
- **Android selection mode:** a contextual top app bar replaces the search bar (M3 contextual action bar): accentContainer fill (the status bar matches), close icon on the left, the count as title (22 sp), actions on the right: Favorite, Move to folder, Delete, then an overflow with Select all and Share. No bottom toolbar, and the FAB is hidden. Back exits selection. Delete asks for confirmation with a red text action.

## 6. Folders

- **Icon:** outline folder glyph, 26, inside a 42 circle. Circle fill: accent at 16% (light) or 22% (dark) on iOS; accentContainer on Android. Glyph color: accent on iOS; onContainer on Android.
- **Horizontal style:** a scrolling row above the cards, tiles 173 x 71, radius 21, 10 between tiles, 16 side margin. Surface: row color on iOS, surfaceContainerLow on Android. Content: icon circle, name 17 semibold, count 14 secondary.
- **Vertical style:** grouped rows, 68 tall, side margin 16 (same as the card list). iOS: one inset grouped container, radius 18, hairlines inset 72 from the left. Android: segmented group, 20 outer corners on the first and last row only, 6 between, 2 gap. Content: icon circle, name 18 medium, count secondary (14), chevron (iOS only, hidden in selection). iOS hairlines run from the start of the text to the trailing edge. The folders group and the cards group are 8 apart.
- **Folder page.** The folder color tints the app bar the way a card color tints its plate: the tonal container on Android, a translucent tint of the color on iOS. The title starts with the outline folder icon of the rows, uncolored (24 on Android, 30 on iOS next to the large title), and the subtitle is the card count, so the page reads as a folder. On Android the title is shown (collapsible search), not the integrated search bar of the root list.
- **In the columns style,** vertical folders span the full width (both columns) above the grid.
- **Card rows in the list style** follow the same grouping: first and last corners only. A row knows its position through its index; if the list cannot supply it, wrap the rows in one rounded container (iOS) or compute the corners from the index (Android).

## 7. Placeholder art in the mockups

The darker band at the bottom of some photo tiles in the mockups is a drawn horizon, a placeholder for a real photo. It is not a design element and must not be implemented. A photo tile is the photo alone.

## 8. List rows (card list, list style)

- **Row:** 88 tall on both platforms (Android adds the 2 gap around it), 16 horizontal padding. Thumbnail 116 x 72 (ratio 1.6), radius 13. Title, subtitle, then trailing items.
- **Title:** iOS 20 semibold (Title 3); Android 20 sp medium; one line, ellipsis. An auto-named card uses the full localized date and time.
- **Subtitle:** 16 secondary. Photo count when there are photos ("2 photos"), followed by a 20 code icon when the card has a code (qr or barcode glyph). **Never the word "code".** Name and code cards without photos show the code glyph alone as the subtitle; name-only cards have no subtitle and the title centers vertically.
- **No-photo thumbnail:** the color tile with the title inside (section 4), not a bare color.
- **Trailing:** favorite star (20, accent) when favorite. Chevron on iOS only, hidden in selection. Android rows have no chevron.
- These are the mockup values (66 row, 88 x 56 thumbnail, 15 title in a 300 wide frame) times 1.31.

## 9. Typography scale

| Role | iOS (text style) | Android (M3 role) |
| --- | --- | --- |
| Card name, large | Large Title 34 bold | Display Medium Emphasized |
| Screen title | Large Title 34 bold | Title Large 22 |
| Row and folder title | Title 3 20 semibold | 20 sp medium |
| Body, field value | Body 17 | Body Large 16 |
| Secondary, subtitle | Subheadline 15 | Body Medium 14 |
| Footnote, helper, caption | Footnote 13 and Caption 12 | Label Medium 12 |
| Button, menu item | Body 17 semibold / Body 17 | Label Large 14 medium / Body Large 16 |
| Chip text on tiles | 14 semibold | 14 sp medium |

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
| Selection scale, chip merge, row marker slide | 150 ms, cubic-bezier(0.2, 0.9, 0.3, 1.15), not a spring (see differences below) |
| Menu open | 150 ms, scale from the anchor (section 14) |
| Sheet present and detent change | System spring (iOS); M3 Expressive spatial spring, about 350 ms (Android) |
| Ambient backdrop and page color crossfade | 250 ms |
| FAB collapse and extend | The Material ExtendedFloatingActionButton shrink and extend animation |
| Reduce Motion, remove animations, e-ink | 150 ms fade, or none on e-ink |

## 12. Snackbars, toasts and progress

- **Android snackbar:** inverseSurface container, radius 16, 16 side margin, 48 tall (single line) up to 68 (two lines), message 14 sp, optional text action in inversePrimary, 4 s (6 s with an action such as Undo). It sits 12 above the FAB or the top of the floating toolbar, never under it.
- **iOS toast:** a glass capsule, 44 tall, text 15, optional action in accent, 3 s (5 s with an action). It sits 12 above the toolbar or search capsule.
- **Linear progress:** 4 tall pill track, accent fill. Android uses the M3 Expressive wavy style (amplitude 3, wavelength 40); iOS uses the system progress view.
- **Circular progress:** iOS system activity indicator (medium); Android wavy circular, 48.
- **Blocking operations** (import, export, OCR): a centered card, radius 24, surface (Android) or glass (iOS), 24 padding, spinner 32 and a 15 label, input blocked, dim 32%. **Non-blocking** work (sync, thumbnails) uses a linear progress under the top bar and no dim.

## 13. Icons

- **One set per platform, one id table:** `app/utils/appIcons.ts` maps an app icon id to an SF Symbol (iOS) and an MDI name (Android, loaded as `res://ic_mdi_*` vector drawables; iOS `sys://`). Tabler in the mockups is a stand-in only.
- **Style:** outline by default; filled only for an "on" state (favorite_on). Sizes: 24 in bars and buttons (22 on iOS bars), 20 in menus and rows, 18 in fields, 16 on tile chips.
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


## 14. Menus

- **Android animation origin:** the popup scales from the anchor, not from the top-left: pivot at the anchor's nearest corner (top-right for the overflow button), 0.8 to 1 plus fade, 150 ms. If the menu plugin cannot set the origin, that is a plugin bug to fix there (done in ui-menu with a style per corner; not published yet).
- **iOS:** the system menu already animates from the button.
- Everything else about menus is in `cardwallet-card-view.md` (Menus).

## 15. Sheets, safe areas and dialogs

- **Bottom safe area:** every sheet and every scrolling screen ends with bottom padding = system inset (Android navigation or gesture bar, iOS home indicator) + 16, so the last item is never under the gesture area. A sheet footer, if any, sits above the inset.
- **Keyboard:** a focused field stays at least 16 above the keyboard. iOS sheets expand to the large detent when the keyboard opens; Android sheets use adjustResize and scroll.
- **iOS alert (UIAlertController):** the system alert, which is glass on iOS 26. Title, optional message, optional native text field. Cancel on the left, regular weight; the default action on the right, bold; a destructive action in the system red. For a text prompt the field is focused when the alert appears and the keyboard opens; Return runs the default action. Do not build a custom alert.
- **Android dialog (M3):** width min(312, screen - 48), radius 28, container surfaceContainerHigh, 24 padding. Title 24 sp, message 14 sp secondary, notched outlined field full width and focused on open (the dialog moves above the keyboard), actions right-aligned text buttons: Cancel, then the primary action; a destructive action uses the error color.
- **Which to use:** short confirmation or one name prompt (Rename, New folder) is an alert or dialog. **Move to folder** is a bottom sheet: header (Cancel, title, Move), a focused text field for the folder name (iOS capsule, Android notched outlined), and the existing folders as wrapped outline chips under it (32 tall, the outline button variant with its default outline, no fill, 8 gap, pill), filtered while the user types; tapping a chip moves the card there. An empty name removes the card from its folder. No search field and no remove-from-folder row. It is not an alert. (Owner decision from the PR 781 review.)

## 16. Remaining components

- **iOS text field rhythm (decided):** caption row 14 + 2, capsule 48, 8 between fields, so the pitch is 72. The caption shows the label only when the field has a value; the hint inside the empty capsule is the label text. The caption row is always reserved, so heights never change on focus or typing. Helper and error text go in an optional 16 row below; reserve it only in forms that validate. The gap between fields must stay larger than the 2 between a caption and its capsule, so a caption never reads as belonging to the field above.
- **Settings rows:** iOS inset grouped, row 52 tall (min 44), leading icon in a 30 circle (accent 16% fill, icon 17 in accent) when the row has an icon, title 17, trailing value in secondary, switch or chevron; section header Footnote uppercase secondary, footer Footnote. Android: segmented groups (28 outer, 6 inner, 2 gap), row 64 tall (72 with supporting text), leading icon 24 in a 40 circle (accentContainer), title Body Large, supporting text Body Medium secondary, trailing switch or value; section header Label Large in the accent.
- **Switch, checkbox, radio in lists:** the switch is trailing; a checkbox is a leading 24 circle (both platforms); a radio is trailing on iOS rows with a check instead (single choice uses a trailing check on iOS, a leading radio on Android settings rows).
- **Pickers:** color picker is a grid of 40 round swatches, 6 per row, selected has a 2 ring and a check, a custom color at the end. Date and time use the system pickers (iOS compact or graphical in a sheet; Android M3 modal pickers). Move to folder is the sheet in section 15.
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
| 15 Safe areas and dialogs | Specified; Move to folder changed to name field plus folder chips (PR 781 review) |
| 16 Remaining components | Specified |
| 17 Document Scanner | Proposal |

## 19. Differences on purpose (code against this document, PRs 777 to 783)

- **Row marker slide:** 150 ms cubic-bezier(0.2, 0.9, 0.3, 1.15), not a spring, because the NativeScript spring curve crashes iOS with translate. Marker border is 2, not 1.5, because a fractional border is not drawn reliably on Android.
- **Scan FAB:** an ExtendedFloatingActionButton using the Material collapse and extend animation; this needs an unpublished ui-floatingactionbutton fix.
- **Move to folder:** replaced by the sheet in section 15 (name field plus folder chips), decided in the PR 781 review; the earlier remove_from_folder row and its string are gone.
- **Android menu origin:** fixed in ui-menu with a style per corner; the plugin change is not published.
- **Sizes x 1.31 (decided, to apply in code):** list rows 88 with a 116 x 72 thumbnail and 20 titles, tile chips 28 tall with 14 text, folder tiles 173 x 71 and vertical folder rows 68, tile titles 18 to 28 (grid) and 26 (stacked).
- **Open:** the Document Scanner list is still its own canvas list (section 17 is a proposal). The delete confirmation dialog (destructive text action in the error color, section 15) is not built yet.

## 20. App icons and splash

- **Shape rule applies:** the glyphs use only rounded rectangles, circles and round-capped strokes. Masters are full-bleed 100 x 100 squares in `graphics/icon_<app>.svg` (the platforms apply their own mask); `_dark`, `_monochrome` and `_transparent` (glyph only) sit beside them.
- **Cardwallet:** accent `#DA3D5C`, two stacked cards (the back one tilted 14 degrees), a chip circle and a stripe pill on the front card.
- **Document Scanner:** accent `#2FBF71`, a document with text pills inside four scan brackets, crossed by a scan bar (dropped in the monochrome variant).
- **Android:** adaptive icon with the `icon_background` color and the glyph at 78% inside the safe zone; the themed (monochrome) layer is `icon_monochrome`, with the details cut out.
- **Dark icon:** iOS 18+ uses the `1024-dark.png` entry of a single-size `AppIcon` set. Android has no dark adaptive icon, so `drawable-night/ic_launcher_foreground.xml` and a night `icon_background` are provided; only launchers that resolve the icon with the night configuration use them.
- **Splash:** the system background (white, dark in dark mode) and the icon centered. Android 12+ shows the glyph on an `icon_background` disc; older versions and iOS show the rounded icon (`splash_icon`, `logo.png`) at 144 / 120.
- Export the PNGs from the masters; do not edit them by hand.
