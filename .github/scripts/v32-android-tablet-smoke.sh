#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts/v32-android-screenshots/tablet artifacts/v32-diagnostics
adb_poll_timeout() { timeout --kill-after=2s 5s adb "$@"; }
adb_timeout() { timeout --kill-after=10s 90s adb "$@"; }
ANDROID_SERIAL=${ANDROID_SERIAL:-}
if [ -n "$ANDROID_SERIAL" ]; then
  adb_poll_timeout devices | awk -v serial="$ANDROID_SERIAL" '$1==serial && $2=="device"{ok=1} END{exit !ok}'
else
  mapfile -t devices < <(adb_poll_timeout devices | awk '$1 ~ /^emulator-[0-9]+$/ && $2=="device"{print $1}')
  [ "${#devices[@]}" -eq 1 ] || { echo "Expected one online tablet emulator; found ${#devices[@]}" >&2; exit 1; }
  ANDROID_SERIAL=${devices[0]}
fi
export ANDROID_SERIAL
adb_timeout -s "$ANDROID_SERIAL" wait-for-device
booted=
for attempt in $(seq 1 90); do
  booted=$(adb_poll_timeout -s "$ANDROID_SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
  [ "$booted" = 1 ] && break
  sleep 2
done
[ "$booted" = 1 ] || { adb_poll_timeout devices -l; echo "Tablet emulator did not finish booting" >&2; exit 1; }
APP_ID=com.aaria.magickitchen.pilot.v32preview
adb_timeout -s "$ANDROID_SERIAL" install -r phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
adb_timeout -s "$ANDROID_SERIAL" shell pm path "$APP_ID" | grep -q 'package:'
adb_timeout -s "$ANDROID_SERIAL" shell am start -n "$APP_ID"/com.aaria.magickitchen.pilot.MainActivity
socket=
for attempt in $(seq 1 30); do
  pid=$(adb_poll_timeout -s "$ANDROID_SERIAL" shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' | awk '{print $1}' || true)
  if [ -n "$pid" ]; then socket=$(adb_poll_timeout -s "$ANDROID_SERIAL" shell cat /proc/net/unix 2>/dev/null | grep -o "webview_devtools_remote_${pid}" | head -1 || true); fi
  [ -n "$socket" ] && break
  sleep 2
done
[ -n "$socket" ] || { echo "Tablet WebView debug socket was not created" >&2; exit 1; }
adb_timeout -s "$ANDROID_SERIAL" forward tcp:9223 "localabstract:$socket"
timeout --kill-after=10s 300s node --input-type=module <<'NODE'
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const serial=process.env.ANDROID_SERIAL;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const adb=args=>execFileSync('timeout',['--kill-after=5s','60s','adb','-s',serial,...args],{maxBuffer:32*1024*1024});
let target=null;
for(let i=0;i<60&&!target;i++){
  try{const list=await(await fetch('http://127.0.0.1:9223/json')).json();target=list.find(x=>x.type==='page'&&x.webSocketDebuggerUrl&&(x.url?.includes('appassets.androidplatform.net')||x.title?.includes('Magical Kitchen')))}catch{}
  if(!target)await pause(500);
}
if(!target)throw Error('Tablet app-owned WebView target missing');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map();
ws.addEventListener('message',async event=>{let data=event.data;if(typeof data!=='string')data=typeof data?.text==='function'?await data.text():Buffer.from(data).toString('utf8');let msg;try{msg=JSON.parse(data)}catch{return}if(!msg.id||!pending.has(msg.id))return;const p=pending.get(msg.id);pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result)});
async function command(method,params={}){const id=++seq;const p=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('DevTools timeout: '+method))},30000);pending.set(id,{resolve,reject,timer})});ws.send(JSON.stringify({id,method,params}));return await p}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text||'WebView evaluation failed');return r.result?.value}
async function waitFor(selector,label){let last='';for(let i=0;i<40;i++){const x=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');const r=e?.getBoundingClientRect();return {ok:!!e&&!!r&&r.width>0&&r.height>0,text:e?.innerText||""}})()');last=JSON.stringify(x);if(x.ok)return x;await pause(250)}throw Error(label+' not visible: '+last)}
async function click(selector,label){const ok=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)return false;e.click();return true})()');if(!ok)throw Error(label+' control missing')}
async function orientation(landscape){for(let n=0;n<4;n++){const v=await evaluate('({w:innerWidth,h:innerHeight})');if((v.w>v.h)===landscape)return v;adb(['emu','rotate']);for(let i=0;i<30;i++){await pause(500);const x=await evaluate('({w:innerWidth,h:innerHeight})');if((x.w>x.h)===landscape){await pause(800);return x}}}throw Error('Tablet did not rotate to '+(landscape?'landscape':'portrait'))}
async function audit(label){const x=await evaluate('(()=>{const tabs=[...document.querySelectorAll("#nav .tab")].map(e=>{const r=e.getBoundingClientRect();return {label:(e.innerText||e.getAttribute("aria-label")||e.title||"").trim(),w:Math.round(r.width),h:Math.round(r.height)}});return {label:'+JSON.stringify(label)+',width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,tabs}})()');if(x.tabs.length!==6||x.tabs.some(t=>!t.label||t.w<48||t.h<48))throw Error('Persistent navigation accessibility failure: '+JSON.stringify(x));if(x.documentWidth>x.width+2)throw Error('Horizontal page overflow: '+JSON.stringify(x));return x}
async function screenshot(name,landscape){await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await pause(500);const png=adb(['exec-out','screencap','-p']);const w=png.readUInt32BE(16),h=png.readUInt32BE(20);if(landscape?w<=h:w>=h)throw Error(name+' has incorrect screenshot orientation '+w+'x'+h);const path='artifacts/v32-android-screenshots/tablet/'+name+'.png';writeFileSync(path,png);return {path,width:w,height:h,bytes:png.length}}
async function pageSet(landscape){
  await click('#nav .tab[data-nav="home"]','Home');await waitFor('.v31-hero-welcome h1','Home');const homeA11y=await audit('home');const home=await screenshot('home-'+(landscape?'landscape':'portrait'),landscape);
  await click('#nav .tab[data-nav="world"]','World');await waitFor('.v31-world-header h1','World');const worldA11y=await audit('world');
  const map=await evaluate('(()=>{const p=document.querySelector(".v31-map-decoration"),r=p?.getBoundingClientRect(),style=p?getComputedStyle(p):null;const controls=[...document.querySelectorAll(".v31-map-controls button")].map(e=>{const b=e.getBoundingClientRect();return {w:Math.round(b.width),h:Math.round(b.height)}});return {landmarks:document.querySelectorAll(".v31-map-landmark").length,decorationVisible:!!p&&style.display!=="none"&&style.visibility!=="hidden"&&r.width>0&&r.height>0,controls}})()');
  if(map.landmarks<5||!map.decorationVisible||map.controls.some(x=>x.w<48||x.h<48))throw Error('World map marker/touch target audit failed: '+JSON.stringify(map));
  const world=await screenshot('world-'+(landscape?'landscape':'portrait'),landscape);
  await click('#nav .tab[data-nav="home"]','Home');await waitFor('.v31-hero-welcome h1','Home before library');await click('.v31-action-tiles [data-nav="library"]','Recipe library');await waitFor('.recipe-card','95-recipe library');
  const library=await evaluate('(()=>({count:document.querySelectorAll("#screen .recipe-card").length,themeIds:[1,2,3].map(id=>document.querySelector("#screen [data-open=\\\""+id+"\\\"]")?.dataset.v32Theme||"")}))()');
  if(library.count!==95||library.themeIds.join(',')!=='sunny-orange,fresh-green,playful-purple')throw Error('Tablet catalogue/theme audit failed: '+JSON.stringify(library));
  const libraryA11y=await audit('library');const libshot=await screenshot('library-'+(landscape?'landscape':'portrait'),landscape);
  const themeShots=[];
  for(const id of [1,2,3]){await click('#screen [data-open="'+id+'"]','Recipe '+id);await waitFor('.ref-hero h1','Recipe '+id+' details');const result=await evaluate('(()=>({theme:document.querySelector("#screen [data-v32-theme]")?.dataset.v32Theme||document.querySelector("body")?.dataset.v32Theme||"unknown"}))()');const image=await screenshot('theme-'+id+'-detail-'+(landscape?'landscape':'portrait'),landscape);themeShots.push({id,expected:library.themeIds[id-1],observed:result.theme,screenshot:image});await click('#nav .tab[data-nav="library"]','Recipe library');await waitFor('.recipe-card','Library after recipe '+id)}
  return {home,world,library:libshot,themeShots,accessibility:{home:homeA11y,world:worldA11y,library:libraryA11y},worldMap:map}
}
await pause(6000);
await waitFor('.v31-hero-welcome h1','Tablet home');
const portraitViewport=await orientation(false);
const portrait=await pageSet(false);
const landscapeViewport=await orientation(true);
const landscape=await pageSet(true);
const report={serial,profile:'pixel_tablet',portraitViewport,landscapeViewport,portrait,landscape,scope:'isolated V3.2 debug APK; no release or rights/A08/A09 approval'};
mkdirSync('artifacts/v32-diagnostics',{recursive:true});
writeFileSync('artifacts/v32-diagnostics/tablet-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
ws.close();
NODE
