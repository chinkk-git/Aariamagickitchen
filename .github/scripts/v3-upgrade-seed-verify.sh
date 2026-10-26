#!/usr/bin/env bash
set -euo pipefail

mode="${1:?seed|verify required}"
serial="${2:?emulator serial required}"
package="${3:?package required}"
evidence="${V34_UPGRADE_EVIDENCE_DIR:-artifacts/v34-upgrade-evidence}"
mkdir -p "$evidence/screenshots" "$evidence/ui"
ui_file="$evidence/ui/current.xml"

adb_s() { adb -s "$serial" "$@"; }
dump_ui() {
  for _ in $(seq 1 5); do
    adb_s shell uiautomator dump --compressed /sdcard/v34-window.xml >/dev/null 2>&1 || true
    adb_s exec-out cat /sdcard/v34-window.xml > "$ui_file" 2>/dev/null || true
    if python3 - "$ui_file" <<'PY'
import sys, xml.etree.ElementTree as ET
try: ET.parse(sys.argv[1])
except Exception: raise SystemExit(1)
PY
    then return 0; fi
    sleep 1
  done
  echo 'Android accessibility tree was not valid XML after bounded retries.' >&2
  return 1
}
text_present() {
  python3 - "$ui_file" "$1" <<'PY'
import re, sys, xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1]).getroot()
p=re.compile(sys.argv[2], re.I)
sys.exit(0 if any(p.search(' '.join((n.attrib.get('text',''), n.attrib.get('content-desc','')))) for n in root.iter('node')) else 1)
PY
}
wait_text() {
  local regex="$1"
  for _ in $(seq 1 30); do
    dump_ui
    if text_present "$regex"; then return 0; fi
    sleep 1
  done
  echo "Timed out waiting for UI text: $regex" >&2
  cp "$ui_file" "$evidence/ui/timeout-$(date +%s).xml"
  adb_s exec-out screencap -p > "$evidence/screenshots/$mode-wait-timeout.png"
  return 1
}
wait_absent() {
  local regex="$1"
  for _ in $(seq 1 30); do
    dump_ui
    if ! text_present "$regex"; then return 0; fi
    sleep 1
  done
  echo "Timed out waiting for UI text to disappear: $regex" >&2
  cp "$ui_file" "$evidence/ui/timeout-absent-$(date +%s).xml"
  return 1
}
tap_text() {
  local regex="$1" point
  dump_ui
  point="$(python3 - "$ui_file" "$regex" <<'PY'
import re, sys, xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1]).getroot(); p=re.compile(sys.argv[2], re.I)
for n in root.iter('node'):
    if n.attrib.get('clickable') != 'true' or n.attrib.get('enabled','true') == 'false' or n.attrib.get('visible-to-user','true') == 'false':
        continue
    label=' '.join((n.attrib.get('text',''), n.attrib.get('content-desc',''))).strip()
    if p.search(label):
        parts=[int(x) for x in n.attrib.get('bounds','').replace('][',',').strip('[]').split(',')]
        if len(parts)==4:
            print(f'{(parts[0]+parts[2])//2} {(parts[1]+parts[3])//2}')
            raise SystemExit(0)
raise SystemExit(1)
PY
  )" || {
    echo "Clickable UI control not found: $regex" >&2
    cp "$ui_file" "$evidence/ui/failed-$(date +%s).xml"
    adb_s exec-out screencap -p > "$evidence/screenshots/$mode-control-not-found.png"
    return 1
  }
  adb_s shell input tap $point
  sleep 1
}
tap_if_present() {
  local regex="$1"
  dump_ui
  if text_present "$regex"; then tap_text "$regex"; fi
}
screenshot() { adb_s exec-out screencap -p > "$evidence/screenshots/$1.png"; }
launch() {
  adb_s shell monkey -p "$package" 1 >/dev/null
  wait_text 'Choose your chef|Recipes|My Recipes|Skip|Enter|Settings'
  if text_present 'Choose your chef'; then
    tap_text 'Chef A'
    tap_text 'Continue to kitchen'
    wait_absent 'Choose your chef'
  fi
  tap_if_present 'Skip'
  tap_if_present 'Enter'
  wait_text 'Recipes|Settings|Home'
}
open_favorite_recipe() {
  tap_text '📖 Recipes|My Recipes'
  wait_text 'Cheesy Egg Bread Cups'
  tap_text 'Cheesy Egg Bread Cups'
  wait_text 'Add to favou?rites|Remove from favou?rites'
}
favorite_is_saved() {
  dump_ui
  text_present 'Remove from favou?rites'
}
set_and_verify_reduced_motion() {
  tap_text 'Settings'
  wait_text 'Reduce motion|Reduce animation'
  dump_ui
  local checked
  checked="$(python3 - "$ui_file" <<'PY'
import sys, xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1]).getroot()
for n in root.iter('node'):
    if 'reduce motion' in n.attrib.get('text','').lower() or 'reduce animation' in n.attrib.get('text','').lower():
        if n.attrib.get('class','').endswith(('CheckBox','Switch')):
            print(n.attrib.get('checked','false')); raise SystemExit(0)
