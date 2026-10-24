# Native libraries (OpenCV, Tesseract)

Reproducible build of the C++ libraries `plugin-nativeprocessor` links, for **Android**, **iOS (device + simulator)** and **Mac Catalyst**.
The result is installed in `opencv/` and `tesseract/` at the repo root (both gitignored), exactly where the Android CMake and the iOS `build.xcconfig` look for it.

## What is built

| Library                                | Source                                                               | Used for              |
| -------------------------------------- | -------------------------------------------------------------------- | --------------------- |
| OpenCV (core, imgproc, photo, features2d, video, highgui) | [nihui/opencv-mobile](https://github.com/nihui/opencv-mobile) (stripped OpenCV, same flavour as the libs the app always used) | document detection / image processing |
| Tesseract                              | `tesseract-ocr/tesseract` tag                                        | OCR                   |
| Leptonica, libpng                      | pinned per tesseract version in `versions.env`                       | tesseract dependencies |
| libjpeg-turbo (Android only)           | pinned per tesseract version                                         | linked by `CMakeLists.txt` (`jpeg`), not used by leptonica |

OpenCV on Android and iOS/Catalyst comes from **opencv-mobile** because that is what the app ships today (`opencv/ios/opencv2.xcframework` is the opencv-mobile "apple" package, `opencv/android` its `sdk/native`).
Default mode repackages the prebuilt opencv-mobile release assets (checksum pinned). `--from-source` / `OPENCV_FROM_SOURCE=1` rebuilds them from the opencv-mobile source zip with the same cmake options as their CI.

## Versions

Everything is selected by version number, pins live in [`versions.env`](versions.env):

- `OPENCV_MOBILE_TAG_<opencv ver>`: opencv-mobile release carrying that OpenCV (4.13.0 -> `v35`). Unpinned versions are looked up through `gh` (and a warning tells you what to pin).
- `TESSERACT_<tesseract ver>_{LEPTONICA,LIBPNG,LIBJPEG_TURBO}`: dependency set of a tesseract version (5.5.1 -> leptonica 1.85.0, libpng 1.6.48, libjpeg-turbo 3.1.4.1; these match the libs currently in `tesseract/ios`).
- `SHA256_*`: optional archive checksums, verified when present (the script prints the checksum of unpinned downloads).
- Android: NDK `NATIVE_LIBS_NDK_VERSION`, API 24 (plugin `minSdkVersion`), ABIs `arm64-v8a armeabi-v7a x86_64` (override with `NATIVE_LIBS_ANDROID_ABIS="arm64-v8a armeabi-v7a x86 x86_64"`).
- Apple: iOS/Catalyst deployment target 16.0 (`NATIVE_LIBS_IOS_MIN`, `NATIVE_LIBS_CATALYST_MIN`).

To add a version: add the pins to `versions.env`, nothing else.

## Getting the libs

**Download a published build** (needs a release `native-libs-<opencv>-<tesseract>`, see below):

```sh
scripts/native-libs/fetch.sh 4.13.0 5.5.1 all        # or android | ios | catalyst
scripts/native-libs/fetch.sh 4.13.0 5.5.1 all --variant both   # + debug tesseract on top (release | debug | both)
```

It extracts into the repo root (`opencv/...`, `tesseract/...`), overwriting `opencv/ios/opencv2.xcframework` and the libs of the selected platforms. Use `--dest <dir>` to extract elsewhere, `--dry-run` to only print the URLs.

**Build locally**:

```sh
export ANDROID_NDK_HOME=~/Library/Android/sdk/ndk/27.3.13750724   # android only
scripts/native-libs/build.sh 4.13.0 5.5.1 ios catalyst            # android | ios | catalyst | all
scripts/native-libs/build.sh 4.13.0 5.5.1 catalyst --variant debug # release (default) | debug | both
```

Needs `cmake`, `curl`, `unzip`, Xcode for ios/catalyst. Output goes to `build/native-libs/out/<platform>/{opencv,tesseract}` and to `build/native-libs/out/native-libs-<platform>-opencv<ov>-tesseract<tv>.tar.gz`, it never touches `opencv/` or `tesseract/`.
Copy it over with `tar -xzf build/native-libs/out/native-libs-ios-*.tar.gz -C .`.
Each step is also available alone: `build-opencv.sh <ver> <android|ios> [--from-source]`, `build-tesseract.sh <ver> <android|ios|catalyst> [--variant release|debug]`, `package.sh ... [--variant ...]`.
`NATIVE_LIBS_OUT`, `NATIVE_LIBS_WORK`, `NATIVE_LIBS_DL` relocate the output / work / download dirs.

**CI**: run the `build-native-libs` workflow (Actions tab, `workflow_dispatch`) with `opencv_version`, `tesseract_version`, `platforms` (`all|android|ios|catalyst`), `variant` (`release|debug|both`), `opencv_from_source` and `release`.
Jobs run on `ubuntu-latest` (Android) and `macos-15` (iOS, Catalyst), results are cached by version + script hash and uploaded as artifacts `native-libs-<platform>-opencv<ver>-tesseract<ver>`.
With `release` on, the archives (and `.sha256`) are attached to the pre-release tag `native-libs-<opencv>-<tesseract>`, which is what `fetch.sh` downloads.

## Layout produced

```
opencv/android/{include,jni,staticlibs/<abi>,3rdparty/libs/<abi>}      # opencv-mobile sdk/native
opencv/ios/opencv2.xcframework                                          # ios-arm64, ios-arm64_x86_64-simulator, ios-arm64_x86_64-maccatalyst
tesseract/android/include/{tesseract,leptonica,png*.h}
tesseract/android/staticlibs/<abi>/{libtesseract,libleptonica,libpngx,libjpeg}.a
tesseract/ios/include/{tesseract,leptonica,libpng16,png*.h,module.modulemap}
tesseract/ios/lib/lib{tesseract,leptonica,png16}-{ios,sim,catalyst}.a   # + libpng-<x>.a symlinks
```

Release assets are split per platform; paths inside are relative to the repo root:

- `native-libs-android-...tar.gz`: opencv/android + tesseract/android
- `native-libs-ios-...tar.gz`: **the whole opencv2.xcframework (ios + simulator + maccatalyst)**, tesseract `-ios` and `-sim` libs, headers
- `native-libs-catalyst-...tar.gz`: tesseract `-catalyst` libs only (and the same headers)
- `native-libs-<platform>-...-debug.tar.gz`: the debug variant, see below (tesseract only, no OpenCV)

So a Mac Catalyst build needs both the `ios` and `catalyst` archives (`fetch.sh <ov> <tv> all`).

## Release and debug variants

Tesseract, leptonica, libpng and libjpeg are built in two variants (OpenCV has none, it comes from opencv-mobile):

| | release (default) | debug |
| --- | --- | --- |
| flags | `-O3 -DNDEBUG`, stripped | `-O1 -g -fno-omit-frame-pointer -UNDEBUG`, **not stripped** |
| output stage | `build/native-libs/out/<platform>/` | `build/native-libs/out/<platform>-debug/` |
| archive | `native-libs-<platform>-opencv<ov>-tesseract<tv>.tar.gz` | `native-libs-<platform>-opencv<ov>-tesseract<tv>-debug.tar.gz` (+ `.sha256`) |
| size (tesseract lib only) | Catalyst 11MB (2 arches), Android arm64 8MB | Catalyst 245MB, Android arm64 100MB (archives 65MB / 71MB) |

Why `-O1` and not `-O0`: tesseract's LSTM engine is unusably slow unoptimised (pages take minutes). `-O1 -g` keeps functions steppable with locals mostly visible (lldb shows `[opt]`, some variables are optimised out) while OCR stays usable. `-fno-omit-frame-pointer` gives reliable backtraces and `ndk-stack`/Instruments sampling, `-UNDEBUG` keeps `assert()` live. For a particular file you can still drop to `-O0` by hand.

The debug archive has **exactly the same file names and layout** as the release one (only `tesseract/...`, no `opencv/...`), so it is extracted over it, no build file change needed:

```sh
scripts/native-libs/fetch.sh 4.13.0 5.5.1 all --variant both   # or --variant debug on top of an installed release
```

and to go back, extract the release archive again (`fetch.sh ... all`). Then rebuild the app.

- **iOS / Catalyst**: DWARF stays inside the static library objects (no dSYM for a `.a`); the app binary's debug map points to the `.a`, so lldb finds it as long as `tesseract/ios/lib/*.a` stays where it is. Breakpoints like `b tesseract::TessBaseAPI::Version` resolve to `baseapi.cpp:191` (verified on Catalyst arm64).
- **Android**: the `.a` carry the DWARF into the unstripped `libdocument_detector.so` of the CMake build tree (`build/intermediates/cxx/.../obj/<abi>/`), which is what Android Studio's native debugger and `ndk-stack -sym` want. The APK copy is stripped by Gradle unless you add `packaging { jniLibs { keepDebugSymbols += "**/libdocument_detector.so" } }`.
- Source paths in the DWARF are those of the machine that built it (`<repo>/build/native-libs/work/src/tesseract-<ver>/...` locally, the runner's workspace for CI archives). Point the debugger at the sources with `settings set target.source-map <old> <new>` (lldb) or the path mapping of Android Studio; local debug builds need nothing.
- Wiring in the app: none required (same names, extract over). If a permanent switch is wanted later, the smallest change would be a `tesseract/<platform>/lib-debug` directory chosen in `build.xcconfig` with `LIBRARY_SEARCH_PATHS[config=Debug]` (iOS) and a `-DTESSERACT_VARIANT=debug` CMake option selecting `staticlibs-debug` (Android); it is not implemented, so as not to touch the plugin files for something extract-over already does.

## How Catalyst consumes it

- **OpenCV**: `plugin-nativeprocessor/platforms/ios/opencv2.xcframework` is a symlink to `opencv/ios/opencv2.xcframework`; Xcode picks the `ios-arm64_x86_64-maccatalyst` slice by itself.
- **Tesseract**: `plugin-nativeprocessor/platforms/ios/build.xcconfig` selects the libs by SDK, the Catalyst build uses the `macosx` SDK:

  ```
  OTHER_LDFLAGS[sdk=iphoneos*]        = -lleptonica-ios -lpng16-ios -ltesseract-ios
  OTHER_LDFLAGS[sdk=iphonesimulator*] = -ltesseract-sim -lpng16-sim -lleptonica-sim
  OTHER_LDFLAGS[sdk=macosx*]          = -ltesseract-catalyst -lpng16-catalyst -lleptonica-catalyst
  ```

  `build-tesseract.sh catalyst` builds the three libs for real with `-target <arm64|x86_64>-apple-ios16.0-macabi` against the macOS SDK and `lipo`s them into one fat `lib*-catalyst.a`. The script checks with `vtool` that every object is tagged `MACCATALYST` (this replaces the old workaround that retagged macOS objects with `vtool`/`ld -r`, which only produced arm64 and no x86_64).
- `libtesseract-macos.a` & co. (plain macOS) are not produced, nothing links them.

## Tesseract build notes

- Built with upstream CMake: static, `Release`, no TIFF/libarchive/curl, no training tools, `GRAPHICS_DISABLED`, `FAST_FLOAT`, leptonica with PNG + zlib only.
- Android: tesseract is built with OpenMP (like the previous `Tesseract4Android` libs; the app links `-fopenmp -static-openmp`). tesseract needs the NDK `cpu-features`: it is compiled from the NDK sources and folded into `libtesseract.a`, so the app still links just `tesseract leptonica pngx jpeg`. libpng is installed as `libpngx.a` (name expected by `CMakeLists.txt`). Debug info is stripped.
- x86/x86_64 Android: libjpeg-turbo is built without SIMD (it would need nasm/yasm).
- Apple: `strip -S` on every slice; tesseract has no OpenMP on Apple (no libomp in the SDK).
- tesseract's `try_run` for leptonica TIFF support cannot run when cross compiling, it is answered with `LEPT_TIFF_RESULT=1` (no TIFF).

## Licenses

OpenCV (Apache 2.0), Tesseract (Apache 2.0), Leptonica (BSD-2), libpng (libpng license), libjpeg-turbo (BSD/IJG/zlib) and the NDK `cpu-features` (Apache 2.0) all allow redistributing binaries, keep their notices in the app's third party licenses.
