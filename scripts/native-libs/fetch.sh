#!/usr/bin/env bash
# Download the prebuilt native libs of a `build-native-libs` release into opencv/ and tesseract/.
#
# usage: fetch.sh <opencv_version> <tesseract_version> <android|ios|catalyst|all> [--variant release|debug|both] [--dest <dir>] [--repo <owner/name>] [--dry-run]
#   release tag : native-libs-<opencv_version>-<tesseract_version>
#   asset       : native-libs-<platform>-opencv<ov>-tesseract<tv>[-debug].tar.gz
#   --variant   : release (default), debug (tesseract with symbols, same file names: extracted over the release libs,
#                 so fetch release first or use `both`) or both (release, then debug on top)
#   --dest      : repo root to extract into (default: this repo's root)
#   --repo      : GitHub repository holding the release (default: $NATIVE_LIBS_REPO or ossappscollective/OSS-DocumentScanner)
#   --dry-run   : only print what would be downloaded
# Uses `gh release download` when gh is installed and authenticated, plain curl otherwise.
# Note: this overwrites opencv/ios/opencv2.xcframework and the matching libs of the selected platforms.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

DEST="$REPO_ROOT"
REPO="${NATIVE_LIBS_REPO:-ossappscollective/OSS-DocumentScanner}"
DRY_RUN=0
VARIANT="${NATIVE_LIBS_VARIANT:-release}"
args=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dest) DEST="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        --variant) VARIANT="${2:-}"; shift 2 ;;
        -*) die "unknown option $1" ;;
        *) args+=("$1"); shift ;;
    esac
done
[[ ${#args[@]} -eq 3 ]] || die "usage: $0 <opencv_version> <tesseract_version> <android|ios|catalyst|all> [--dest dir] [--repo owner/name] [--dry-run]"
OPENCV_VERSION="${args[0]}"
TESS_VERSION="${args[1]}"
case "${args[2]}" in
    all) platforms=(android ios catalyst) ;;
    android | ios | catalyst) platforms=("${args[2]}") ;;
    *) die "unknown platform '${args[2]}'" ;;
esac
case "$VARIANT" in
    release) variants=(release) ;;
    debug) variants=(debug) ;;
    both) variants=(release debug) ;;
    *) die "unknown variant '$VARIANT' (release|debug|both)" ;;
esac
TAG="native-libs-$OPENCV_VERSION-$TESS_VERSION"
mkdir -p "$NATIVE_LIBS_DL/release-$TAG"

for platform in "${platforms[@]}"; do
    for variant in "${variants[@]}"; do
        asset="native-libs-$platform-opencv$OPENCV_VERSION-tesseract$TESS_VERSION$(variant_suffix "$variant").tar.gz"
        url="https://github.com/$REPO/releases/download/$TAG/$asset"
        if [[ "$DRY_RUN" == 1 ]]; then
            log "would download $url and extract it into $DEST"
            continue
        fi
        file="$NATIVE_LIBS_DL/release-$TAG/$asset"
        if [[ ! -s "$file" ]]; then
            if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
                gh release download "$TAG" --repo "$REPO" --pattern "$asset" --dir "$NATIVE_LIBS_DL/release-$TAG" --clobber \
                    || die "release $TAG / asset $asset not found in $REPO (run the build-native-libs workflow first)"
            else
                log "download $url"
                curl -fL --retry 3 -sS -o "$file.part" "$url" || die "cannot download $url (run the build-native-libs workflow first)"
                mv "$file.part" "$file"
            fi
        fi
        # verify against the published checksum when there is one
        if curl -fsSL "$url.sha256" -o "$file.sha256" 2>/dev/null; then
            [[ "$(cut -d' ' -f1 "$file.sha256")" == "$(sha256_of "$file")" ]] || { rm -f "$file"; die "checksum mismatch for $asset"; }
        fi
        log "extract $asset into $DEST"
        tar -xzf "$file" -C "$DEST"
    done
done
