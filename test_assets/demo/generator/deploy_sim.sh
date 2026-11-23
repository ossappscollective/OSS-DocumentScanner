#!/bin/bash
# Seeds the apps installed on an iOS Simulator (the container is a plain folder).
# usage: deploy_sim.sh <sim udid> [documentscanner|cardwallet|all] [--clean]
set -e
UDID=$1; ONLY=${2:-all}; shift 2 || true
DEMO="$(cd "$(dirname "$0")/.." && pwd)"
"$DEMO/generator/fetch_data.sh"
WORK=${WORK_DIR:-/tmp/demo-seed}; mkdir -p "$WORK/backup"
for app in documentscanner cardwallet; do
  [ "$ONLY" != "all" ] && [ "$ONLY" != "$app" ] && continue
  bundle=com.akylas.$app
  xcrun simctl terminate "$UDID" $bundle 2>/dev/null || true
  container=$(xcrun simctl get_app_container "$UDID" $bundle data)
  cp "$container/Documents/db.sqlite" "$WORK/backup/sim-$app-$(date +%Y%m%d-%H%M%S).sqlite"
  rm -f "$container/Documents/db.sqlite-wal" "$container/Documents/db.sqlite-shm"
  python3 "$DEMO/generator/seed_db.py" $app "$container/Documents/db.sqlite" --data-prefix="$container/Documents/data" "$@"
  mkdir -p "$container/Documents/data"
  cp -R "$DEMO/$app/data/." "$container/Documents/data/"
done
