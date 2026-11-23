#!/bin/bash
# Downloads the generated demo data (documentscanner/, cardwallet/, import/) from the `demo-data` release of the repo
# into test_assets/demo, unless it is already there. The data is NOT in git: it is built by gen.py and published by publish_data.sh.
# usage: fetch_data.sh [--force]     needs: gh (logged in) or curl for a public repo
set -e
DEMO="$(cd "$(dirname "$0")/.." && pwd)"
REPO_SLUG=${DEMO_REPO:-ossappscollective/OSS-DocumentScanner}
if [ "$1" != "--force" ] && [ -f "$DEMO/documentscanner/manifest.json" ] && [ -f "$DEMO/cardwallet/manifest.json" ]; then exit 0; fi
tmp=$(mktemp -d)
echo "downloading demo-data.zip from $REPO_SLUG..."
if command -v gh >/dev/null; then
  gh release download demo-data -R "$REPO_SLUG" -p demo-data.zip -D "$tmp" --clobber
else
  curl -fsSL -o "$tmp/demo-data.zip" "https://github.com/$REPO_SLUG/releases/download/demo-data/demo-data.zip"
fi
rm -rf "$DEMO/documentscanner" "$DEMO/cardwallet" "$DEMO/import"
unzip -q "$tmp/demo-data.zip" -d "$DEMO"
rm -rf "$tmp"
echo "demo data ready in $DEMO"
