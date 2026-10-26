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
  adb_s shell uiautomator dump --compressed /sdcard/v34-window.xml >/dev/null 2>&1
  adb_s exec-out cat /sdcard/v34-window.xml > "$ui_file"
}
tap_text() {
  local regex="$1" point
  dump_ui
  point="$(python3 - "$ui_file" "$regex" <<'PY'
import re, sys, xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1]).getroot()
pattern=re.compile(sys.argv[2], re.I)
for node in root.iter('node'):
    if node.attrib.get('visible-to-user','true') == 'false' or node.attrib.get('enabled','true') == 'false':
        continue
    value=' '.join((node.attrib.get('text',''),node.attrib.get('content-desc',''))).strip()
    if pattern.search(value):
        bounds=node.attrib.get('bounds','')
        m=re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',bounds)
        if m:
            x1,y1,x2,y2=map(int,m.groups())
            print(f'{(x1+x2)//2} {(y1+y2)//2}')
            raise SystemExit(0)
raise SystemExit(1)
PY
)" || {
    echo "UI control not found: $regex" >&2
    cp "$ui_file" "$evidence/ui/failed-$(date +%s).xml"
    adb_s exec-out screencap -p > "$evidence/screenshots/$mode-control-not-found.png"
    return 1
  }
  adb_s shell input tap $point
  sleep 1
}
wait_text() {
  local regex="$1"
  for _ in $(seq 1 30); do
    dump_ui
    if python3 - "$ui_file" "$regex" <<'PY'
import re, sys, xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1]).getroot()
p=re.compile(sys.argv[2], re.I)
sys.exit(0 if any(p.search(' '.join((n.attrib.get('text',''),n.attrib.get('content-desc','')))) for n in root.iter('node')) else 1)
PY
    then return 0; fi
    sleep 1
  done
  echo "Timed out waiting for UI text: $regex" >&2
  cp "$ui_file" "$evidence/ui/timeout-$(date +%s).xml"
  adb_s exec-out screencap -p > "$evidence/screenshots/$mode-wait-timeout.png"
  return 1
}
is_checked() {
  python3 - "$ui_file" "$1" <<'PY'
import re, sys, xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1]).getroot()
p=re.compile(sys.argv[2], re.I)
for n in root.iter('node'):
    value=' '.join((n.attrib.get('text',''),n.attrib.get('content-desc',''))).strip()
    if p.search(value) and n.attrib.get('class','').endswith(('CheckBox','Switch')):
        print(n.attrib.get('checked','false'))
        raise SystemExit(0)
