#!/usr/bin/env bash
set -euxo pipefail

apk=phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
pkg="com.aaria.magickitchen.pilot.v35review${GITHUB_RUN_NUMBER}"
mkdir -p artifacts/v35-android-screenshots
diagnostics=artifacts/v35-android-diagnostics
mkdir -p "$diagnostics"
capture_failure_diagnostics() {
  status=$?
  if [[ "$status" -ne 0 ]]; then
    printf 'capture_exit_status=%s\n' "$status" > "$diagnostics/failure-status.txt"
    timeout 25 adb logcat -d -v threadtime -t 2500 > "$diagnostics/logcat-tail.txt" 2>&1 || true
    timeout 20 adb shell dumpsys activity processes > "$diagnostics/activity-processes.txt" 2>&1 || true
    timeout 20 adb shell dumpsys meminfo "$pkg" > "$diagnostics/app-meminfo.txt" 2>&1 || true
    timeout 15 adb exec-out screencap -p > "$diagnostics/failure-screen.png" 2>/dev/null || true
  fi
}
trap capture_failure_diagnostics EXIT
timeout 300 adb wait-for-device
timeout 300 adb shell 'until [ "$(getprop sys.boot_completed)" = "1" ]; do sleep 2; done; until cmd package list packages >/dev/null 2>&1; do sleep 2; done'
timeout 1200 adb install -r "$apk"
timeout 180 adb shell am start -W -n "$pkg/com.aaria.magickitchen.pilot.MainActivity" | tee "$diagnostics/activity-start.txt"
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
