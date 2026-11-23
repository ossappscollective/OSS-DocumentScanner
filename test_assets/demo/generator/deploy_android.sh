#!/bin/bash
# Seeds both apps (or one) on an Android device + copies the import files to /sdcard/Download/DemoImport.
# usage: deploy_android.sh <adb serial> [documentscanner|cardwallet] [--clean] [--no-import]
# Needs a python with pillow numpy treepoem only for gen.py, not here. Keeps a db backup in $BACKUP_DIR.
set -e
SERIAL=$1; ONLY=$2; shift 2 || true
DEMO="$(cd "$(dirname "$0")/.." && pwd)"
"$DEMO/generator/fetch_data.sh"
WORK=${WORK_DIR:-/tmp/demo-seed}; BACKUP_DIR=$WORK/backup
mkdir -p "$WORK" "$BACKUP_DIR"
for app in documentscanner cardwallet; do
  [ -n "$ONLY" ] && [ "$ONLY" != "$app" ] && [ "$ONLY" != "all" ] && continue
  pkg=com.akylas.$app; dir=/sdcard/Android/data/$pkg/files
  adb -s "$SERIAL" shell am force-stop $pkg
  mkdir -p "$WORK/android-$app"
  adb -s "$SERIAL" pull $dir/db.sqlite "$WORK/android-$app/db.sqlite" >/dev/null
  cp "$WORK/android-$app/db.sqlite" "$BACKUP_DIR/android-$app-$(date +%Y%m%d-%H%M%S).sqlite"
  python3 "$DEMO/generator/seed_db.py" $app "$WORK/android-$app/db.sqlite" --data-prefix=/storage/emulated/0/Android/data/$pkg/files/data "$@"
  adb -s "$SERIAL" shell rm -f $dir/db.sqlite-wal $dir/db.sqlite-shm
  adb -s "$SERIAL" push "$WORK/android-$app/db.sqlite" $dir/db.sqlite >/dev/null
  # stale images of previous generations (names carry a content hash)
  for id in $(python3 -c "import json,sys;print(*[d['id'] for d in json.load(open(sys.argv[1]))['documents']])" "$DEMO/$app/manifest.json"); do adb -s "$SERIAL" shell rm -r $dir/data/$id 2>/dev/null || true; done
  adb -s "$SERIAL" push "$DEMO/$app/data/." $dir/data/ | tail -1
  adb -s "$SERIAL" shell mkdir -p /sdcard/Download/DemoImport/$app
  adb -s "$SERIAL" push "$DEMO/import/$app/." /sdcard/Download/DemoImport/$app/ | tail -1
  adb -s "$SERIAL" shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/DemoImport >/dev/null 2>&1 || true
done
