#!/usr/bin/env bash
set -euo pipefail
on_exit() {
  result=$?
  trap - EXIT
  if [ "$result" -ne 0 ]; then
    mkdir -p artifacts/v31-diagnostics
    printf 'android_smoke_exit_code=%s\n' "$result" > artifacts/v31-diagnostics/smoke-exit.txt
    adb logcat -d -t 12000 > artifacts/v31-diagnostics/logcat.txt 2>&1 || true
    adb shell dumpsys activity activities > artifacts/v31-diagnostics/activity.txt 2>&1 || true
    adb shell dumpsys window windows > artifacts/v31-diagnostics/windows.txt 2>&1 || true
    adb shell screencap -p /sdcard/v31-failure.png >/dev/null 2>&1 || true
    adb pull /sdcard/v31-failure.png artifacts/v31-diagnostics/failure-screen.png >/dev/null 2>&1 || true
    cp -R artifacts/v31-android-screenshots artifacts/v31-diagnostics/partial-screenshots >/dev/null 2>&1 || true
  fi
  exit "$result"
}
trap on_exit EXIT
mkdir -p artifacts/v31-android-screenshots
adb install -r phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.aaria.magickitchen.pilot/.MainActivity
socket=""
for attempt in $(seq 1 45); do
  socket=$(adb shell cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*' | head -1 || true)
  [ -n "$socket" ] && break
  sleep 2
done
test -n "$socket"
adb forward tcp:9222 "localabstract:$socket"
node --input-type=module <<'NODE'
const {execFileSync} = await import('node:child_process');
const {readFileSync, statSync} = await import('node:fs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let target;
for (let attempt=0; attempt<60 && !target; attempt++) {
  try {
    const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
    target = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
  } catch {}
  if (!target) await pause(1000);
}
if (!target) throw new Error('Android WebView page target was not found');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, {once:true}); ws.addEventListener('error', reject, {once:true}); });
let seq = 0;
const pending = new Map();
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const {resolve, reject} = pending.get(message.id); pending.delete(message.id);
  message.error ? reject(new Error(message.error.message)) : resolve(message.result);
});
async function evaluate(expression) {
  const id = ++seq;
  const result = new Promise((resolve, reject) => pending.set(id, {resolve, reject}));
  ws.send(JSON.stringify({id, method:'Runtime.evaluate', params:{expression, returnByValue:true, awaitPromise:true}}));
  const response = await result;
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'WebView evaluation failed');
  return response.result?.value;
}
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
execFileSync('adb', ['shell','screencap','-p','/sdcard/v31-home.png']);
execFileSync('adb', ['pull','/sdcard/v31-home.png','artifacts/v31-android-screenshots/v31-home-portrait.png']);
if (statSync('artifacts/v31-android-screenshots/v31-home-portrait.png').size < 10000) throw new Error('Home screenshot is unexpectedly small');
await evaluate(`document.querySelector('[data-v31-open-world]').click()`);
const world = await evaluate(`document.querySelector('.v31-world-page h1')?.innerText || ''`);
if (!world.includes('World Food Adventures')) throw new Error('World route did not load; got: ' + world);
console.log('World route verified:', world);
execFileSync('adb', ['shell','screencap','-p','/sdcard/v31-world.png']);
execFileSync('adb', ['pull','/sdcard/v31-world.png','artifacts/v31-android-screenshots/v31-world-portrait.png']);
execFileSync('adb', ['shell','settings','put','system','accelerometer_rotation','0']);
execFileSync('adb', ['shell','settings','put','system','user_rotation','1']);
await new Promise(resolve => setTimeout(resolve, 2000));
const landscape = await evaluate(`document.querySelector('.v31-world-page h1')?.innerText || ''`);
if (!landscape.includes('World Food Adventures')) throw new Error('World route was lost during orientation change');
execFileSync('adb', ['shell','screencap','-p','/sdcard/v31-world-landscape.png']);
execFileSync('adb', ['pull','/sdcard/v31-world-landscape.png','artifacts/v31-android-screenshots/v31-world-landscape.png']);
const image = readFileSync('artifacts/v31-android-screenshots/v31-world-landscape.png');
const width = image.readUInt32BE(16), height = image.readUInt32BE(20);
if (width <= height) throw new Error(`Landscape capture is not landscape: ${width}x${height}`);
for (const [file, landscapeExpected] of [['v31-home-portrait.png',false],['v31-world-portrait.png',false],['v31-world-landscape.png',true]]) {
  const path = `artifacts/v31-android-screenshots/${file}`;
  if (statSync(path).size < 10000) throw new Error(`Screenshot is unexpectedly small: ${file}`);
  const png = readFileSync(path), w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  if (landscapeExpected ? w<=h : w>=h) throw new Error(`Unexpected orientation for ${file}: ${w}x${h}`);
}
console.log(`Verified landscape screenshot dimensions: ${width}x${height}`);
ws.close();
NODE
file artifacts/v31-android-screenshots/*.png
