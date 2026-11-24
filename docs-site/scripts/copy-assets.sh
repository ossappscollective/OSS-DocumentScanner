#!/bin/sh

# Copy assets from root level and fastlane to static/img for Docusaurus build
# This avoids duplicating images in the docs-site folder

# Get script directory (POSIX compatible)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCS_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$DOCS_DIR")"
STATIC_IMG="$DOCS_DIR/static/img"

echo "Copying assets to docs-site/static/img..."

# Create directories if they don't exist
mkdir -p "$STATIC_IMG/apps"
mkdir -p "$STATIC_IMG/badges"
mkdir -p "$STATIC_IMG/icons"
mkdir -p "$STATIC_IMG/screenshots/documentscanner"
mkdir -p "$STATIC_IMG/screenshots/cardwallet"

# Copy badges from root level
echo "Copying badges..."
cp "$ROOT_DIR/graphics/badge_github.png" "$STATIC_IMG/badges/badge_github.png" 2>/dev/null || true

# Copy app icons from root level
echo "Copying icons..."
cp "$ROOT_DIR/fastlane/metadata/com.akylas.documentscanner/android/en-US/images/icon.png" "$STATIC_IMG/icons/documentscanner-icon.png" 2>/dev/null || true
cp "$ROOT_DIR/fastlane/metadata/com.akylas.cardwallet/android/en-US/images/icon.png" "$STATIC_IMG/icons/cardwallet-icon.png" 2>/dev/null || true
cp "$ROOT_DIR/graphics/documentscanner-icon.svg" "$STATIC_IMG/icons/documentscanner-icon.svg" 2>/dev/null || true
cp "$ROOT_DIR/graphics/cardwallet-icon.svg" "$STATIC_IMG/icons/cardwallet-icon.svg" 2>/dev/null || true

# Copy feature graphics from fastlane
echo "Copying feature graphics..."
cp "$ROOT_DIR/fastlane/metadata/com.akylas.documentscanner/android/en-US/images/featureGraphic.png" "$STATIC_IMG/apps/documentscanner-feature.png" 2>/dev/null || true
cp "$ROOT_DIR/fastlane/metadata/com.akylas.cardwallet/android/en-US/images/featureGraphic.png" "$STATIC_IMG/apps/cardwallet-feature.png" 2>/dev/null || true

# Copy phone screenshots from fastlane, one set per site locale (store locale codes).
# A screenshot missing for a locale falls back to its en-US version.
echo "Copying screenshots..."
LOCALES="en-US fr-FR"
for APP in documentscanner cardwallet; do
    SRC="$ROOT_DIR/fastlane/metadata/com.akylas.$APP/android"
    for FILE in "$SRC/en-US/images/phoneScreenshots/"*_en-US.jpg; do
        [ -f "$FILE" ] || continue
        NAME="$(basename "$FILE" _en-US.jpg)"
        for LOCALE in $LOCALES; do
            LOCALIZED="$SRC/$LOCALE/images/phoneScreenshots/${NAME}_$LOCALE.jpg"
            [ -f "$LOCALIZED" ] || LOCALIZED="$FILE"
            cp "$LOCALIZED" "$STATIC_IMG/screenshots/$APP/${NAME}_$LOCALE.jpg"
        done
    done
done

# Copy App Store badges
echo "Copying store badges..."
cp "$ROOT_DIR/appstore.png" "$STATIC_IMG/badges/appstore.png" 2>/dev/null || true
cp "$ROOT_DIR/appstore_cardwallet.png" "$STATIC_IMG/badges/appstore_cardwallet.png" 2>/dev/null || true

echo "Asset copy complete!"
