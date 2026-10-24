#!/usr/bin/env bash
# Pack the output of build-opencv.sh / build-tesseract.sh of one platform into a release asset.
#
# usage: package.sh <opencv_version> <tesseract_version> <android|ios|catalyst> [dest dir] [--variant release|debug]
# -> native-libs-<platform>-opencv<ov>-tesseract<tv>[-debug].tar.gz (+ .sha256), paths relative to the repo root
#    (opencv/..., tesseract/...), so `tar -xzf <asset> -C <repo root>` installs it.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

VARIANT="${NATIVE_LIBS_VARIANT:-release}"
args=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --variant) VARIANT="${2:-}"; shift 2 ;;
        -*) die "unknown option $1" ;;
        *) args+=("$1"); shift ;;
    esac
done
[[ ${#args[@]} -ge 3 ]] || die "usage: $0 <opencv_version> <tesseract_version> <android|ios|catalyst> [dest dir] [--variant release|debug]"
OPENCV_VERSION="${args[0]}"
TESS_VERSION="${args[1]}"
PLATFORM="${args[2]}"
DEST="${args[3]:-$NATIVE_LIBS_OUT}"
STAGE="$(stage_dir "$PLATFORM" "$VARIANT")"
[[ -d "$STAGE" ]] || die "nothing built for $PLATFORM in $STAGE"

NAME="native-libs-$PLATFORM-opencv$OPENCV_VERSION-tesseract$TESS_VERSION$(variant_suffix "$VARIANT")"
mkdir -p "$DEST"
members=()
for dir in opencv tesseract; do
    if [[ -d "$STAGE/$dir" ]]; then members+=("$dir"); fi
done
[[ ${#members[@]} -gt 0 ]] || die "$STAGE has neither opencv/ nor tesseract/"
tar -C "$STAGE" -czf "$DEST/$NAME.tar.gz" "${members[@]}"
(cd "$DEST" && { sha256sum "$NAME.tar.gz" 2>/dev/null || shasum -a 256 "$NAME.tar.gz"; } >"$NAME.tar.gz.sha256")
log "packaged $DEST/$NAME.tar.gz ($(du -h "$DEST/$NAME.tar.gz" | cut -f1))"