raise SystemExit(1)
PY
  )" || true
  if [[ "$checked" != true ]]; then tap_text 'Reduce motion|Reduce animation'; fi
  dump_ui
  checked="$(python3 - "$ui_file" <<'PY'
import sys, xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1]).getroot()
for n in root.iter('node'):
    if 'reduce motion' in n.attrib.get('text','').lower() or 'reduce animation' in n.attrib.get('text','').lower():
        if n.attrib.get('class','').endswith(('CheckBox','Switch')):
            print(n.attrib.get('checked','false')); raise SystemExit(0)
raise SystemExit(1)
PY
  )" || true
  [[ "$checked" == true ]] || { echo 'Reduced-motion preference did not persist in UI.' >&2; return 1; }
}
verify_reduced_motion_only() {
  tap_if_present 'Home'
  tap_text 'Settings'
  wait_text 'Reduce motion|Reduce animation'
  dump_ui
  local checked
  checked="$(python3 - "$ui_file" <<'PY'
import sys, xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1]).getroot()
for n in root.iter('node'):
    if 'reduce motion' in n.attrib.get('text','').lower() or 'reduce animation' in n.attrib.get('text','').lower():
        if n.attrib.get('class','').endswith(('CheckBox','Switch')):
            print(n.attrib.get('checked','false')); raise SystemExit(0)
raise SystemExit(1)
PY
  )" || true
  [[ "$checked" == true ]] || { echo 'Reduced-motion preference was lost across the update or restart.' >&2; return 1; }
}
write_report() {
  python3 - "$1" "$2" "$3" <<'PY'
import json,sys
path,phase,favorite=sys.argv[1:]
data={
  'phase': phase,
  'favorite_recipe_name':'Cheesy Egg Bread Cups',
  'favorite_persisted':'PASS' if favorite=='PASS' else favorite,
  'reduced_motion_preference':'PASS' if phase in ('seed','after-upgrade','after-restart') else 'NOT_VERIFIED',
  'planner_selections':'NOT_SEEDED',
  'saved_photos':'NOT_SUPPORTED_OR_NOT_PERSISTENT_IN_V7',
  'my_creations':'NOT_SUPPORTED_IN_V7',
  'full_upgrade_acceptance':'NOT_VERIFIED',
  'limitation':'Authentic v7 persists no photo-record collection; V3.4 photo migration cannot be seeded from v7.'
}
json.dump(data,open(path,'w'),indent=2); print(json.dumps(data,indent=2))
PY
}
if [[ "$mode" == seed ]]; then
  launch
  open_favorite_recipe
  if ! favorite_is_saved; then tap_text 'Add to favou?rites'; fi
  favorite_is_saved || { echo 'Favorite did not persist in v7 UI.' >&2; exit 1; }
  screenshot v7-favorite-seeded
  tap_if_present 'Home'
  set_and_verify_reduced_motion
  screenshot v7-preferences-seeded
  write_report "$evidence/data-before.json" seed PASS
  cp "$ui_file" "$evidence/ui/v7-seeded-state.xml"
  exit 0
fi
if [[ "$mode" == verify ]]; then
  launch
  open_favorite_recipe
  favorite_is_saved || { echo 'Seeded favorite is missing after v7-to-V3.4 update.' >&2; exit 1; }
  screenshot v34-favorite-after-upgrade
  tap_if_present 'Home'
  verify_reduced_motion_only
  screenshot v34-preferences-after-upgrade
  write_report "$evidence/data-after-upgrade.json" after-upgrade PASS
  adb_s shell am force-stop "$package"
  launch
  open_favorite_recipe
  favorite_is_saved || { echo 'Seeded favorite is missing after V3.4 restart.' >&2; exit 1; }
  tap_if_present 'Home'
  verify_reduced_motion_only
  write_report "$evidence/data-after-restart.json" after-restart PASS
  cp "$ui_file" "$evidence/ui/v34-after-restart.xml"
  exit 0
fi
echo "Unknown mode: $mode" >&2
exit 2
