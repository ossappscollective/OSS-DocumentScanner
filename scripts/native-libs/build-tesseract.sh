#!/usr/bin/env bash
# Build tesseract + leptonica + libpng (+ libjpeg-turbo on Android) as static libraries.
#
# usage: build-tesseract.sh <tesseract_version> <android|ios|catalyst> [--variant release|debug]
#   android  : arm64-v8a armeabi-v7a x86_64 (NATIVE_LIBS_ANDROID_ABIS), needs ANDROID_NDK_HOME
#   ios      : iphoneos arm64 + iphonesimulator arm64/x86_64 -> libX-ios.a, libX-sim.a
#   catalyst : Mac Catalyst (macabi) arm64 + x86_64          -> libX-catalyst.a
#
#   --variant release (default): -O3, stripped, small.
#   --variant debug            : -O1 -g -fno-omit-frame-pointer, asserts on, NOT stripped, same file names
#                                (output in <platform>-debug/, extract it over the release one to debug into tesseract).
#                                Not -O0: tesseract's LSTM engine becomes unusably slow without optimisation.
#
# Result is written to $NATIVE_LIBS_OUT/<platform>/tesseract/{android,ios}/ (default build/native-libs/out),
# with the same layout the app already uses (see scripts/native-libs/README.md). The dependency
# versions (leptonica, libpng, libjpeg-turbo) come from the TESSERACT_<ver>_* pins in versions.env.
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
[[ ${#args[@]} -eq 2 ]] || die "usage: $0 <tesseract_version> <android|ios|catalyst> [--variant release|debug]"
TESS_VERSION="${args[0]}"
PLATFORM="${args[1]}"
variant_suffix "$VARIANT" >/dev/null
case "$PLATFORM" in android | ios | catalyst) ;; *) die "unknown platform '$PLATFORM'" ;; esac
require_cmd cmake
require_cmd curl

LEPT_VERSION="$(pin_get TESSERACT "$TESS_VERSION" LEPTONICA)"
PNG_VERSION="$(pin_get TESSERACT "$TESS_VERSION" LIBPNG)"
JPEG_VERSION="$(pin_get TESSERACT "$TESS_VERSION" LIBJPEG_TURBO)"
[[ -n "$LEPT_VERSION" && -n "$PNG_VERSION" && -n "$JPEG_VERSION" ]] \
    || die "tesseract $TESS_VERSION has no dependency pins in versions.env (TESSERACT_$(version_key "$TESS_VERSION")_{LEPTONICA,LIBPNG,LIBJPEG_TURBO})"
log "tesseract $TESS_VERSION (leptonica $LEPT_VERSION, libpng $PNG_VERSION, libjpeg-turbo $JPEG_VERSION) for $PLATFORM, $VARIANT"

SRC="$NATIVE_LIBS_WORK/src"
WORK="$NATIVE_LIBS_WORK/tesseract-$TESS_VERSION/$PLATFORM$(variant_suffix "$VARIANT")"
STAGE="$(stage_dir "$PLATFORM" "$VARIANT")"

fetch_source() { # fetch_source <name> <url> <version> <sha-key>
    local archive="$NATIVE_LIBS_DL/$1-$3.tar.gz" sha_var="SHA256_$4"
    download "$2" "$archive" "${!sha_var:-}"
    extract_tarball "$archive" "$SRC/$1-$3"
}
fetch_source tesseract "https://github.com/tesseract-ocr/tesseract/archive/refs/tags/$TESS_VERSION.tar.gz" "$TESS_VERSION" "tesseract_$(version_key "$TESS_VERSION")"
fetch_source leptonica "https://github.com/DanBloomberg/leptonica/archive/refs/tags/$LEPT_VERSION.tar.gz" "$LEPT_VERSION" "leptonica_$(version_key "$LEPT_VERSION")"
fetch_source libpng "https://github.com/pnggroup/libpng/archive/refs/tags/v$PNG_VERSION.tar.gz" "$PNG_VERSION" "libpng_$(version_key "$PNG_VERSION")"
if [[ "$PLATFORM" == android ]]; then
    fetch_source libjpeg-turbo "https://github.com/libjpeg-turbo/libjpeg-turbo/archive/refs/tags/$JPEG_VERSION.tar.gz" "$JPEG_VERSION" "libjpeg_turbo_$(version_key "$JPEG_VERSION")"
fi
TESS_SRC="$SRC/tesseract-$TESS_VERSION"
LEPT_SRC="$SRC/leptonica-$LEPT_VERSION"
PNG_SRC="$SRC/libpng-$PNG_VERSION"
JPEG_SRC="$SRC/libjpeg-turbo-$JPEG_VERSION"

# --- cmake helpers ---------------------------------------------------------------------------
# The debug variant keeps CMAKE_BUILD_TYPE=Release (same install names/targets) and only swaps the
# Release flags: -O1 keeps the code steppable but fast enough for OCR, -UNDEBUG so assert() stays live (the NDK toolchain adds -DNDEBUG on its own).
VARIANT_FLAGS=()
if [[ "$VARIANT" == debug ]]; then
    VARIANT_FLAGS=("-DCMAKE_C_FLAGS_RELEASE=-O1 -g -fno-omit-frame-pointer -UNDEBUG" "-DCMAKE_CXX_FLAGS_RELEASE=-O1 -g -fno-omit-frame-pointer -UNDEBUG")
fi
# TOOLCHAIN_ARGS is filled per target (android abi / apple sdk+arch) before calling build_stack
TOOLCHAIN_ARGS=()

# cmake_build <src> <build dir> <prefix> [cmake args...] ; libs are installed into <prefix>
cmake_build() {
    local src="$1" bld="$2" prefix="$3"
    shift 3
    cmake -S "$src" -B "$bld" \
        -DCMAKE_BUILD_TYPE=Release ${VARIANT_FLAGS[@]+"${VARIANT_FLAGS[@]}"} \
        -DBUILD_SHARED_LIBS=OFF \
        -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
        -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
        -DCMAKE_INSTALL_PREFIX="$prefix" \
        "${TOOLCHAIN_ARGS[@]}" "$@" >"$bld.configure.log" 2>&1 \
        || { tail -n 40 "$bld.configure.log" >&2; die "cmake configure failed for $src (log: $bld.configure.log)"; }
    cmake --build "$bld" --parallel "$JOBS" ${BUILD_TARGET:+--target "$BUILD_TARGET"} >"$bld.build.log" 2>&1 \
        || { tail -n 60 "$bld.build.log" >&2; die "cmake build failed for $src (log: $bld.build.log)"; }
}
cmake_install() { cmake --install "$1" >/dev/null; }

# build_stack <label> <ABI-or-arch used for CMAKE_SYSTEM_PROCESSOR hint, may be empty>
# Builds libpng, [libjpeg-turbo], leptonica and tesseract into $WORK/<label>/prefix
build_stack() {
    local label="$1" root="$WORK/$1"
    local prefix="$root/prefix"
    rm -rf "$root"
    mkdir -p "$root" "$prefix"
    log "[$label] libpng $PNG_VERSION"
    cmake_build "$PNG_SRC" "$root/png" "$prefix" \
        -DPNG_SHARED=OFF -DPNG_STATIC=ON -DPNG_TESTS=OFF -DPNG_TOOLS=OFF -DPNG_FRAMEWORK=OFF
    cmake_install "$root/png"

    if [[ "$PLATFORM" == android ]]; then
        log "[$label] libjpeg-turbo $JPEG_VERSION"
        # x86 SIMD needs nasm/yasm (the NDK's yasm is an x86 binary, unusable on Apple Silicon); leptonica
        # is built without jpeg anyway, libjpeg is only shipped because the app links it
        local jpeg_simd=()
        if [[ "$label" == x86* ]]; then jpeg_simd=(-DWITH_SIMD=OFF); fi
        cmake_build "$JPEG_SRC" "$root/jpeg" "$prefix" \
            -DENABLE_SHARED=OFF -DENABLE_STATIC=ON -DWITH_TURBOJPEG=OFF -DWITH_JAVA=OFF "${jpeg_simd[@]}"
        cmake_install "$root/jpeg"
    fi

    log "[$label] leptonica $LEPT_VERSION"
    cmake_build "$LEPT_SRC" "$root/lept" "$prefix" \
        -DSW_BUILD=OFF -DBUILD_PROG=OFF \
        -DENABLE_ZLIB=ON -DENABLE_PNG=ON \
        -DENABLE_GIF=OFF -DENABLE_JPEG=OFF -DENABLE_TIFF=OFF -DENABLE_WEBP=OFF -DENABLE_OPENJPEG=OFF \
        -DPNG_LIBRARY="$prefix/lib/libpng16.a" -DPNG_PNG_INCLUDE_DIR="$prefix/include"
    cmake_install "$root/lept"

    log "[$label] tesseract $TESS_VERSION"
    # LEPT_TIFF_RESULT: answer of a try_run() that cannot run when cross-compiling (1 = no TIFF in leptonica)
    local extra=(-DOPENMP_BUILD=OFF)
    if [[ "$PLATFORM" == android ]]; then
        extra=(-DOPENMP_BUILD=ON -DCpuFeaturesNdkCompat_DIR="$WORK/cpufeatures-$1/lib/cmake/CpuFeaturesNdkCompat")
    fi
    BUILD_TARGET=libtesseract cmake_build "$TESS_SRC" "$root/tess" "$prefix" \
        -DSW_BUILD=OFF -DBUILD_TRAINING_TOOLS=OFF -DBUILD_TESTS=OFF -DINSTALL_CONFIGS=OFF \
        -DDISABLE_TIFF=ON -DDISABLE_ARCHIVE=ON -DDISABLE_CURL=ON \
        -DLEPT_TIFF_RESULT=1 \
        -DGRAPHICS_DISABLED=ON -DFAST_FLOAT=ON \
        -DLeptonica_DIR="$prefix/lib/cmake/leptonica" "${extra[@]}"
    cp "$root/tess/libtesseract.a" "$prefix/lib/libtesseract.a"
    mkdir -p "$prefix/include/tesseract"
    cp "$TESS_SRC"/include/tesseract/*.h "$root/tess/include/tesseract/version.h" "$prefix/include/tesseract/"
}

copy_headers() { # copy_headers <prefix> <dest include dir>
    local prefix="$1" dest="$2"
    rm -rf "$dest"
    mkdir -p "$dest/libpng16"
    cp -R "$prefix/include/tesseract" "$prefix/include/leptonica" "$dest/"
    cp "$prefix"/include/png.h "$prefix"/include/pngconf.h "$prefix"/include/pnglibconf.h "$dest/"
    cp "$prefix"/include/libpng16/*.h "$dest/libpng16/" 2>/dev/null || cp "$dest"/png*.h "$dest/libpng16/"
}

# --- android ---------------------------------------------------------------------------------
build_android() {
    require_android_ndk
    local ndk="$ANDROID_NDK_HOME" abi out="$STAGE/tesseract/android"
    local host_tag strip_bin
    host_tag="$(ls "$ndk/toolchains/llvm/prebuilt")"
    strip_bin="$ndk/toolchains/llvm/prebuilt/$host_tag/bin/llvm-strip"
    rm -rf "$out"
    mkdir -p "$out/staticlibs"
    for abi in $(android_abis); do
        TOOLCHAIN_ARGS=(
            -DCMAKE_TOOLCHAIN_FILE="$ndk/build/cmake/android.toolchain.cmake"
            -DANDROID_ABI="$abi" -DANDROID_PLATFORM="android-$NATIVE_LIBS_ANDROID_API"
            -DANDROID_STL=c++_shared -DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON
            -DCMAKE_FIND_ROOT_PATH_MODE_PACKAGE=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_INCLUDE=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_LIBRARY=BOTH
        )
        if [[ "$abi" == armeabi-v7a ]]; then TOOLCHAIN_ARGS+=(-DANDROID_ARM_NEON=ON); fi
        make_cpufeatures_shim "$abi" "$WORK/cpufeatures-$abi"
        build_stack "$abi"
        local prefix="$WORK/$abi/prefix" lib="$out/staticlibs/$abi"
        mkdir -p "$lib"
        cp "$prefix/lib/libleptonica.a" "$prefix/lib/libjpeg.a" "$lib/"
        cp "$prefix/lib/libpng16.a" "$lib/libpngx.a"
        # tesseract needs the NDK cpu-features helpers: fold them into libtesseract.a so the app
        # keeps linking `tesseract leptonica pngx jpeg` only
        merge_archives "$ndk/toolchains/llvm/prebuilt/$host_tag/bin/llvm-ar" "$lib/libtesseract.a" \
            "$prefix/lib/libtesseract.a" "$WORK/cpufeatures-$abi/lib/libndk_compat.a"
        if [[ "$VARIANT" == release ]]; then "$strip_bin" --strip-debug "$lib"/*.a; fi
        if [[ ! -d "$out/include" ]]; then copy_headers "$prefix" "$out/include"; fi
    done
}

# NDK ships cpu-features.c; tesseract's CMake wants it through find_package(CpuFeaturesNdkCompat)
make_cpufeatures_shim() { # make_cpufeatures_shim <abi> <dir>
    local abi="$1" dir="$2" ndk="$ANDROID_NDK_HOME" cpuf
    cpuf="$ndk/sources/android/cpufeatures"
    [[ -f "$cpuf/cpu-features.c" ]] || die "NDK cpu-features.c not found in $cpuf"
    rm -rf "$dir"
    mkdir -p "$dir/lib/cmake/CpuFeaturesNdkCompat" "$dir/include/ndk_compat" "$dir/build"
    cp "$cpuf/cpu-features.h" "$dir/include/ndk_compat/"
    cat >"$dir/build/CMakeLists.txt" <<CMAKE
cmake_minimum_required(VERSION 3.14)
project(ndk_compat C)
add_library(ndk_compat STATIC $cpuf/cpu-features.c)
target_compile_definitions(ndk_compat PRIVATE _GNU_SOURCE)
target_link_libraries(ndk_compat PUBLIC dl)
CMAKE
    cmake -S "$dir/build" -B "$dir/build/b" -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_TOOLCHAIN_FILE="$ndk/build/cmake/android.toolchain.cmake" -DANDROID_ABI="$abi" \
        -DANDROID_PLATFORM="android-$NATIVE_LIBS_ANDROID_API" -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY="$dir/lib" \
        >"$dir/build/configure.log" 2>&1 && cmake --build "$dir/build/b" >"$dir/build/build.log" 2>&1 \
        || die "cpu-features shim failed for $abi (see $dir/build)"
    cat >"$dir/lib/cmake/CpuFeaturesNdkCompat/CpuFeaturesNdkCompatConfig.cmake" <<CMAKE
if(NOT TARGET CpuFeatures::ndk_compat)
  add_library(CpuFeatures::ndk_compat STATIC IMPORTED)
  set_target_properties(CpuFeatures::ndk_compat PROPERTIES
    IMPORTED_LOCATION "\${CMAKE_CURRENT_LIST_DIR}/../../libndk_compat.a")
endif()
CMAKE
}

merge_archives() { # merge_archives <llvm-ar> <out.a> <in.a>...
    local ar_bin="$1" out="$2" mri
    shift 2
    mri="$(mktemp)"
    { echo "CREATE $out"; for a in "$@"; do echo "ADDLIB $a"; done; echo "SAVE"; echo "END"; } >"$mri"
    "$ar_bin" -M <"$mri"
    rm -f "$mri"
}

# --- apple -----------------------------------------------------------------------------------
# apple_toolchain <ios|sim|catalyst> <arch>
apple_toolchain() {
    local kind="$1" arch="$2" sdk
    TOOLCHAIN_ARGS=(-DCMAKE_TRY_COMPILE_TARGET_TYPE=STATIC_LIBRARY -DCMAKE_SYSTEM_PROCESSOR="$arch")
    case "$kind" in
        ios)
            TOOLCHAIN_ARGS+=(-DCMAKE_SYSTEM_NAME=iOS -DCMAKE_OSX_SYSROOT=iphoneos -DCMAKE_OSX_ARCHITECTURES="$arch"
                -DCMAKE_OSX_DEPLOYMENT_TARGET="$NATIVE_LIBS_IOS_MIN")
            ;;
        sim)
            TOOLCHAIN_ARGS+=(-DCMAKE_SYSTEM_NAME=iOS -DCMAKE_OSX_SYSROOT=iphonesimulator -DCMAKE_OSX_ARCHITECTURES="$arch"
                -DCMAKE_OSX_DEPLOYMENT_TARGET="$NATIVE_LIBS_IOS_MIN")
            ;;
        catalyst)
            # Mac Catalyst is "macOS SDK + ios-macabi target": CMake has no native mode for it, so the
            # target triple does the job. CMAKE_OSX_ARCHITECTURES must match it (otherwise CMake adds
            # the host arch with -arch), CMAKE_OSX_DEPLOYMENT_TARGET stays unset (-mmacosx-version-min
            # would fight with -target).
            sdk="$(xcrun --sdk macosx --show-sdk-path)"
            local triple="$arch-apple-ios$NATIVE_LIBS_CATALYST_MIN-macabi"
            # CMAKE_SYSTEM_NAME=Darwin forces cross-compiling mode, which keeps the CMAKE_SYSTEM_PROCESSOR
            # given above (else it is reset to the host cpu and tesseract picks NEON for x86_64).
            TOOLCHAIN_ARGS+=(-DCMAKE_SYSTEM_NAME=Darwin -DCMAKE_OSX_SYSROOT="$sdk" -DCMAKE_OSX_ARCHITECTURES="$arch"
                "-DCMAKE_C_FLAGS=-target $triple" "-DCMAKE_CXX_FLAGS=-target $triple" "-DCMAKE_ASM_FLAGS=-target $triple"
                "-DCMAKE_EXE_LINKER_FLAGS=-target $triple" "-DCMAKE_MODULE_LINKER_FLAGS=-target $triple")
            ;;
    esac
}

# thin_libs <prefix> <dest dir> <suffix-tag> <label>: copy + strip the three libs of one slice
collect_slice() {
    local prefix="$1" dest="$2" label="$3"
    mkdir -p "$dest"
    for lib in tesseract leptonica png16; do
        cp "$prefix/lib/lib$lib.a" "$dest/lib$lib-$label.a"
        if [[ "$VARIANT" == release ]]; then strip -S "$dest/lib$lib-$label.a" 2>/dev/null || true; fi
    done
}

# fat_libs <out dir> <label> <thin dir>...  : lipo the per-arch dirs into libX-<label>.a
fat_libs() {
    local out="$1" label="$2"
    shift 2
    mkdir -p "$out"
    for lib in tesseract leptonica png16; do
        local inputs=()
        for dir in "$@"; do inputs+=("$dir/lib$lib-$label.a"); done
        if [[ ${#inputs[@]} -eq 1 ]]; then cp "${inputs[0]}" "$out/lib$lib-$label.a"; else lipo -create "${inputs[@]}" -output "$out/lib$lib-$label.a"; fi
    done
    ln -sf "libpng16-$label.a" "$out/libpng-$label.a"
}

# verify_slices <lib.a> <expected archs, space separated> <expected vtool platform or empty>
verify_slices() {
    local lib="$1" archs="$2" platform="${3:-}" got arch tmp
    got="$(lipo -archs "$lib")"
    [[ " $(printf '%s\n' $got | sort | tr '\n' ' ')" == " $(printf '%s\n' $archs | sort | tr '\n' ' ')" ]] \
        || die "$lib has archs '$got', expected '$archs'"
    [[ -z "$platform" ]] && return 0
    tmp="$(mktemp -d)"
    for arch in $archs; do
        if [[ "$(lipo -archs "$lib" | wc -w)" -eq 1 ]]; then cp "$lib" "$tmp/thin.a"; else lipo "$lib" -thin "$arch" -output "$tmp/thin.a"; fi
        (cd "$tmp" && rm -f ./*.o && ar x thin.a && vtool -show-build "$(ls ./*.o | head -n1)" | grep -q "platform $platform") \
            || { rm -rf "$tmp"; die "$lib ($arch) is not built for platform $platform"; }
    done
    rm -rf "$tmp"
}

write_modulemap() {
    cat >"$1/module.modulemap" <<'MAP'
module libtesseract {
    header "tesseract/capi.h"
    export *
}

module libleptonica {
    header "leptonica/allheaders.h"
    export *
}
MAP
}

build_apple() {
    require_macos_tools
    require_cmd lipo
    local out="$STAGE/tesseract/ios" thin="$WORK/thin"
    rm -rf "$out" "$thin"
    mkdir -p "$out/lib"
    if [[ "$PLATFORM" == ios ]]; then
        apple_toolchain ios arm64
        build_stack ios-arm64
        collect_slice "$WORK/ios-arm64/prefix" "$thin/ios-arm64" ios
        fat_libs "$out/lib" ios "$thin/ios-arm64"
        copy_headers "$WORK/ios-arm64/prefix" "$out/include"
        write_modulemap "$out/include"
        local sim_dirs=()
        for arch in arm64 x86_64; do
            apple_toolchain sim "$arch"
            build_stack "sim-$arch"
            collect_slice "$WORK/sim-$arch/prefix" "$thin/sim-$arch" sim
            sim_dirs+=("$thin/sim-$arch")
        done
        fat_libs "$out/lib" sim "${sim_dirs[@]}"
        verify_slices "$out/lib/libtesseract-ios.a" "arm64" IOS
        verify_slices "$out/lib/libtesseract-sim.a" "arm64 x86_64" IOSSIMULATOR
    else
        local cat_dirs=()
        for arch in arm64 x86_64; do
            apple_toolchain catalyst "$arch"
            build_stack "catalyst-$arch"
            collect_slice "$WORK/catalyst-$arch/prefix" "$thin/catalyst-$arch" catalyst
            cat_dirs+=("$thin/catalyst-$arch")
        done
        fat_libs "$out/lib" catalyst "${cat_dirs[@]}"
        for lib in tesseract leptonica png16; do verify_slices "$out/lib/lib$lib-catalyst.a" "arm64 x86_64" MACCATALYST; done
        copy_headers "$WORK/catalyst-arm64/prefix" "$out/include"
        write_modulemap "$out/include"
    fi
}

case "$PLATFORM" in
    android) build_android ;;
    ios | catalyst) build_apple ;;
esac

printf 'tesseract=%s\nleptonica=%s\nlibpng=%s\nlibjpeg-turbo=%s\nplatform=%s\nvariant=%s\n' \
    "$TESS_VERSION" "$LEPT_VERSION" "$PNG_VERSION" "$JPEG_VERSION" "$PLATFORM" "$VARIANT" >"$STAGE/tesseract/VERSION.$PLATFORM"
log "done: $STAGE/tesseract"
