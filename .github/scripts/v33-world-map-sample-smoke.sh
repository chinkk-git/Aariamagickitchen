#!/usr/bin/env bash
set -euo pipefail

mkdir -p artifacts/v33-world-map-sample/screenshots artifacts/v33-world-map-sample/logs
APP_ID=${ANDROID_TEST_APP_ID:?Expected the unique W02 sample package ID}
APK=phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
adb_timeout() { timeout --kill-after=10s 90s adb "$@"; }
adb_poll_timeout() { timeout --kill-after=2s 5s adb "$@"; }

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

wait_for_stable_launcher() {
  adb_timeout shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME
  stable=0
  rebooted=0
  for attempt in $(seq 1 45); do
    windows="$(adb_poll_timeout shell dumpsys window windows 2>/dev/null || true)"
    activities="$(adb_poll_timeout shell dumpsys activity activities 2>/dev/null || true)"
    anr_window="$(printf '%s' "$windows" | grep -Ei 'Window\{[^}]*Application Not Responding|WindowStateAnimator\{[^}]*Application Not Responding' | head -1 || true)"
    if [ -n "$anr_window" ]; then
      stable=0
      if [ "$rebooted" -eq 0 ]; then
        echo "Quickstep ANR before sample launch; rebooting the clean emulator once: $anr_window" >&2
        rebooted=1
        adb_timeout reboot
        booted=''
        for boot_attempt in $(seq 1 90); do
          booted="$(adb_poll_timeout shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
          [ "$booted" = 1 ] && break
          sleep 2
        done
        [ "$booted" = 1 ] || { echo 'Clean sample emulator did not reboot successfully' >&2; return 1; }
        adb_timeout shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME
      else
        echo "Quickstep still shows an ANR after reboot: $anr_window" >&2
        return 1
      fi
    elif printf '%s' "$activities" | grep -Eq 'ResumedActivity: ActivityRecord.*com\.android\.launcher3/.uioverrides\.QuickstepLauncher'; then
      stable=$((stable + 1))
      if [ "$stable" -ge 3 ]; then
        echo "Quickstep launcher stable across three checks (rebooted=$rebooted)"
        return 0
      fi
    else
      stable=0
    fi
    sleep 2
  done
  echo 'Quickstep did not reach a stable HOME state before the W02 sample launch' >&2
  return 1
}

test -s "$APK"
aapt="$(find "$ANDROID_HOME/build-tools" -type f -name aapt | sort -V | tail -n 1)"
"$aapt" dump badging "$APK" > artifacts/v33-world-map-sample/logs/apk-badging.txt
grep -Fq "package: name='${APP_ID}'" artifacts/v33-world-map-sample/logs/apk-badging.txt
sha256sum "$APK" | tee artifacts/v33-world-map-sample/logs/apk-sha256.txt
adb install -r "$APK" | tee artifacts/v33-world-map-sample/logs/install.txt
adb shell pm path "$APP_ID" | tee artifacts/v33-world-map-sample/logs/package-path.txt | grep -q 'package:'
wait_for_stable_launcher
adb shell am start -W -n "$APP_ID"/com.aaria.magickitchen.pilot.MainActivity | tee artifacts/v33-world-map-sample/logs/launch.txt

# A cold-started WebView can briefly leave an old app PID ahead of the active
# process in `pidof`. Do not forward to the first socket-shaped match: prove
# that the forwarded socket serves this app's DevTools page before continuing.
adb forward --remove tcp:9224 >/dev/null 2>&1 || true
connected=''
for attempt in $(seq 1 60); do
  pids="$(adb shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' || true)"
  for pid in $pids; do
    case "$pid" in ''|*[!0-9]*) continue ;; esac
    socket="$(adb shell cat /proc/net/unix 2>/dev/null | grep -o "webview_devtools_remote_${pid}" | head -1 || true)"
    [ -n "$socket" ] || continue
    adb forward --remove tcp:9224 >/dev/null 2>&1 || true
    if adb forward tcp:9224 "localabstract:$socket" >/dev/null 2>&1 \
      && node -e 'fetch("http://127.0.0.1:9224/json").then(r=>r.json()).then(t=>process.exit(Array.isArray(t)&&t.some(x=>x.type==="page"&&x.webSocketDebuggerUrl&&(String(x.url||"").includes("appassets.androidplatform.net")||String(x.title||"").includes("Magical Kitchen")))?0:1)).catch(()=>process.exit(1))'; then
      printf 'Connected Android WebView DevTools pid=%s socket=%s\n' "$pid" "$socket" | tee artifacts/v33-world-map-sample/logs/devtools-target.txt
      connected='yes'
      break 2
    fi
  done
  sleep 1
done
if [ "$connected" != 'yes' ]; then
  adb shell pidof "$APP_ID" > artifacts/v33-world-map-sample/logs/devtools-pids.txt 2>&1 || true
  adb shell cat /proc/net/unix | grep 'webview_devtools_remote_' > artifacts/v33-world-map-sample/logs/devtools-sockets.txt 2>&1 || true
  adb forward --list > artifacts/v33-world-map-sample/logs/devtools-forwards.txt 2>&1 || true
  echo 'No live app-owned WebView DevTools page became available from the current app process' >&2
  exit 1
fi
ANDROID_TEST_APP_ID="$APP_ID" node .github/scripts/v33-world-map-sample-smoke.mjs
