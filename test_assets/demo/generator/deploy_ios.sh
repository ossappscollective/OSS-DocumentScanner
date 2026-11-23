#!/bin/bash
# Seeds both apps (or one) on a connected iPhone (dev/adhoc builds whose container devicectl can reach)
# and copies the import files to the media "Downloads" folder (AFC) + each app's Documents/DemoImport.
# usage: deploy_ios.sh <udid> [documentscanner|cardwallet|all] [--clean]
# needs: xcrun devicectl, pymobiledevice3 (pip) for the container path + AFC.
set -e
UDID=$1; ONLY=${2:-all}; shift 2 || true
DEMO="$(cd "$(dirname "$0")/.." && pwd)"
"$DEMO/generator/fetch_data.sh"
WORK=${WORK_DIR:-/tmp/demo-seed}; BACKUP_DIR=$WORK/backup
PMD=${PMD:-pymobiledevice3}
PMD_PY=${PMD_PY:-python3}   # the python of the pymobiledevice3 install
mkdir -p "$WORK" "$BACKUP_DIR"
APPS_JSON=$($PMD apps list --udid "$UDID" 2>/dev/null)
for app in documentscanner cardwallet; do
  [ "$ONLY" != "all" ] && [ "$ONLY" != "$app" ] && continue
  bundle=com.akylas.$app
  container=$(echo "$APPS_JSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['$bundle']['Container'].replace('/private',''))")
  bundle_url=$(xcrun devicectl device info apps --device "$UDID" --bundle-id $bundle --json-output /dev/stdout 2>/dev/null | python3 -c "import json,sys;t=sys.stdin.read();print(json.loads(t[t.index('{'):])['result']['apps'][0]['url'])")
  bundle_uuid=$(echo "$bundle_url" | sed -E 's#.*/Application/([0-9A-F-]+)/.*#\1#')
  pid=$(xcrun devicectl device info processes --device "$UDID" 2>/dev/null | grep "$bundle_uuid" | awk '{print $1}' | head -1)
  [ -n "$pid" ] && xcrun devicectl device process terminate --device "$UDID" --pid "$pid" >/dev/null || true
  mkdir -p "$WORK/ios-$app"
  xcrun devicectl device copy from --device "$UDID" --domain-type appDataContainer --domain-identifier $bundle --source Documents/db.sqlite --destination "$WORK/ios-$app/db.sqlite" >/dev/null
  cp "$WORK/ios-$app/db.sqlite" "$BACKUP_DIR/ios-$app-$(date +%Y%m%d-%H%M%S).sqlite"
  python3 "$DEMO/generator/seed_db.py" $app "$WORK/ios-$app/db.sqlite" --data-prefix="$container/Documents/data" "$@"
  xcrun devicectl device copy to --device "$UDID" --domain-type appDataContainer --domain-identifier $bundle --source "$WORK/ios-$app/db.sqlite" --destination Documents/db.sqlite >/dev/null
  # devicectl copies the CONTENT of a source folder into the destination folder
  $PMD_PY "$DEMO/generator/ios_rm.py" "$UDID" $bundle Documents/DemoImport "@$DEMO/$app/manifest.json" >/dev/null
  xcrun devicectl device copy to --device "$UDID" --domain-type appDataContainer --domain-identifier $bundle --source "$DEMO/$app/data" --destination Documents/data | tail -1
  xcrun devicectl device copy to --device "$UDID" --domain-type appDataContainer --domain-identifier $bundle --source "$DEMO/import/$app" --destination Documents/DemoImport | tail -1
  # afc push puts the source folder INSIDE the destination folder
  $PMD afc rm /Downloads/DemoImport/$app --udid "$UDID" >/dev/null 2>&1 || true
  $PMD afc mkdir /Downloads/DemoImport --udid "$UDID" >/dev/null 2>&1 || true
  $PMD afc push "$DEMO/import/$app" /Downloads/DemoImport --udid "$UDID" >/dev/null 2>&1 || echo "AFC push failed for $app"
done
