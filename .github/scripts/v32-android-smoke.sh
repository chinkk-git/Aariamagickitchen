#!/usr/bin/env bash
set -euo pipefail
on_exit() {
  result=$?
  trap - EXIT
  if [ "$result" -ne 0 ]; then
    mkdir -p artifacts/v32-diagnostics
    printf 'android_smoke_exit_code=%s\n' "$result" > artifacts/v32-diagnostics/smoke-exit.txt
    timeout --kill-after=2s 15s adb logcat -d -t 12000 > artifacts/v32-diagnostics/logcat.txt 2>&1 || true
    timeout --kill-after=2s 15s adb shell dumpsys activity activities > artifacts/v32-diagnostics/activity.txt 2>&1 || true
    timeout --kill-after=2s 15s adb shell dumpsys window windows > artifacts/v32-diagnostics/windows.txt 2>&1 || true
    timeout --kill-after=2s 15s adb exec-out screencap -p > artifacts/v32-diagnostics/failure-screen.png 2>/dev/null || true
    cp -R artifacts/v32-android-screenshots artifacts/v32-diagnostics/partial-screenshots >/dev/null 2>&1 || true
  fi
  exit "$result"
}
trap on_exit EXIT
adb_timeout() { timeout --kill-after=10s 90s adb "$@"; }
adb_poll_timeout() { timeout --kill-after=2s 5s adb "$@"; }
ANDROID_SERIAL=${ANDROID_SERIAL:-}
export ANDROID_SERIAL
discover_android_serial() {
  local listed
  listed="$(adb_poll_timeout devices -l 2>&1 || true)"
  printf '%s\n' "$listed" | tee artifacts/v32-diagnostics/adb-devices-at-smoke-start.txt
  if [ -n "$ANDROID_SERIAL" ]; then
    if ! printf '%s\n' "$listed" | awk -v serial="$ANDROID_SERIAL" '$1 == serial && $2 == "device" { found=1 } END { exit !found }'; then
      echo "Configured Android serial $ANDROID_SERIAL is not an online emulator." >&2
      return 1
    fi
  else
    local -a candidates=()
    mapfile -t candidates < <(printf '%s\n' "$listed" | awk '$1 ~ /^emulator-[0-9]+$/ && $2 == "device" { print $1 }')
    if [ "${#candidates[@]}" -ne 1 ]; then
      echo "Expected exactly one online Android emulator; found ${#candidates[@]}." >&2
      return 1
    fi
    ANDROID_SERIAL="${candidates[0]}"
    export ANDROID_SERIAL
  fi
  echo "Selected online emulator: $ANDROID_SERIAL"
}
wait_for_booted_device() {
  echo "Waiting for $ANDROID_SERIAL to be online and fully booted"
  stable=0
  for attempt in $(seq 1 90); do
    state=$(adb_poll_timeout devices 2>/dev/null | awk -v serial="$ANDROID_SERIAL" '$1 == serial { print $2; exit }' || true)
    if [ "$state" = offline ]; then
      echo "$ANDROID_SERIAL is offline; requesting ADB reconnect (attempt $attempt/90)"
      adb_poll_timeout reconnect device >/dev/null 2>&1 || true
      stable=0
    elif [ "$state" = device ]; then
      booted=$(adb_poll_timeout -s "$ANDROID_SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
      if [ "$booted" = 1 ]; then
        stable=$((stable + 1))
        if [ "$stable" -ge 5 ]; then
          echo "$ANDROID_SERIAL is online and fully booted across five consecutive checks"
          return 0
        fi
      else
        stable=0
      fi
    else
      stable=0
    fi
    sleep 2
  done
  adb_poll_timeout devices -l || true
  echo "Timed out waiting for $ANDROID_SERIAL to become online and fully booted" >&2
  return 1
}
wait_for_stable_launcher() {
  echo 'Warming Android HOME and waiting for Quickstep to settle before the app launch'
  adb_timeout -s "$ANDROID_SERIAL" shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME
  stable=0
  rebooted=0
  attempt=0
  while [ "$attempt" -lt 45 ]; do
    attempt=$((attempt + 1))
    windows=$(adb_poll_timeout -s "$ANDROID_SERIAL" shell dumpsys window windows 2>/dev/null || true)
    activities=$(adb_poll_timeout -s "$ANDROID_SERIAL" shell dumpsys activity activities 2>/dev/null || true)
    anr_window=$(printf '%s' "$windows" | grep -Ei 'Window\{[^}]*Application Not Responding|WindowStateAnimator\{[^}]*Application Not Responding' | head -1 || true)
    if [ -n "$anr_window" ]; then
      stable=0
      if [ "$rebooted" -eq 0 ]; then
        echo "Android showed an ANR before the app smoke; rebooting the emulator once: $anr_window" >&2
        printf 'startup_anr_recovery=reboot\nstartup_anr_window=%s\n' "$anr_window" > artifacts/v32-diagnostics/launcher-preflight.txt
        rebooted=1
        adb_timeout -s "$ANDROID_SERIAL" reboot
        wait_for_booted_device
        adb_timeout -s "$ANDROID_SERIAL" shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME
        stable=0
        attempt=0
        continue
      fi
      printf 'startup_anr_recovery=reboot\nstartup_anr_window=%s\nstartup_anr_persisted=true\n' "$anr_window" > artifacts/v32-diagnostics/launcher-preflight.txt
      echo "Android still shows an ANR after one clean reboot; refusing to capture evidence: $anr_window" >&2
      return 1
    elif printf '%s' "$activities" | grep -Eq 'ResumedActivity: ActivityRecord.*com\.android\.launcher3/.uioverrides\.QuickstepLauncher'; then
      stable=$((stable + 1))
      if [ "$stable" -ge 3 ]; then
        printf 'startup_anr_recovery=%s\nlauncher_stable_checks=%s\n' "$([ "$rebooted" -eq 1 ] && echo rebooted || echo none)" "$stable" > artifacts/v32-diagnostics/launcher-preflight.txt
        echo 'Quickstep HOME stayed resumed across three checks with no ANR window'
        return 0
      fi
    else
      stable=0
    fi
    sleep 2
  done
  printf 'startup_anr_recovery=%s\nlauncher_preflight=timeout\n' "$([ "$rebooted" -eq 1 ] && echo rebooted || echo none)" > artifacts/v32-diagnostics/launcher-preflight.txt
  echo 'Quickstep did not reach a stable HOME state; refusing to continue Android evidence capture' >&2
  return 1
}
mkdir -p artifacts/v32-android-screenshots artifacts/v31-android-screenshots
mkdir -p artifacts/v32-diagnostics
echo 'Waiting for emulator ADB'
discover_android_serial
adb_timeout -s "$ANDROID_SERIAL" wait-for-device
wait_for_booted_device
{
  printf 'serial=%s\n' "$ANDROID_SERIAL"
  adb_timeout -s "$ANDROID_SERIAL" shell getprop sys.boot_completed
  adb_timeout -s "$ANDROID_SERIAL" shell getprop ro.build.version.release
  adb_timeout -s "$ANDROID_SERIAL" shell getprop ro.build.version.sdk
  adb_timeout -s "$ANDROID_SERIAL" shell getprop ro.product.model
  adb_timeout -s "$ANDROID_SERIAL" shell df -h /data
} | tee artifacts/v32-diagnostics/emulator-boot-properties.txt
wait_for_stable_launcher
echo 'Installing the previous V3.2 preview, V3.1 baseline and uniquely identified V3.2 visual review build side by side'
BASELINE_APP_ID=com.aaria.magickitchen.pilot.v31preview
PREVIOUS_V32_APP_ID=com.aaria.magickitchen.pilot.v32preview
PREVIOUS_V32_REVIEW_APP_ID=com.aaria.magickitchen.pilot.v32review70
APP_ID=${ANDROID_TEST_APP_ID:-"com.aaria.magickitchen.pilot.v32review${GITHUB_RUN_NUMBER:-local}"}
baseline_candidates=(artifacts/v31-baseline-apk/*.apk)
if [ "${#baseline_candidates[@]}" -ne 1 ] || [ ! -s "${baseline_candidates[0]}" ]; then
  echo "Expected exactly one archived Classic preview APK under artifacts/v31-baseline-apk; found ${#baseline_candidates[@]}" >&2
  find artifacts/v31-baseline-apk -maxdepth 2 -type f -print >&2 || true
  exit 1
fi
BASELINE_APK=${baseline_candidates[0]}
previous_review_candidates=(artifacts/v32-previous-review-apk/*.apk)
if [ "${#previous_review_candidates[@]}" -ne 1 ] || [ ! -s "${previous_review_candidates[0]}" ]; then
  echo "Expected exactly one previous unique V3.2 review APK; found ${#previous_review_candidates[@]}" >&2
  exit 1
fi
adb_timeout install -r "${previous_review_candidates[0]}"
adb_timeout shell pm path "$PREVIOUS_V32_REVIEW_APP_ID" | grep -q 'package:'
echo "Previous uniquely identified V3.2 review package remains installed: $PREVIOUS_V32_REVIEW_APP_ID"
if [ "${GITHUB_RUN_NUMBER:-}" = "74" ]; then
  previous_v32_candidates=(artifacts/v32-previous-preview-apk/*.apk)
  if [ "${#previous_v32_candidates[@]}" -ne 1 ] || [ ! -s "${previous_v32_candidates[0]}" ]; then
    echo "Expected the previous V3.2 preview APK for the one-time install-conflict regression." >&2
    exit 1
  fi
  PREVIOUS_V32_APK=${previous_v32_candidates[0]}
  adb_timeout install -r "$PREVIOUS_V32_APK"
  adb_timeout shell pm path "$PREVIOUS_V32_APP_ID" | grep -q 'package:'
  echo "Previous V3.2 package remains installed: $PREVIOUS_V32_APP_ID"
fi
adb_timeout install -r "$BASELINE_APK"
adb_timeout shell pm path "$BASELINE_APP_ID" | grep -q 'package:'
adb_timeout install -r phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
adb_timeout shell pm path "$BASELINE_APP_ID" | grep -q 'package:'
adb_timeout shell pm path "$APP_ID" | grep -q 'package:'
if [ "${GITHUB_RUN_NUMBER:-}" = "74" ]; then
  adb_timeout shell pm path "$PREVIOUS_V32_APP_ID" | grep -q 'package:'
fi
echo "Co-install verified: V3.1 baseline and uniquely identified V3.2 visual review package $APP_ID"
echo 'Starting V3.2 Android activity'
adb_timeout shell am start -n "$APP_ID"/com.aaria.magickitchen.pilot.MainActivity
socket=""
for attempt in $(seq 1 30); do
  app_pid=$(adb_poll_timeout shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' | awk '{print $1}' || true)
  if [ -n "$app_pid" ]; then
    socket=$(adb_poll_timeout shell cat /proc/net/unix 2>/dev/null | grep -o "webview_devtools_remote_${app_pid}" | head -1 || true)
  fi
  [ -n "$socket" ] && break
  sleep 2
done
test -n "$socket"
echo "Forwarding app-owned WebView DevTools socket: $socket (app PID $app_pid)"
adb_timeout forward tcp:9222 "localabstract:$socket"
timeout --kill-after=10s 1800s node --input-type=module <<'NODE'
const {execFileSync} = await import('node:child_process');
const {readFileSync, statSync, renameSync, unlinkSync, writeFileSync, mkdirSync} = await import('node:fs');
const {createHash} = await import('node:crypto');
const {clickByDatasetExpression, clickSelectorExpression, findByDatasetExpression, navigationSummaryExpression} = await import('./tools/v3/android-webview-smoke-expressions.mjs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const adb = args => execFileSync('timeout', ['--kill-after=10s','60s','adb',...args], { maxBuffer: 32 * 1024 * 1024 });
async function waitForVisible(selector, label) {
  let last = '';
  for (let attempt=0; attempt<30; attempt++) {
    const state = await evaluate(`(() => { const screen=document.querySelector('#screen'); const node=screen?.querySelector(${JSON.stringify(selector)}); if(!node)return {screen:screen?.className||'',text:''}; const rect=node.getBoundingClientRect(), style=getComputedStyle(node); return {screen:screen.className,text:node.innerText||'',visible:style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0}; })()`);
    last = JSON.stringify(state);
    if (state?.visible) return state;
    await pause(250);
  }
  throw new Error(`${label} did not become visible in #screen; last state: ${last}`);
}
async function prepareVisibleRecipeCapture(selector, label) {
  const state = await evaluate(`(() => { const screen=document.querySelector('#screen'); const node=screen?.querySelector(${JSON.stringify(selector)}); if(!node) return {visible:false,reason:'missing target'}; node.scrollIntoView({block:'center',inline:'nearest'}); const rect=node.getBoundingClientRect(), root=screen.getBoundingClientRect(), style=getComputedStyle(node); const visible=style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0&&rect.bottom>root.top&&rect.top<root.bottom&&rect.right>root.left&&rect.left<root.right; return {visible,text:(node.innerText||node.textContent||'').trim(),rect:{top:Math.round(rect.top),bottom:Math.round(rect.bottom),left:Math.round(rect.left),right:Math.round(rect.right)},screen:{top:Math.round(root.top),bottom:Math.round(root.bottom),left:Math.round(root.left),right:Math.round(root.right)}}; })()`);
  if (!state?.visible) throw new Error(`${label} is not visibly inside the active app screen before screenshot: ${JSON.stringify(state)}`);
  await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  await pause(500);
  const settled = await evaluate(`(() => { const screen=document.querySelector('#screen'); const node=screen?.querySelector(${JSON.stringify(selector)}); if(!node) return {visible:false,reason:'target disappeared'}; const rect=node.getBoundingClientRect(), root=screen.getBoundingClientRect(), style=getComputedStyle(node); return {visible:style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0&&rect.bottom>root.top&&rect.top<root.bottom&&rect.right>root.left&&rect.left<root.right,text:(node.innerText||node.textContent||'').trim()}; })()`);
  if (!settled?.visible) throw new Error(`${label} left the active app viewport before screenshot: ${JSON.stringify(settled)}`);
  return settled;
}
async function assertNoAndroidAnr(label) {
  const windows = adb(['shell','dumpsys','window','windows']).toString('utf8');
  const anrWindow = windows.match(/Window\{[^}\n]*Application Not Responding[^}\n]*\}/i)?.[0];
  if (anrWindow) throw new Error(`${label}: Android displayed a system ANR overlay (${anrWindow})`);
}
async function captureScreenshot(name, label, previousDigest = null) {
  const output = `artifacts/v32-android-screenshots/${name}`;
  const pending = `${output}.pending`;
  for (let attempt = 0; attempt < 20; attempt++) {
    await assertNoAndroidAnr(label);
    await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    const screenshot = adb(['exec-out','screencap','-p']);
    await assertNoAndroidAnr(label);
    const isPng = screenshot.length >= 10000 && screenshot.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    if (isPng) {
      const digest = createHash('sha256').update(screenshot).digest('hex');
      if (!previousDigest || digest !== previousDigest) {
        writeFileSync(pending, screenshot);
        renameSync(pending, output);
        return digest;
      }
    }
    try { unlinkSync(pending); } catch {}
    await pause(1000);
  }
  throw new Error(`${label} screenshot framebuffer did not refresh to a distinct image after the route became active`);
}
async function currentRotation() {
  let last = 'unknown';
  try {
    const status = adb(['shell','dumpsys','window']).toString('utf8');
    const rotation = status.match(/mRotation=(\d)/)?.[1] || status.match(/mRotation=ROTATION_(0|90|180|270)/)?.[1];
    last = rotation === '90' ? '1' : rotation === '180' ? '2' : rotation === '270' ? '3' : rotation || 'unknown';
  } catch {}
  if (!['0','1','2','3'].includes(last)) throw new Error(`Could not read Android display rotation; last observed: ${last}`);
  return Number(last);
}
async function waitForRotationChange(previous) {
  let last = previous;
  for (let attempt=0; attempt<30; attempt++) {
    try { last = await currentRotation(); } catch {}
    if (last !== previous) return last;
    await pause(1000);
  }
  throw new Error(`Android display rotation did not change from ${previous}; last observed: ${last}`);
}
async function waitForOrientation(landscapeExpected) {
  let last = 'unknown';
  for (let attempt=0; attempt<30; attempt++) {
    try {
      last = await currentRotation();
      if ((last % 2 === 1) === landscapeExpected) return last;
    } catch {}
    await pause(1000);
  }
  throw new Error(`Android display did not reach ${landscapeExpected ? 'landscape' : 'portrait'} orientation; last observed rotation: ${last}`);
}
async function waitForWebViewOrientation(landscapeExpected) {
  let last = null;
  let stable = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    last = await evaluate(`(() => ({innerWidth, innerHeight, visualWidth: visualViewport?.width ?? null, visualHeight: visualViewport?.height ?? null, orientation: screen.orientation?.type ?? 'unknown'}))()`);
    const viewportIsLandscape = last.innerWidth > last.innerHeight && (last.visualWidth === null || last.visualWidth > last.visualHeight);
    const matches = viewportIsLandscape === landscapeExpected;
    stable = matches ? stable + 1 : 0;
    if (stable >= 3) {
      console.log(`WebView viewport settled in ${landscapeExpected ? 'landscape' : 'portrait'}: ${JSON.stringify(last)}`);
      return last;
    }
    await pause(500);
  }
  throw new Error(`Android display rotated but WebView viewport did not settle in ${landscapeExpected ? 'landscape' : 'portrait'}; last viewport: ${JSON.stringify(last)}`);
}
async function rotateTo(expected) {
  const landscapeExpected = expected % 2 === 1;
  for (let attempt=0; attempt<4; attempt++) {
    const current = await currentRotation();
    if ((current % 2 === 1) === landscapeExpected) return current;
    adb(['emu','rotate']);
    await waitForRotationChange(current);
  }
  return await waitForOrientation(landscapeExpected);
}
console.log('Waiting for the app-owned Android WebView debugging target');
let target;
for (let attempt=0; attempt<60 && !target; attempt++) {
  try {
    const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
    target = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl && (item.url?.includes('/android_asset/index.html') || item.title?.includes('Magical Kitchen')));
  } catch {}
  if (!target) await pause(1000);
}
if (!target) throw new Error('Android WebView page target was not found');
console.log('Connected app WebView target:', target.title || '(untitled)', target.url || '(no URL)');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, {once:true}); ws.addEventListener('error', reject, {once:true}); });
console.log('WebView DevTools WebSocket opened');
console.log('Allowing the offline kitchen page to settle briefly');
await pause(8000);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', async event => {
  let payload=event.data;
  if(typeof payload!=='string')payload=typeof payload?.text==='function'?await payload.text():Buffer.from(payload).toString('utf8');
  let message;
  try{message=JSON.parse(payload)}catch(error){console.error('Could not parse DevTools message:',String(error));return}
  if (!message.id || !pending.has(message.id)) return;
  const {resolve, reject, timer} = pending.get(message.id); pending.delete(message.id); clearTimeout(timer);
  message.error ? reject(new Error(message.error.message)) : resolve(message.result);
});
ws.addEventListener('close', event => {for(const {reject,timer} of pending.values()){clearTimeout(timer);reject(new Error(`DevTools socket closed (${event.code})`))}pending.clear()});
ws.addEventListener('error', () => {for(const {reject,timer} of pending.values()){clearTimeout(timer);reject(new Error('DevTools socket error'))}pending.clear()});
async function evaluate(expression) {
  const id = ++seq;
  const result = new Promise((resolve, reject) => {
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`DevTools command ${id} timed out: ${expression.slice(0,100)}`))},30000);
    pending.set(id, {resolve, reject, timer});
  });
  ws.send(JSON.stringify({id, method:'Runtime.evaluate', params:{expression, returnByValue:true, awaitPromise:true}}));
  const response = await result;
  if (response.exceptionDetails) { const d=response.exceptionDetails, detail=d.exception?.description||String(d.exception?.value??d.text??'WebView evaluation failed'); throw new Error(`${detail}; expression=${expression.slice(0,240)}`); }
  return response.result?.value;
}
async function clickRecipeIngredient(index) {
  return evaluate(clickByDatasetExpression('.ref-ingredient-grid input', 'check', index));
}
async function clickCatalogueRecipe(id) {
  return evaluate(clickByDatasetExpression('#screen [data-open]', 'open', id));
}
async function clickWebViewSelector(selector, label = selector) {
  if (!await evaluate(clickSelectorExpression(selector))) throw new Error(`${label} control was not found.`);
  return true;
}
async function assertRecipe12IngredientGrid(label) {
  const layout=await evaluate(`(()=>{const grid=document.querySelector('.ref-ingredient-grid'),screen=document.querySelector('#screen'),main=document.querySelector('.reference-main');if(!grid||!screen||!main)return {missing:true};const cards=[...grid.querySelectorAll('.ref-ingredient')],cols=getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).length,boxes=cards.map(card=>{const art=card.querySelector('.ref-ingredient-icon'),name=card.querySelector('.ref-ingredient-icon + span'),input=card.querySelector('input[type=checkbox]'),cr=card.getBoundingClientRect(),ar=art?.getBoundingClientRect(),nr=name?.getBoundingClientRect(),ir=input?.getBoundingClientRect(),range=document.createRange();if(name)range.selectNodeContents(name);const lines=[...range.getClientRects()];return {card:{left:cr.left,right:cr.right,top:cr.top,bottom:cr.bottom},art:ar&&{left:ar.left,right:ar.right,top:ar.top,bottom:ar.bottom},name:nr&&{left:nr.left,right:nr.right,top:nr.top,bottom:nr.bottom,scrollWidth:name.scrollWidth,clientWidth:name.clientWidth,lines:lines.length},input:ir&&{width:ir.width,height:ir.height,labels:input.labels?.length||0,labelText:input.closest('label')?.innerText||''}}});return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,screen:screen.getBoundingClientRect().width,main:main.getBoundingClientRect().width,grid:grid.getBoundingClientRect().width,cols,rows:new Set(boxes.map(x=>Math.round(x.card.top))).size,count:cards.length,boxes}})()`);
  if(layout.missing||layout.count!==6||layout.cols<1||layout.cols>6||layout.rows!==Math.ceil(6/layout.cols)||layout.documentWidth>layout.width+1||layout.grid<layout.width*.68||layout.main<layout.width*.82)throw new Error(`${label}: #12 approved ingredient grid does not use the phone viewport or has invalid card geometry: ${JSON.stringify(layout)}`);
  for(const [i,card] of layout.boxes.entries()){
    const overlap=card.art&&card.name&&card.art.right>card.name.left&&card.art.left<card.name.right&&card.art.bottom>card.name.top&&card.art.top<card.name.bottom;
    if(!card.art||!card.name||!card.input||overlap||card.input.width<12||card.input.height<12||card.input.labels<1||!card.input.labelText.trim()||card.name.scrollWidth>card.name.clientWidth+1||card.name.lines>8)throw new Error(`${label}: #12 ingredient ${i+1} overlaps, clips or lacks a labeled checkbox: ${JSON.stringify({layout,card})}`);
  }
  return layout;
}
async function assertNarrowPtBrIngredientGrid() {
  await command('Emulation.setDeviceMetricsOverride',{width:320,height:720,deviceScaleFactor:2,mobile:true,screenOrientation:{angle:0,type:'portraitPrimary'}});
  try {
    await pause(300);
    const layout=await assertRecipe12IngredientGrid('PT-BR 320 CSS-pixel phone viewport');
    if(Math.min(...layout.boxes.map(card=>card.name.clientWidth))<50)throw new Error('PT-BR ingredient text column is too narrow at 320 CSS pixels: '+JSON.stringify(layout));
  } finally {
    await command('Emulation.clearDeviceMetricsOverride');
    await pause(300);
  }
  await waitForWebViewOrientation(false);
}
async function command(method, params={}) {
  const id=++seq;
  const result=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`DevTools ${method} timed out`))},30000);
    pending.set(id,{resolve,reject,timer});
  });
  ws.send(JSON.stringify({id,method,params}));
  return await result;
}
await command('Runtime.enable');
await evaluate('true');
console.log('DevTools Runtime.evaluate responds on the app-owned target');
let ready = false;
for (let attempt=0; attempt<60 && !ready; attempt++) {
  ready = await evaluate(`!!document.querySelector('#v3ProfileDialog') || !!document.querySelector('[data-v3-profile-open]')`);
  if (!ready) await pause(1000);
}
if (!ready) throw new Error('Android WebView did not reach profile setup or a ready home within 60 seconds');
await evaluate(`(() => { const dialog=document.querySelector('#v3ProfileDialog'); if(!dialog) return 'existing-profile'; const name=dialog.querySelector('#v3ProfileName'); const chef=dialog.querySelector('[data-v3-chef="CHEF_A"]'); const submit=dialog.querySelector('[data-v3-profile-continue]'); if(!name||!chef||!submit) throw Error('unexpected first-run profile setup'); name.value='Preview Chef'; chef.click(); submit.click(); return 'profile-created'; })()`);
const homeState = await waitForVisible('.v31-hero-welcome h1', 'Home heading');
if (!homeState.screen.includes('home-page') || await evaluate(`!!document.querySelector('#v3ProfileDialog')`)) throw new Error(`Home screen did not become the active page after test profile setup: ${JSON.stringify(homeState)}`);
await rotateTo(0);
await waitForVisible('.v31-hero-welcome h1', 'Home heading after portrait normalization');
console.log('Android home screen loaded with the test profile');
const homeVisual = await evaluate(`(() => { const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null}; const images=[...document.querySelectorAll('.v31-reference-hero img,.v31-brand-lockup,.v31-featured-art img')];const destinations=[...document.querySelectorAll('.v31-destination-tile')];const nav=[...document.querySelectorAll('#nav .tab')];return {hero:rect(document.querySelector('.v31-reference-hero')),brand:rect(document.querySelector('.v31-brand-lockup')),heroImages:images.map(i=>({loaded:i.complete&&i.naturalWidth>0,alt:i.alt,width:i.naturalWidth})),tiles:document.querySelectorAll('.v31-action-tile').length,featured:rect(document.querySelector('.v31-featured-card')),destinationTiles:destinations.length,destinationCodes:destinations.map(tile=>tile.getAttribute('data-v31-card-country')||''),indiaTileVisible:destinations.length===1&&!!destinations[0].getBoundingClientRect().width&&!!destinations[0].getBoundingClientRect().height,nav:nav.map(b=>b.innerText.trim())}; })()`);
// W02 exposes only the validated India destination until international recipes are active.
if (!homeVisual.hero || homeVisual.hero.w < 260 || homeVisual.hero.h < 150 || !homeVisual.brand || homeVisual.heroImages.some(i=>!i.loaded) || homeVisual.tiles!==4 || !homeVisual.featured || homeVisual.destinationTiles!==1 || JSON.stringify(homeVisual.destinationCodes)!=='["IND"]' || !homeVisual.indiaTileVisible || homeVisual.nav.length!==6) throw new Error(`Approved Home visual composition is incomplete in Android: ${JSON.stringify(homeVisual)}`);
const reviewFeatured=await evaluate(`(()=>{const rail=document.querySelector('.v32-review-featured-rail'),style=rail?getComputedStyle(rail):null,cards=[...document.querySelectorAll('.v32-review-featured-card')];return {ids:cards.map(e=>Number(e.dataset.v32ReviewFeaturedId)),contract:rail?.dataset.v32FeaturedIds||'',overflowX:style?.overflowX||'',title:document.querySelector('.v32-review-featured-section h2')?.textContent?.trim()||'',ready:document.querySelector('.v32-review-featured-card .v31-featured-kicker')?.textContent?.trim()||'',cardTitle:cards[0]?.querySelector('strong')?.textContent?.trim()||'',visible:!!rail&&rail.getBoundingClientRect().width>0&&rail.getBoundingClientRect().height>0}})()`);
if(JSON.stringify(reviewFeatured.ids)!=='[12]'||reviewFeatured.contract!=='12'||reviewFeatured.overflowX!=='auto'||!reviewFeatured.visible||reviewFeatured.title!=='⭐ Featured Recipes'||reviewFeatured.ready!=='READY FOR REVIEW'||reviewFeatured.cardTitle!=='Cheesy Corn Pancakes')throw new Error('Review Featured Recipes must contain only the current pilot recipe #12 in a visible horizontal rail: '+JSON.stringify(reviewFeatured));
await clickWebViewSelector('.v32-review-featured-card[data-v32-review-featured-id="12"]','Featured recipe #12');await waitForVisible('.reference-layout','Featured recipe 12 direct route');
if(!await evaluate(`view==='recipe'&&Number(selected?.id)===12`))throw new Error('Featured recipe #12 card did not open recipe #12.');
await clickWebViewSelector('#nav .tab[data-nav="home"]','Home');await waitForVisible('.v32-review-featured-rail','Home after featured recipe route');
await evaluate(`state.language='pt-BR';save();render()`);
const ptFeatured=await evaluate(`(()=>({ids:[...document.querySelectorAll('.v32-review-featured-card')].map(e=>Number(e.dataset.v32ReviewFeaturedId)),title:document.querySelector('.v32-review-featured-card strong')?.textContent?.trim()||'',heading:document.querySelector('.v32-review-featured-section h2')?.textContent?.trim()||''}))()`);
if(JSON.stringify(ptFeatured.ids)!=='[12]'||ptFeatured.title!=='Panquequinhas de milho com queijo'||ptFeatured.heading!=='⭐ Receitas em destaque')throw new Error('PT-BR current-batch Featured Recipes content mismatch: '+JSON.stringify(ptFeatured));
await evaluate(`state.language='en-GB';save();render()`);await waitForVisible('.v32-review-featured-rail','English Featured Recipes restored');
console.log('Installed Android Home visual composition verified:', JSON.stringify(homeVisual));
const homeDigest = await captureScreenshot('v31-home-portrait.png', 'Home');
if (statSync('artifacts/v32-android-screenshots/v31-home-portrait.png').size < 10000) throw new Error('Home screenshot is unexpectedly small');
const groupAvatarAudits=[];
for(const scene of [
 {mode:'family',keys:['aaria','mommy','daddy'],labels:['Aaria','Mommy','Daddy']},
 {mode:'friends',keys:['rohan','arjun','vihaan','isha','meera','sana','diya'],labels:['Rohan','Arjun','Vihaan','Isha','Meera','Sana','Diya']}
]){
 const groupEntry=await evaluate(`(()=>{const button=document.querySelector('.v31-home-quick-links [data-nav="${scene.mode}"]');if(!button)return false;button.click();return view==='${scene.mode}'})()`); if(!groupEntry)throw new Error(`Home ${scene.mode} entry did not open its route`);
 await waitForVisible(`.v32-${scene.mode}-avatar-cast`,`${scene.mode} canonical avatar scene`);
 const report=await evaluate(`(()=>{const imgs=[...document.querySelectorAll('.v32-${scene.mode}-avatar-cast img[data-v32-avatar]')];return {keys:imgs.map(i=>i.dataset.v32Avatar),labels:imgs.map(i=>i.alt),assetsMatch:imgs.every(i=>i.src===(i.dataset.v32Avatar==='aaria'?V31_HOME_WORLD_ART.aaria:V31_HOME_WORLD_ART.avatars[i.dataset.v32Avatar]))}})()`);
 if(JSON.stringify(report.keys)!==JSON.stringify(scene.keys)||JSON.stringify(report.labels)!==JSON.stringify(scene.labels)||!report.assetsMatch)throw new Error(`Canonical ${scene.mode} avatar identity/source mismatch: ${JSON.stringify(report)}`);
 groupAvatarAudits.push({mode:scene.mode,...report});
 await captureScreenshot(`v32-${scene.mode}-avatars-portrait.png`,`${scene.mode} canonical avatar scene`);
 await evaluate(`document.querySelector('#nav .tab[data-nav="home"]')?.click()`);
 await waitForVisible('.v31-hero-welcome h1',`Home restored after ${scene.mode} avatar scene`);
}
console.log('Canonical Aaria, family and seven friend identities verified in existing routes:',JSON.stringify(groupAvatarAudits));

const isW02Globe=(process.env.ANDROID_TEST_APP_ID||'').includes('.v33map');
let worldDigest;
if(isW02Globe){
  await evaluate(`document.querySelector('[data-v31-open-world]').click()`);
  const worldState=await waitForVisible('.aria-world-globe__eyebrow','Magical Spinning Globe heading');
  if(await evaluate(`typeof view==='undefined'?'unknown':view`)!=='world'||worldState.text.trim()!=='World Adventure')throw new Error('W02 World route did not mount the W03 globe: '+JSON.stringify(worldState));
  const globe=await evaluate(`(()=>{const root=document.querySelector('.aria-world-globe'),sphere=root?.querySelector('.aria-world-globe__sphere'),stage=root?.querySelector('.aria-world-globe__stage'),flag=root?.querySelector('.aria-world-globe__flag[aria-label="India"]'),guide=root?.querySelector('.aria-world-globe__guide'),hand=root?.querySelector('.aria-world-globe__guide-hand'),flags=root?.querySelector('.aria-world-globe__flags'),rr=root?.getBoundingClientRect(),sr=sphere?.getBoundingClientRect(),fr=flag?.getBoundingClientRect(),hr=hand?.getBoundingClientRect(),handStyle=hand?getComputedStyle(hand):null,guideStyle=guide?getComputedStyle(guide):null,clip=hr?{left:hr.left+hr.width*.61,right:hr.left+hr.width,top:hr.top+hr.height*.27,bottom:hr.top+hr.height*.46}:null,overlap=!!clip&&!!sr&&Math.max(0,Math.min(clip.right,sr.right)-Math.max(clip.left,sr.left))*Math.max(0,Math.min(clip.bottom,sr.bottom)-Math.max(clip.top,sr.top));return {route:typeof view==='undefined'?'unknown':view,version:window.AariaWorldAdventureGlobe?.version||'',heading:root?.querySelector('.aria-world-globe__eyebrow')?.textContent?.trim()||'',occupancy:rr&&innerWidth?rr.width*rr.height/(innerWidth*innerHeight):0,sphere:{width:sr?.width||0,height:sr?.height||0},flag:{width:fr?.width||0,height:fr?.height||0},guide:!!guide?.complete&&guide.naturalWidth>0&&guide.src===V33_WORLD_ARTWORK.pointingAaria&&guideStyle?.display!=='none'&&!!guide.getBoundingClientRect().width,hand:{visible:!!hand&&hand.complete&&hand.naturalWidth>0&&handStyle?.display!=='none'&&handStyle?.clipPath!=='none',overlapArea:overlap,flagsAbove:!!flags&&Number(getComputedStyle(flags).zIndex)>Number(handStyle?.zIndex||0),flagsInStage:!!stage&&flags?.parentElement===stage},countries:[...root?.querySelectorAll('.aria-world-globe__flag')||[]].map(e=>e.getAttribute('aria-label')),nav:document.querySelectorAll('#nav .tab').length}})()`);
  if(globe.route!=='world'||globe.version!=='0.3.0-natural-earth-orthographic'||globe.heading!=='World Adventure'||globe.occupancy<.65||globe.sphere.width<180||globe.flag.width<48||globe.flag.height<48||!globe.guide||!globe.hand.visible||globe.hand.overlapArea<1||!globe.hand.flagsAbove||!globe.hand.flagsInStage||!globe.countries.includes('India')||globe.nav!==6)throw new Error('Android W03 globe/module/touch geometry audit failed: '+JSON.stringify(globe));
  worldDigest=await captureScreenshot('v31-world-portrait.png','W03 globe',homeDigest);if(worldDigest===homeDigest)throw new Error('W03 globe screenshot is byte-identical to Home');
  await rotateTo(1);await waitForWebViewOrientation(true);
  const landscape=await waitForVisible('.aria-world-globe__eyebrow','W03 globe after landscape rotation');
  const landscapeGlobe=await evaluate(`(()=>{const root=document.querySelector('.aria-world-globe'),sphere=root?.querySelector('.aria-world-globe__sphere'),flag=root?.querySelector('.aria-world-globe__flag[aria-label="India"]'),sr=sphere?.getBoundingClientRect(),fr=flag?.getBoundingClientRect(),nav=document.querySelector('#nav'),nr=nav?.getBoundingClientRect();return {route:typeof view==='undefined'?'unknown':view,width:innerWidth,height:innerHeight,sphereWidth:sr?.width||0,flagWidth:fr?.width||0,flagHeight:fr?.height||0,navDisplay:nav?getComputedStyle(nav).display:'missing',navHeight:nr?.height||0}})()`);
  if(landscapeGlobe.route!=='world'||landscapeGlobe.width<=landscapeGlobe.height||landscapeGlobe.sphereWidth<180||landscapeGlobe.flagWidth<48||landscapeGlobe.flagHeight<48||landscapeGlobe.navDisplay==='none'||landscapeGlobe.navHeight<40)throw new Error('Android W03 globe landscape geometry/navigation failed: '+JSON.stringify({landscape,landscapeGlobe}));
  await captureScreenshot('v31-world-landscape.png','W03 globe landscape',worldDigest);const worldPng=readFileSync('artifacts/v32-android-screenshots/v31-world-landscape.png');if(worldPng.readUInt32BE(16)<=worldPng.readUInt32BE(20))throw new Error('W03 globe landscape screenshot has portrait dimensions');
  await rotateTo(0);await waitForWebViewOrientation(false);await waitForVisible('.aria-world-globe__eyebrow','W03 globe after portrait return');
  await evaluate(`document.querySelector('.aria-world-globe__flag[aria-label="India"]')?.click()`);
  const countryPreview=await waitForVisible('.aria-world-globe__panel-head h2','India recipe panel');
  const india=await evaluate(`({name:document.querySelector('.aria-world-globe__panel-head h2')?.textContent?.trim()||'',ids:[...document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]')].map(x=>Number(x.dataset.recipeId))})`);
  if(india.name!=='India'||india.ids.length!==18||new Set(india.ids).size!==18||india.ids.some(id=>![51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74].includes(id)))throw new Error('W03 India must expose exactly its 18 canonical recipes: '+JSON.stringify(india));
  await evaluate(`document.querySelector('.aria-world-globe__recipe[data-recipe-id="51"]')?.click()`);
  const recipe=await waitForVisible('.ref-hero h1','India recipe heading');if(recipe.text!=='Masala Cheese Toast')throw new Error('India recipe card did not open Masala Cheese Toast: '+JSON.stringify(recipe));

}else{
await evaluate(`document.querySelector('[data-v31-open-world]').click()`);
const worldState = await waitForVisible('.w02-map-header h1', 'Adventure Explorer heading');
if (!worldState.screen.includes('v31-world-screen') || !worldState.text.includes('World Map')) throw new Error('World route did not replace the active screen; got: ' + JSON.stringify(worldState));
console.log('Visible World route verified:', worldState.text);
let approvedMapImageReady=false;for(let attempt=0;attempt<60;attempt++){approvedMapImageReady=await evaluate(`(()=>{const image=document.querySelector('.v31-map-art-image'),expected=V31_HOME_WORLD_ART.worldMap;return !!image&&image.src===expected&&image.complete&&image.naturalWidth>0})()`);if(approvedMapImageReady)break;await pause(250)}if(!approvedMapImageReady)throw new Error('approved World Map crop did not finish loading in Android');
const worldVisual = await evaluate(`(() => {const screen=document.querySelector('#screen.v31-world-screen'),viewport=document.querySelector('[data-w02-fixed-map]'),art=document.querySelector('.w02-map-art'),image=document.querySelector('.v31-map-art-image'),marker=document.querySelector('.w02-country-marker'),sr=screen?.getBoundingClientRect(),vr=viewport?.getBoundingClientRect(),ar=art?.getBoundingClientRect(),mr=marker?.getBoundingClientRect(),expected=V31_HOME_WORLD_ART.worldMap,style=viewport?getComputedStyle(viewport):null,approvedArt=expected.startsWith('data:image/webp;base64,')&&image?.src===expected&&image.complete&&image.naturalWidth>0,occupancy=sr&&vr?vr.width*vr.height/(sr.width*sr.height):0,aspect=ar?.width&&ar?.height?ar.width/ar.height:0,imageAspect=image?.naturalWidth&&image?.naturalHeight?image.naturalWidth/image.naturalHeight:0,local=ar&&mr?{x:((mr.left+mr.right)/2-ar.left)/ar.width,y:((mr.top+mr.bottom)/2-ar.top)/ar.height}:null;return {approvedArt,occupancy,aspect,imageAspect,objectFit:image?getComputedStyle(image).objectFit:'',borderWidth:style?.borderWidth||'',borderRadius:style?.borderRadius||'',countries:[...document.querySelectorAll('[data-v31-country]')].map(x=>x.dataset.v31Country),marker:{width:mr?.width||0,height:mr?.height||0,local},forbiddenControls:document.querySelectorAll('[data-v31-zoom],[data-v31-pan-toggle],.v31-map-pin,.v31-world-map').length,passportButton:!!document.querySelector('.w02-passport-button'),nav:document.querySelectorAll('#nav .tab').length};})()`);
if (!worldVisual.approvedArt || worldVisual.occupancy<0.85 || worldVisual.occupancy>0.95 || Math.abs(worldVisual.aspect-717/389)>0.02 || Math.abs(worldVisual.imageAspect-717/389)>0.02 || worldVisual.objectFit!=='contain' || worldVisual.borderWidth!=='0px' || Number.parseFloat(worldVisual.borderRadius)>2 || JSON.stringify(worldVisual.countries)!==JSON.stringify(['IND']) || worldVisual.marker.width<48 || worldVisual.marker.height<48 || Math.abs(worldVisual.marker.local.x-.69)>.02 || Math.abs(worldVisual.marker.local.y-.47)>.02 || worldVisual.forbiddenControls!==0 || !worldVisual.passportButton || worldVisual.nav!==6) throw new Error(`Rendered Android fixed World Map geometry/art is incomplete: ${JSON.stringify(worldVisual)}`);
console.log('Rendered Android fixed World Map geometry verified:', JSON.stringify(worldVisual));
worldDigest = await captureScreenshot('v31-world-portrait.png', 'World', homeDigest);
if (homeDigest === worldDigest) throw new Error('World screenshot is byte-identical to Home; route transition was not captured');
await rotateTo(1);
await waitForWebViewOrientation(true);
const landscape = await waitForVisible('.w02-map-header h1', 'World heading after rotation');
if (!landscape.screen.includes('v31-world-screen') || !landscape.text.includes('World Map')) throw new Error('World route was lost during orientation change');
const landscapeLayout = await evaluate(`(() => { const app=document.querySelector('.app'),nav=document.querySelector('#nav'); return {appWidth:app?.getBoundingClientRect().width||0,viewportWidth:innerWidth,navDisplay:nav?getComputedStyle(nav).display:'missing',navHeight:nav?.getBoundingClientRect().height||0}; })()`);
if (landscapeLayout.appWidth < landscapeLayout.viewportWidth * 0.9 || landscapeLayout.navDisplay === 'none' || landscapeLayout.navHeight < 40) throw new Error(`Landscape layout does not use the screen width or show navigation: ${JSON.stringify(landscapeLayout)}`);
await captureScreenshot('v31-world-landscape.png', 'World landscape', worldDigest);
const image = readFileSync('artifacts/v32-android-screenshots/v31-world-landscape.png');
const width = image.readUInt32BE(16), height = image.readUInt32BE(20);
if (width <= height) throw new Error(`Landscape capture is not landscape: ${width}x${height}`);
console.log(`Verified landscape screenshot dimensions: ${width}x${height}`);
await rotateTo(0);
await waitForWebViewOrientation(false);
const portraitWorld = await waitForVisible('.w02-map-header h1', 'World heading after returning to portrait');
if (!portraitWorld.screen.includes('v31-world-screen') || !portraitWorld.text.includes('World Map')) throw new Error('World route was lost while returning to portrait orientation');
await evaluate(`document.querySelector('.w02-country-marker[data-v31-country="IND"]').click()`);
const countryPreview=await evaluate(`({name:document.querySelector('#v33-country-title')?.textContent?.trim()||'',recipeCount:document.querySelectorAll('.w02-country-recipes [data-v31-approved-recipe]').length})`);
if(countryPreview.name!=='India'||countryPreview.recipeCount!==18)throw new Error('India preview should expose its 18 canonical recipes: '+JSON.stringify(countryPreview));
await evaluate(`document.querySelector('.w02-country-recipes [data-v31-approved-recipe="51"]').click()`);
const recipe = await waitForVisible('.ref-hero h1', 'India recipe heading');
if (recipe.text !== 'Masala Cheese Toast') throw new Error(`India recipe did not replace the active screen; got: ${JSON.stringify(recipe)}`);

}
const adultCue = await waitForVisible('.v31-adult-cue', 'Recipe adult cooking cue');
if (!adultCue.text.includes('Ask an adult to operate the air fryer')) throw new Error(`Air fryer safety cue is missing or unclear: ${JSON.stringify(adultCue)}`);
const recipeNavigation = await evaluate(`(() => { const nav=document.querySelector('#nav'),r=nav?.getBoundingClientRect(); return {display:nav?getComputedStyle(nav).display:'missing',height:r?.height||0}; })()`);
if (recipeNavigation.display === 'none' || recipeNavigation.height < 40) throw new Error(`Recipe navigation is not visible: ${JSON.stringify(recipeNavigation)}`);
const recipeDigest=await captureScreenshot('v31-recipe-portrait.png','Recipe',worldDigest);
if (statSync('artifacts/v32-android-screenshots/v31-recipe-portrait.png').size < 10000) throw new Error('Recipe screenshot is unexpectedly small');
await evaluate(`document.querySelector('.ref-cook-area')?.scrollIntoView({block:'start'})`);
const stepSafety = await waitForVisible('.v31-step-adult-cue', 'Active-step adult cooking cue');
if (!stepSafety.text.includes('Adult only: operate the air fryer')) throw new Error(`Active-step adult cue is missing or unclear: ${JSON.stringify(stepSafety)}`);
const stepLayout = await evaluate(`(() => { const photo=document.querySelector('.ref-step-card.active .storybook-action'),svg=photo?.querySelector('svg.action-svg'),atlasFrame=document.querySelector('.ref-step-card.active .step-atlas.atlas-frame'),atlasImage=atlasFrame?.querySelector('.atlas-cell img'),cue=document.querySelector('.ref-step-card.active .v31-step-adult-cue'),copy=document.querySelector('.ref-step-card.active .ref-step-copy'),actions=document.querySelector('.ref-step-actions'); const box=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null}; const a=box(cue),c=box(copy),n=box(actions),p=box(svg); const overlap=(x,y)=>x&&y&&x.x<x.x+x.w&&x.x<y.x+y.w&&x.x+x.w>y.x&&x.y<y.y+y.h&&x.y+x.h>y.y; return {photo:box(photo),svg:p,atlasFrame:box(atlasFrame),atlasImage:box(atlasImage),atlasLoaded:!!(atlasImage?.complete&&atlasImage.naturalWidth>0&&atlasImage.naturalHeight>0),atlasSource:atlasImage?.currentSrc?.startsWith('data:image/')||false,cue:a,copy:c,actions:n,cueHeight:a?.h||0,copyActionsOverlap:overlap(c,n)}; })()`);
const validSvg = !!(stepLayout.svg && stepLayout.svg.w >= 180 && stepLayout.svg.h >= 100);
const validAtlas = !!(stepLayout.atlasFrame && stepLayout.atlasFrame.w >= 180 && stepLayout.atlasFrame.h >= 100 && stepLayout.atlasImage && stepLayout.atlasImage.w >= 180 && stepLayout.atlasImage.h >= 100 && stepLayout.atlasLoaded && stepLayout.atlasSource);
if (!validSvg && !validAtlas) {
  const artDiagnostics = await evaluate(`(() => { const card=document.querySelector('.ref-step-card.active'); const art=typeof NEW_RECIPE_ART==='object'?NEW_RECIPE_ART[51]:null; const atlas=typeof BATCH_ATLASES==='object'?BATCH_ATLASES[51]:null; return {activeCard:!!card,activeCardClasses:card?.className,storybookCount:card?.querySelectorAll('.storybook-action').length||0,svgCount:card?.querySelectorAll('svg').length||0,cardMarkup:card?.outerHTML.slice(0,3500)||null,artFields:art?Object.keys(art):[],atlasPresent:!!atlas,atlasType:typeof atlas,metaSteps:typeof BATCH_META==='object'?BATCH_META[51]?.stepCells:null}; })()`);
  console.error('Recipe 51 illustration diagnostic:', JSON.stringify(artDiagnostics));
  throw new Error(`Cooking scene illustration is not visibly laid out: ${JSON.stringify(stepLayout)}`);
}
if (stepLayout.cueHeight > 100 || stepLayout.copyActionsOverlap) throw new Error(`Cooking instruction/cue overlaps controls or has excessive height: ${JSON.stringify(stepLayout)}`);
console.log('Cooking-step scene and non-overlapping cue/instruction layout verified:', JSON.stringify(stepLayout));
await captureScreenshot('v31-recipe-step-portrait.png', 'Recipe active step', recipeDigest);
for (const [left,right,label] of [['v31-home-portrait.png','v31-recipe-portrait.png','Recipe'],['v31-world-portrait.png','v31-recipe-portrait.png','Recipe']]) {
  const a=createHash('sha256').update(readFileSync(`artifacts/v32-android-screenshots/${left}`)).digest('hex');
  const b=createHash('sha256').update(readFileSync(`artifacts/v32-android-screenshots/${right}`)).digest('hex');
  if(a===b)throw new Error(`${label} screenshot is byte-identical to ${left}; route transition was not captured`);
}
for (const [file, landscapeExpected] of [['v31-home-portrait.png',false],['v31-world-portrait.png',false],['v31-recipe-portrait.png',false],['v31-world-landscape.png',true]]) {
  const path = `artifacts/v32-android-screenshots/${file}`;
  if (statSync(path).size < 10000) throw new Error(`Screenshot is unexpectedly small: ${file}`);
  const png = readFileSync(path), w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  if (landscapeExpected ? w<=h : w>=h) throw new Error(`Unexpected orientation for ${file}: ${w}x${h}`);
}
await evaluate(`document.querySelector('[data-v3-quiz="51"]')?.click()`);
const quizVisible = await evaluate(`!!document.querySelector('#v3QuizDialog')`);
if (!quizVisible) throw new Error('India recipe ingredient quiz did not open');
await evaluate(`document.querySelector('#v3QuizDialog [data-v3-answer][data-v3-right="1"]')?.click()`);
const quizFeedback = await evaluate(`document.querySelector('#v3QuizDialog .v3-quiz-feedback')?.innerText || ''`);
if (!quizFeedback.includes('That’s right')) throw new Error(`India recipe quiz did not accept the correct answer: ${quizFeedback}`);
await evaluate(`document.querySelector('#v3QuizDialog [data-v3-dismiss]')?.click()`);
await evaluate(`document.querySelector('.ref-next')?.click()`);
await evaluate(`document.querySelector('.ref-next.finish-step')?.click()`);
if(isW02Globe){
  await evaluate(`document.querySelector('#nav .tab[data-nav="world"]')?.click()`);await waitForVisible('.aria-world-globe__passport','Food Passport globe control');await evaluate(`document.querySelector('.aria-world-globe__passport')?.click()`);await waitForVisible('#v33-passport-title','Food Passport after canonical recipe completion');
  const passport=await evaluate(`(()=>({title:document.querySelector('#v33-passport-title')?.textContent?.trim()||'',count:document.querySelector('#v33-passport-title')?.parentElement?.querySelector('p')?.textContent?.trim()||'',stamps:[...document.querySelectorAll('.w02-passport-stamps .v31-stamp')].map(e=>e.textContent.trim())}))()`);
  if(passport.title!=='My Food Passport'||!passport.count.includes('1 stamp earned')||!passport.stamps.some(x=>x.includes('India')))throw new Error('Completed India recipe must earn the Food Passport stamp: '+JSON.stringify(passport));
  await evaluate(`document.querySelector('[data-v33-passport-close]')?.click()`);await pause(250);if(await evaluate(`!!document.querySelector('.v33-passport-overlay')`))throw new Error('Food Passport overlay did not close after Android regression check');
}else{
  await evaluate(`document.querySelector('.bottom .tab[data-nav="world"]')?.click()`);
  const stampCount = await evaluate(`document.querySelector('.v31-passport-count strong')?.innerText || ''`);
  if (!stampCount.includes('1 stamp collected')) throw new Error(`Finishing an India recipe should award a local passport stamp; got: ${stampCount}`);
  const indiaStamp = await evaluate(`!!document.querySelector('.v31-passport .v31-stamp')?.innerText.includes('India')`);
  if (!indiaStamp) throw new Error('India stamp is missing from the food passport');
}
console.log('Android World Adventure verified: canonical India recipe completion earned a profile-persisted local passport stamp');
await evaluate(`document.querySelector('#nav .tab[data-nav="home"]')?.click()`);
await waitForVisible('.v31-hero-welcome h1', 'Home after World Adventure');
const catalogueCount = await evaluate(`RECIPES.length`);
if (catalogueCount !== 95) throw new Error(`Android catalogue should contain exactly 95 production recipes; found ${catalogueCount}`);
await evaluate(`document.querySelector('#nav .tab[data-nav="week"]')?.click()`);
await waitForVisible('.daycard', 'Planner before Spin My Week');
await evaluate(`document.querySelector('#screen [data-action="open-week-wheel"]')?.click()`);
await waitForVisible('#spinNow', 'Spin My Week control');
const weekWheelHeading = await evaluate(`document.querySelector('#screen h1')?.innerText || ''`);
if (!weekWheelHeading.includes('week')) throw new Error(`Spin My Week did not open its dedicated wheel: ${weekWheelHeading}`);
await evaluate(`document.querySelector('#spinNow')?.click()`);
await waitForVisible('.daycard', 'Spin My Week planner result');
const spunWeekCount = await evaluate(`document.querySelectorAll('.daycard').length`);
if (spunWeekCount !== 7) throw new Error(`Spin My Week should produce seven planned recipes; found ${spunWeekCount}`);
console.log('Android Spin My Week produced a seven-recipe planner');
await evaluate(`document.querySelector('#nav .tab[data-nav="home"]')?.click()`);
await waitForVisible('.v31-hero-welcome h1', 'Home before English feature checks');
const whatsNewButton = await evaluate(`!!document.querySelector('[data-v3-tour-open]')`);
if (!whatsNewButton) throw new Error('What’s New entry point is missing from the home screen');
await evaluate(`document.querySelector('[data-v3-tour-open]')?.click()`);
await pause(250);
const tourStepOne = await evaluate(`document.querySelector('#v3WhatsNewTitle')?.innerText || ''`);
if (!tourStepOne.includes('Welcome to your V3 kitchen')) throw new Error(`What’s New first step has unexpected content: ${tourStepOne}`);
await evaluate(`document.querySelector('#v3WhatsNew [data-v3-tour-step="1"]')?.click()`);
await pause(250);
const tourStepTwo = await evaluate(`document.querySelector('#v3WhatsNewTitle')?.innerText || ''`);
if (!tourStepTwo.includes('Plan and play')) throw new Error(`What’s New second step has unexpected content: ${tourStepTwo}`);
await evaluate(`document.querySelector('#v3WhatsNew [data-v3-tour-step="2"]')?.click()`);
await pause(250);
const tourStepThree = await evaluate(`document.querySelector('#v3WhatsNewTitle')?.innerText || ''`);
if (!tourStepThree.includes('Make it yours')) throw new Error(`What’s New third step has unexpected content: ${tourStepThree}`);
await evaluate(`document.querySelector('#v3WhatsNew [data-v3-tour-close]')?.click()`);
await evaluate(`(() => { const select=document.querySelector('#languageSelect'); if(!select)throw Error('Language selector is missing'); select.value='pt-BR';select.dispatchEvent(new Event('change',{bubbles:true}));return state.language; })()`);
const portugueseHome = await waitForVisible('.v31-hero-welcome h1', 'Portuguese home');
await evaluate(`document.querySelector('#nav .tab[data-nav="week"]')?.click()`);
await waitForVisible('.v31-spin-week-entry', 'Portuguese planner Spin My Week entry');
const portugueseWeek = await evaluate(`document.querySelector('.v31-spin-week-entry')?.innerText || ''`);
if (!portugueseHome.text.includes('O que vamos cozinhar hoje?') || !portugueseWeek.includes('Monte minha semana')) throw new Error(`Portuguese home or Spin My Week translation is missing: ${JSON.stringify({home:portugueseHome.text,week:portugueseWeek})}`);
await evaluate(`(() => { const select=document.querySelector('#languageSelect');select.value='en-GB';select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
await evaluate(`document.querySelector('#nav .tab[data-nav="home"]')?.click()`);
await waitForVisible('.v31-hero-welcome h1', 'English home restored');
await evaluate(`document.querySelector('#nav .tab[data-nav="creations"]')?.click()`);
const creationsState = await waitForVisible('.v3-creations-heading h1', 'My Creations page');
if (!creationsState.text.includes('My Creations') || !await evaluate(`!!document.querySelector('.v3-creation-card [data-open="51"]')`)) throw new Error(`My Creations did not show the completed India recipe: ${creationsState.text}`);
await captureScreenshot('v31-my-creations-portrait.png', 'My Creations', recipeDigest);
console.log('Android My Creations displays profile-scoped completed recipes');
adb(['shell','input','keyevent','4']);
const backHome = await waitForVisible('.v31-hero-welcome h1', 'Android Back from My Creations');
if (!backHome.screen.includes('home-page')) throw new Error(`Android Back did not return from My Creations to Home: ${JSON.stringify(backHome)}`);
await evaluate(`document.querySelector('#nav .tab[data-nav="groceries"]')?.click()`);
const groceriesState = await waitForVisible('[data-action="share-groceries"]', 'Shopping list share control');
const groceryButtons = await evaluate(`({text:document.querySelector('#screen')?.innerText||'',share:document.querySelector('#screen [data-action="share-groceries"]')?.innerText||''})`);
if (!/Shopping|Grocery|compras|Lista/i.test(groceriesState.text+groceryButtons.text)) throw new Error(`Shopping list did not render: ${JSON.stringify(groceryButtons)}`);
const grocerySharePresent = await evaluate(`!!document.querySelector('#screen [data-action="share-groceries"]')`);
if (!grocerySharePresent) throw new Error('WhatsApp/share action is missing from the shopping list');
console.log('Shopping list and parent-mediated share control are present; no external message was sent');
await evaluate(`document.querySelector('#nav .tab[data-nav="home"]')?.click()`);
await waitForVisible('.v31-hero-welcome h1', 'Home before recipe/favorites checks');
await evaluate(`document.querySelector('.v31-action-tiles [data-nav="library"]')?.click()`);
const libraryReady = await waitForVisible('.recipe-card', '95-recipe library');
const libraryCards = await evaluate(`document.querySelectorAll('#screen .recipe-card').length`);
if (libraryCards !== 95) throw new Error(`Recipe library should show all 95 recipes; found ${libraryCards}`);
const themeReport = await evaluate(`(() => { const cards=[...document.querySelectorAll('#screen .recipe-card')]; return {count:cards.length, themes:[...new Set(cards.map(x=>x.dataset.v32Theme))].sort(), samples:Object.fromEntries(['12','76','5'].map(id=>[id,[...document.querySelectorAll('#screen [data-open]')].find(card=>card.dataset.open===id)?.dataset.v32Theme||'']))}; })()`);
if(themeReport.count!==95||themeReport.themes.join(',')!=='fresh-green,playful-purple,sunny-orange'||themeReport.samples['12']!=='playful-purple'||themeReport.samples['76']!=='fresh-green'||themeReport.samples['5']!=='sunny-orange') throw new Error(`V3.2 theme renderer did not assign stable purple/green/orange themes across all 95 recipes: ${JSON.stringify(themeReport)}`);
await captureScreenshot('v32-three-theme-library-portrait.png','All three recipe themes',recipeDigest);
console.log('V3.2 renderer exposes all three stable recipe themes across all 95 original IDs:',JSON.stringify(themeReport));
const filterReport=await evaluate(`(()=>{const select=document.querySelector('[data-appliance-filter]');if(!select)throw Error('Cooking-method filter is missing');select.value='Air fryer';select.dispatchEvent(new Event('change',{bubbles:true}));const ids=[...document.querySelectorAll('#screen .recipe-card[data-open]')].map(x=>Number(x.dataset.open));return {ids,allAirFryer:ids.length>0&&ids.every(id=>/air[ -]?fryer/i.test(RECIPES.find(r=>r.id===id)?.method||''))}})()`);
if(!filterReport.allAirFryer||filterReport.ids.length>=95)throw new Error(`Air fryer filter returned invalid recipes: ${JSON.stringify(filterReport)}`);
await evaluate(`(()=>{const select=document.querySelector('[data-appliance-filter]');select.value='All';select.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
const breakfastCount=await evaluate("(()=>{const button=document.querySelector('#screen button[data-filter=Breakfast]');if(!button)throw Error('Breakfast category filter is missing');button.click();const cards=[...document.querySelectorAll('#screen .recipe-card[data-open]')];return {count:cards.length,allBreakfast:cards.length>0&&cards.every(x=>RECIPES.find(r=>r.id===Number(x.dataset.open))?.category==='Breakfast')}})()");
if(!breakfastCount.allBreakfast||breakfastCount.count>=95)throw new Error('Breakfast filter returned invalid recipes: '+JSON.stringify(breakfastCount));
await evaluate("document.querySelector('#screen button[data-filter=All]')?.click()");
await evaluate("document.querySelector('#nav .tab[data-nav=home]')?.click()");
await waitForVisible('.v31-tile-surprise','Home Surprise Me action');
await evaluate("document.querySelector('#screen .v31-tile-surprise[data-action=open-wheel]').click()");
await waitForVisible('.spin-page','Surprise Me recipe wheel');
const wheelOptions=await evaluate('wheelOptions.map(r=>Number(r.id))');
if(wheelOptions.length!==8||wheelOptions.some(id=>!Number.isInteger(id)||id<1||id>95))throw new Error('Surprise Me wheel exposed invalid recipe IDs: '+JSON.stringify(wheelOptions));
await evaluate("document.querySelector('#screen [data-action=spin-now]').click()");
await waitForVisible('.ref-title h1','Surprise Me selected recipe');
const surpriseId=await evaluate('Number(selected?.id)');
if(!Number.isInteger(surpriseId)||surpriseId<1||surpriseId>95)throw new Error('Surprise Me selected invalid recipe ID: '+surpriseId);
await evaluate("document.querySelector('#nav .tab[data-nav=library]')?.click()");
await waitForVisible('.recipe-card[data-open="1"]','95-recipe catalogue restored after filter and Surprise Me checks');
console.log('Air fryer/category filters and Surprise Me preserve canonical recipe IDs:',JSON.stringify({airFryer:filterReport.ids.length,breakfast:breakfastCount.count,surpriseId}));

const v32CanonicalPhoneExamples=[[12,'Cheesy Corn Pancakes','playful-purple'],[76,'Rainbow Vegetable Noodle Toss','fresh-green'],[5,'Mini Pizza Bread Cups','sunny-orange']];
const v32PhoneRecipeScreenshots=[];
let v32PhoneScreenshotDigest=recipeDigest;
async function captureV32PhoneRecipeFlow(id,title,theme,landscape){
  const orientation=landscape?'landscape':'portrait';
  await evaluate('(()=>{state.done=(state.done||[]).filter(x=>Number(x)!=='+id+');state.myCreations=(state.myCreations||[]).filter(x=>Number(typeof x==="object"?x.recipeId:x)!=='+id+');step=0;save();return true})()');
  // Each recipe capture starts from an explicit, user-visible navigation path.
  // Earlier world-map and planner checks can leave the renderer on a different
  // screen; do not assume the preceding test's route is the recipe catalogue.
  await clickWebViewSelector('#nav .tab[data-nav="home"]','Home before phone recipe '+id);
  await waitForVisible('.v31-hero-welcome h1','Home before phone recipe '+id);
  const homeState=await evaluate('(()=>({view,screen:document.querySelector("#screen")?.className||"",title:document.querySelector(".v31-hero-welcome h1")?.textContent?.trim()||""}))()');
  if(homeState.view!=='home'||homeState.screen.includes('v31-world-screen')||!homeState.title)throw new Error('Phone recipe flow did not reset to the visible Home route: '+JSON.stringify({id,homeState}));
  await clickWebViewSelector('.v31-action-tiles [data-nav="library"]','Recipes before phone recipe '+id);
  await waitForVisible('.recipe-card[data-open="1"]','95-recipe catalogue before phone recipe '+id);
  const catalogueState=await evaluate('(()=>({view,count:document.querySelectorAll("#screen .recipe-card[data-open]").length,screen:document.querySelector("#screen")?.className||""}))()');
  if(catalogueState.view!=='library'||catalogueState.count!==95||catalogueState.screen.includes('v31-world-screen'))throw new Error('Phone recipe flow did not enter the complete Recipes catalogue: '+JSON.stringify({id,catalogueState}));
  const card=await evaluate(`(()=>{const e=${findByDatasetExpression('#screen [data-open]','open',id)};const text=e?.innerText?.trim()||"";const observedTheme=e?.dataset.v32Theme||"";e?.click();return {text,theme:observedTheme}})()`);
  if(!card||!card.text.includes(title)||card.theme!==theme)throw new Error('Phone exemplar catalogue card mismatch: '+JSON.stringify({id,title,theme,card}));
  const opened=await evaluate('(()=>({view,selectedId:Number(selected?.id||0),screen:document.querySelector("#screen")?.className||""}))()');
  if(opened.view!=='recipe'||opened.selectedId!==id||opened.screen.includes('v31-world-screen'))throw new Error('Phone recipe card click did not reach the selected recipe route: '+JSON.stringify({id,opened}));
  const detailTitleSelector=id===12?'.ref-hero h1':'.ref-hero h1';
  await waitForVisible(detailTitleSelector,'Phone '+title+' details');
  const detail=await evaluate(`(()=>({title:document.querySelector(${JSON.stringify(detailTitleSelector)})?.textContent?.trim()||"",theme:document.querySelector(".app")?.dataset.v32RecipeTheme||""}))()`);
  if(detail.title!==title||detail.theme!==theme)throw new Error('Phone exemplar detail mismatch: '+JSON.stringify({id,expected:{title,theme},detail}));
  const detailName='v32-recipe-'+id+'-detail-'+orientation+'.png';
  v32PhoneScreenshotDigest=await captureScreenshot(detailName,title+' detail '+orientation,v32PhoneScreenshotDigest);
  let ingredientName=null;
  if(id===12){
    const viewport=await evaluate('({width:innerWidth,height:innerHeight})');
    const expectedColumns=null;
    await assertRecipe12IngredientGrid('EN-GB #12 phone '+orientation);
    const ingredientTarget=await prepareVisibleRecipeCapture('.ref-ingredient-grid','EN-GB #12 Ingredients '+orientation);
    if(!ingredientTarget.visible)throw new Error('EN-GB #12 ingredient grid is not visible before screenshot capture');
    ingredientName='v32-recipe-12-ingredients-'+orientation+'.png';
    v32PhoneScreenshotDigest=await captureScreenshot(ingredientName,'EN-GB #12 Ingredients '+orientation,v32PhoneScreenshotDigest);
    const acceptance=await evaluate('(()=>({canonicalId:selected?.id,title:selected?.title,ingredients:document.querySelectorAll(".ref-ingredient-grid .ref-ingredient").length,steps:Number(document.querySelector(".ref-step-grid")?.dataset.stepCount||document.querySelectorAll(".ref-step-grid > .ref-step-card").length||0),allergens:[...document.querySelectorAll(".allergy-card .allergen-badges span")].map(x=>x.textContent.trim()).sort(),nutrition:!!document.querySelector(".nutrition-results"),quiz:!!document.querySelector(".v3-quiz-card"),copy:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||"",expectedCopy:RECIPES.find(x=>x.id===12)?.steps?.[0]||"",safety:document.querySelector(".ref-safety details p")?.textContent||""}))()');
    if(acceptance.canonicalId!==12||acceptance.title!==title||acceptance.ingredients!==6||acceptance.steps!==4||!['Eggs','Milk','Wheat'].every(x=>acceptance.allergens.includes(x))||!acceptance.nutrition||!acceptance.quiz||acceptance.copy!==acceptance.expectedCopy||!acceptance.safety)throw new Error('Recipe 12 internal acceptance data/health/quiz gate failed: '+JSON.stringify(acceptance));
    if(!await clickRecipeIngredient(0))throw new Error('Recipe 12 first ingredient checkbox was not found.');
    if(!await evaluate('state.checks[12]?.includes(0)'))throw new Error('Recipe 12 ingredient checklist did not persist.');
    if(!await clickRecipeIngredient(0))throw new Error('Recipe 12 first ingredient checkbox was not found for reset.');
    await clickWebViewSelector('.ref-favorite','Recipe 12 favourite');
    if(!await evaluate('state.favorites.includes(12)'))throw new Error('Recipe 12 favourite action did not persist.');
    await clickWebViewSelector('.ref-favorite','Recipe 12 favourite reset');
    await clickWebViewSelector('.recipe-grocery-link','Recipe 12 grocery action');
    if(!await evaluate('view==="groceries"&&state.grocerySelected.includes(12)'))throw new Error('Recipe 12 grocery-list action did not carry the canonical recipe.');
    await clickWebViewSelector('#nav .tab[data-nav="library"]','Recipe library');
    await waitForVisible('.recipe-card[data-open="12"]','Recipe library after recipe 12 grocery check');
    if(!await clickCatalogueRecipe(12))throw new Error('Recipe 12 catalogue card was not found after grocery checks.');
    await waitForVisible('.reference-layout','Recipe 12 after existing-function checks');
  }
  const flow=await evaluate('(()=>({selectedId:Number(selected?.id||0),stepCount:Number(document.querySelector(".ref-step-grid")?.dataset.stepCount)||document.querySelectorAll(".ref-step-card").length,activeCount:document.querySelectorAll(".ref-step-card.active").length,activeStep:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),pilot:!!document.querySelector(".reference-layout")}))()');flow.nav=await evaluate(navigationSummaryExpression());
  if(flow.selectedId!==id||flow.stepCount<1||flow.activeCount!==1||flow.activeStep!==1)throw new Error('Phone exemplar active-step state mismatch: '+JSON.stringify({id,flow}));
  if(id===12&&(!flow.pilot||flow.stepCount!==4||flow.nav.map(x=>x.label).join('|')!=='Home|Recipes|World Adventure|Magic Pantry|Planner|My Creations'||flow.nav.map(x=>x.id).join('|')!=='home|library|world|groceries|week|creations'))throw new Error('Recipe 12 pilot contract or exact six-button navigation failed: '+JSON.stringify(flow));
  const stepFiles=[];
  for(let index=1;index<=flow.stepCount;index++){
    const current=await evaluate('(()=>({step:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),safety:document.querySelector(".ref-safety details p")?.textContent||"",progress:Number(step||0)+1,instruction:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||"",expectedInstruction:displayStepText(selected,step)||"",canonicalInstruction:selected?.steps?.[step]||""}))()');
    if(current.step!==index)throw new Error('Phone exemplar step progression mismatch: '+JSON.stringify({id,index,current}));
    if(id===12&&(!current.canonicalInstruction||!current.safety||current.progress!==index||current.instruction!==current.expectedInstruction))throw new Error('Recipe 12 rendered step copy, canonical source, per-step safety or progress is missing: '+JSON.stringify(current));
    if(id===12||index===1){
      await evaluate('document.querySelector(".ref-step-card.active")?.scrollIntoView({block:"start"})');
      const stepName=id===12?'v32-recipe-12-step-'+index+'-'+orientation+'.png':'v32-recipe-'+id+'-active-step-'+orientation+'.png';
      v32PhoneScreenshotDigest=await captureScreenshot(stepName,title+' step '+index+' '+orientation,v32PhoneScreenshotDigest);
      stepFiles.push(stepName);
    }
    if(index<flow.stepCount){
      await clickWebViewSelector('.ref-next','Next recipe step');
      await pause(200);
    }
  }
  let complete=false;
  const last=await evaluate('!!document.querySelector(".ref-next.finish-step")');
  if(last){await clickWebViewSelector('.ref-next.finish-step','Finish recipe');await pause(250);complete=await evaluate('Array.isArray(state.done)&&state.done.includes('+id+')');}
  if(!complete)throw new Error('Phone exemplar '+id+' did not reach completion');
  if(id===12&&(!await evaluate('state.myCreations.some(x=>Number(typeof x==="object"?x.recipeId:x)===12)&&!!document.querySelector(".ref-next.finish-step")')))throw new Error('Recipe 12 completion did not save to My Creations or render the completion view.');
  const completionName='v32-recipe-'+id+'-completion-'+orientation+'.png';
  if(id===12&&!await evaluate('!!document.querySelector(".ref-next.finish-step")'))throw new Error('Recipe 12 completion view is missing.');
  v32PhoneScreenshotDigest=await captureScreenshot(completionName,title+' completion '+orientation,v32PhoneScreenshotDigest);
  const files=[detailName,...(ingredientName?[ingredientName]:[]),...stepFiles,completionName].map(name=>{
    const image=readFileSync('artifacts/v32-android-screenshots/'+name);
    const width=image.readUInt32BE(16),height=image.readUInt32BE(20);
    if(landscape?width<=height:width>=height)throw new Error(name+' has incorrect screenshot orientation '+width+'x'+height);
    return {name,width,height,bytes:image.length};
  });
  v32PhoneRecipeScreenshots.push({id,title,theme,orientation,files});
  await clickWebViewSelector('#nav .tab[data-nav="library"]','Recipe library');
  await waitForVisible('.recipe-card[data-open="1"]','Phone catalogue after '+title+' '+orientation);
}
for(const [id,title,theme] of v32CanonicalPhoneExamples){
  await rotateTo(0);await waitForWebViewOrientation(false);
  await captureV32PhoneRecipeFlow(id,title,theme,false);
  await rotateTo(1);await waitForWebViewOrientation(true);
  await captureV32PhoneRecipeFlow(id,title,theme,true);
}
await rotateTo(0);await waitForWebViewOrientation(false);
writeFileSync('artifacts/v32-diagnostics/phone-three-recipe-screenshots.json',JSON.stringify({status:'CAPTURED',device:'Pixel 3a',recipes:v32PhoneRecipeScreenshots,scope:'debug preview; visual, rights, A08/A09 approval still pending'},null,2)+'\n');
console.log('Phone recipe detail, active-step and completion screenshots captured for all three themes in portrait and landscape:',JSON.stringify(v32PhoneRecipeScreenshots));

const routeCoverage=[];
const recipeImageEvidence=[];
let recipeImageScreenshotDigest=null;
for(let recipeId=1;recipeId<=95;recipeId++){
  if(recipeId===12)await evaluate('(()=>{state.done=(state.done||[]).filter(x=>Number(x)!==12);state.myCreations=(state.myCreations||[]).filter(x=>Number(typeof x==="object"?x.recipeId:x)!==12);step=0;save();return true})()');
  const recipeAuditStartedAt=Date.now();
  const card=await evaluate(`(()=>{const cards=document.querySelectorAll('#screen .recipe-card[data-open]');const e=${findByDatasetExpression('#screen .recipe-card[data-open]','open',recipeId)};if(cards.length!==95||!e)return {catalogueCount:cards.length,missingRecipe:${recipeId}};const x={title:e.querySelector('.home-tile-name')?.textContent||e.innerText,theme:e.dataset.v32Theme};e.click();return x})()`);
  if(!card?.title||!card.theme)throw new Error(`Recipe ${recipeId} is missing its catalogue card or deterministic theme`);
  if(card.catalogueCount!==undefined)throw new Error(`Recipe ${recipeId} route sweep is not on the full recipe catalogue: ${JSON.stringify(card)}`);
  const routeTitleSelector=recipeId===12?'.ref-hero h1':'.ref-hero h1';
  await waitForVisible(routeTitleSelector,`Recipe ${recipeId} detail route`);
  const routeState=await evaluate(`(()=>({view:typeof view==='undefined'?'unavailable':view,selectedId:typeof selected==='undefined'?null:selected?.id??null,hash:location.hash,screen:document.querySelector('#screen')?.className||'',screenText:document.querySelector('#screen')?.innerText?.slice(0,180)||'',record:typeof RECIPES==='undefined'?null:(RECIPES.find(r=>r.id===${recipeId})?{id:RECIPES.find(r=>r.id===${recipeId}).id,title:RECIPES.find(r=>r.id===${recipeId}).title,steps:RECIPES.find(r=>r.id===${recipeId}).steps?.length,ingredients:RECIPES.find(r=>r.id===${recipeId}).ingredients?.length}:null)}))()`);
  if(routeState.view!=='recipe'||Number(routeState.selectedId)!==recipeId)throw new Error(`Recipe ${recipeId} catalogue click did not enter its route: ${JSON.stringify(routeState)}`);
  const detail=await evaluate(`(()=>({title:document.querySelector(${JSON.stringify(routeTitleSelector)})?.textContent?.trim()||'',theme:document.querySelector('.app')?.dataset.v32RecipeTheme||'',steps:Number(document.querySelector('#screen .ref-step-grid')?.dataset.stepCount)||document.querySelectorAll('#screen .ref-step-card').length,ingredients:document.querySelectorAll('#screen .ref-ingredient').length,nutrition:document.querySelector('#screen .nutrition-results')?.innerText||'',completion:!!document.querySelector('#screen .ref-next.finish-step')}))()`);
  if(!detail.title||detail.theme!==card.theme||detail.steps<1||detail.ingredients<1)throw new Error(`Recipe ${recipeId} detail regression: ${JSON.stringify({card,detail})}`);
  if(!detail.nutrition||([91,94].includes(recipeId)&&!detail.nutrition.includes('Partial draft')))throw new Error(`Recipe ${recipeId} nutrition must render and disclose incomplete source data: ${JSON.stringify(detail)}`);
  const recipeScreenshots=[];
  const detailShot=`recipe-image-${recipeId}-phone-portrait-detail.png`;
  recipeImageScreenshotDigest=await captureScreenshot(detailShot,`Recipe ${recipeId} finished-dish/detail portrait`,recipeImageScreenshotDigest);
  recipeScreenshots.push(detailShot);
  const inspectActiveArtwork=async stepIndex=>evaluate(`(()=>{
    const id=${recipeId},index=${stepIndex},screen=document.querySelector('#screen'),card=screen?.querySelector('.ref-step-card.active');
    const figure=card?.querySelector('.ref-step-photo, [data-v32-step-art], .storybook-action');
    const image=figure?.querySelector('img'),svg=figure?.querySelector('svg');
    const pending=!!figure?.closest('.new-recipe-art-pending')||!!screen?.querySelector('.ref-step-photo.new-recipe-art-pending');
    const art=(typeof NEW_RECIPE_ART==='object'?NEW_RECIPE_ART[id]:null)||{};
    const source=image?.currentSrc||image?.src||'';
    const expectedSource=art.atlas||art.storyboard||BATCH_ATLASES?.[id]||'';
    const atlas=!!figure?.querySelector('.atlas-cell');
    const frame=figure?.querySelector('.atlas-frame');
    const meta=typeof BATCH_META==='object'?BATCH_META[id]:null;
    const cell=Number.isInteger(meta?.stepCells?.[index])?meta.stepCells[index]:index;
    const left=image?.style.left||'';
    const top=image?.style.top||'';
    const dimensions=image?{naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,complete:image.complete}:null;
    const loaded=!!image&&image.complete&&image.naturalWidth>0&&image.naturalHeight>0;
    const rendered=loaded||!!svg||!!figure?.querySelector('[role="img"]');
    const association=atlas?!!expectedSource&&source===expectedSource&&left===(-((cell%3)*100)+'%')&&top===(-Math.floor(cell/3)*100+'%'):rendered;
    return {recipeId:id,stepIndex:index+1,stepNumber:Number(card?.querySelector('.ref-step-number')?.textContent||0),pending,kind:pending?'pending':atlas?'atlas':image?'image':svg?'svg':'role-image',source,expectedSource,cell,left,top,aspect:frame?getComputedStyle(frame).aspectRatio:'',dimensions,loaded,rendered,association,expectedSteps:Number(screen?.querySelector('.ref-step-grid')?.dataset.stepCount)||screen?.querySelectorAll('.ref-step-card').length||0};
  })()`);
  const stepEvidence=[];
  for(let stepIndex=0;stepIndex<detail.steps;stepIndex++){
    const art=await inspectActiveArtwork(stepIndex);
    if(art.stepNumber!==stepIndex+1)throw new Error(`Recipe ${recipeId} Android step navigation mismatch: ${JSON.stringify(art)}`);
    stepEvidence.push({...art,status:art.pending?'FAIL':art.rendered&&art.association&&((art.kind!=='atlas'&&art.kind!=='image')||art.loaded)?'PASS':'FAIL'});
    const stepShot=`recipe-image-${recipeId}-phone-portrait-step-${stepIndex+1}.png`;
    await evaluate('document.querySelector(".ref-step-card.active")?.scrollIntoView({block:"start"})');
    recipeImageScreenshotDigest=await captureScreenshot(stepShot,`Recipe ${recipeId} step ${stepIndex+1} portrait`,recipeImageScreenshotDigest);
    recipeScreenshots.push(stepShot);
    if(stepIndex+1<detail.steps){await clickWebViewSelector('.ref-next',`Recipe ${recipeId} next visual audit step`);await pause(180)}
  }
  const finishedDish=await evaluate(`(()=>{
    const id=${recipeId},screen=document.querySelector('#screen');
    const art=typeof NEW_RECIPE_ART==='object'?NEW_RECIPE_ART[id]||{}:{};
    const candidates=[...screen.querySelectorAll('.ref-hero img, .ref-dish img, [data-dish-art] img, .v32-r12-dish img')];
    const image=candidates.find(item=>!item.alt?.toLowerCase().includes('avatar'))||null;
    const source=image?.currentSrc||image?.src||'';
    const expected=art.dish||art.hero||INLINE_DISH_PHOTOS?.[id]||HOME_RECIPE_THUMBS?.[id]||'';
    return {source,expected,complete:image?.complete||false,naturalWidth:image?.naturalWidth||0,naturalHeight:image?.naturalHeight||0,loaded:!!image&&image.complete&&image.naturalWidth>0,association:!!image&&!!source&&(!expected||source===expected),candidateCount:candidates.length};
  })()`);
  const imageStatus=finishedDish.loaded&&finishedDish.association&&stepEvidence.every(item=>item.status==='PASS')?'PASS':finishedDish.candidateCount===0||stepEvidence.some(item=>item.status==='FAIL')?'FAIL':'NOT TESTED';
  recipeImageEvidence.push({recipeId,title:detail.title,device:'phone',orientation:'portrait',status:imageStatus,finishedDish,steps:stepEvidence,screenshots:recipeScreenshots});
  routeCoverage.push(recipeId);
  if(recipeId%10===0)console.log(`Verified recipe detail routes ${recipeId}/95`);
  await evaluate(`document.querySelector('#nav .tab[data-nav="library"]')?.click()`);
  const returned=await waitForVisible('.recipe-card[data-open="1"]',`Recipe catalogue after ${recipeId}`);
  const returnCount=await evaluate(`document.querySelectorAll('#screen .recipe-card[data-open]').length`);
  if(returnCount!==95)throw new Error(`Recipe catalogue after ${recipeId} contains ${returnCount} cards, expected 95; screen=${returned.screen}`);
  console.log(`Recipe ${recipeId}/95 full phone portrait audit elapsed_ms=${Date.now()-recipeAuditStartedAt}`);
}
if(routeCoverage.length!==95||new Set(routeCoverage).size!==95)throw new Error(`Expected unique detail route coverage 95/95, got ${routeCoverage.length}`);
await rotateTo(1);await waitForWebViewOrientation(true);
let phoneLandscapeDigest=null;
const landscapeSweepStartedAt=Date.now();
for(let recipeId=1;recipeId<=95;recipeId++){
  const card=await evaluate(`(()=>{const e=${findByDatasetExpression('#screen .recipe-card[data-open]','open',recipeId)};if(!e)return null;e.click();return {title:e.querySelector('.home-tile-name')?.textContent?.trim()||e.innerText}})()`);
  if(!card?.title)throw new Error(`Landscape phone image audit cannot open recipe ${recipeId}`);
  await waitForVisible('.ref-hero h1',`Phone landscape recipe ${recipeId} detail`);
  const title=await evaluate('document.querySelector(".ref-hero h1")?.textContent?.trim()||""');
  const detailShot=`recipe-image-${recipeId}-phone-landscape-detail.png`;
  phoneLandscapeDigest=await captureScreenshot(detailShot,`Recipe ${recipeId} finished-dish/detail landscape`,phoneLandscapeDigest);
  await evaluate('document.querySelector(".ref-step-card.active")?.scrollIntoView({block:"start"})');
  const stepShot=`recipe-image-${recipeId}-phone-landscape-step-1.png`;
  phoneLandscapeDigest=await captureScreenshot(stepShot,`Recipe ${recipeId} step 1 landscape`,phoneLandscapeDigest);
  const row=recipeImageEvidence.find(item=>item.recipeId===recipeId);
  if(!row)throw new Error(`Phone landscape image audit has no portrait row for recipe ${recipeId}`);
  row.landscapeScreenshots=[detailShot,stepShot];
  if(recipeId%10===0||recipeId===95)console.log(`Verified phone landscape screenshots ${recipeId}/95 elapsed_ms=${Date.now()-landscapeSweepStartedAt}`);
  await evaluate('document.querySelector("#nav .tab[data-nav=library]")?.click()');
  await waitForVisible('.recipe-card[data-open="1"]',`Phone landscape catalogue after recipe ${recipeId}`);
}
await rotateTo(0);await waitForWebViewOrientation(false);
mkdirSync('artifacts/v32-diagnostics',{recursive:true});
writeFileSync('artifacts/v32-diagnostics/recipe-route-coverage.json',JSON.stringify({checkedAt:new Date().toISOString(),recipeIds:routeCoverage,uniqueCount:new Set(routeCoverage).size,status:'PASS'},null,2)+'\n');
writeFileSync('artifacts/v32-diagnostics/recipe-image-verification-phone.json',JSON.stringify({schemaVersion:1,device:'phone',orientation:'portrait',recipeCount:recipeImageEvidence.length,recipes:recipeImageEvidence},null,2)+'\n');
writeFileSync('artifacts/v32-diagnostics/recipe-image-verification-matrix.csv','recipe_id,title,device,orientation,status,finished_dish_source,finished_dish_loaded,step_count,verified_steps,screenshot_evidence\n'+recipeImageEvidence.flatMap(row=>[['phone','portrait',row.screenshots],['phone','landscape',row.landscapeScreenshots||[]]].map(([device,orientation,screenshots])=>[row.recipeId,JSON.stringify(row.title),device,orientation,row.status,JSON.stringify(row.finishedDish.source),row.finishedDish.loaded,row.steps.length,row.steps.filter(step=>step.status==='PASS').length,JSON.stringify(screenshots.join(';'))].join(','))).join('\n')+'\n');
console.log('Android recipe detail route coverage passed 95/95 with theme, ingredient and step content verified');
await evaluate(`(()=>{const select=document.querySelector('#languageSelect');if(!select)throw Error('Language selector missing before PT-BR recipe audit');select.value='pt-BR';select.dispatchEvent(new Event('change',{bubbles:true}));return state.language})()`);
await waitForVisible('.recipe-card','PT-BR recipe library');
const ptRouteCoverage=[];
for(let recipeId=66;recipeId<=95;recipeId++){
  const card=await evaluate(`(()=>{const e=${findByDatasetExpression('#screen .recipe-card[data-open]','open',recipeId)};if(!e)return null;const title=e.querySelector('.home-tile-name')?.textContent||e.innerText;e.click();return title})()`);
  if(!card)throw new Error(`PT-BR recipe ${recipeId} is missing from the catalogue`);
  await waitForVisible('.ref-hero h1',`PT-BR recipe ${recipeId} detail`);
  const translated=await evaluate(`(()=>{const r=RECIPES.find(x=>x.id===${recipeId}),pt=PT_RECIPES[${recipeId}],title=document.querySelector('.ref-hero h1')?.textContent?.trim()||'',ingredient=document.querySelector('.ref-ingredient')?.innerText||'',step=document.querySelector('.ref-step-card.active .ref-step-copy p')?.innerText||'',safetyPanel=document.querySelector('.storybook-safety,.ref-safety details');if(!safetyPanel)throw Error('Portuguese recipe safety disclosure is missing');safetyPanel.open=true;const safety=safetyPanel.querySelector('p')?.textContent||'',role=document.querySelector('.v32-group-role-copy')?.innerText||'',roleMode=r?.category==='Cooking with Mommy & Daddy'?'family':'friends',expectedRole=V32_PT_GROUP_ROLE_COPY?.[roleMode]||'';return {id:r?.id,title,expectedTitle:pt?.title,ingredient,expectedIngredient:pt?.ingredients?.[0],step,expectedStep:pt?.steps?.[0],safety,expectedSafety:pt?.safety,safetyDisclosureOpened:safetyPanel.open,role,expectedRole}})()`);
  if(!translated.expectedTitle||!translated.title.includes(translated.expectedTitle)||!translated.expectedIngredient||!translated.ingredient.includes(translated.expectedIngredient)||!translated.expectedStep||!translated.step.includes(translated.expectedStep.slice(0,36))||!translated.expectedSafety||!translated.safety.includes(translated.expectedSafety.slice(0,36))||!translated.safetyDisclosureOpened||!translated.expectedRole||translated.role!==translated.expectedRole)throw new Error(`PT-BR recipe ${recipeId} translation did not reach its title, ingredient, first step, safety and group role copy: ${JSON.stringify(translated)}`);
  ptRouteCoverage.push(recipeId);
  if(recipeId%10===0||recipeId===95)console.log(`Verified PT-BR recipe routes ${recipeId-65}/30 (through ${recipeId})`);
  if([66,81,95].includes(recipeId))await captureScreenshot(`pt-br-recipe-${recipeId}-portrait.png`,`Portuguese recipe ${recipeId}`);
  await evaluate(`document.querySelector('#nav .tab[data-nav="library"]')?.click()`);
  const returned=await waitForVisible('.recipe-card[data-open="66"]',`PT-BR catalogue after recipe ${recipeId}`);
  const count=await evaluate(`document.querySelectorAll('#screen .recipe-card[data-open]').length`);
  if(count!==95)throw new Error(`PT-BR catalogue after recipe ${recipeId} contains ${count}, expected 95: ${returned.screen}`);
}
if(ptRouteCoverage.length!==30||ptRouteCoverage[0]!==66||ptRouteCoverage.at(-1)!==95)throw new Error('PT-BR recipe translation route coverage is not IDs 66–95');
writeFileSync('artifacts/v32-diagnostics/pt-br-recipe-coverage.json',JSON.stringify({checkedAt:new Date().toISOString(),recipeIds:ptRouteCoverage,uniqueCount:new Set(ptRouteCoverage).size,status:'DRAFT_COPY_RENDERED_REVIEW_REQUIRED',review:'A08/A09/native PT-BR review pending'},null,2)+'\\n');
await evaluate(`(()=>{state.done=(state.done||[]).filter(x=>Number(x)!==12);step=0;save();return true})()`);
if(!await clickCatalogueRecipe(12))throw new Error('PT-BR recipe 12 card was not found.');
await waitForVisible('.reference-layout','PT-BR recipe 12 pilot');
const pt12=await evaluate(`(()=>{const expectedIngredient=PT_RECIPES[12].ingredients[0];const ingredient=[...document.querySelectorAll('.ref-ingredient-grid .ref-ingredient')].map(card=>(card.innerText||card.textContent||'').replace(/\\s+/g,' ').trim()).find(text=>text.includes(expectedIngredient))||'';return {title:document.querySelector('.ref-hero h1')?.textContent?.trim()||'',expected:PT_RECIPES[12].title,ingredient,expectedIngredient,ingredientCount:PT_RECIPES[12].ingredients.length,stepCount:PT_RECIPES[12].steps.length}})()`);pt12.nav=await evaluate(navigationSummaryExpression());
if(pt12.title!==pt12.expected||!pt12.ingredient.includes(pt12.expectedIngredient)||pt12.nav.map(x=>x.label).join('|')!=='Início|Receitas|Aventura|Despensa|Planejar|Criações'||pt12.nav.map(x=>x.id).join('|')!=='home|library|world|groceries|week|creations')throw new Error('PT-BR recipe 12 title, ingredient or six-destination navigation is incorrect: '+JSON.stringify(pt12));
async function capturePtBr12Orientation(orientation){
 const landscape=orientation==='landscape';
 const title=await waitForVisible('.ref-hero h1','PT-BR #12 detail '+orientation);
 const viewport=await evaluate('({width:innerWidth,height:innerHeight})');
 const expectedColumns=null;
 await assertRecipe12IngredientGrid('PT-BR #12 phone '+orientation);
 if(!landscape)await assertNarrowPtBrIngredientGrid();
 const detailState=await prepareVisibleRecipeCapture('.ref-hero h1','PT-BR #12 detail '+orientation);
 if(!title.text.includes(pt12.expected)||!detailState.text.includes(pt12.expected))throw new Error('PT-BR #12 detail capture is not on the expected recipe: '+JSON.stringify({title,detailState}));
 const detail='v32-recipe-12-pt-br-detail-'+orientation+'.png';
 v32PhoneScreenshotDigest=await captureScreenshot(detail,'PT-BR recipe 12 detail '+orientation,v32PhoneScreenshotDigest);
 const ingredientsState=await prepareVisibleRecipeCapture('.ref-ingredient-grid','PT-BR #12 Ingredients '+orientation);
 const ingredients='v32-recipe-12-pt-br-ingredients-'+orientation+'.png';
 v32PhoneScreenshotDigest=await captureScreenshot(ingredients,'PT-BR #12 Ingredients '+orientation,v32PhoneScreenshotDigest);
 const stepScreens=[];
 for(let index=0;index<4;index++){
  let copy=null;
  for(let attempt=0;attempt<30;attempt++){
   copy=await evaluate('(()=>({step:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||"",expectedStep:PT_RECIPES[12].steps['+index+'],safety:document.querySelector(".ref-safety details p")?.textContent?.trim()||"",expectedSafety:v32PilotRecipePresentation[12].safety.pt['+index+'],number:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0)}))()');
   if(copy.number===index+1)break;
   await pause(250);
  }
  if(copy.step!==copy.expectedStep||copy.safety!==copy.expectedSafety||copy.number!==index+1)throw new Error('PT-BR recipe 12 step/safety coverage failed: '+JSON.stringify({index,copy}));
  const active=await prepareVisibleRecipeCapture('.ref-step-card.active','PT-BR #12 active step '+(index+1)+' '+orientation);
  if(!active.text.includes(copy.step))throw new Error('PT-BR #12 active-step capture target does not contain the canonical instruction: '+JSON.stringify({index,copy,active}));
  const name='v32-recipe-12-pt-br-step-'+(index+1)+'-'+orientation+'.png';
  v32PhoneScreenshotDigest=await captureScreenshot(name,'PT-BR recipe 12 step '+(index+1)+' '+orientation,v32PhoneScreenshotDigest);stepScreens.push(name);
  if(index<3){await clickWebViewSelector('.ref-next','Next PT-BR recipe step');await pause(250)}
 }
 await clickWebViewSelector('.ref-next.finish-step','Finish PT-BR recipe');await pause(300);
 if(!await evaluate('state.done.includes(12)&&!!document.querySelector(".ref-next.finish-step")'))throw new Error('PT-BR recipe 12 completion did not render.');
 const completionState=await prepareVisibleRecipeCapture('.ref-next.finish-step','PT-BR #12 completion '+orientation);
 const completion='v32-recipe-12-pt-br-completion-'+orientation+'.png';
 v32PhoneScreenshotDigest=await captureScreenshot(completion,'PT-BR recipe 12 completion '+orientation,v32PhoneScreenshotDigest);
 return {orientation,detail,ingredients,steps:stepScreens,completion,visibleTargets:{detail:detailState.text,ingredients:ingredientsState.text,steps:4,completion:completionState.text}};
}
await rotateTo(0);await waitForWebViewOrientation(false);
const pt12Portrait=await capturePtBr12Orientation('portrait');
await rotateTo(1);await waitForWebViewOrientation(true);
await clickWebViewSelector('#nav .tab[data-nav="home"]','PT-BR Home before landscape recipe capture');
await waitForVisible('.v31-hero-welcome h1','PT-BR Home before landscape recipe capture');
await clickWebViewSelector('.v31-action-tiles [data-nav="library"]','PT-BR Recipes before landscape recipe capture');
await waitForVisible('.recipe-card[data-open="12"]','PT-BR recipe library before landscape capture');
await evaluate('(()=>{state.done=(state.done||[]).filter(x=>Number(x)!==12);state.myCreations=(state.myCreations||[]).filter(x=>Number(typeof x==="object"?x.recipeId:x)!==12);step=0;save();return true})()');
if(!await clickCatalogueRecipe(12))throw new Error('PT-BR recipe 12 card was not found for landscape capture.');
await waitForVisible('.reference-layout','PT-BR recipe 12 landscape detail');
const pt12Landscape=await capturePtBr12Orientation('landscape');
writeFileSync('artifacts/v32-diagnostics/recipe-12-pt-br-evidence.json',JSON.stringify({status:'INTERNAL_VISUAL_CAPTURE_PENDING_MANUAL_INSPECTION',title:pt12.title,ingredients:pt12.ingredientCount,steps:pt12.stepCount,phone:{portrait:pt12Portrait,landscape:pt12Landscape},independentReview:'A08/A09/native PT-BR review pending'},null,2)+'\n');
await evaluate(`document.querySelector('#nav .tab[data-nav="library"]')?.click()`);
await waitForVisible('.recipe-card','Portuguese recipe library restored');
await evaluate(`(()=>{const select=document.querySelector('#languageSelect');select.value='en-GB';select.dispatchEvent(new Event('change',{bubbles:true}));return state.language})()`);
await waitForVisible('.recipe-card','English recipe library restored');
console.log('Portuguese recipe titles, ingredients, steps and safety rendered for IDs 66–95; acceptance remains pending independent review');
await evaluate(`document.querySelector('#screen [data-open="1"]')?.click()`);
await waitForVisible('.ref-hero h1', 'Favourite test recipe');
await evaluate(`document.querySelector('.ref-favorite')?.click()`);
const favoriteSaved = await evaluate(`state.favorites.includes(1)`);
if (!favoriteSaved) throw new Error('Favourite control did not save recipe 1 to this profile');
const cameraOnly = await evaluate(`(() => {const inputs=[...document.querySelectorAll('#screen input[type="file"]')];return inputs.length===1&&inputs[0].accept==='image/*'&&inputs[0].getAttribute('capture')==='environment'&&!!document.querySelector('#screen [data-action="take-dish-photo"]')&&!/Choose a dish photo/i.test(document.querySelector('#screen .cook-share-card')?.innerText||'')})()`);
if (!cameraOnly) throw new Error('Recipe dish-photo flow is not camera-only');
await evaluate(`document.querySelector('#nav .tab[data-nav="library"]')?.click()`);
await waitForVisible('.recipe-card', 'Favourite filter setup');
await evaluate(`document.querySelector('#screen [data-filter="Favorites"]')?.click()`);
const favCount = await evaluate(`document.querySelectorAll('#screen .recipe-card').length`);
const favoriteRecipePresent = await evaluate(`!!document.querySelector('#screen [data-open="1"]')`);
if (favCount !== 1 || !favoriteRecipePresent) throw new Error(`Favourite filter failed to show only the saved recipe: ${favCount}`);
console.log('Android catalogue, camera-only capture, favourite save/filter, bilingual home, What’s New, shopping, and Back checks passed');
ws.close();
NODE
timeout --kill-after=10s 180s node .github/scripts/v33-passport-persistence-smoke.mjs
echo 'Launching the explicitly gated debug-only artwork review route'
adb_timeout shell am force-stop "$APP_ID"
adb_timeout shell am start -W -n "$APP_ID"/com.aaria.magickitchen.pilot.MainActivity --ez W01_ARTWORK_REVIEW true
adb_timeout forward --remove tcp:9222 >/dev/null 2>&1 || true
review_socket=""
for attempt in $(seq 1 30); do
  review_pid=$(adb_poll_timeout shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' | awk '{print $1}' || true)
  if [ -n "$review_pid" ]; then
    review_socket=$(adb_poll_timeout shell cat /proc/net/unix 2>/dev/null | grep -o "webview_devtools_remote_${review_pid}" | head -1 || true)
  fi
  [ -n "$review_socket" ] && break
  sleep 2
done
test -n "$review_socket"
adb_timeout forward tcp:9222 "localabstract:$review_socket"
timeout --kill-after=10s 90s node .github/scripts/v31-artwork-review-smoke.mjs
echo 'Launching exact five-recipe artwork batches in the debug-only Android reviewer route'
for batch_dir in tools/v3/artwork/exact-batches/B*; do
  [ -d "$batch_dir" ] || continue
  batch=$(basename "$batch_dir")
  [[ "$batch" =~ ^B(0[1-9]|10)$ ]] || { echo "Unexpected exact batch directory: $batch" >&2; exit 1; }
  echo "Capturing exact Android review evidence for $batch"
  adb_timeout shell am force-stop "$APP_ID"
  adb_timeout shell am start -W -n "$APP_ID"/com.aaria.magickitchen.pilot.MainActivity --ez W01_ARTWORK_REVIEW true --es W01_ARTWORK_BATCH "$batch"
  adb_timeout forward --remove tcp:9222 >/dev/null 2>&1 || true
  exact_socket=""
  for attempt in $(seq 1 30); do
    exact_pid=$(adb_poll_timeout shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' | awk '{print $1}' || true)
    if [ -n "$exact_pid" ]; then
      exact_socket=$(adb_poll_timeout shell cat /proc/net/unix 2>/dev/null | grep -o "webview_devtools_remote_${exact_pid}" | head -1 || true)
    fi
    [ -n "$exact_socket" ] && break
    sleep 2
  done
  test -n "$exact_socket"
  adb_timeout forward tcp:9222 "localabstract:$exact_socket"
  timeout --kill-after=10s 120s node .github/scripts/w01-exact-batch-smoke.mjs "$batch"
done
file artifacts/v32-android-screenshots/*.png
