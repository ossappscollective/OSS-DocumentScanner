#!/usr/bin/env bash
# Provide OpenCV (opencv-mobile flavour: core, imgproc, photo, features2d, video, highgui) for the app.
#
# usage: build-opencv.sh <opencv_version> <android|ios|catalyst> [--from-source]
#   android : static libs for NATIVE_LIBS_ANDROID_ABIS     -> <out>/android/opencv/android/{include,jni,staticlibs,3rdparty}
#   ios     : opencv2.xcframework with the ios, ios-simulator and mac-catalyst slices
#   catalyst: alias of ios, the xcframework always carries the maccatalyst slice
#             (-> <out>/ios/opencv/ios/opencv2.xcframework)
#
# Default mode downloads the prebuilt nihui/opencv-mobile release assets (what the app has always
# used). --from-source (or OPENCV_FROM_SOURCE=1) instead downloads the opencv-mobile *source* zip
# of the same release and rebuilds it with the same cmake options as opencv-mobile's CI, so the
# result no longer depends on binaries somebody else uploaded.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

FROM_SOURCE="${OPENCV_FROM_SOURCE:-0}"
POSITIONAL=()
for arg in "$@"; do
    case "$arg" in
        --from-source) FROM_SOURCE=1 ;;
        *) POSITIONAL+=("$arg") ;;
    esac
done
[[ ${#POSITIONAL[@]} -eq 2 ]] || die "usage: $0 <opencv_version> <android|ios|catalyst> [--from-source]"
OPENCV_VERSION="${POSITIONAL[0]}"
PLATFORM="${POSITIONAL[1]}"
case "$PLATFORM" in android) ;; ios | catalyst) PLATFORM=ios ;; *) die "unknown platform '$PLATFORM'" ;; esac

