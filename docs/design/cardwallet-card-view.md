# Cardwallet design system: card view

> Where this file and `cardwallet-design-rules.md` disagree, the rules file wins. Start from `README.md` in this folder.

Source of truth for the Cardwallet card view (`app/components/view/CardView.svelte`). iOS follows native iOS 26 Liquid Glass; Android follows Material 3 Expressive plus one signature. Document Scanner may diverge in vibe but shares tokens.

## Principles

1. **The card is the hero, chrome is glass or tonal.** Codes and photos get the most space and contrast. Bars, page controls and the info panel stay secondary and never compete with a scan.
2. **Two stacked hero zones on both platforms.** Codes on top, photos below, both visible at once. Each zone is a pager when it holds more than one item. Same geometry and gestures, different skin.
3. **Name and card color are the accent, not a wash.** The page stays neutral. Identity is carried by the name, tinted controls, and an ambient glow (iOS) or a tonal plate (Android).
4. **Scannability wins.** A QR or barcode always sits on a white tile with a quiet zone, whatever the card color or theme. Full brightness and keep-awake while a code is on screen.
5. **Native first.** iOS uses system bars, sheets, menus and Liquid Glass without imitation. Android uses Material 3 Expressive components, then adds one signature.
6. **One structure, many content mixes.** Variants are the same layout with parts omitted.
7. **Cardwallet and Document Scanner may differ.** They share tokens (roles, spacing, motion) and the platform skins. Cardwallet is warm and object-like; Scanner is calm and tool-like.

## Tokens

