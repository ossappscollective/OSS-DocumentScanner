#!/usr/bin/env bash
# Build + package everything for one or more platforms. This is what the workflow runs.
#
# usage: build.sh <opencv_version> <tesseract_version> <android|ios|catalyst|all>... [--opencv-from-source] [--variant release|debug|both]
#   --variant debug builds only tesseract/leptonica/libpng/libjpeg with symbols (OpenCV has no debug variant);
#   its archive has the same layout/names as the release one and can be extracted over it.
#   (--opencv-from-source is the same as OPENCV_FROM_SOURCE=1)
#   ios      : opencv2.xcframework (ios + simulator + maccatalyst slices) + tesseract -ios/-sim libs
#   catalyst : tesseract -catalyst libs only (the maccatalyst opencv slice ships with `ios`)
#   all      : android ios catalyst
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

opencv_args=()
args=()
variant="${NATIVE_LIBS_VARIANT:-release}"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --opencv-from-source) opencv_args+=(--from-source); shift ;;
        --variant) variant="${2:-}"; shift 2 ;;
        *) args+=("$1"); shift ;;
    esac
done
case "$variant" in release | debug | both) ;; *) die "unknown variant '$variant' (release|debug|both)" ;; esac
[[ ${#args[@]} -ge 3 ]] || die "usage: $0 <opencv_version> <tesseract_version> <android|ios|catalyst|all>... [--opencv-from-source]"
OPENCV_VERSION="${args[0]}"
TESS_VERSION="${args[1]}"
platforms=("${args[@]:2}")
if [[ " ${platforms[*]} " == *" all "* ]]; then platforms=(android ios catalyst); fi

variants=("$variant")
if [[ "$variant" == both ]]; then variants=(release debug); fi

for platform in "${platforms[@]}"; do
    for v in "${variants[@]}"; do
        case "$platform" in
            android | ios)
                if [[ "$v" == release ]]; then "$NL_DIR/build-opencv.sh" "$OPENCV_VERSION" "$platform" ${opencv_args[@]+"${opencv_args[@]}"}; fi
                "$NL_DIR/build-tesseract.sh" "$TESS_VERSION" "$platform" --variant "$v"
                ;;
            catalyst) "$NL_DIR/build-tesseract.sh" "$TESS_VERSION" catalyst --variant "$v" ;;
            *) die "unknown platform '$platform'" ;;
        esac
        "$NL_DIR/package.sh" "$OPENCV_VERSION" "$TESS_VERSION" "$platform" --variant "$v"
    done
done
