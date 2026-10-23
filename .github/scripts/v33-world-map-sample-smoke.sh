#!/usr/bin/env bash
set -euo pipefail

mkdir -p artifacts/v33-world-map-sample/screenshots artifacts/v33-world-map-sample/logs
APP_ID=${ANDROID_TEST_APP_ID:?Expected the unique W02 sample package ID}
APK=phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk

on_exit() {
  result=$?
  trap - EXIT
  timeout --kill-after=2s 15s adb logcat -d -t 12000 > artifacts/v33-world-map-sample/logs/logcat.txt 2>&1 || true
  timeout --kill-after=2s 15s adb shell dumpsys activity activities > artifacts/v33-world-map-sample/logs/activity.txt 2>&1 || true
  timeout --kill-after=2s 15s adb shell dumpsys window windows > artifacts/v33-world-map-sample/logs/windows.txt 2>&1 || true
  if [ "$result" -ne 0 ]; then
    timeout --kill-after=2s 15s adb exec-out screencap -p > artifacts/v33-world-map-sample/screenshots/failure.png 2>/dev/null || true
  fi
  exit "$result"
}
trap on_exit EXIT

test -s "$APK"
aapt="$(find "$ANDROID_HOME/build-tools" -type f -name aapt | sort -V | tail -n 1)"
"$aapt" dump badging "$APK" > artifacts/v33-world-map-sample/logs/apk-badging.txt
grep -Fq "package: name='${APP_ID}'" artifacts/v33-world-map-sample/logs/apk-badging.txt
sha256sum "$APK" | tee artifacts/v33-world-map-sample/logs/apk-sha256.txt
adb install -r "$APK" | tee artifacts/v33-world-map-sample/logs/install.txt
adb shell pm path "$APP_ID" | tee artifacts/v33-world-map-sample/logs/package-path.txt | grep -q 'package:'
adb shell am start -W -n "$APP_ID"/com.aaria.magickitchen.pilot.MainActivity | tee artifacts/v33-world-map-sample/logs/launch.txt

pid=''
socket=''
for attempt in $(seq 1 45); do
  pid="$(adb shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' | awk '{print $1}' || true)"
  if [ -n "$pid" ]; then
    socket="$(adb shell cat /proc/net/unix 2>/dev/null | grep -o "webview_devtools_remote_${pid}" | head -1 || true)"
  fi
  [ -n "$socket" ] && break
  sleep 1
done
test -n "$socket"
adb forward tcp:9224 "localabstract:$socket"
ANDROID_TEST_APP_ID="$APP_ID" node .github/scripts/v33-world-map-sample-smoke.mjs
