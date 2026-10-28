#!/usr/bin/env bash
set -Eeuo pipefail

apk=phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
pkg="com.aaria.magickitchen.pilot.v35review${GITHUB_RUN_NUMBER}"
diagnostics=artifacts/v35-android-smoke
mkdir -p "$diagnostics"

capture_failure_diagnostics() {
  status=$?
  if [[ "$status" -ne 0 ]]; then
    printf 'smoke_exit_status=%s\n' "$status" > "$diagnostics/failure-status.txt"
    timeout 25 adb logcat -d -v threadtime -t 2500 > "$diagnostics/logcat-tail.txt" 2>&1 || true
    timeout 20 adb shell dumpsys activity processes > "$diagnostics/activity-processes.txt" 2>&1 || true
    timeout 20 adb shell dumpsys meminfo "$pkg" > "$diagnostics/app-meminfo.txt" 2>&1 || true
  fi
}
trap capture_failure_diagnostics EXIT

test -s "$apk"
timeout 300 adb wait-for-device
timeout 300 adb shell 'until [ "$(getprop sys.boot_completed)" = "1" ]; do sleep 2; done; until cmd package list packages >/dev/null 2>&1; do sleep 2; done'
timeout 180 adb logcat -c
timeout 240 adb install -r "$apk"
timeout 60 adb shell am start -W -n "$pkg/com.aaria.magickitchen.pilot.MainActivity" | tee "$diagnostics/activity-start.txt"
grep -q '^Status: ok' "$diagnostics/activity-start.txt"

pid=""
for attempt in $(seq 1 45); do
  pid="$(adb shell pidof "$pkg" 2>/dev/null | tr -d '\r' | awk '{print $1}' || true)"
  [[ -n "$pid" ]] && break
  sleep 1
done
test -n "$pid"

socket="webview_devtools_remote_${pid}"
for attempt in $(seq 1 60); do
  if adb shell cat /proc/net/unix 2>/dev/null | grep -Fq "$socket"; then break; fi
  sleep 1
done
adb shell cat /proc/net/unix 2>/dev/null | grep -Fq "$socket"
adb forward tcp:9222 "localabstract:$socket"
V35_SMOKE_OUTPUT="$diagnostics" V35_SMOKE_PACKAGE="$pkg" node tools/v3/smoke-v35-android.mjs

# Inspect only fatal/ANR/renderer markers after the functional checks. On a
# failure the EXIT trap retains a bounded logcat tail and process diagnostics.
timeout 25 adb logcat -d -v threadtime -t 5000 > "$diagnostics/logcat-check.txt"
if grep -Fq "ANR in $pkg" "$diagnostics/logcat-check.txt" || grep -Fq "Process: $pkg" "$diagnostics/logcat-check.txt"; then
  echo "Fatal exception, ANR or renderer crash references $pkg" >&2
  exit 1
fi
if grep -E 'Render process .*crash|renderer process.*crash' "$diagnostics/logcat-check.txt"; then
  echo "WebView renderer crash observed during the smoke route checks" >&2
  exit 1
fi
rm "$diagnostics/logcat-check.txt"
printf 'PASS: Android install, Activity launch, WebView readiness, essential routes and focused fatal/ANR log check.\n' | tee "$diagnostics/ci-result.txt"
