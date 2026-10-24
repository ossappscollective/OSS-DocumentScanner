#!/usr/bin/env bash
# Shared helpers for scripts/native-libs. Source it, do not execute it.
set -euo pipefail

NL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$NL_DIR/../.." && pwd)"
# shellcheck source=../versions.env
source "$NL_DIR/versions.env"

# Everything lives under build/ (gitignored). Nothing is ever written into opencv/ or tesseract/
# by the build scripts: results go to $NATIVE_LIBS_OUT/<stage>/{opencv,tesseract}/...
NATIVE_LIBS_OUT="${NATIVE_LIBS_OUT:-$REPO_ROOT/build/native-libs/out}"
NATIVE_LIBS_WORK="${NATIVE_LIBS_WORK:-$REPO_ROOT/build/native-libs/work}"
NATIVE_LIBS_DL="${NATIVE_LIBS_DL:-$REPO_ROOT/build/native-libs/downloads}"
JOBS="${JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)}"

log() { printf '\033[1;34m[native-libs]\033[0m %s\n' "$*" >&2; }
warn() { printf '\033[1;33m[native-libs] warning:\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m[native-libs] error:\033[0m %s\n' "$*" >&2; exit 1; }

# "4.13.0" -> "4_13_0"
version_key() { printf '%s' "$1" | tr -c 'A-Za-z0-9' '_'; }

# pin_get <PREFIX> <version> [SUFFIX] -> value of PREFIX_<version>[_SUFFIX], empty if unset
pin_get() {
    local key name
    key="$(version_key "$2")"
    name="$1_${key}${3:+_$3}"
    printf '%s' "${!name:-}"
}

sha256_of() {
    if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# download <url> <dest> [expected_sha256]
download() {
    local url="$1" dest="$2" expected="${3:-}"
    mkdir -p "$(dirname "$dest")"
    if [[ ! -s "$dest" ]]; then
        log "download $url"
        curl -fL --retry 3 --retry-delay 2 -sS -o "$dest.part" "$url"
        mv "$dest.part" "$dest"
    fi
    local actual
    actual="$(sha256_of "$dest")"
    if [[ -n "$expected" ]]; then
        [[ "$actual" == "$expected" ]] || { rm -f "$dest"; die "sha256 mismatch for $url (expected $expected, got $actual)"; }
    else
        warn "no pinned sha256 for $(basename "$dest"), got $actual (add it to versions.env)"
    fi
}

# extract_tarball <archive> <dest_dir>  (strips the top level directory)
extract_tarball() {
    local archive="$1" dest="$2"
    if [[ -d "$dest" ]]; then return 0; fi
    mkdir -p "$dest.tmp"
    tar -xzf "$archive" -C "$dest.tmp" --strip-components=1
    mv "$dest.tmp" "$dest"
}

# stage_dir <android|ios|catalyst> [release|debug] -> where the packaged tree of a platform is assembled
stage_dir() { printf '%s/%s%s' "$NATIVE_LIBS_OUT" "$1" "$(variant_suffix "${2:-release}")"; }

# variant_suffix <release|debug> -> "" or "-debug" (suffix of stage dirs and archive names)
variant_suffix() {
    case "$1" in
        release) ;;
        debug) printf -- '-debug' ;;
        *) die "unknown variant '$1' (release|debug)" ;;
    esac
}

android_abis() { printf '%s' "${NATIVE_LIBS_ANDROID_ABIS:-$NATIVE_LIBS_ANDROID_ABIS_DEFAULT}"; }

require_android_ndk() {
    ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-${ANDROID_NDK_ROOT:-${ANDROID_NDK_LATEST_HOME:-}}}"
    [[ -n "$ANDROID_NDK_HOME" && -f "$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake" ]] \
        || die "ANDROID_NDK_HOME must point to an Android NDK (got '${ANDROID_NDK_HOME:-}')"
    export ANDROID_NDK_HOME
}

require_macos_tools() {
    [[ "$(uname -s)" == "Darwin" ]] || die "Apple builds need macOS with Xcode"
    command -v xcrun >/dev/null || die "xcrun not found, install Xcode"
}

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }
