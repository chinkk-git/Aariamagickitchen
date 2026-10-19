#!/usr/bin/env bash
set -euo pipefail
on_exit() {
  result=$?
  trap - EXIT
  if [ "$result" -ne 0 ]; then
    mkdir -p artifacts/v31-diagnostics
    printf 'android_smoke_exit_code=%s\n' "$result" > artifacts/v31-diagnostics/smoke-exit.txt
    timeout --kill-after=2s 15s adb logcat -d -t 12000 > artifacts/v31-diagnostics/logcat.txt 2>&1 || true
    timeout --kill-after=2s 15s adb shell dumpsys activity activities > artifacts/v31-diagnostics/activity.txt 2>&1 || true
    timeout --kill-after=2s 15s adb shell dumpsys window windows > artifacts/v31-diagnostics/windows.txt 2>&1 || true
    timeout --kill-after=2s 15s adb exec-out screencap -p > artifacts/v31-diagnostics/failure-screen.png 2>/dev/null || true
    cp -R artifacts/v31-android-screenshots artifacts/v31-diagnostics/partial-screenshots >/dev/null 2>&1 || true
  fi
  exit "$result"
}
trap on_exit EXIT
adb_timeout() { timeout --kill-after=10s 90s adb "$@"; }
adb_poll_timeout() { timeout --kill-after=2s 5s adb "$@"; }
ANDROID_SERIAL=${ANDROID_SERIAL:-emulator-5554}
export ANDROID_SERIAL
wait_for_booted_device() {
  echo "Waiting for $ANDROID_SERIAL to be online and fully booted"
  for attempt in $(seq 1 90); do
    state=$(adb_poll_timeout devices 2>/dev/null | awk -v serial="$ANDROID_SERIAL" '$1 == serial { print $2; exit }' || true)
    if [ "$state" = offline ]; then
      echo "$ANDROID_SERIAL is offline; requesting ADB reconnect (attempt $attempt/90)"
      adb_poll_timeout reconnect device >/dev/null 2>&1 || true
    elif [ "$state" = device ]; then
      booted=$(adb_poll_timeout -s "$ANDROID_SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
      if [ "$booted" = 1 ]; then
        echo "$ANDROID_SERIAL is online and fully booted"
        return 0
      fi
    fi
    sleep 2
  done
  adb_poll_timeout devices -l || true
  echo "Timed out waiting for $ANDROID_SERIAL to become online and fully booted" >&2
  return 1
}
mkdir -p artifacts/v31-android-screenshots
echo 'Waiting for emulator ADB'
adb_timeout wait-for-device
wait_for_booted_device
echo 'Installing V3.1 APK'
adb_timeout install -r phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
echo 'Starting V3.1 Android activity'
adb_timeout shell am start -n com.aaria.magickitchen.pilot/.MainActivity
socket=""
for attempt in $(seq 1 30); do
  socket=$(adb_poll_timeout shell cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*' | head -1 || true)
  [ -n "$socket" ] && break
  sleep 2
done
test -n "$socket"
echo "Forwarding WebView DevTools socket: $socket"
adb_timeout forward tcp:9222 "localabstract:$socket"
timeout --kill-after=10s 240s node --input-type=module <<'NODE'
const {execFileSync} = await import('node:child_process');
const {readFileSync, statSync} = await import('node:fs');
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
async function waitForRotation(expected) {
  let last = 'unknown';
  for (let attempt=0; attempt<30; attempt++) {
    try {
      const status = adb(['shell','dumpsys','window']).toString('utf8');
      last = status.match(/mRotation=(\d)/)?.[1] || 'unknown';
      if (last === String(expected)) return;
    } catch {}
    await pause(1000);
  }
  throw new Error(`Android display did not reach rotation ${expected}; last observed: ${last}`);
}
console.log('Waiting for Android WebView debugging target');
let target;
for (let attempt=0; attempt<60 && !target; attempt++) {
  try {
    const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
    target = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
  } catch {}
  if (!target) await pause(1000);
}
if (!target) throw new Error('Android WebView page target was not found');
console.log('Connected WebView target:', target.title || '(untitled)', target.url || '(no URL)');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, {once:true}); ws.addEventListener('error', reject, {once:true}); });
console.log('WebView DevTools WebSocket opened');
console.log('Allowing the offline kitchen page to settle briefly');
await pause(8000);
let seq = 0;
const pending = new Map();
let pageLoaded = false;
let resolvePageLoaded;
const pageLoadEvent = new Promise(resolve => { resolvePageLoaded = resolve; });
ws.addEventListener('message', async event => {
  let payload=event.data;
  if(typeof payload!=='string')payload=typeof payload?.text==='function'?await payload.text():Buffer.from(payload).toString('utf8');
  let message;
  try{message=JSON.parse(payload)}catch(error){console.error('Could not parse DevTools message:',String(error));return}
  if(message.method==='Page.loadEventFired'){pageLoaded=true;resolvePageLoaded(true);return}
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
await command('Page.enable');
await command('Runtime.enable');
console.log('Waiting for WebView page-load signal');
const loaded=pageLoaded||await Promise.race([pageLoadEvent,pause(90000).then(()=>false)]);
console.log(loaded?'WebView page-load event received':'WebView page-load event not observed; probing current document');
await evaluate('true');
console.log('DevTools Runtime.evaluate responds after the page-load wait');
let ready = false;
for (let attempt=0; attempt<60 && !ready; attempt++) {
  ready = await evaluate(`!!document.querySelector('#v3ProfileDialog') || !!document.querySelector('[data-v3-profile-open]')`);
  if (!ready) await pause(1000);
}
if (!ready) throw new Error('Android WebView did not reach profile setup or a ready home within 60 seconds');
await evaluate(`(() => { const dialog=document.querySelector('#v3ProfileDialog'); if(!dialog) return 'existing-profile'; const name=dialog.querySelector('#v3ProfileName'); const chef=dialog.querySelector('[data-v3-chef="CHEF_A"]'); const submit=dialog.querySelector('[data-v3-profile-continue]'); if(!name||!chef||!submit) throw Error('unexpected first-run profile setup'); name.value='Preview Chef'; chef.click(); submit.click(); return 'profile-created'; })()`);
const home = await evaluate(`!!document.querySelector('.v3-home') && !document.querySelector('#v3ProfileDialog')`);
if (!home) throw new Error('Home screen did not appear after test profile setup');
console.log('Android home screen loaded with the test profile');
adb(['shell','screencap','-p','/sdcard/v31-home.png']);
adb(['pull','/sdcard/v31-home.png','artifacts/v31-android-screenshots/v31-home-portrait.png']);
if (statSync('artifacts/v31-android-screenshots/v31-home-portrait.png').size < 10000) throw new Error('Home screenshot is unexpectedly small');
await evaluate(`document.querySelector('[data-v31-open-world]').click()`);
const worldState = await waitForVisible('.v31-world-header h1', 'World Adventure heading');
if (!worldState.screen.includes('v31-world-screen') || !worldState.text.includes('World Food Adventures')) throw new Error('World route did not replace the active screen; got: ' + JSON.stringify(worldState));
await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
console.log('Visible World route verified:', worldState.text);
adb(['shell','screencap','-p','/sdcard/v31-world.png']);
adb(['pull','/sdcard/v31-world.png','artifacts/v31-android-screenshots/v31-world-portrait.png']);
const homeDigest = createHash('sha256').update(readFileSync('artifacts/v31-android-screenshots/v31-home-portrait.png')).digest('hex');
const worldDigest = createHash('sha256').update(readFileSync('artifacts/v31-android-screenshots/v31-world-portrait.png')).digest('hex');
if (homeDigest === worldDigest) throw new Error('World screenshot is byte-identical to Home; route transition was not captured');
adb(['emu','rotate']);
await waitForRotation(1);
const landscape = await waitForVisible('.v31-world-header h1', 'World heading after rotation');
if (!landscape.screen.includes('v31-world-screen') || !landscape.text.includes('World Food Adventures')) throw new Error('World route was lost during orientation change');
await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
adb(['shell','screencap','-p','/sdcard/v31-world-landscape.png']);
adb(['pull','/sdcard/v31-world-landscape.png','artifacts/v31-android-screenshots/v31-world-landscape.png']);
const image = readFileSync('artifacts/v31-android-screenshots/v31-world-landscape.png');
const width = image.readUInt32BE(16), height = image.readUInt32BE(20);
if (width <= height) throw new Error(`Landscape capture is not landscape: ${width}x${height}`);
console.log(`Verified landscape screenshot dimensions: ${width}x${height}`);
adb(['emu','rotate']);
adb(['emu','rotate']);
adb(['emu','rotate']);
await waitForRotation(0);
const portraitWorld = await waitForVisible('.v31-world-header h1', 'World heading after returning to portrait');
if (!portraitWorld.screen.includes('v31-world-screen') || !portraitWorld.text.includes('World Food Adventures')) throw new Error('World route was lost while returning to portrait orientation');
const indiaCount = await evaluate(`document.querySelectorAll('.v31-approved-recipes [data-v31-approved-recipe]').length`);
if (indiaCount !== 18) throw new Error(`India destination should expose its 18 original recipes; found ${indiaCount}`);
await evaluate(`document.querySelector('[data-v31-approved-recipe="51"]').click()`);
const recipe = await waitForVisible('.ref-hero h1', 'India recipe heading');
if (recipe.text !== 'Masala Cheese Toast') throw new Error(`India recipe did not replace the active screen; got: ${JSON.stringify(recipe)}`);
await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
adb(['shell','screencap','-p','/sdcard/v31-recipe.png']);
adb(['pull','/sdcard/v31-recipe.png','artifacts/v31-android-screenshots/v31-recipe-portrait.png']);
if (statSync('artifacts/v31-android-screenshots/v31-recipe-portrait.png').size < 10000) throw new Error('Recipe screenshot is unexpectedly small');
for (const [left,right,label] of [['v31-home-portrait.png','v31-recipe-portrait.png','Recipe'],['v31-world-portrait.png','v31-recipe-portrait.png','Recipe']]) {
  const a=createHash('sha256').update(readFileSync(`artifacts/v31-android-screenshots/${left}`)).digest('hex');
  const b=createHash('sha256').update(readFileSync(`artifacts/v31-android-screenshots/${right}`)).digest('hex');
  if(a===b)throw new Error(`${label} screenshot is byte-identical to ${left}; route transition was not captured`);
}
for (const [file, landscapeExpected] of [['v31-home-portrait.png',false],['v31-world-portrait.png',false],['v31-recipe-portrait.png',false],['v31-world-landscape.png',true]]) {
  const path = `artifacts/v31-android-screenshots/${file}`;
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
ws.close();
NODE
file artifacts/v31-android-screenshots/*.png