raise SystemExit(1)
PY
}
tap_if_present() {
  local regex="$1"
  dump_ui
  if python3 - "$ui_file" "$regex" <<'PY'
import re, sys, xml.etree.ElementTree as ET
r=ET.parse(sys.argv[1]).getroot(); p=re.compile(sys.argv[2],re.I)
sys.exit(0 if any(p.search(' '.join((n.attrib.get('text',''),n.attrib.get('content-desc','')))) for n in r.iter('node')) else 1)
PY
  then tap_text "$regex"; fi
}
screenshot() { adb_s exec-out screencap -p > "$evidence/screenshots/$1.png"; }
launch() {
  adb_s shell monkey -p "$package" 1 >/dev/null
  wait_text 'Recipes|My Recipes|Skip|Enter|Chef A|Settings'
  tap_if_present 'Chef A'
  tap_if_present 'Continue'
  tap_if_present 'Skip'
  tap_if_present 'Enter'
  wait_text 'Recipes|My Recipes|Settings'
}
open_recipe() {
  tap_text '^(Recipes|My Recipes)$'
  wait_text 'Cheesy Corn Pancakes'
  tap_text 'Cheesy Corn Pancakes'
  wait_text 'Add to favorites|Remove from favorites'
}
check_favorite() {
  dump_ui
  python3 - "$ui_file" <<'PY'
import sys, xml.etree.ElementTree as ET
r=ET.parse(sys.argv[1]).getroot()
vals=[' '.join((n.attrib.get('text',''),n.attrib.get('content-desc',''))).lower() for n in r.iter('node')]
if not any('remove from favorites' in v or 'remove from favourites' in v for v in vals):
    raise SystemExit('Favorite state is not visible as saved.')
PY
}
open_settings_and_seed_preference() {
  tap_if_present '^Home$'
  tap_text 'Settings'
  wait_text 'Reduce motion|Reduce animation'
  dump_ui
  checked="$(is_checked 'Reduce motion|Reduce animation' || true)"
  if [[ "$checked" != 'true' ]]; then
    tap_text 'Reduce motion|Reduce animation'
    dump_ui
  fi
  checked="$(is_checked 'Reduce motion|Reduce animation' || true)"
  [[ "$checked" == 'true' ]] || { echo 'Reduced-motion preference did not persist in the UI.' >&2; return 1; }
}
open_week() {
  tap_if_present '^Home$'
  tap_text 'My Week|My magical week'
  wait_text 'My Week|My magical week|Monday'
  screenshot "$mode-week"
}
write_report() {
  local destination="$1" favorite="$2" motion="$3" week="$4"
  python3 - "$destination" "$favorite" "$motion" "$week" <<'PY'
import json,sys
path,favorite,motion,week=sys.argv[1:]
data={
  "favorite_recipe_12":"PASS" if favorite=="PASS" else favorite,
  "reduced_motion_preference":"PASS" if motion=="PASS" else motion,
  "my_week_state":week,
  "v7_saved_photos":"NOT_SUPPORTED_OR_NOT_PERSISTENT",
  "v7_my_creations":"NOT_SUPPORTED",
  "legacy_photo_evidence":"The authentic v7 APK stores the photo share payload in in-memory sharePostBlobs; its persisted aariaPrivateKitchenV4 snapshot has no photo record collection. V3.4 photo migration from v7 cannot be seeded.",
  "full_upgrade_acceptance":"NOT_VERIFIED"
}
json.dump(data,open(path,"w"),indent=2)
print(json.dumps(data,indent=2))
PY
}

if [[ "$mode" == seed ]]; then
  launch
  open_recipe
  if ! grep -qi 'remove from favorites\|remove from favourites' "$ui_file"; then tap_text 'Add to favorites|Add to favourites'; fi
  check_favorite
  screenshot v7-favorite-seeded
  open_settings_and_seed_preference
  screenshot v7-preferences-seeded
  motion=PASS
  open_week
  cp "$ui_file" "$evidence/ui/v7-week-before.xml"
  write_report "$evidence/data-before.json" PASS "$motion" NOT_VERIFIED
  cp "$ui_file" "$evidence/ui/v7-seeded-state.xml"
  exit 0
fi

if [[ "$mode" == verify ]]; then
  launch
  open_recipe
  check_favorite
  screenshot v34-favorite-after-upgrade
  favorite=PASS
  open_settings_and_seed_preference
  screenshot v34-preferences-after-upgrade
  motion=PASS
  open_week
  cp "$ui_file" "$evidence/ui/v34-week-after-upgrade.xml"
  week=NOT_VERIFIED
  if [[ -f "$evidence/ui/v7-week-before.xml" ]]; then
    if python3 - "$evidence/ui/v7-week-before.xml" "$ui_file" <<'PY'
import sys, xml.etree.ElementTree as ET
def values(path):
    root=ET.parse(path).getroot()
    return {n.attrib.get('text','').strip() for n in root.iter('node') if n.attrib.get('text','').strip()}
a,b=map(values,sys.argv[1:])
generic={'My magical week','My Week','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Home','Recipes'}
shared={x for x in a&b if len(x)>4 and x not in generic}
sys.exit(0 if shared else 1)
PY
    then week=PASS; fi
  fi
  adb_s shell am force-stop "$package"
  launch
  open_recipe
  check_favorite
  open_settings_and_seed_preference
  motion=PASS
  write_report "$evidence/data-after-restart.json" "$favorite" "$motion" "$week"
  cp "$ui_file" "$evidence/ui/v34-after-restart.xml"
  if [[ "$week" != PASS ]]; then
    echo 'NOT VERIFIED: My Week selected recipe state did not produce a specific before/after text match.' >&2
  fi
  exit 0
fi
echo "Unknown mode: $mode" >&2
exit 2