Every color derives from one input, the card color (the user's color, else the dominant color of the first photo, else the app seed), so a card with no color or a pale one still produces legible roles.

| Role | iOS 26/27 | Android M3 Expressive |
| --- | --- | --- |
| accent | Card color, lightness nudged until it holds 3:1 on the system background; tints glass controls, the type capsule and the ambient glow | Tone 40 (light) / 80 (dark) of a tonal palette generated from the card color in HCT |
| accentContainer | Accent at 14% (light) / 28% (dark) over the system background | Tone 90 / 30; fills the name plate |
| onAccent | White or black, whichever gives 4.5:1 on the accent | Tone 100 / 20 of the same palette |
| page | systemBackground, grouped lists on secondarySystemGroupedBackground | surface; rows on surfaceContainerLow |
| codeTile | #FFFFFF in both themes, 24 pt quiet zone | #FFFFFF in both themes, 24 dp quiet zone |
| photoScrim | Glass, no manual scrim | Black 0 to 56% gradient behind text over a photo |

**Type.** iOS: system text styles only (Dynamic Type): name Large Title (34, bold), subtitle Subheadline, label Footnote, value Body, code digits Body with monospaced digits. Android: Roboto Flex via the M3 scale: name Display Medium Emphasized, subtitle Title Medium, label Label Large, value Body Large, digits Title Large with tabular figures.

**Spacing.** 4 pt/dp grid. Screen margin 16, section gap 24, group gap 8, field row min height 52.

**Shape.** iOS: continuous, concentric corners (child radius = parent radius minus inset). Android: expressive shapes: code tile 28 dp, field group 28 dp outer corners with 6 dp between rows, plate 40 dp with one 12 dp notch corner, buttons fully round.

**Motion.** iOS: system springs (smooth for layout, snappy for taps), toolbar morphs into its menu with glass. Android: expressive motion scheme: spatial springs for size and position, effects springs for color and opacity. Reduce Motion: 150 ms fade.

## Hero zones (shared)

A card can hold several codes and several photos, so they are two stacked zones: **code zone on top, photo zone below**.

- **Code zone.** One white tile per code, 240 wide, 28 corners. With several codes it is a pager: next tile peeks 24, page dots under it. Dots carry no names; a code can optionally be named in edit and the name then shows next to the digits.
- **Photo zone.** Pager of photos at their own aspect (1.58 for ID-style cards), same width, peek and corners. With several photos a thumbnail strip sits under it, the selected thumbnail outlined in the accent. One photo means no strip.
- **Controls have no names.** Dots select codes, thumbnails select photos.
- **Size follows content.** On iOS the code tile shrinks to make room for photos and the zones grow when there are no details. On Android the code zone is a fixed 270 dp tall whatever the card holds, because scanning is the primary action; the photo zone takes the remaining height with the thumbnail strip below it, so with several photos the carousel cards can be narrower than the page and the 44 dp peek is not always visible (the thumbnail strip is the cue). On iOS the code zone height springs to the selected code (a wide barcode is shorter than a QR); on Android a wide barcode is centered in the fixed zone.
- **Taps.** A code opens fullscreen on that code with swipe between codes; a photo opens the fullscreen viewer. Long press opens the native menu for that item (copy payload, share, rename, delete).
- **Memory.** The code zone reopens on the code used last for that card.
- **Screen behavior.** Full brightness and keep-awake while the code zone is on screen; released when it scrolls away.

| Card content | Code tile | Photo zone | Details |
| --- | --- | --- | --- |
| Photos only | none | Pager plus thumbnails | Sheet (iOS) or list (Android) |
| Photos, codes, details | Compact: 140 tall, code left and digits right | Pager plus thumbnails | iOS sheet at peek, Android list below the fold |
| Photos, codes, no details | Medium: 176 tall, code above digits | Pager plus thumbnails | None |
| Codes only | Large: 236 tall for a QR, 150 for a barcode | none | Sheet (iOS) or list (Android) |

## iOS: Liquid Glass

Three layers: an **ambient backdrop** that gives glass something to refract, a crisp **content layer**, and a **glass layer** for everything functional. Glass never sits on glass; content (code tile, photos, field rows) is never glass. Uses public iOS 26 APIs only; recheck against iOS 27 release notes.

**Layout, top to bottom (same order as Android)**

1. Navigation bar: back and more, system glass buttons.
2. Name in the primary label color (Large Title, 34 pt bold) with the card type as a small accent-tinted glass capsule under it. With a photo, the accent is not used for the name text. With no photo the card color is the backdrop, so the name takes the contrast color against it (white or black) and the capsule is solid card color with onAccent text.
3. Code zone: white tiles, **no border and no ring**. A soft shadow (0 6 22, 14% black) separates the tile from the backdrop. Dots in a small glass capsule when there are several codes.
4. Photo zone: pager with 28 pt concentric corners; thumbnail strip in a glass capsule when there are several photos.
5. Details sheet, non-modal, three detents.
6. Bottom toolbar: share, favorite, edit (prominent, card-tinted), more.

**Layer 1: ambient backdrop**

- With photos: the photo zone's current photo, downscaled to about 64 px, blurred (radius 40), saturation +20%, 35% strength. Rule: no photo, the card color is the backdrop; with a photo, the photo is. With no photo a large blurred blob of the card color at about 85% strength fills the top third of the screen, with a softer second blob (about 40%) lower on the opposite side.
- Crossfades in 250 ms when the photo changes.
- Never holds text. With a photo it is capped so label text keeps 4.5:1 and dimmed to 45% in dark mode. With no photo the name uses the contrast color, which keeps 4.5:1 on the card color; dark mode dims the blob to 70%.
- Cost: one small texture per photo, cached; no live blur of a large view.

**Layer 3: glass, by element**

| Element | Material | UIKit (iOS 26) | Notes |
| --- | --- | --- | --- |
| Nav buttons | System glass | UINavigationBar items | Untinted |
| Type capsule | Regular glass tinted with the card color; solid card color when there is no photo | UIGlassEffect, tintColor | Non-interactive |
| Code dots | Small regular glass capsule | UIGlassEffect | Selected dot in the accent |
| Photo thumbnails | Regular glass, interactive | UIGlassEffect (isInteractive) in a UIGlassContainerEffect | Selected thumbnail outlined in the accent; over bright photos use the clear style plus a 20% dim |
| Details sheet, peek and medium | System sheet glass | UISheetPresentationController, custom detents, largestUndimmedDetentIdentifier | Turns opaque at large |
| Toolbar | System glass | UIToolbar; edit item with the prominent style, tinted | One tinted item only |
| More menu | System menu, morphs from its button | UIMenu on the toolbar item | Fullscreen and delete live here |

API names are from memory of iOS 26; each needs a check on device. Reachable from NativeScript through the iOS runtime.

**Details sheet**

- **Peek:** grabber plus as many fields as fit under the zones (often none when photos, codes and details are all present). **Medium:** all fields plus Add field. **Large:** opaque, scrolls, nav bar title takes over from the name.
- At medium the zones scale down (0.8 at most) to stay visible above the sheet.
- **Name and details only** uses the same sheet, opened at medium by default over the ambient backdrop and a large name. No inline grouped list on iOS.
- **No details** (photos and codes only): no sheet; the code tile grows to its medium size.

**Behaviors**

- Swiping the photo pager re-lights the ambient backdrop and moves the thumbnail selection; swiping codes moves the dots.
- Tap a code: fullscreen on that code, white full-bleed, max brightness, swipe between codes, wide barcodes rotate to landscape, glass close button top-left.
- Long press on a code or photo: native menu.
- Edit is a sheet (medium, expandable to large) with an inset grouped form and a Pages list to reorder and add codes and photos; Cancel plain, Save prominent tinted glass; color swatch row, ambient backdrop recolors live behind the sheet.
- Haptics: selection on page change, light success on copy.

**Accessibility.** Reduce Transparency: flat page color instead of the ambient backdrop, opaque system materials instead of glass. Increase Contrast: borders, accent text recomputed to 4.5:1. Reduce Motion: 150 ms fade. Dynamic Type AX5: drop chip icons, stack field label above value.

## Android: Material 3 Expressive with a signature

Standard M3 Expressive components do the work (small top app bar, carousel, floating toolbar with FAB, grouped list, bottom sheet). Signature: **the card slides out of its pocket.**

- A tonal **plate** (accentContainer) fills the top of the screen edge to edge behind the status bar. It holds the name (Display Medium Emphasized) and card type (Title Medium). Bottom corners 40 dp, with one 12 dp notch corner (bottom-left), a nod to a clipped plastic card.
- A **stamp** top-right of the name: the card's initial in a cookie-shaped container that morphs to a circle when the plate collapses. The only place the full-strength accent fills a large shape.
- The **hero zones start below the name block and overlap only the plate's bottom edge**, by 44 dp, with 20 dp between the name block and the top of the code tile. The plate grows with the name (up to three lines) and pushes the zones down, so the name and type are never covered. Layout order: the name block is measured first, then the plate height and the zones are placed from it, so the carousel is never clipped. Plate height = status inset + app bar + name block + 20 + 44, so there is no separate minimum; a date-only name (22 sp) gives a short plate. Depth from tone and shape only, no shadows.

**Anatomy**

- **Top app bar.** Small, transparent over the plate: back and more. On scroll it becomes a tonal bar with the name in Title Large.
- **Code zone.** White tiles, 28 dp corners, no shadow, overlapping the plate's bottom edge. Several codes: pager (24 dp peek) with dots, no names. Tap opens fullscreen; long press opens the item menu.
- **Photo zone.** M3 carousel of photo cards, same width, peek and corners as code tiles, thumbnail row under it when there are several photos; selected thumbnail has a 2.5 dp accent outline.
- **Details.** Inline segmented list: outer corners 28 dp, inner 6 dp, 2 dp between rows, on surfaceContainerLow, below the zones (often below the fold). Pressing a row morphs its corners to 20 dp and copies the value; masked fields (PIN) reveal on tap.
- **Actions.** M3 floating toolbar: share, favorite, more. Edit is the FAB at its end, filled with the accent role. Fullscreen sits in the overflow menu. The toolbar floats 16 dp above the navigation or gesture bar inset, not above the screen edge. Content bottom padding = navigation inset + 88 dp (64 toolbar, 16 margin, 8 gap), so the thumbnail strip and the last details never sit under the toolbar.
- **Edit.** Modal bottom sheet, drag handle, notched outlined text fields stacked in the order Name, type fields, extra fields, then a Color row, a Pages list to reorder and add codes and photos, Save as a filled button.

**Color and motion.** The card view alone seeds its palette from the card color; the rest of the app keeps the system or app seed. Spatial springs drive the plate collapse and the carousel; effects springs drive color changes when the user changes the card color in edit (the plate recolors live behind the sheet).

**Accessibility.** 48 dp minimum targets; font scale to 200% wraps the name to three lines before truncating; TalkBack reads the plate as a heading and a code tile as "Barcode, 4821 7730, double tap to enlarge".

## Variants

Every variant is the same stack: code zone, photo zone, details. Missing parts drop out and the rest grow into the space. Extra data can be added to any variant and goes in the details block.

| Variant | Code zone | Photo zone | Name and card color | Details |
| --- | --- | --- | --- | --- |
| 1. Photos only | None | Pager plus thumbnails | Standard | Optional |
| 2. Photos, codes, details | Compact tiles, dots if several | Pager plus thumbnails | Standard | iOS sheet at peek, Android list below the zones |
| 2b. Photos, codes, no details | Medium tile, dots if several | Pager plus thumbnails | Standard | None; zones take the space |
| 3. Name and codes | Large tiles, dots if several | None | Standard | Optional |
| 4. Name and details | None | None | Tall: iOS Large Title at 44 pt, Android plate 264 dp with no overlap | iOS sheet opened at medium; Android inline list |

**Edge cases**

- **Several codes.** Dots select them, no names. A code can be named in edit; the name shows next to the digits and is read by screen readers.
- **Several photos.** Thumbnails select them; one photo means no strip.
- **Mixed code shapes.** A square QR and a wide barcode share the code zone; its height springs to the selected code and the zones below follow.
- **Wide linear barcode (EAN, Code 128, PDF417).** Tile keeps the full width with a wide aspect (about 150, 130 or 110 tall by size). Fullscreen rotates to landscape. Square codes cap at 80% of the width.
- **Dense QR.** If modules would fall under 2 pt/dp at the current tile size, show a hint to open fullscreen instead of scaling further. The compact tile makes this more likely.
- **More than 6 codes or photos.** Dots become a counter (3 / 9); thumbnails scroll.
- **Long name.** Two lines then ellipsis on iOS. Android plate grows to three lines and pushes the zones down. Full name visible in edit.
- **No card color.** The card color is the color the user set on the card. With none set it is the dominant color of the first photo, extracted once and stored. With no photo, or an extracted color too gray to carry an accent (HCT chroma below 16, typical for scans of white paper), use the app seed. It is never random. The same card color drives the Android plate, app bar and status bar, the iOS tinted controls and type capsule, and the iOS backdrop.
- **More than 6 fields.** First 4 shown, then a Show all row.
- **Sensitive fields (PIN, CVV).** Masked by default; tap to reveal, gated by the app's security lock when enabled.
- **Missing content.** An empty zone shows a tonal Add code or Add photo button.
- **Dark theme.** Code tile stays white; photos not dimmed; plates, tiles and ambient backdrop use dark roles.
- **Landscape and tablets.** Two columns: zones left, name and details right.
- **E-ink.** No ambient backdrop, no glass, no accent fills: flat borders only.

## Card list

The list uses the same tile language as the card view. Its main problem today is the name on image cards: bare text drawn over the image, colored by the page color's brightness, which is unreadable on light scans, and hidden altogether when the name is an automatic timestamp. The list keeps the four existing view styles and gives every kind of card a tile that is readable on any image. Mockup: `cardwallet-card-list.html`.

| Style | Layout | Label | Notes |
| --- | --- | --- | --- |
| Columns | 2 columns in portrait, 3 to 4 in landscape; 16 margin, 12 gap; tile ratio 1.58 | Chip, bottom-left | Default |
| List | Rows 72 tall: 96 by 60 thumbnail, title, subtitle, star, chevron (iOS only) | None on the thumbnail; text beside it | iOS inset grouped rows; Android one rounded row per card for now (a row does not know its position yet), segmented rows later |
| Cardholder | Full-width tiles stacked, about 40% of each visible | Chip, top-left | Soft shadow on each tile's top edge |
| Full | Full-width tiles stacked, about 29% visible, last tile whole | Chip, top-left | Same as cardholder with deeper overlap |

**Tile kinds**

| Kind | Surface | Label | Badges |
| --- | --- | --- | --- |
| Photo, named | Image fill | Chip with the name | Page count when more than one |
| Photo, auto-named | Image fill | Small date chip with the localized short date, for example Oct 28, 2026 | Same |
| Photo and code | Image fill | Chip with the name or date | Code glyph |
| Name and code | Card color fill (iOS: the color; Android: tone 84 light, 30 dark) | Name inside the tile: centered in the grid, top-left in the stacked styles; text color by contrast | Code glyph, bottom-right |
| Name only | Same as name and code | Name inside the tile | None |
| Wallet pass | The pass's own look (PKPassCardCell) | The pass's own | None |

**Rules**

- **Chips, never bare text.** The name sits in a glass chip on iOS (regular glass, 70% white in light, 66% dark gray in dark) and a tonal chip (accentContainer) on Android. The chip stays legible on any image.
- **Chip position.** The title chip sits bottom-left in the grid and top-left in the stacked styles. Page count, code glyph and favorite merge into one info pill at the top-right in every style (exact values in `cardwallet-design-rules.md`, section 3).
- **Auto names.** The default timestamp name is never shown in full on a tile: the chip shows the localized short date only. List rows show the full timestamp as the title, since there is room. A name the user set always shows. The existing `alwaysShowNames` setting then only decides whether auto-named cards get the date chip.
- **Card color.** It fills name tiles. Image tiles get no ring and no border; the color appears in the card view and in edit.
- **Selection.** A check badge top-left and the tile scales to 95%. iOS: the title becomes "3 selected" with a Done pill, and a glass toolbar (share, favorite, folder, delete) replaces the search capsule. Android: a contextual app bar with the same actions.
- **Folders.** Always above the cards, in every style. Horizontal: a scrolling row of 132 by 54 tiles. Vertical: grouped rows 52 tall with count and chevron (iOS only). The folder icon sits in a tinted circle.
- **Chrome.** iOS: Large Title "Cards", a glass pill with add, settings and more, and a glass search capsule beside a glass camera button; the list scrolls under both with the system scroll edge effect. Android: search bar on top, an extended Scan FAB at the bottom right, the contextual bar for selection.
- **Stacking.** Bars and the search row are always above the tiles. In the stacked styles tiles overlap each other, so their order must never rise above the chrome.
- **Empty state.** An icon in a glass circle (iOS) or a shape (Android), the title "Add your first card", one line of help and a prominent "Scan a card" button.

**Open points**

- Cardholder and full are very close in the code (40% against 29% visible); consider merging them into one stacked style.
- The sync indicator and where it goes next to the selection check are not designed yet.
- The wallet-pass tile in the mockup is a stand-in for the real `PKPassCardCell`.

**Mapping to the code.** `CardListCell.svelte` draws the name as a bare label colored by `getLabelParams`; replace it with a chip per layout and move `showCardName` to the auto-name rule above. `CardsList.svelte` keeps `viewStyles`, `folderViewStyles` and `itemOverlap`; only tile content and chrome change. Selected, favorite and sync indicators stay as separate overlays.

## Components

The basics are shared by Cardwallet and Document Scanner: same roles, different skin per platform. Every component reads its colors from a scoped role set, so it themes correctly on a page, in an opaque sheet and in a transparent sheet. In the card view the accent role is the card color; elsewhere it is the app accent.

**Buttons**

| Kind | iOS | Android | Use |
| --- | --- | --- | --- |
| Primary | Prominent tinted capsule, 44 tall | Filled pill, 40 tall, shape morphs from round to squircle on press | One per view or sheet: Save, Scan |
| Tonal | Accent at 12% (light) or 20% (dark) on a capsule | Tonal pill (accentContainer) | Secondary action: Edit |
| Text | Accent text, no fill | Text button | Cancel, links |
| Destructive | Red at 10% fill, red text | errorContainer fill, error text | Delete; red text in menus |
| Icon | 44 circle | 40 circle, tonal, outlined or filled | Toolbars, rows |

One primary per view. System bars and the camera button use system glass buttons on iOS; glass never goes inside glass. On a transparent sheet the tonal fill is white at 18%.

**Text fields** (mockup: `cardwallet-textfields.html`)

- **iOS: capsule.** 48 tall, fully rounded, system fill (12% gray in light, 24% in dark), placeholder inside. Our touch: a small caption appears above the field once it is focused or filled, so the capsule itself stays clean. Focus: accent tint at 12% plus a 1.5 pt accent ring. Error: red ring, alert icon, red helper text below. Multiline keeps a 24 radius and grows from 84. Dense forms, such as the card edit sheet, use a grouped row (label left, value right) instead.
- **Android: notched outlined.** Radius 20 on three corners and 6 on the bottom-left, the same clipped corner as the plate. 1.5 dp outline in the outline role (tone 50, 3:1 against the surface), 2 dp accent when focused, 2 dp error when invalid. The label lives inside the field (16 as placeholder, floating to 11 above the value) and never cuts the border, so it works on a transparent sheet. Height 56, multiline from 96.
- **Why not filled on Android.** The tonal fill barely contrasts with the page, so the field depends on a bottom line to be found, and its square top corners fight the signature. M3 outlined has a clear boundary but its label cuts a patch in the border on glass.
- **Both.** A label is always present. An error is never color alone: icon plus text. Select fields show a trailing chevron; fields show a clear button while focused. Disabled is 45% (iOS) or 38% (Android).
- **Forms in sheets.** Short forms (Create card, Add extra field: up to about three fields) stack fields in the platform style: iOS capsules, Android notched outlined, a label always present, 12 between fields. Dense forms (the card edit sheet, with many fields and extras) use grouped rows on iOS (label left, value right) and stacked notched outlined fields on Android. Field order: Name first (focused, required), then the type-specific fields, then extra fields, then Color last, as a row with the label on the left and the selected swatch on the right on both platforms; tapping it opens the color picker. The header carries the actions: iOS Cancel pill, centered title, prominent Create, Add or Save; Android close icon, title, text action. No bottom button, and sheet content is not wrapped in list items.

**Chips**

- **Filter** (toggle): iOS capsule with the system fill, selected is accent fill with a check. Android chips are pills too (one shape rule: controls are round); selected is tonal with a check.
- **Input** (removable): trailing close icon, like the current `Chip`.
- **Assist**: leading icon, for actions such as Add.
- Height 32 with the touch target padded to 44 (iOS) or 48 (Android).

**Selection**

- **Tile badge.** A 22 circle in the accent with a check, a 2 ring in the surface color (white on iOS photo tiles, page color on Android), top-left, the tile scales to 95%. This replaces the current 26 `SelectedIndicator`.
- **Row checkbox.** A 24 circle with a check on both platforms (one shape rule).
- **Radio** 22 on both. **Switch**: iOS 51 by 31, Android M3 52 by 32.
- **Segmented**: iOS system segmented control; Android connected button group, the selected button tonal with a check.

**Sheets** (mockup: `cardwallet-components.html`)

- **Kinds.** Modal sheet (edit, camera settings, pickers), non-modal persistent sheet (card details on iOS), system menu.
- **Anatomy.** Grabber 36 by 5. Header: iOS has a Cancel glass pill, centered title and a prominent Done; Android has a close icon, title and a Save text button. Content scrolls under a hairline that appears on scroll.
- **Detents.** iOS: peek, medium, large. Android: partially expanded and expanded; the camera sheet skips the collapsed state.
- **Opaque.** iOS systemBackground with secondary grouped rows; Android surfaceContainerLow. A modal sheet dims what is behind it by 32%.
- **Transparent (new).** For sheets that sit over live or visual content the user must keep seeing, such as the camera preview or an image being edited. Set through an appearance option on the sheet: opaque or transparent.

| Aspect | Transparent sheet |
| --- | --- |
| Material | iOS: system glass sheet, floating with a 6 pt inset and 26 corners. Android: translucent surface with 28 top corners, blurred on Android 12 and later, 90% opaque before |
| Scrim | No dim behind. The glass base is 55% over a dark scene and rises to 72% over a bright one, measured from the covered region when the sheet opens and at most once a second after |
| Color scheme | Forced dark over camera or media, whatever the app theme |
| Content | Nothing inside is glass; fields, chips and buttons use flat fills from the on-glass roles |
| Fallback | Reduce Transparency, power saving, or no blur support: opaque, with the app theme roles |

| Role | Opaque sheet | Transparent sheet |
| --- | --- | --- |
| Text | Theme text | White |
| Secondary text | Theme secondary | White at 68% |
| Field fill | Theme field fill | White at 14% |
| Separator | Theme separator | White at 22% |
| Accent | Theme accent | Accent lightened to L 68 (iOS) or tone 80 (Android) |
| On accent | Theme on accent | Dark (tone 20) |
| Tonal fill | Accent at 12 to 20% | White at 18% |
| Error | Theme error | Error lightened to tone 80 |

Text must keep 4.5:1 against the worst sampled backdrop; if it cannot, the scrim rises before the text color changes.

**Menus** (mockup: `cardwallet-menus.html`)

The Android options menu today is square (4 dp corners, heavy shadow, dividers only) and uses checkboxes for single choices, so a choice and a toggle look the same.

- **iOS: the system menu.** No custom popover. A single-choice group is an inline section with a check on the left of the selected item and its title above; actions have trailing icons; destructive actions are red and sit in their own section. What the app controls is the titles, icons and destructive flags.
- **Android: M3 Expressive menu.** A 28 dp container with 6 dp padding. Each group is its own segment: 20 dp outer corners, 6 dp inner corners, 2 dp between rows, a 12 sp medium group label above. Rows are 48 dp tall. A single choice is a tonal row (accentContainer) with a trailing check; unselected rows are plain. A toggle (Ascending) gets a small trailing switch. Actions have a leading 20 dp icon, a submenu a trailing chevron, and Delete is red in its own segment.
- **Choice against toggle.** A single choice never uses a checkbox, and a toggle never looks like a choice. Multi-select, if ever needed, uses checked rows with a leading check.
- **Select menu** (for a text field) is the same menu, as wide as its field, with the current value as the tonal row or the check.
- **Always opaque.** Menus are short-lived: system glass on iOS, surfaceContainer on Android with level 3 elevation. They never use the transparent mode that sheets have.

Menu mapping: `MainList.svelte` builds the view style, folder style and sort menu from `@nativescript-community/ui-menu` items that all use `checked`. Each group needs a type (single choice, toggle or action) so Android can draw the tonal row or the switch, while iOS keeps the system check. The Android styling needs a themed menu style or a custom popup view; `optionsToMenuItems` in `app/utils/appMenu.ts` already flags destructive items.

**Mapping to the code.** `showBottomSheet` gets an `appearance` option; `backgroundOpacity` is already commented out in `Camera.svelte`. The sheet provides its role set through a Svelte context, and components read `getContext` first and the global `$colors` store second, so `Chip.svelte`, `SelectedIndicator.svelte`, `uibutton` variants and textfields theme without knowing about sheets. The textfield `variant="outline"` used in `ImageProcessingSettingsBottomSheet.svelte` becomes the notched outlined style on Android and the capsule on iOS.

## Implementation status

The card list and the components are on draft pull requests 765 to 768 in ossappscollective/OSS-DocumentScanner. This spec stays the target; the gaps below mostly need changes in native plugins (ui-textfield, ui-button, ui-bottomsheet, ui-menu), not different design decisions.

| Area | PR | Implemented | Gap against this spec |
| --- | --- | --- | --- |
| Card list | 765 | Four view styles, chips, tiles, folder tiles (horizontal 132 by 54, vertical 46 row with chevron) | Android list is one rounded row per card, not segmented, because a row does not know its position |
| Text fields | 766 | Android outlined with 20/20/20/6 corners through a ui-textfield style override; iOS capsule in CSS | Android label still floats on the border (a label inside the field needs a ui-textfield change). iOS has no caption above and no focus or error ring: NativeScript CSS has no :focus, though focus and blur events could toggle a class |
| Buttons | 767 | Primary is prominentGlass on iOS (44) and contained on Android (40) | No round-to-squircle shape morph on press (needs ui-button) |
| Sheets | 768 | Shared SheetHeader: iOS glass Cancel pill, centered title, prominent action; Android close icon, title, text action | Transparent appearance, hairline on scroll and the 32% dim (need ui-bottomsheet) |
| Menus | none | iOS uses the system menu | Android grouped menu needs ui-menu support: segmented groups, tonal row, trailing switch |

## Mapping to the code

The card view already has the native app bar and bottom toolbar (commit d8db994a) and the code area plus image pager on `ui-surface` (commit 14d7ffaa); this system is mostly a re-skin and re-ordering.

- **Accent roles.** `CardView.svelte` derives the card color in several places (`extra.color`, then page color). Replace with one function returning the role set from the Tokens table, per platform. Pure logic: put it in a sibling module and test with Vitest like `app/utils/exportUtils.ts`.
- **QR on white.** The existing `forceWhiteBackgroundForQRCode` logic lets the code adopt theme colors. This spec makes white the default; decide whether the setting stays as an opt-out.
- **E-ink theme.** `isEInk` already drops card colors. Keep it.
- **Toolbar.** Move fullscreen and delete into the more menu via `optionsToMenuItems`; edit becomes the prominent, card-tinted action.
- **Details on iOS.** Bottom sheet with peek, medium and large detents for every variant, including name and details only.
- **Android signature.** Plate, stamp and overlap are new views; shape morph and spring values need a prototype on device.

Mockups (not in this file): HTML mockups of the variants and iOS states were produced in the design session; the Docs source is https://claude.ai/artifact/C3YZRi2BodSTFNXz7xWMPg.
