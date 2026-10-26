#!/usr/bin/env bash
set -euo pipefail

apk=phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
pkg="com.aaria.magickitchen.pilot.v35review${GITHUB_RUN_NUMBER}"
mkdir -p artifacts/v35-android-screenshots
adb install -r "$apk"
adb shell am start -n "$pkg/com.aaria.magickitchen.pilot.MainActivity"
timeout 300 adb wait-for-device
sleep 3
adb exec-out screencap -p > artifacts/v35-android-screenshots/home-app-launch.png
socket=""
for attempt in $(seq 1 90); do
  socket="$(adb shell cat /proc/net/unix 2>/dev/null | awk '$NF ~ /webview_devtools_remote_/ {sub(/^.*webview_devtools_remote_/, "webview_devtools_remote_", $NF); print $NF; exit}' || true)"
  if [[ -n "$socket" ]]; then break; fi
  sleep 2
done
test -n "$socket"
printf 'WebView DevTools socket ready: %s\n' "$socket"
adb forward tcp:9222 "localabstract:$socket"
V35_SCREENSHOT_DIR=artifacts/v35-android-screenshots node tools/v3/capture-v35-android-evidence.mjs
