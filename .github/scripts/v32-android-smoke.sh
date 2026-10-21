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
  adb_timeout shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME
  stable=0
  restarted=0
  for attempt in $(seq 1 45); do
    windows=$(adb_poll_timeout shell dumpsys window windows 2>/dev/null || true)
    activities=$(adb_poll_timeout shell dumpsys activity activities 2>/dev/null || true)
    if printf '%s' "$windows" | grep -Eqi 'Window\{[^}]*Application Not Responding|WindowStateAnimator\{[^}]*Application Not Responding'; then
      stable=0
      if [ "$restarted" -eq 0 ]; then
        echo 'Quickstep showed an ANR during HOME warmup; restarting launcher before app smoke'
        adb_timeout shell am force-stop com.android.launcher3
        adb_timeout shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME
        restarted=1
      fi
    elif printf '%s' "$activities" | grep -Eq 'ResumedActivity: ActivityRecord.*com\.android\.launcher3/.uioverrides\.QuickstepLauncher'; then
      stable=$((stable + 1))
      if [ "$stable" -ge 3 ]; then
        echo 'Quickstep HOME stayed resumed across three checks with no ANR window'
        return 0
      fi
    else
      stable=0
    fi
    sleep 2
  done
  printf 'launcher_preflight=failed\nrestarted=%s\n' "$restarted" > artifacts/v32-diagnostics/launcher-preflight.txt
  echo 'Android HOME did not reach a stable Quickstep foreground without ANR' >&2
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
echo 'Installing original V3 APK and isolated V3.2 preview side by side'
BASELINE_APP_ID=com.aaria.magickitchen.pilot.v31preview
APP_ID=com.aaria.magickitchen.pilot.v32preview
baseline_candidates=(artifacts/v31-baseline-apk/*.apk)
if [ "${#baseline_candidates[@]}" -ne 1 ] || [ ! -s "${baseline_candidates[0]}" ]; then
  echo "Expected exactly one archived Classic preview APK under artifacts/v31-baseline-apk; found ${#baseline_candidates[@]}" >&2
  find artifacts/v31-baseline-apk -maxdepth 2 -type f -print >&2 || true
  exit 1
fi
BASELINE_APK=${baseline_candidates[0]}
adb_timeout install -r "$BASELINE_APK"
adb_timeout shell pm path "$BASELINE_APP_ID" | grep -q 'package:'
adb_timeout install -r phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
adb_timeout shell pm path "$BASELINE_APP_ID" | grep -q 'package:'
adb_timeout shell pm path "$APP_ID" | grep -q 'package:'
echo 'Co-install verified: original V3 and V3.1 preview have distinct installed package paths'
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
timeout --kill-after=10s 720s node --input-type=module <<'NODE'
const {execFileSync} = await import('node:child_process');
const {readFileSync, statSync, renameSync, unlinkSync, writeFileSync, mkdirSync} = await import('node:fs');
const {createHash} = await import('node:crypto');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const adb = args => execFileSync('timeout', ['--kill-after=10s','60s','adb',...args]);
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
async function assertNoAndroidAnr(label) {
  const windows = adb(['shell','dumpsys','window','windows']).toString('utf8');
  const anrWindow = windows.match(/Window\{[^}\n]*Application Not Responding[^}\n]*\}/i)?.[0];
  if (anrWindow) throw new Error(`${label}: Android displayed a system ANR overlay (${anrWindow})`);
}
async function captureScreenshot(name, label, previousDigest = null) {
  const output = `artifacts/v32-android-screenshots/${name}`;
  const pending = `${output}.pending`;
  const remote = `/sdcard/${name}`;
  for (let attempt = 0; attempt < 20; attempt++) {
    await assertNoAndroidAnr(label);
    await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    await pause(500);
    adb(['shell','screencap','-p',remote]);
    adb(['pull',remote,pending]);
    await assertNoAndroidAnr(label);
    if (statSync(pending).size >= 10000) {
      const digest = createHash('sha256').update(readFileSync(pending)).digest('hex');
      if (!previousDigest || digest !== previousDigest) {
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
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'WebView evaluation failed');
  return response.result?.value;
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
const homeVisual = await evaluate(`(() => { const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null}; const images=[...document.querySelectorAll('.v31-reference-hero img,.v31-brand-lockup,.v31-featured-art img')];const nav=[...document.querySelectorAll('#nav .tab')];return {hero:rect(document.querySelector('.v31-reference-hero')),brand:rect(document.querySelector('.v31-brand-lockup')),heroImages:images.map(i=>({loaded:i.complete&&i.naturalWidth>0,alt:i.alt,width:i.naturalWidth})),tiles:document.querySelectorAll('.v31-action-tile').length,featured:rect(document.querySelector('.v31-featured-card')),destinationTiles:document.querySelectorAll('.v31-destination-tile').length,nav:nav.map(b=>b.innerText.trim())}; })()`);
if (!homeVisual.hero || homeVisual.hero.w < 260 || homeVisual.hero.h < 150 || !homeVisual.brand || homeVisual.heroImages.some(i=>!i.loaded) || homeVisual.tiles!==4 || !homeVisual.featured || homeVisual.destinationTiles<5 || homeVisual.nav.length!==6) throw new Error(`Approved Home visual composition is incomplete in Android: ${JSON.stringify(homeVisual)}`);
console.log('Installed Android Home visual composition verified:', JSON.stringify(homeVisual));
const homeDigest = await captureScreenshot('v31-home-portrait.png', 'Home');
if (statSync('artifacts/v32-android-screenshots/v31-home-portrait.png').size < 10000) throw new Error('Home screenshot is unexpectedly small');
await evaluate(`document.querySelector('[data-v31-open-world]').click()`);
const worldState = await waitForVisible('.v31-world-header h1', 'World Adventure heading');
if (!worldState.screen.includes('v31-world-screen') || !worldState.text.includes('World Food Adventure')) throw new Error('World route did not replace the active screen; got: ' + JSON.stringify(worldState));
console.log('Visible World route verified:', worldState.text);
const worldVisual = await evaluate(`(() => { const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null}; const map=document.querySelector('.v31-illustrated-map-panel'),feature=document.querySelector('.v31-world-feature'),pending=document.querySelector('.v31-world-pending');return {map:rect(map),mapCountries:map?.querySelectorAll('.v31-land').length||0,landmarks:map?.querySelectorAll('.v31-map-landmark').length||0,featured:rect(feature),featuredImage:!!feature?.querySelector('.v31-world-feature-art img'),pendingCountry:!!pending,recipes:document.querySelectorAll('.v31-world-recipe-tile').length,passport:!!document.querySelector('.v31-passport'),nav:document.querySelectorAll('#nav .tab').length}; })()`);
if (!worldVisual.map || worldVisual.map.h < 160 || worldVisual.mapCountries < 100 || worldVisual.landmarks!==5 || !worldVisual.featured || !worldVisual.featuredImage || worldVisual.recipes < 5 || !worldVisual.passport || worldVisual.nav!==6) throw new Error(`Approved World Adventure visual composition is incomplete in Android: ${JSON.stringify(worldVisual)}`);
console.log('Installed Android World Adventure visual composition verified:', JSON.stringify(worldVisual));
const worldDigest = await captureScreenshot('v31-world-portrait.png', 'World', homeDigest);
if (homeDigest === worldDigest) throw new Error('World screenshot is byte-identical to Home; route transition was not captured');
await rotateTo(1);
await waitForWebViewOrientation(true);
const landscape = await waitForVisible('.v31-world-header h1', 'World heading after rotation');
if (!landscape.screen.includes('v31-world-screen') || !landscape.text.includes('World Food Adventure')) throw new Error('World route was lost during orientation change');
const landscapeLayout = await evaluate(`(() => { const app=document.querySelector('.app'),nav=document.querySelector('#nav'); return {appWidth:app?.getBoundingClientRect().width||0,viewportWidth:innerWidth,navDisplay:nav?getComputedStyle(nav).display:'missing',navHeight:nav?.getBoundingClientRect().height||0}; })()`);
if (landscapeLayout.appWidth < landscapeLayout.viewportWidth * 0.9 || landscapeLayout.navDisplay === 'none' || landscapeLayout.navHeight < 40) throw new Error(`Landscape layout does not use the screen width or show navigation: ${JSON.stringify(landscapeLayout)}`);
await captureScreenshot('v31-world-landscape.png', 'World landscape', worldDigest);
const image = readFileSync('artifacts/v32-android-screenshots/v31-world-landscape.png');
const width = image.readUInt32BE(16), height = image.readUInt32BE(20);
if (width <= height) throw new Error(`Landscape capture is not landscape: ${width}x${height}`);
console.log(`Verified landscape screenshot dimensions: ${width}x${height}`);
await rotateTo(0);
await waitForWebViewOrientation(false);
const portraitWorld = await waitForVisible('.v31-world-header h1', 'World heading after returning to portrait');
if (!portraitWorld.screen.includes('v31-world-screen') || !portraitWorld.text.includes('World Food Adventure')) throw new Error('World route was lost while returning to portrait orientation');
const indiaCount = await evaluate(`document.querySelectorAll('.v31-approved-recipes [data-v31-approved-recipe]').length`);
if (indiaCount !== 18) throw new Error(`India destination should expose its 18 original recipes; found ${indiaCount}`);
await evaluate(`document.querySelector('[data-v31-approved-recipe="51"]').click()`);
const recipe = await waitForVisible('.ref-hero h1', 'India recipe heading');
if (recipe.text !== 'Masala Cheese Toast') throw new Error(`India recipe did not replace the active screen; got: ${JSON.stringify(recipe)}`);
const adultCue = await waitForVisible('.v31-adult-cue', 'Recipe adult cooking cue');
if (!adultCue.text.includes('Ask an adult to operate the air fryer')) throw new Error(`Air fryer safety cue is missing or unclear: ${JSON.stringify(adultCue)}`);
const recipeNavigation = await evaluate(`(() => { const nav=document.querySelector('#nav'),r=nav?.getBoundingClientRect(); return {display:nav?getComputedStyle(nav).display:'missing',height:r?.height||0}; })()`);
if (recipeNavigation.display === 'none' || recipeNavigation.height < 40) throw new Error(`Recipe navigation is not visible: ${JSON.stringify(recipeNavigation)}`);
const recipeDigest = await captureScreenshot('v31-recipe-portrait.png', 'Recipe', worldDigest);
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
await evaluate(`document.querySelector('.bottom .tab[data-nav="world"]')?.click()`);
const stampCount = await evaluate(`document.querySelector('.v31-passport-count strong')?.innerText || ''`);
if (!stampCount.includes('1/7')) throw new Error(`Finishing an India recipe should award a local passport stamp; got: ${stampCount}`);
const indiaStamp = await evaluate(`!!document.querySelector('.v31-passport .v31-stamp')?.innerText.includes('India')`);
if (!indiaStamp) throw new Error('India stamp is missing from the food passport');
await evaluate(`document.querySelector('[data-v31-passport-reset]')?.click()`);
const resetCount = await evaluate(`document.querySelector('.v31-passport-count strong')?.innerText || ''`);
if (!resetCount.includes('0/7')) throw new Error(`Passport reset did not clear local stamps: ${resetCount}`);
console.log('Android World Adventure verified: India recipes → recipe → quiz → local passport stamp/reset');
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
const themeReport = await evaluate(`(() => { const cards=[...document.querySelectorAll('#screen .recipe-card')]; return {count:cards.length, themes:[...new Set(cards.map(x=>x.dataset.v32Theme))].sort(), samples:Object.fromEntries(['1','2','3'].map(id=>[id,document.querySelector('#screen [data-open=\"'+id+'\"]')?.dataset.v32Theme||'']))}; })()`);
if(themeReport.count!==95||themeReport.themes.join(',')!=='fresh-green,playful-purple,sunny-orange'||themeReport.samples['1']!=='sunny-orange'||themeReport.samples['2']!=='fresh-green'||themeReport.samples['3']!=='playful-purple') throw new Error(`V3.2 theme renderer did not assign stable purple/green/orange themes across all 95 recipes: ${JSON.stringify(themeReport)}`);
await captureScreenshot('v32-three-theme-library-portrait.png','All three recipe themes',recipeDigest);
console.log('V3.2 renderer exposes all three stable recipe themes across all 95 original IDs:',JSON.stringify(themeReport));
const routeCoverage=[];
for(let recipeId=1;recipeId<=95;recipeId++){
  const card=await evaluate(`(()=>{const cards=document.querySelectorAll('#screen .recipe-card[data-open]');const e=document.querySelector('#screen .recipe-card[data-open="${recipeId}"]');if(cards.length!==95||!e)return {catalogueCount:cards.length,missingRecipe:${recipeId}};const x={title:e.querySelector('.home-tile-name')?.textContent||e.innerText,theme:e.dataset.v32Theme};e.click();return x})()`);
  if(!card?.title||!card.theme)throw new Error(`Recipe ${recipeId} is missing its catalogue card or deterministic theme`);
  if(card.catalogueCount!==undefined)throw new Error(`Recipe ${recipeId} route sweep is not on the full recipe catalogue: ${JSON.stringify(card)}`);
  await pause(250);
  const routeState=await evaluate(`(()=>({view:typeof view==='undefined'?'unavailable':view,selectedId:typeof selected==='undefined'?null:selected?.id??null,hash:location.hash,screen:document.querySelector('#screen')?.className||'',screenText:document.querySelector('#screen')?.innerText?.slice(0,180)||'',record:typeof RECIPES==='undefined'?null:(RECIPES.find(r=>r.id===${recipeId})?{id:RECIPES.find(r=>r.id===${recipeId}).id,title:RECIPES.find(r=>r.id===${recipeId}).title,steps:RECIPES.find(r=>r.id===${recipeId}).steps?.length,ingredients:RECIPES.find(r=>r.id===${recipeId}).ingredients?.length}:null)}))()`);
  if(routeState.view!=='recipe'||Number(routeState.selectedId)!==recipeId)throw new Error(`Recipe ${recipeId} catalogue click did not enter its route: ${JSON.stringify(routeState)}`);
  await waitForVisible('.ref-hero h1',`Recipe ${recipeId} detail route`);
  const detail=await evaluate(`(()=>({title:document.querySelector('.ref-hero h1')?.textContent?.trim()||'',theme:document.querySelector('.app')?.dataset.v32RecipeTheme||'',steps:document.querySelectorAll('#screen .ref-step-card').length,ingredients:document.querySelectorAll('#screen .ref-ingredient').length,nutrition:document.querySelector('#screen .nutrition-results')?.innerText||''}))()`);
  if(!detail.title||detail.theme!==card.theme||detail.steps<1||detail.ingredients<1)throw new Error(`Recipe ${recipeId} detail regression: ${JSON.stringify({card,detail})}`);
  if(!detail.nutrition||([91,94].includes(recipeId)&&!detail.nutrition.includes('Partial draft')))throw new Error(`Recipe ${recipeId} nutrition must render and disclose incomplete source data: ${JSON.stringify(detail)}`);
  routeCoverage.push(recipeId);
  if(recipeId%10===0)console.log(`Verified recipe detail routes ${recipeId}/95`);
  await evaluate(`document.querySelector('#nav .tab[data-nav="library"]')?.click()`);
  const returned=await waitForVisible('.recipe-card[data-open="1"]',`Recipe catalogue after ${recipeId}`);
  const returnCount=await evaluate(`document.querySelectorAll('#screen .recipe-card[data-open]').length`);
  if(returnCount!==95)throw new Error(`Recipe catalogue after ${recipeId} contains ${returnCount} cards, expected 95; screen=${returned.screen}`);
}
if(routeCoverage.length!==95||new Set(routeCoverage).size!==95)throw new Error(`Expected unique detail route coverage 95/95, got ${routeCoverage.length}`);
mkdirSync('artifacts/v32-diagnostics',{recursive:true});
writeFileSync('artifacts/v32-diagnostics/recipe-route-coverage.json',JSON.stringify({checkedAt:new Date().toISOString(),recipeIds:routeCoverage,uniqueCount:new Set(routeCoverage).size,status:'PASS'},null,2)+'\n');
console.log('Android recipe detail route coverage passed 95/95 with theme, ingredient and step content verified');
await evaluate(`(()=>{const select=document.querySelector('#languageSelect');if(!select)throw Error('Language selector missing before PT-BR recipe audit');select.value='pt-BR';select.dispatchEvent(new Event('change',{bubbles:true}));return state.language})()`);
await waitForVisible('.recipe-card','PT-BR recipe library');
const ptRouteCoverage=[];
for(let recipeId=66;recipeId<=95;recipeId++){
  const card=await evaluate(`(()=>{const e=document.querySelector('#screen .recipe-card[data-open="${recipeId}"]');if(!e)return null;const title=e.querySelector('.home-tile-name')?.textContent||e.innerText;e.click();return title})()`);
  if(!card)throw new Error(`PT-BR recipe ${recipeId} is missing from the catalogue`);
  await waitForVisible('.ref-hero h1',`PT-BR recipe ${recipeId} detail`);
  const translated=await evaluate(`(()=>{const r=RECIPES.find(x=>x.id===${recipeId}),pt=PT_RECIPES[${recipeId}],title=document.querySelector('.ref-hero h1')?.textContent?.trim()||'',ingredient=document.querySelector('.ref-ingredient')?.innerText||'',step=document.querySelector('.ref-step-card.active .ref-step-copy p')?.innerText||'',safety=[...document.querySelectorAll('.storybook-safety p,.ref-safety p')].map(x=>x.innerText).join(' '),role=document.querySelector('.v32-group-role-copy')?.innerText||'',roleMode=r?.category==='Cooking with Mommy & Daddy'?'family':'friends',expectedRole=V32_PT_GROUP_ROLE_COPY?.[roleMode]||'';return {id:r?.id,title,expectedTitle:pt?.title,ingredient,expectedIngredient:pt?.ingredients?.[0],step,expectedStep:pt?.steps?.[0],safety,expectedSafety:pt?.safety,role,expectedRole}})()`);
  if(!translated.expectedTitle||!translated.title.includes(translated.expectedTitle)||!translated.expectedIngredient||!translated.ingredient.includes(translated.expectedIngredient)||!translated.expectedStep||!translated.step.includes(translated.expectedStep.slice(0,36))||!translated.expectedSafety||!translated.safety.includes(translated.expectedSafety.slice(0,36))||!translated.expectedRole||translated.role!==translated.expectedRole)throw new Error(`PT-BR recipe ${recipeId} translation did not reach its title, ingredient, first step, safety and group role copy: ${JSON.stringify(translated)}`);
  ptRouteCoverage.push(recipeId);
  if([66,81,95].includes(recipeId))await captureScreenshot(`pt-br-recipe-${recipeId}-portrait.png`,`Portuguese recipe ${recipeId}`);
  await evaluate(`document.querySelector('#nav .tab[data-nav="library"]')?.click()`);
  const returned=await waitForVisible('.recipe-card[data-open="66"]',`PT-BR catalogue after recipe ${recipeId}`);
  const count=await evaluate(`document.querySelectorAll('#screen .recipe-card[data-open]').length`);
  if(count!==95)throw new Error(`PT-BR catalogue after recipe ${recipeId} contains ${count}, expected 95: ${returned.screen}`);
}
if(ptRouteCoverage.length!==30||ptRouteCoverage[0]!==66||ptRouteCoverage.at(-1)!==95)throw new Error('PT-BR recipe translation route coverage is not IDs 66–95');
writeFileSync('artifacts/v32-diagnostics/pt-br-recipe-coverage.json',JSON.stringify({checkedAt:new Date().toISOString(),recipeIds:ptRouteCoverage,uniqueCount:new Set(ptRouteCoverage).size,status:'DRAFT_COPY_RENDERED_REVIEW_REQUIRED',review:'A08/A09/native PT-BR review pending'},null,2)+'\\n');
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
