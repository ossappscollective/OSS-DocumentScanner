# Document Scanner: document list and document view (proposal)

Mockups: `scanner-document-list.html`, `scanner-document-view.html`. Same tokens, shape rule, bars rule (rules file, section 20) and platform skins as the card list and card view; the differences are in section 17 of `cardwallet-design-rules.md`. Values come from this file and the rules file, not from mockup pixels.

## 1. Document list (`DocumentsList.svelte` on `MainList.svelte`)

- **Two view styles**, replacing expanded and condensed: **Grid** (default) and **List**. The choice is in the top more menu under "View".
- **Grid:** 2 columns of portrait tiles, ratio 1 : 1.41, 16 margin, 12 gap, radius from the radius rule (section 9). The tile is the first page image, aspect fill. Chips follow section 3: title chip bottom-left (auto-named document: calendar icon and the localized short date), info pill top-right.
- **Info pill segments:** page count (only when more than 1) and favorite, merged into one pill when both are present.
- **Sync pill:** a pill of its own, right-aligned 8 under the info pill (at the top when there is no info pill), so a long list of services never widens the info pill. One 9 round dot per service the document is synced to, in the color of that service (the color set in the sync settings, `getSyncColors`), 4 apart, with a 1 ring in the chip fill so the dots separate from the photo. A service the document is not on has no dot. Up to 5 dots on a tile (6 in a list chip), then "+n". A document synced nowhere has no sync pill. This keeps the color code of the `SyncIndicator` bars, inside the pill. Color alone is not enough to read it, so the document view names the services (section 2).
- **List:** row 84 tall, thumbnail 48 x 62, radius 9. Title 15 semibold, then "date, size" in secondary, then a line of chips (20 tall, 10 radius, 11 semibold, neutral fill on iOS, tonal container on Android): the page count chip (stack icon and number, only when more than 1), then under it the sync chip (the same dots as the tile). Trailing favorite star and chevron. iOS inset grouped, Android segmented groups.
- **Folders** above the documents, horizontal tiles (default) or vertical rows, as in the card list. Folder tiles read "n documents".
- **Bars:** iOS large title "Documents", glass group top-right (add menu, settings, more), bottom search capsule with the camera as a 48 glass circle. Android search bar at the top (search, more, settings), small tonal FAB (import) above the extended Scan FAB (rules, section 2).
- **More menu** (top): Select; View (Grid, List); Sort by (Date, Name, Most used, with direction); Folders (Horizontal, Vertical; only when folders exist); Trash.
- **Selection:** the card list pattern. iOS: "n selected" and Done, bottom toolbar with share, favorite, folder, delete in red. Android: contextual bar. The selection marker replaces the sync segment position only on the left; the pill stays top-right.
- **Empty:** icon in a glass circle (iOS) or a shape (Android), "Scan your first document", one line of help, a prominent Scan action and a text Import action.

## 2. Document view (`DocumentView.svelte`)

- **Header:** iOS large title (the document name, 32 bold, up to 2 lines) with one line under it: date, page count, size. Android: top bar with back, favorite and more, then the name (28) and the same line. Tap the title or use Rename to edit it.
- **Synced with:** under that line, one chip per service the document is on (24 tall, a 9 dot in the service color, the service name). Hidden when the document is synced nowhere. This is where the colors of the list are named.
- **Pages:** grid of portrait tiles, 2 columns (3 by the existing column setting), same tile as the list. Chips: page number bottom-left, a text recognition glyph top-right when the page has detected text. No size line on the tile any more (the size is in the page edit).
- **Tap** opens the page edit. **Long press** selects (the selection mode of the list). There is no in-place reorder: Reorder pages is a sheet (rules, section 24) with a handle per row, Save at the end.
- **Bars** (section 20): top right favorite and the one more menu; iOS bottom toolbar with export and import images on the left and a prominent "Add" (camera) at the trailing end; Android extended Add FAB with a small tonal export FAB 12 to its left. Both hidden in selection.
- **Export menu:** the native menu of `cardwallet-crop-export.md`, section 2 (PDF, images, share), from the export button.
- **More menu:** Rename, Select pages, Reorder pages, Move to folder; then Detect text, Transform pages, Remove originals (hidden when no original is left); then Delete in red.
- **Selection:** iOS bottom toolbar with share, PDF, detect text, delete in red; Android contextual bar with share, delete, more (PDF, transform, select all).
- **Rename:** inline field in the header zone (iOS capsule, Android notched outlined), Cancel and Save on iOS, close and Save on Android.

## 3. Decisions to confirm

- Grid as default view style, instead of the expanded list.
- Condensed and expanded merged into Grid and List (a migration of the stored view style is needed).
- Sync shown as colored dots (one per service) in the pill and in a list chip, instead of the bars along the bottom of the row.
- The add (camera) action is the main action of the document view; import images moves to the toolbar (iOS) and the add menu (Android).