TAG="$(pin_get OPENCV_MOBILE_TAG "$OPENCV_VERSION")"
if [[ -z "$TAG" ]]; then
    require_cmd gh
    log "no OPENCV_MOBILE_TAG pin for $OPENCV_VERSION, looking it up on github (newest release carrying it)"
    TAG="$(gh api repos/nihui/opencv-mobile/releases --paginate \
        --jq ".[] | select(any(.assets[]; .name == \"opencv-mobile-$OPENCV_VERSION.zip\")) | .tag_name" | head -n1)"
    [[ -n "$TAG" ]] || die "no opencv-mobile release contains OpenCV $OPENCV_VERSION"
    warn "resolved $OPENCV_VERSION -> opencv-mobile $TAG, pin OPENCV_MOBILE_TAG_$(version_key "$OPENCV_VERSION")=$TAG in versions.env"
fi
BASE_URL="https://github.com/nihui/opencv-mobile/releases/download/$TAG"
WORK="$NATIVE_LIBS_WORK/opencv-$OPENCV_VERSION"
STAGE="$(stage_dir "$PLATFORM")"
log "opencv $OPENCV_VERSION (opencv-mobile $TAG, $([[ $FROM_SOURCE == 1 ]] && echo from source || echo prebuilt)) for $PLATFORM"

# fetch_zip <asset suffix: android|ios|ios-simulator|mac-catalyst, or empty for the source zip> <dest dir>
fetch_zip() {
    local suffix="$1" dest="$2" name="opencv-mobile-$OPENCV_VERSION${1:+-$1}" sha_var
    sha_var="SHA256_opencv_mobile_$(version_key "$OPENCV_VERSION")${suffix:+_$(version_key "$suffix")}"
    download "$BASE_URL/$name.zip" "$NATIVE_LIBS_DL/$name.zip" "${!sha_var:-}"
    rm -rf "$dest"
    mkdir -p "$dest"
    unzip -q "$NATIVE_LIBS_DL/$name.zip" -d "$dest"
}

# ------------------------------------------------------------------------------------------
# Android
# ------------------------------------------------------------------------------------------
build_android_from_source() { # -> $WORK/android-sdk/<abi>/ install trees
    require_android_ndk
    require_cmd cmake
    fetch_zip "" "$WORK/source"
    local src="$WORK/source/opencv-mobile-$OPENCV_VERSION" abi opts
    read -r -a opts < <(tr '\n' ' ' <"$src/options.txt"; echo)
    for abi in $(android_abis); do
        local bld="$src/build-$abi" extra=()
        log "[$abi] opencv-mobile $OPENCV_VERSION"
        if [[ "$abi" == armeabi-v7a ]]; then extra+=(-DANDROID_ARM_NEON=ON); fi
        if [[ "$abi" == arm64-v8a ]]; then extra+=(-DOPENCV_EXTRA_FLAGS=-mno-outline-atomics); fi
        cmake -S "$src" -B "$bld" \
            -DCMAKE_POLICY_DEFAULT_CMP0057=NEW -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
            -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake" \
            -DANDROID_USE_LEGACY_TOOLCHAIN_FILE=False -DANDROID_ABI="$abi" \
            -DANDROID_PLATFORM="android-$NATIVE_LIBS_ANDROID_API" -DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON \
            -DANDROID_CPP_FEATURES="no-rtti no-exceptions" -DCMAKE_INSTALL_PREFIX="$bld/install" -DCMAKE_BUILD_TYPE=Release \
            "${opts[@]}" -DBUILD_opencv_world=OFF -DOPENCV_DISABLE_FILESYSTEM_SUPPORT=ON "${extra[@]}" >"$bld.configure.log" 2>&1 \
            || { tail -n 40 "$bld.configure.log" >&2; die "opencv configure failed for $abi"; }
        cmake --build "$bld" --parallel "$JOBS" >"$bld.build.log" 2>&1 || { tail -n 60 "$bld.build.log" >&2; die "opencv build failed for $abi"; }
        cmake --build "$bld" --target install >/dev/null
        mkdir -p "$WORK/android-sdk"
        cp -R "$bld/install/." "$WORK/android-sdk/"
    done
}

build_android() {
    local native out="$STAGE/opencv/android" abi
    if [[ "$FROM_SOURCE" == 1 ]]; then
        build_android_from_source
        native="$WORK/android-sdk/sdk/native"
    else
        fetch_zip android "$WORK/android"
        native="$WORK/android/opencv-mobile-$OPENCV_VERSION-android/sdk/native"
    fi
    [[ -d "$native/staticlibs" ]] || die "unexpected android package layout in $native"
    rm -rf "$out"
    mkdir -p "$out/staticlibs" "$out/3rdparty/libs" "$out/jni"
    cp -R "$native/jni/." "$out/jni/"
    cp -R "$native/jni/include" "$out/include"
    for abi in $(android_abis); do
        [[ -d "$native/staticlibs/$abi" ]] || die "ABI $abi missing from the opencv package"
        cp -R "$native/staticlibs/$abi" "$out/staticlibs/$abi"
        if [[ -d "$native/3rdparty/libs/$abi" ]]; then cp -R "$native/3rdparty/libs/$abi" "$out/3rdparty/libs/$abi"; fi
    done
    # drop the cmake config of the ABIs we do not ship
    for dir in "$out"/jni/abi-*; do
        abi="${dir##*/abi-}"
        if [[ " $(android_abis) " != *" $abi "* ]]; then rm -rf "$dir"; fi
    done
}

# ------------------------------------------------------------------------------------------
# Apple: opencv2.xcframework = ios + ios-simulator + mac-catalyst frameworks
# ------------------------------------------------------------------------------------------
# build_apple_framework <ios|simulator|catalyst> <dest dir>: builds <dest>/opencv2.framework from source
build_apple_framework() {
    local kind="$1" dest="$2" src="$WORK/source/opencv-mobile-$OPENCV_VERSION"
    local platform deploy archs arch extra=()
    case "$kind" in
        ios) platform=OS deploy="$OPENCV_IOS_MIN" archs="arm64" extra=(-DOPENCV_DISABLE_FILESYSTEM_SUPPORT=ON) ;;
        simulator) platform=SIMULATOR deploy="$OPENCV_IOS_MIN" archs="x86_64 arm64" extra=(-DOPENCV_DISABLE_FILESYSTEM_SUPPORT=ON) ;;
        catalyst) platform=MAC_CATALYST deploy="$OPENCV_CATALYST_MIN" archs="x86_64 arm64" ;;
    esac
    local opts libs=()
    read -r -a opts < <(tr '\n' ' ' <"$src/options.txt"; echo)
    for arch in $archs; do
        local bld="$src/build-$kind-$arch"
        log "[$kind/$arch] opencv-mobile $OPENCV_VERSION"
        cmake -S "$src" -B "$bld" \
            -DCMAKE_POLICY_VERSION_MINIMUM=3.5 -DCMAKE_TOOLCHAIN_FILE="$src/toolchains/ios.toolchain.cmake" \
            -DPLATFORM="$platform" -DDEPLOYMENT_TARGET="$deploy" -DENABLE_BITCODE=OFF -DENABLE_ARC=OFF -DENABLE_VISIBILITY=OFF \
            -DCMAKE_C_FLAGS="-fno-rtti -fno-exceptions" -DCMAKE_CXX_FLAGS="-fno-rtti -fno-exceptions" \
            -DCMAKE_INSTALL_PREFIX="$bld/install" -DCMAKE_BUILD_TYPE=Release -DARCHS="$arch" \
            "${opts[@]}" -DBUILD_opencv_world=ON "${extra[@]}" >"$bld.configure.log" 2>&1 \
            || { tail -n 40 "$bld.configure.log" >&2; die "opencv configure failed for $kind/$arch"; }
        # `ar @list` breaks on some macOS toolchains: fall back to archiving the object list by hand (as opencv-mobile's CI does)
        cmake --build "$bld" --parallel "$JOBS" >"$bld.build.log" 2>&1 || {
            # shellcheck disable=SC2046
            (cd "$bld/modules/world" && "$(xcrun -f ar)" qc ../../lib/libopencv_world.a $(cat world_objects.rsp) CMakeFiles/opencv_world.dir/src/world_init.cpp.o)
        }
        cmake --build "$bld" --target install >/dev/null
        local kleidi
        kleidi="$(find "$bld/install/lib" -name libkleidicv.a -print -quit)"
        if [[ -n "$kleidi" ]]; then # KleidiCV (arm64, opencv >= 4.14) is a separate 3rdparty archive: fold it in
            libtool -static "$bld/install/lib/libopencv_world.a" "$(dirname "$kleidi")"/libkleidicv*.a -o "$bld/install/lib/world_combined.a"
            mv "$bld/install/lib/world_combined.a" "$bld/install/lib/libopencv_world.a"
        fi
        libs+=("$bld/install/lib/libopencv_world.a")
    done
    local fw="$dest/opencv2.framework" headers_from
    rm -rf "$fw"
    mkdir -p "$fw/Versions/A/Headers" "$fw/Versions/A/Resources"
    ln -s A "$fw/Versions/Current"
    ln -s Versions/Current/Headers "$fw/Headers"
    ln -s Versions/Current/Resources "$fw/Resources"
    ln -s Versions/Current/opencv2 "$fw/opencv2"
    lipo -create "${libs[@]}" -o "$fw/Versions/A/opencv2"
    headers_from="$(dirname "$(dirname "${libs[0]}")")/include"
    for inc in "$headers_from/opencv5/opencv2" "$headers_from/opencv4/opencv2" "$headers_from/opencv2"; do
        if [[ -d "$inc" ]]; then cp -R "$inc/." "$fw/Versions/A/Headers/"; fi
    done
    cp "$src/Info.plist" "$fw/Versions/A/Resources/"
}

