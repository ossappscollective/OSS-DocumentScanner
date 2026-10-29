---
name: branch-check
description: Ensure you're on a correct working branch off up-to-date main before planning or editing — starting from a GitHub issue when one is in play.
---

Run before anything else, before planning or editing.

1. Check the current branch (`git branch --show-current`).
2. If you are on `main`, you must branch — never edit directly on `main`.
3. Ensure `main` is current first: `git pull origin main` (rebase onto `upstream/main` if working from a fork).
4. If a GitHub issue is in play, fetch it with `gh` and derive the branch from it:
    - `gh issue view <number> --json number,title,labels` — read the title and labels
    - Pick the `<type>` from the labels/intent (`fix` for a bug, `feat` for an enhancement, etc.)
    - Build the name as `<type>/<number>-<slug>`, where `<slug>` is the issue title lowercased, non-alphanumerics → `-`, trimmed (e.g. issue #1234 "ScrollView insets wrong on iOS" → `fix/1234-scrollview-insets-wrong-on-ios`)
5. If no issue is in play, name the branch `<type>/<short-description>` from the change itself (e.g. `feat/date-picker-range`).
6. Resolve the branch:
    - If it already exists, check it out.
    - Otherwise create it from up-to-date `main`.
7. Check out the branch BEFORE planning. Interactive: confirm the branch name with the user first. **`--auto`** (caller runs autonomously): skip confirmation, just check out.
