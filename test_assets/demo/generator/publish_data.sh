#!/bin/bash
# Zips the generated demo data and uploads it as the `demo-data` release asset (creates the release the first time).
# usage: publish_data.sh   (after python gen.py all). Replaces the previous asset: deploys of everybody get the new data.
set -e
DEMO="$(cd "$(dirname "$0")/.." && pwd)"
REPO_SLUG=${DEMO_REPO:-ossappscollective/OSS-DocumentScanner}
[ -f "$DEMO/documentscanner/manifest.json" ] || { echo "no data: run python gen.py all first"; exit 1; }
tmp=$(mktemp -d)
(cd "$DEMO" && zip -q -r "$tmp/demo-data.zip" documentscanner cardwallet import)
ls -la "$tmp/demo-data.zip"
if gh release view demo-data -R "$REPO_SLUG" >/dev/null 2>&1; then
  gh release upload demo-data "$tmp/demo-data.zip" -R "$REPO_SLUG" --clobber
else
  gh release create demo-data "$tmp/demo-data.zip" -R "$REPO_SLUG" --prerelease --title "Demo data" \
    --notes "Fictional documents, cards and passes to test the apps and make store screenshots. Built by test_assets/demo/generator/gen.py, fetched by fetch_data.sh. Not a version of the app."
fi
rm -rf "$tmp"
