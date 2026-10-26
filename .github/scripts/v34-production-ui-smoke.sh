#!/usr/bin/env bash
set -euo pipefail

: "${ANDROID_TEST_APP_ID:?}"
: "${V34_PRODUCTION_APK:?}"
: "${V34_DEVICE:?}"
out="${V34_ARTIFACT_DIR:-artifacts/v34-production-smoke}/${V34_DEVICE}"
mkdir -p "$out/screenshots" "$out/logs"
if [[ "$V34_DEVICE" == 'tablet' ]]; then
  adb shell settings put system accelerometer_rotation 0
  adb shell settings put system user_rotation 1
fi

adb install "$V34_PRODUCTION_APK"
adb shell pm path "$ANDROID_TEST_APP_ID" > "$out/logs/package-path.txt"
adb logcat -c
launch="$(adb shell am start -W -n "$ANDROID_TEST_APP_ID/com.aaria.magickitchen.pilot.MainActivity")"
printf '%s\n' "$launch" > "$out/logs/activity-launch.txt"
grep -F 'Status: ok' "$out/logs/activity-launch.txt" >/dev/null

ready=0
for _ in $(seq 1 30); do
  if adb shell pidof "$ANDROID_TEST_APP_ID" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]]
sleep 3
adb shell pidof "$ANDROID_TEST_APP_ID" > "$out/logs/process-id.txt"
adb shell dumpsys package "$ANDROID_TEST_APP_ID" > "$out/logs/package-dump.txt"
grep -F 'versionCode=8 minSdk=26 targetSdk=34' "$out/logs/package-dump.txt" >/dev/null
painted=0
for attempt in $(seq 1 45); do
  shot="$out/screenshots/production-cold-launch.png.tmp"
  adb exec-out screencap -p > "$shot"
  bytes="$(wc -c < "$shot")"
  if [[ "$bytes" -gt 100000 ]]; then
    mv "$shot" "$out/screenshots/production-cold-launch.png"
    painted=1
    break
  fi
  mv "$shot" "$out/screenshots/production-cold-launch-last-attempt.png"
  sleep 2
done
adb logcat -d -s AndroidRuntime:E > "$out/logs/android-runtime-errors.txt"
if grep -E 'FATAL EXCEPTION|Process: com\\.aaria\\.magickitchen\\.pilot' "$out/logs/android-runtime-errors.txt"; then
  echo 'Android runtime crash detected after production APK launch.' >&2
  exit 1
fi
if [[ "$painted" != 1 ]]; then
  adb shell uiautomator dump /sdcard/v34-production-window.xml >/dev/null 2>&1 || true
  adb exec-out cat /sdcard/v34-production-window.xml > "$out/logs/ui-tree-webview-not-painted.xml" 2>/dev/null || true
  echo "WebView did not paint a nonblank screen within 90 seconds (last screenshot $(wc -c < "$out/screenshots/production-cold-launch-last-attempt.png") bytes)." >&2
  exit 1
fi
printf 'device=%s\\npackage=%s\\nversionCode=8\\nproduction_release_apk_installed=PASS\\nmain_activity_launch=PASS\\nprocess_alive=PASS\\ncrash_free_launch_window=PASS\\nwebview_nonblank_first_frame=PASS\\nwebview_dom_accessibility=NOT_EXPOSED_BY_RELEASE_WEBVIEW (functional navigation is covered by the exact-source focused emulator check)\\nphysical_camera_capture=NOT_TESTED\\n' "$V34_DEVICE" "$ANDROID_TEST_APP_ID" > "$out/logs/production-ui-smoke.txt"
