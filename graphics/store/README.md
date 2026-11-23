# Store graphics of this app

The scripts live in the shared `tools/store-graphics` (see its README for the format of `slides.json`, the flows and the options).
This folder only holds what is specific to the apps:

```
slides.json     slides, colors, font and capture settings of OSS Document Scanner and OSS Card Wallet
locales/        the texts of the images: en-US.json, fr-FR.json (copy one to add a language)
maestro/        the flows taking the screens (needs the demo data of test_assets/demo)
templates/      one Open Screenshot Generator project per app (no captures), generated, edit it with `osg studio`
raw/            captured screens (git-ignored)
```

```bash
yarn store:install                                   # once (tools/store-graphics deps) + maestro
yarn store:capture:ios -- --phone <sim udid> --tablet <sim udid> [--locales en-US,fr-FR] [--app cardwallet]
yarn store:capture:android -- --phone emulator-5554 --tablet emulator-5556
yarn store:render                                    # -> fastlane/metadata/<app id>/ (--locales, --app, --target, --fastlane)
yarn store:templates                                 # refresh templates/ after changing slides.json or locales
```

Devices: iPhone 17 Pro Max + iPad Pro 13" simulators, a 1080x2400 Android emulator, a Pixel Tablet emulator, the apps installed and
seeded (`test_assets/demo/generator/deploy_sim.sh`, `deploy_android.sh`). The flows match button labels in English and French:
add the words of a new language to the regexes in `maestro/`.