build_apple() {
    require_macos_tools
    require_cmd lipo
    local frameworks="$WORK/frameworks" out="$STAGE/opencv/ios"
    rm -rf "$frameworks"
    mkdir -p "$frameworks"
    if [[ "$FROM_SOURCE" == 1 ]]; then
        require_cmd cmake
        fetch_zip "" "$WORK/source"
        build_apple_framework ios "$frameworks/ios"
        build_apple_framework simulator "$frameworks/ios-simulator"
        build_apple_framework catalyst "$frameworks/mac-catalyst"
    else
        local kind
        for kind in ios ios-simulator mac-catalyst; do
            fetch_zip "$kind" "$frameworks/$kind"
        done
    fi
    rm -rf "$out/opencv2.xcframework"
    mkdir -p "$out"
    xcodebuild -create-xcframework \
        -framework "$frameworks/ios/opencv2.framework" \
        -framework "$frameworks/ios-simulator/opencv2.framework" \
        -framework "$frameworks/mac-catalyst/opencv2.framework" \
        -output "$out/opencv2.xcframework" >/dev/null
    local slices
    slices="$(find "$out/opencv2.xcframework" -maxdepth 1 -type d -name '*-*' -exec basename {} \; | sort | tr '\n' ' ')"
    log "opencv2.xcframework slices: $slices"
    [[ "$slices" == *maccatalyst* && "$slices" == *simulator* ]] || die "xcframework misses the simulator or maccatalyst slice"
}

case "$PLATFORM" in
    android) build_android ;;
    ios) build_apple ;;
esac
printf 'opencv=%s\nopencv-mobile=%s\nsource=%s\nplatform=%s\n' "$OPENCV_VERSION" "$TAG" "$([[ $FROM_SOURCE == 1 ]] && echo source || echo prebuilt)" "$PLATFORM" >"$STAGE/opencv/VERSION.$PLATFORM"
log "done: $STAGE/opencv"
