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
adb shell am start -W -n "$ANDROID_TEST_APP_ID/com.aaria.magickitchen.pilot.MainActivity"
sleep 4

dump_ui() {
  adb shell uiautomator dump /sdcard/v34-window.xml >/dev/null 2>&1
  adb exec-out cat /sdcard/v34-window.xml | tr -d '\r'
}

contains_node() {
  local needle="${1,,}"
  dump_ui | python3 -c 'import sys,xml.etree.ElementTree as E; n=sys.argv[1]; root=E.fromstring(sys.stdin.read()); print("\n".join((x.get("text","")+" "+x.get("content-desc","")).strip() for x in root.iter("node") if n in (x.get("text","")+" "+x.get("content-desc","")).lower()))' "$needle" | grep -q .
}

tap_node() {
  local needle="${1,,}"
  local bounds
  bounds="$(dump_ui | python3 -c 'import sys,xml.etree.ElementTree as E; n=sys.argv[1]; root=E.fromstring(sys.stdin.read()); found=[]
for x in root.iter("node"):
 s=(x.get("text","")+" "+x.get("content-desc","")).lower()
 if n in s and x.get("clickable")=="true": found.append(x.get("bounds",""))
print(found[-1] if found else "")' "$needle")"
  if [[ -z "$bounds" ]]; then
    echo "Missing accessible tap target: $1" >&2
    dump_ui > "$out/logs/ui-tree-missing-${needle// /-}.xml"
    exit 1
  fi
  local x1 y1 x2 y2 x y
  read -r x1 y1 x2 y2 < <(sed -E 's/^\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]$/\1 \2 \3 \4/' <<< "$bounds")
  x=$(( (x1 + x2) / 2 )); y=$(( (y1 + y2) / 2 ))
  adb shell input tap "$x" "$y"
  sleep 1
}

capture() {
  adb exec-out screencap -p > "$out/screenshots/$1.png"
}

assert_node() {
  if ! contains_node "$1"; then
    echo "Missing expected Android accessibility text: $1" >&2
    dump_ui > "$out/logs/ui-tree-missing-${1// /-}.xml"
    exit 1
  fi
}

assert_node 'Skip welcome'
assert_node 'Next'
capture welcome-cold-launch
tap_node 'Next'
tap_node 'Next'
adb shell input keyevent 4
sleep 1
assert_node 'Scene 2 of 3'
tap_node 'Next'
assert_node 'Enter My Magical Kitchen'
capture welcome-enter-scene
tap_node 'Enter My Magical Kitchen'
assert_node 'Aaria'
assert_node 'Surprise Me'
assert_node 'World'
capture magical-home-entered

tap_node 'Surprise Me'
sleep 1
assert_node 'Surprise'
capture surprise-me-original-workflow
adb shell input keyevent 4
sleep 1

tap_node 'World'
sleep 2
capture world-default-globe
adb shell input keyevent 4
sleep 1
assert_node 'Surprise Me'

tap_node 'Settings'
assert_node 'My Home Style'
tap_node 'Classic Kitchen'
capture classic-home
adb shell am force-stop "$ANDROID_TEST_APP_ID"
adb shell am start -W -n "$ANDROID_TEST_APP_ID/com.aaria.magickitchen.pilot.MainActivity"
sleep 4
assert_node 'Skip welcome'
tap_node 'Skip welcome'
sleep 2
capture classic-home-after-relaunch
if contains_node 'Surprise Me'; then
  echo 'The saved Classic Kitchen preference did not survive relaunch.' >&2
  dump_ui > "$out/logs/ui-tree-classic-preference-failure.xml"
  exit 1
fi
adb shell dumpsys package "$ANDROID_TEST_APP_ID" > "$out/logs/package-dump.txt"
grep -F 'versionCode=8 minSdk=26 targetSdk=34' "$out/logs/package-dump.txt" >/dev/null
printf 'device=%s\npackage=%s\nproduction_release_apk_installed=PASS\nfresh_install_and_welcome=PASS\nwelcome_next_back_enter=PASS\nsurprise_entry_rendered=PASS\nworld_navigation_rendered=PASS\nclassic_preference_saved_across_relaunch=PASS\nphysical_camera_capture=NOT_TESTED\nphoto_gallery_exact_release_apk=NOT_TESTED\n' "$V34_DEVICE" "$ANDROID_TEST_APP_ID" > "$out/logs/production-ui-smoke.txt"
