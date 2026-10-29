# Design system (Cardwallet and Document Scanner)

Read these in order. Everything here is the target design; the implementation status of each rule is at the end of `cardwallet-design-rules.md`.

| File | What it holds |
| --- | --- |
| `cardwallet-design-rules.md` | Exact values for every component and state: shape rule, FAB, chips, titles, selection, folders, list rows, typography, states, motion, snackbars, icons, safe areas, dialogs, settings rows, Document Scanner differences. **Wins on conflicts.** |
| `cardwallet-card-view.md` | Principles, tokens, hero zones, the iOS (Liquid Glass) and Android (Material 3 Expressive) card view, variants and edge cases, card list, components (buttons, text fields, chips, selection, sheets, menus), implementation status of PRs 765 to 768 |
| `cardwallet-card-view-variants.html` | Mockup: card view variants on iOS and Android |
| `cardwallet-card-view-ios-states.html` | Mockup: eight iOS card view states |
| `cardwallet-card-list.html` | Mockup: card list styles, folders, selection, tile anatomy |
| `cardwallet-components.html` | Mockup: buttons, text fields, chips, selection, sheets (opaque and transparent) |
| `cardwallet-textfields.html` | Mockup: text field options (adopted: iOS capsule, Android notched outlined) |
| `cardwallet-menus.html` | Mockup: menus |

- The mockups are schematic, drawn 300 wide. Take values from the markdown, not from mockup pixels (see section 0 of the rules file).
- The Docs source (editable, with comments): https://claude.ai/artifact/C3YZRi2BodSTFNXz7xWMPg
- The HTML mockups load the Tabler icon font from a CDN; the real icons are SF Symbols and MDI (rules file, section 13).
