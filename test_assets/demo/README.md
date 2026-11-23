# Demo data (fictional)

Realistic fake data for both apps, used to test production builds, to test imports and detection, and to take store screenshots / graphics.
Everything is fictional (brands, people, numbers).

The data itself (about 14 MB) is **not in git**: git has the generator and the scripts, the generated files are the `demo-data` release asset
of the repo, so regenerating never grows the history.

```
generator/         python generator (gen.py, seed_db.py, ...), deploy and release scripts
documentscanner/   generated: manifest.json + data/<docId>/<pageId>/{image_*.jpg,capture_*.jpg}   25 docs, 32 pages, 9 folders, 18 tags
cardwallet/        generated: manifest.json + data/...                                            19 cards + 5 passes, 3 folders
import/            generated: files to import (documentscanner/, cardwallet/)
```

`image_*.jpg` is the processed (cropped) page shown in the lists, `capture_*.jpg` the original photo the page was cropped from (the `crop` quad is in the db).
`import/` has desk photos to import and let the app detect and crop itself, including hard ones (`photo-hard-*`: low light, glare, hard shadow,
page cut by the frame, cluttered desk, strong angle; `card-photo-hard-*` for cards), PDFs, pkpass, barcode images and backup zips.

## Get the data (you or an agent)

```bash
test_assets/demo/generator/fetch_data.sh          # downloads the release asset into test_assets/demo (gh or curl), --force to refresh
```

The deploy scripts call it when the data is missing.

## Deploy

```bash
generator/deploy_android.sh <adb serial> all --clean       # db + images + /sdcard/Download/DemoImport
PMD=pymobiledevice3 PMD_PY=<python of that install> generator/deploy_ios.sh <udid> all --clean
generator/deploy_sim.sh <sim udid> all --clean              # iOS simulator
```

`--clean` empties documents/folders/tags of the app before seeding (a db backup is kept in `$WORK_DIR/backup`). Without it the seed is added to the existing data
(fixed ids, idempotent). The apps are stopped by the scripts. iOS devices: `devicectl` for the app container, `pymobiledevice3` for the container path
(pass images are stored with absolute paths), for deleting and for the media "Downloads" folder.

## Change the data

```bash
python3 -m venv /tmp/demo-venv && /tmp/demo-venv/bin/pip install -r generator/requirements.txt   # pillow numpy treepoem (needs ghostscript)
/tmp/demo-venv/bin/python generator/gen.py            # all | docs | cards | imports
generator/publish_data.sh                              # zips and uploads the demo-data release asset (gh, needs write access)
```
