# Document Scanner: document list and document view

Mockups: `scanner-document-list.html`, `scanner-document-view.html`. Same tokens, shape rule, bars rule (rules file, section 20) and platform skins as the card list and card view; the differences are in section 17 of `cardwallet-design-rules.md`. Values come from this file and the rules file, not from mockup pixels. This file describes what is built (the list: `DocumentsList.svelte`, `DocumentTile.svelte`, `DocumentRow.svelte`, `DocumentSyncChip.svelte`; the view: `DocumentView.svelte`, `DocumentPageTile.svelte`, `ReorderPagesSheet.svelte`, `RenameDocumentBar.svelte`) and the few things still open (section 4).

## 0. The edge of a page (list tiles and page tiles)

A document is white paper on the page color, so it needs an edge, the one of the page edit screen (rules, section 22):

- **iOS:** level 1 shadow, 0 2 10, 18% black (`0x6C` in the code: iOS applies the alpha twice).
- **Android and e-ink:** a 1 outline in `outlineVariant`.
- Photo tiles of the card app keep no ring and no border (card view, section "Card list").
- Code: `getPaperEdge` in `app/utils/documentCell.ts`.

## 1. Document list (`DocumentsList.svelte` on `MainList.svelte`)

- **Two view styles:** **Grid** (default) and **List**, in the top more menu under "View". The stored keys are unchanged (`default` is the grid, `condensed` the list: the trash and the picker share them), so there is no migration. A list in landscape is shown as a grid (a row would be too wide): 4 columns in landscape, 2 in portrait.
- **Grid tile:** portrait, ratio 1 : 1.41, 16 margin, 12 gap, radius = clamp(8, 0.18 x shorter side, 28) (`getTileRadius`). The tile is the first page, aspect fill, with the edge of section 0. Chips (rules, section 3): title chip bottom-left (the name, or the localized short date when the document is auto-named), info pill top-right.
- **Info pill:** page count (only when more than 1) and favorite, merged into one pill with a hairline between them when both are present (`getInfoPill`).
- **Sync pill:** a pill of its own, right-aligned 8 under the info pill (at the top when there is no info pill), so a long list of services never widens the info pill. One 9 round dot per service the document is on, in the color of that service (the color set in the sync settings, `getSyncedServices`), 4 apart. A service the document is not on has no dot. Up to 5 dots on a tile (6 in a list chip), then "+n" (`getSyncDots`). A document synced nowhere has no sync pill. This keeps the color code of the old `SyncIndicator` bars; the document view names the services (section 2).
- **List row:** 84 tall, thumbnail 48 x 62, radius 9. Title 15 semibold (the name, or the full date and time when auto-named), then "date, size" in secondary, then a line of chips (20 tall, 10 radius, 11 semibold): the page count chip (only when more than 1), then the sync chip (the same dots) on the same line, wrapping only when there is no room. Trailing favorite star. iOS inset grouped with a hairline between rows, Android segmented groups. Row selection uses the leading marker of the card list.
- **Folders:** the horizontal tiles and the vertical rows of the card list (`FolderCell`), "n documents". `MainList` uses them for both apps; the old canvas folders are gone.
- **Bars:** iOS large title "Documents", glass group top-right, bottom search capsule with the camera as a glass circle. Android search bar at the top, small tonal add FAB (a menu: import file, import image) beside the extended Scan FAB (rules, section 2). Unchanged `MainList` bars.
- **Empty:** `CardsEmpty` with the camera icon, "scan your first document", one line of help and a prominent "scan a document" action.

## 2. Document view (`DocumentView.svelte`)

- **Title zone** (under the bar, like the card view): the name in bold (iOS 32, Android 28) and under it, 13 in secondary, "date · n pages · size". An auto-named document is titled by its date and time ("Nov 5, 2026 12:09 PM") and its line has no date: "4 pages · 631 kB". The bar has no title, except "n selected" in selection. The zone does not scroll with the pages.
- **Synced with:** under it, one chip per service the document is on (24 tall, a 9 dot in the service color, "Service · KIND", for example "Google Drive · PDF", because a service can sync data, images and PDF with a color each). Wraps on several lines. Hidden when the document is synced nowhere or in selection.
- **Pages:** grid of tiles, 2 columns in portrait and 3 in landscape (the existing columns setting). A tile is a white holder with the edge of section 0, the page shown whole (aspect fit) in it. Chips: page number bottom-left (hidden when selected), a text recognition glyph top-right when the page has detected text. The tile has no size line.
- **Tap** opens the page edit. **Long press** starts the selection; with a selection, a tap toggles. There is no in-place reorder.
- **Bars** (rules, section 20): top right favorite (filled when on) and the one more menu. iOS bottom toolbar: export (menu) and import images on the left, a prominent "Add" with the camera at the trailing end. Android: small tonal export FAB (menu) 12 to the left of the extended "Add" FAB; no bottom toolbar. Both hidden in selection.
- **Export menu:** PDF (the PDF export options) and share images, one native menu from the export button.
- **More menu:** Rename, Select pages, Reorder pages, Move to folder, Detect text, Transform pages, Remove originals (only when a page still has its original), Delete (destructive).
- **Selection:** iOS: "n selected" and a prominent Cancel, bottom toolbar with share (the export menu), detect text, more (select all, transform, remove originals), delete in red. Android: contextual bar with close, the count, share (the export menu), delete, more.
- **Reorder pages:** a sheet (rules, section 24: Cancel, title, Save), rows of a 40 x 56 thumbnail, "page n" (the number the page had when the sheet opened, so a moved page keeps its name) and a handle; drag a row or long press it. The document changes only on Save, then the grid starts again.
- **Rename:** a bar over the pages with the sheet header (iOS Cancel glass pill and prominent Save, Android close and a text Save) and an outlined name field, focused with the keyboard.

## 3. Mockup differences on purpose

- The synced chips of the view stay fixed under the title instead of scrolling.
- The built list row puts the page count chip and the sync chip on one line.
- The edge of the tiles is the section 0 rule (the first mockup drew a faint hairline).

## 4. Open

- A secondary "Import" action in the empty state (`CardsEmpty` has one button).
- The export menu has PDF and share images; a third "Share" entry of `cardwallet-crop-export.md`, section 2, is not built.
- Tapping the title to rename.
- The "Synced with" row could scroll with the pages (it needs a header item in the collection).
