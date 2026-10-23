#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts/v32-android-screenshots/tablet artifacts/v32-android-screenshots/g2-tablet artifacts/v32-diagnostics
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
capture_tablet_logcat_on_exit() {
  local result=$?
  trap - EXIT
  if [ "$result" -ne 0 ]; then
    {
      printf 'exit_code=%s\n' "$result"
      printf 'captured_at_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      adb_timeout -s "$ANDROID_SERIAL" logcat -d -t 4000 || printf 'logcat_capture=FAILED\n'
    } > artifacts/v32-diagnostics/tablet-emulator-logcat.txt 2>&1
  fi
  exit "$result"
}
trap capture_tablet_logcat_on_exit EXIT
adb_timeout -s "$ANDROID_SERIAL" wait-for-device
booted=
for attempt in $(seq 1 90); do
  booted=$(adb_poll_timeout -s "$ANDROID_SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
  [ "$booted" = 1 ] && break
  sleep 2
done
[ "$booted" = 1 ] || { adb_poll_timeout devices -l; echo "Tablet emulator did not finish booting" >&2; exit 1; }
APP_ID="com.aaria.magickitchen.pilot.v32review${GITHUB_RUN_NUMBER:-local}"
BASELINE_APP_ID=com.aaria.magickitchen.pilot.v31preview
PREVIOUS_V32_REVIEW_APP_ID=com.aaria.magickitchen.pilot.v32review70
previous_review_candidates=(artifacts/v32-previous-review-apk/*.apk)
baseline_candidates=(artifacts/v31-baseline-apk/*.apk)
if [ "${#previous_review_candidates[@]}" -ne 1 ] || [ ! -s "${previous_review_candidates[0]}" ] || [ "${#baseline_candidates[@]}" -ne 1 ] || [ ! -s "${baseline_candidates[0]}" ]; then
  echo 'Expected previous V3.2 review and Classic APKs for nondestructive coexistence validation.' >&2
  exit 1
fi
adb_timeout -s "$ANDROID_SERIAL" install -r "${baseline_candidates[0]}"
adb_timeout -s "$ANDROID_SERIAL" shell pm path "$BASELINE_APP_ID" | grep -q 'package:'
adb_timeout -s "$ANDROID_SERIAL" install -r "${previous_review_candidates[0]}"
adb_timeout -s "$ANDROID_SERIAL" shell pm path "$PREVIOUS_V32_REVIEW_APP_ID" | grep -q 'package:'
adb_timeout -s "$ANDROID_SERIAL" install -r phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk
adb_timeout -s "$ANDROID_SERIAL" shell pm path "$BASELINE_APP_ID" | grep -q 'package:'
adb_timeout -s "$ANDROID_SERIAL" shell pm path "$PREVIOUS_V32_REVIEW_APP_ID" | grep -q 'package:'
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
timeout --kill-after=10s 2700s node --input-type=module <<'NODE'
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,unlinkSync,writeFileSync} from 'node:fs';
import {clickByDatasetExpression,clickSelectorExpression,navigationSummaryExpression} from './tools/v3/android-webview-smoke-expressions.mjs';
import {captureDistinctPng} from './.github/scripts/android-screenshot-orientation.mjs';
const serial=process.env.ANDROID_SERIAL;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const adb=args=>execFileSync('timeout',['--kill-after=5s','60s','adb','-s',serial,...args],{maxBuffer:32*1024*1024});
let target=null;
let lastCandidate=null;
for(let i=0;i<60&&!target;i++){
  try{const list=await(await fetch('http://127.0.0.1:9223/json')).json();lastCandidate=list.find(x=>x.type==='page'&&x.webSocketDebuggerUrl&&x.url?.includes('appassets.androidplatform.net'))||null;target=list.find(x=>x.type==='page'&&x.webSocketDebuggerUrl&&x.url?.includes('appassets.androidplatform.net')&&x.title?.includes('Magical Kitchen'))||null}catch{}
  if(!target)await pause(500);
}
if(!target)throw Error('Tablet app-owned WebView target did not become title-ready within 30 seconds: '+JSON.stringify(lastCandidate&&{url:lastCandidate.url,title:lastCandidate.title,id:lastCandidate.id}));
console.log('Tablet WebView DevTools target: '+JSON.stringify({url:target.url,title:target.title,id:target.id}));
let ws=null;
let lastConnectionError=null;
for(let attempt=1;attempt<=6&&!ws;attempt++){
  let candidate=null;
  try{
    const targets=await(await fetch('http://127.0.0.1:9223/json',{signal:AbortSignal.timeout(2500)})).json();
    target=targets.find(x=>x.type==='page'&&x.webSocketDebuggerUrl&&x.url?.includes('appassets.androidplatform.net')&&x.title?.includes('Magical Kitchen'))||target;
    candidate=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value)};
      const timer=setTimeout(()=>finish(reject,new Error('DevTools WebSocket open timed out after 5 seconds')),5000);
      candidate.addEventListener('open',()=>finish(resolve),{once:true});
      candidate.addEventListener('error',event=>finish(reject,event.error||new Error('DevTools WebSocket error before open: '+String(event.message||event.type))),{once:true});
      candidate.addEventListener('close',event=>finish(reject,new Error('DevTools WebSocket closed before open: '+JSON.stringify({code:event.code,reason:event.reason,wasClean:event.wasClean}))),{once:true});
    });
    ws=candidate;
    if(attempt>1)console.log('Tablet DevTools WebSocket connected after bounded retry '+attempt+'/6');
  }catch(error){
    lastConnectionError=error;
    try{candidate?.close()}catch{}
    ws=null;
    console.warn('Tablet DevTools WebSocket startup attempt '+attempt+'/6 failed: '+String(error?.stack||error));
    if(attempt<6)await pause(1000);
  }
}
if(!ws)throw new Error('Tablet WebView DevTools WebSocket failed after 6 bounded attempts: '+String(lastConnectionError?.stack||lastConnectionError)+'; target='+JSON.stringify({url:target.url,title:target.title,id:target.id}));
let seq=0;const pending=new Map();
ws.addEventListener('close',event=>{const error=new Error('Tablet WebView DevTools socket closed: '+JSON.stringify({code:event.code,reason:event.reason,wasClean:event.wasClean}));console.error(error.message);for(const request of pending.values()){clearTimeout(request.timer);request.reject(error)}pending.clear()});
ws.addEventListener('error',event=>console.error('Tablet WebView DevTools socket error: '+String(event.message||event.type)));
ws.addEventListener('message',async event=>{let data=event.data;if(typeof data!=='string')data=typeof data?.text==='function'?await data.text():Buffer.from(data).toString('utf8');let msg;try{msg=JSON.parse(data)}catch{return}if(!msg.id||!pending.has(msg.id))return;const p=pending.get(msg.id);pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result)});
async function command(method,params={}){const id=++seq;const p=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('DevTools timeout: '+method+'; target='+JSON.stringify({url:target.url,title:target.title,id:target.id})+'; pending='+pending.size))},30000);pending.set(id,{resolve,reject,timer})});ws.send(JSON.stringify({id,method,params}));return await p}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text||'WebView evaluation failed');return r.result?.value}
await command('Page.enable');
await command('Runtime.enable');
console.log('Tablet WebView DevTools Page and Runtime domains are enabled');
async function waitFor(selector,label){let last='';for(let i=0;i<40;i++){const x=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');const r=e?.getBoundingClientRect();const hidden=e?[...function*(){for(let n=e;n&&n!==document.documentElement;n=n.parentElement)yield n}()].some(n=>{const s=getComputedStyle(n);return s.display==="none"||s.visibility==="hidden"||Number(s.opacity)===0}):true;return {ok:!!e&&!!r&&r.width>0&&r.height>0&&!hidden,text:e?.innerText||""}})()');last=JSON.stringify(x);if(x.ok)return x;await pause(250)}throw Error(label+' not visible: '+last)}
async function waitForCaptureReady(label){let previous='',stable=0,last=null;for(let attempt=0;attempt<30;attempt++){last=await evaluate('(()=>{const screen=document.querySelector("#screen"),root=screen?.getBoundingClientRect(),visible=!!root&&root.width>0&&root.height>0,images=[...(screen?.querySelectorAll("img")||[])].filter(image=>{const r=image.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth}).map(image=>({src:image.currentSrc||image.src,complete:image.complete,width:image.naturalWidth,height:image.naturalHeight}));return {visible,fonts:document.fonts?.status||"unknown",rect:root&&[Math.round(root.x),Math.round(root.y),Math.round(root.width),Math.round(root.height)],step:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),textLength:(screen?.innerText||"").length,images}})()');const ready=last.visible&&last.fonts==="loaded"&&last.images.every(image=>image.complete&&image.width>0&&image.height>0);const signature=JSON.stringify(last);stable=ready&&signature===previous?stable+1:0;if(stable>=2)return last;previous=signature;await pause(100)}throw Error(label+' did not reach stable, image-ready UI before screenshot: '+JSON.stringify(last))}
async function waitForActiveStep(index,label){let last=null;for(let attempt=0;attempt<40;attempt++){last=await evaluate('(()=>({step:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),progress:Number(step||0)+1,instruction:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||""}))()');if(last.step===index&&last.progress===index)return last;await pause(100)}throw Error(label+' did not reach the expected step within 4 seconds: '+JSON.stringify({expected:index,last}))}
async function dismissChefChooser(){const present=await evaluate('(()=>{const d=document.querySelector("#v3ProfileDialog");if(!d)return false;const r=d.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(d).display!=="none"})()');if(present){console.log('Selecting Chef A for the disposable Aaria tablet profile');const selected=await evaluate(clickSelectorExpression('#v3ProfileDialog [data-v3-chef]'));if(!selected||!await evaluate('document.querySelector("#v3ProfileDialog [data-v3-chef]")?.getAttribute("aria-pressed")==="true"'))throw Error('Chef chooser was visible but Chef A could not be selected');const clicked=await evaluate(clickSelectorExpression('#v3ProfileDialog [data-v3-profile-continue]'));if(!clicked)throw Error('Chef chooser was visible but could not be continued');let remains=true;for(let attempt=0;attempt<30;attempt++){remains=await evaluate('!!document.querySelector("#v3ProfileDialog")');if(!remains)break;await pause(100)}if(remains)throw Error('Chef chooser remained open after selecting Chef A')} }
async function click(selector,label){const ok=await evaluate(clickSelectorExpression(selector));if(!ok)throw Error(label+' control missing')}
async function clickRecipeCard(id,label){const ok=await evaluate(clickByDatasetExpression('#screen [data-open]','open',id));if(!ok)throw Error(label+' recipe card missing')}
async function assertRecipe12IngredientGrid(label){const layout=await evaluate('(()=>{const grid=document.querySelector(".ref-ingredient-grid"),screen=document.querySelector("#screen"),main=document.querySelector(".reference-main"),sidebar=document.querySelector(".ref-sidebar"),panel=grid?.closest(".ref-ingredients");if(!grid||!screen||!main||!panel)return {missing:true};const side=sidebar?.getBoundingClientRect(),sideStyle=sidebar&&getComputedStyle(sidebar),sidebarOverlap=side&&sideStyle.display!=="none"&&sideStyle.visibility!=="hidden"?Math.max(0,Math.min(innerWidth,side.right)-Math.max(0,side.left)):0,usableWidth=innerWidth-sidebarOverlap,cards=[...grid.querySelectorAll(".ref-ingredient")],cols=getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).length,boxes=cards.map(card=>{const art=card.querySelector(".ref-ingredient-icon"),name=card.querySelector(".ref-ingredient-icon + span"),input=card.querySelector("input[type=checkbox]"),cr=card.getBoundingClientRect(),ar=art?.getBoundingClientRect(),nr=name?.getBoundingClientRect(),ir=input?.getBoundingClientRect(),range=document.createRange();if(name)range.selectNodeContents(name);return {card:{left:cr.left,right:cr.right,top:cr.top,bottom:cr.bottom},art:ar&&{left:ar.left,right:ar.right,top:ar.top,bottom:ar.bottom},name:nr&&{left:nr.left,right:nr.right,top:nr.top,bottom:nr.bottom,scrollWidth:name.scrollWidth,clientWidth:name.clientWidth,lines:range.getClientRects().length},input:ir&&{width:ir.width,height:ir.height,labels:input.labels?.length||0,labelText:input.closest("label")?.innerText||""}}});return {width:innerWidth,usableWidth,sidebarOverlap,documentWidth:document.documentElement.scrollWidth,screen:screen.getBoundingClientRect().width,main:main.getBoundingClientRect().width,ingredientPanel:panel.getBoundingClientRect().width,grid:grid.getBoundingClientRect().width,gridColumns:getComputedStyle(grid).gridTemplateColumns,cols,rows:new Set(boxes.map(x=>Math.round(x.card.top))).size,count:cards.length,boxes}})()');if(layout.missing||layout.count!==6||layout.cols<1||layout.cols>6||layout.rows!==Math.ceil(6/layout.cols)||layout.documentWidth>layout.width+1||layout.usableWidth<layout.width*.6||layout.ingredientPanel<layout.usableWidth*.58||layout.grid<layout.ingredientPanel*.90||layout.main<layout.usableWidth*.82)throw Error(label+' approved ingredient grid does not use its landscape ingredient panel or has invalid card geometry: '+JSON.stringify(layout));for(let i=0;i<layout.boxes.length;i++){const c=layout.boxes[i],overlap=c.art&&c.name&&c.art.right>c.name.left&&c.art.left<c.name.right&&c.art.bottom>c.name.top&&c.art.top<c.name.bottom;if(!c.art||!c.name||!c.input||overlap||c.input.width<12||c.input.height<12||c.input.labels<1||!c.input.labelText.trim()||c.name.scrollWidth>c.name.clientWidth+1||c.name.lines>8)throw Error(label+' ingredient '+(i+1)+' overlaps, clips or lacks a labeled checkbox: '+JSON.stringify({layout,card:c}))}return layout}
const orientationTrace=[];
async function orientation(landscape){
  const target=landscape?'landscape':'portrait';
  const viewport=()=>evaluate('({w:innerWidth,h:innerHeight})');
  await adb(['shell','settings','put','system','accelerometer_rotation','0']);
  const attempts=[];
  for(const rotation of [0,1,2,3]){
    const before=await viewport();
    await adb(['shell','settings','put','system','user_rotation',String(rotation)]);
    const configured=adb(['shell','settings','get','system','user_rotation']).toString('utf8').trim();
    let after=before;
    for(let i=0;i<24;i++){
      await pause(500);
      after=await viewport();
      if((after.w>after.h)===landscape){
        await pause(100);
        const settled=await viewport();
        await pause(100);
        after=await viewport();
        if((settled.w>settled.h)===landscape&&settled.w===after.w&&settled.h===after.h){
          const record={target,rotation,configured,before,after,matched:true};
          attempts.push(record);orientationTrace.push(...attempts);
          console.log('Tablet orientation verified: '+JSON.stringify(record));
          return after;
        }
      }
    }
    attempts.push({target,rotation,configured,before,after,matched:false});
  }
  orientationTrace.push(...attempts);
  const diagnostic={target,attempts};
  writeFileSync('artifacts/v32-diagnostics/tablet-orientation-trace.json',JSON.stringify(orientationTrace,null,2)+'\\n');
  throw Error('Tablet failed to reach '+target+' viewport: '+JSON.stringify(diagnostic));
}
async function audit(label){const x=await evaluate('(()=>{const tabs=[...document.querySelectorAll("#nav .tab")].map(e=>{const r=e.getBoundingClientRect();return {label:(e.innerText||e.getAttribute("aria-label")||e.title||"").trim(),w:Math.round(r.width),h:Math.round(r.height)}});return {label:'+JSON.stringify(label)+',width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,tabs}})()');if(x.tabs.length!==6||x.tabs.some(t=>!t.label||t.w<48||t.h<48))throw Error('Persistent navigation accessibility failure: '+JSON.stringify(x));if(x.documentWidth>x.width+2)throw Error('Horizontal page overflow: '+JSON.stringify(x));return x}

async function avatarScene(mode,landscape){
  const selector='.v31-home-quick-links [data-nav="'+mode+'"]';
  await click(selector,mode+' avatar screen');
  await waitFor('.v32-'+mode+'-avatar-cast',mode+' canonical avatar scene');
  const expected=mode==='family'?{keys:['aaria','mommy','daddy'],labels:['Aaria','Mommy','Daddy']}:{keys:['rohan','arjun','vihaan','isha','meera','sana','diya'],labels:['Rohan','Arjun','Vihaan','Isha','Meera','Sana','Diya']};
  const castSelector=JSON.stringify('.v32-'+mode+'-avatar-cast');
  const result=await evaluate('(()=>{const imgs=[...document.querySelectorAll('+castSelector+'+" img[data-v32-avatar]")];return {keys:imgs.map(i=>i.dataset.v32Avatar),labels:imgs.map(i=>i.alt),assetsMatch:imgs.every(i=>i.src===(i.dataset.v32Avatar==="aaria"?V31_HOME_WORLD_ART.aaria:V31_HOME_WORLD_ART.avatars[i.dataset.v32Avatar]))}})()');
  if(JSON.stringify(result.keys)!==JSON.stringify(expected.keys)||JSON.stringify(result.labels)!==JSON.stringify(expected.labels)||!result.assetsMatch)throw Error('Canonical '+mode+' avatar identity/source mismatch: '+JSON.stringify(result));
  const shot=await screenshot(mode+'-avatars-'+(landscape?'landscape':'portrait'),landscape);
  await click('#nav .tab[data-nav="home"]','Home after '+mode+' avatar screen');await waitFor('.v31-hero-welcome h1','Home after '+mode+' avatar screen');
  return {result,shot};
}
async function screenshot(name,landscape,options={}){let attempt=0;const outputDir=process.env.V32_G2_TARGETED_ONLY==='1'?'artifacts/v32-android-screenshots/g2-tablet':'artifacts/v32-android-screenshots/tablet';const captured=await captureDistinctPng({label:name,previousPng:options.previousPng,assertExpectedUi:options.assertExpectedUi,wait:pause,attempts:20,retryDelayMs:1000,capturePng:async()=>{await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await waitForCaptureReady(name);if(options.assertExpectedUi)await options.assertExpectedUi();const suffix=Date.now()+'-'+attempt++,remote='/sdcard/v32-tablet-'+name+'-'+suffix+'.png',pending=outputDir+'/.'+name+'.pending-'+suffix;adb(['shell','screencap','-p',remote]);adb(['pull',remote,pending]);const png=readFileSync(pending);unlinkSync(pending);adb(['shell','rm','-f',remote]);return png}});const {png,width:w,height:h}=captured;if(landscape?w<=h:w>=h)throw Error(name+' has incorrect screenshot orientation '+w+'x'+h);const path=outputDir+'/'+(name.endsWith('.png')?name:name+'.png');writeFileSync(path,png);return {path,width:w,height:h,bytes:png.length}}
async function prepareVisibleRecipeCapture(selector,label){const first=await evaluate('(()=>{const screen=document.querySelector("#screen"),e=screen?.querySelector('+JSON.stringify(selector)+');if(!e)return {visible:false,reason:"missing target"};e.scrollIntoView({block:"center",inline:"nearest"});const r=e.getBoundingClientRect(),root=screen.getBoundingClientRect(),s=getComputedStyle(e);return {visible:s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0&&r.bottom>root.top&&r.top<root.bottom&&r.right>root.left&&r.left<root.right,text:(e.innerText||e.textContent||"").trim()}})()');if(!first?.visible)throw Error(label+' is not inside the visible app screen before capture: '+JSON.stringify(first));await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await waitForCaptureReady(label);const settled=await evaluate('(()=>{const screen=document.querySelector("#screen"),e=screen?.querySelector('+JSON.stringify(selector)+');if(!e)return {visible:false,reason:"target disappeared"};const r=e.getBoundingClientRect(),root=screen.getBoundingClientRect(),s=getComputedStyle(e);return {visible:s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0&&r.bottom>root.top&&r.top<root.bottom&&r.right>root.left&&r.left<root.right,text:(e.innerText||e.textContent||"").trim()}})()');if(!settled?.visible)throw Error(label+' left the active app screen before capture: '+JSON.stringify(settled));return settled}
async function assertInternationalIngredientLayout(label){const x=await evaluate('(()=>{const grid=document.querySelector(".v32-international-recipe .ref-ingredient-grid"),nav=document.querySelector("#nav"),root=document.querySelector("#screen");if(!grid||!nav||!root)return {missing:true};const boxes=[...grid.querySelectorAll(".ref-ingredient")].map(card=>{const image=card.querySelector(".ref-ingredient-icon img"),name=card.querySelector(":scope>span:nth-child(2)"),input=card.querySelector("input[type=checkbox]"),r=card.getBoundingClientRect(),ir=image?.getBoundingClientRect(),wr=card.querySelector(".ref-ingredient-icon")?.getBoundingClientRect(),nr=name?.getBoundingClientRect(),cr=input?.getBoundingClientRect(),range=document.createRange();if(name)range.selectNodeContents(name);return {r:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},image:ir&&{left:ir.left,right:ir.right,top:ir.top,bottom:ir.bottom,width:ir.width,height:ir.height,complete:image.complete,naturalWidth:image.naturalWidth},wrap:wr&&{left:wr.left,right:wr.right,top:wr.top,bottom:wr.bottom},name:nr&&{left:nr.left,right:nr.right,top:nr.top,bottom:nr.bottom,width:nr.width,scrollWidth:name.scrollWidth,lines:range.getClientRects().length},input:cr&&{left:cr.left,right:cr.right,top:cr.top,bottom:cr.bottom,width:cr.width,height:cr.height,labels:input.labels?.length||0,labelText:input.labels?.[0]?.textContent?.trim()||""}}});const navRect=nav.getBoundingClientRect();return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,grid:grid.getBoundingClientRect().width,count:boxes.length,columns:getComputedStyle(grid).gridTemplateColumns,nav:{top:navRect.top,bottom:navRect.bottom},boxes}})()');if(x.missing||x.count<1||x.documentWidth>x.width+1||x.grid>x.width+1)throw Error(label+" ingredient list missing or horizontally overflowing: "+JSON.stringify(x));for(const [i,b] of x.boxes.entries()){const overlap=(a,c)=>a&&c&&a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top;const imageEscapes=b.image&&b.wrap&&(b.image.left<b.wrap.left-1||b.image.right>b.wrap.right+1||b.image.top<b.wrap.top-1||b.image.bottom>b.wrap.bottom+1);if(!b.image||!b.image.complete||b.image.naturalWidth<1||!b.wrap||imageEscapes||!b.name||!b.input||overlap(b.image,b.name)||overlap(b.name,b.input)||b.r.height<44||b.r.height>96||b.r.width>x.width+1||b.input.width<20||b.input.height<20||b.input.labels<1||!b.input.labelText||b.name.scrollWidth>b.name.width+1||b.name.lines>4)throw Error(label+" ingredient row "+(i+1)+" escaped, overlaps, clips, is oversized or lacks an accessible checkbox: "+JSON.stringify({row:b,layout:x}));}return x}
async function pageSet(landscape){
  await click('#nav .tab[data-nav="home"]','Home');await waitFor('.v31-hero-welcome h1','Home');const featured=await evaluate('(()=>{const rail=document.querySelector(".v32-review-featured-rail"),style=rail?getComputedStyle(rail):null,cards=[...document.querySelectorAll(".v32-review-featured-card")];return {ids:cards.map(e=>Number(e.dataset.v32ReviewFeaturedId)),contract:rail?.dataset.v32FeaturedIds||"",overflowX:style?.overflowX||"",title:cards[0]?.querySelector("strong")?.textContent?.trim()||"",heading:document.querySelector(".v32-review-featured-section h2")?.textContent?.trim()||""}})()');if(JSON.stringify(featured.ids)!=="[12]"||featured.contract!=="12"||featured.overflowX!=="auto"||featured.title!=="Cheesy Corn Pancakes"||featured.heading!=="⭐ Featured Recipes")throw Error("Tablet Featured Recipes must contain only review-pilot recipe #12 in a horizontal rail: "+JSON.stringify(featured));const homeA11y=await audit('home');const home=await screenshot('home-'+(landscape?'landscape':'portrait'),landscape);const newHome=await evaluate('(()=>({ids:[...document.querySelectorAll(".v32-new-recipe-card")].map(x=>Number(x.dataset.open)).sort((a,b)=>a-b),images:[...document.querySelectorAll(".v32-new-recipe-card img")].map(x=>x.complete&&x.naturalWidth>0)}))()');if(JSON.stringify(newHome.ids)!=="[96,99]"||newHome.images.some(x=>!x))throw Error('Home New Recipes artwork/navigation cards failed: '+JSON.stringify(newHome));await prepareVisibleRecipeCapture('.v32-new-recipe-card','Home New Recipes section');const newRecipeHome=await screenshot('new-recipes-'+(landscape?'landscape':'portrait'),landscape);const newHomeRoutes=[];for(const [id,title] of [[96,'Tomato Basil Pasta'],[99,'Vegetable Fried Rice']]){await clickRecipeCard(id,'Home New Recipes direct navigation');await waitFor('.ref-hero h1','Home New Recipes recipe '+id);const route=await evaluate('(()=>({id:Number(selected?.id||0),title:document.querySelector(".ref-hero h1")?.textContent?.trim()||""}))()');if(route.id!==id||route.title!==title)throw Error('Home New Recipes direct navigation mismatch: '+JSON.stringify({expected:{id,title},route}));newHomeRoutes.push(route);await click('#nav .tab[data-nav="home"]','Home after New Recipes direct navigation');await waitFor('.v31-hero-welcome h1','Home after New Recipes direct navigation '+id)}if(!landscape){await evaluate('state.language="pt-BR";save();render()');await waitFor('.v32-review-featured-rail','PT-BR tablet Featured Recipes');const ptNewHome=await evaluate('(()=>[...document.querySelectorAll(".v32-new-recipe-card strong")].map(x=>x.textContent.trim()))()');if(JSON.stringify(ptNewHome)!==JSON.stringify(['Massa com tomate e manjericão','Arroz frito com legumes']))throw Error('PT-BR New Recipes Home titles failed: '+JSON.stringify(ptNewHome));const ptFeatured=await evaluate('(()=>({ids:[...document.querySelectorAll(".v32-review-featured-card")].map(e=>Number(e.dataset.v32ReviewFeaturedId)),title:document.querySelector(".v32-review-featured-card strong")?.textContent?.trim()||"",heading:document.querySelector(".v32-review-featured-section h2")?.textContent?.trim()||""}))()');if(JSON.stringify(ptFeatured.ids)!=="[12]"||ptFeatured.title!=="Panquequinhas de milho com queijo"||ptFeatured.heading!=="⭐ Receitas em destaque")throw Error("PT-BR tablet Featured Recipes mismatch: "+JSON.stringify(ptFeatured));await screenshot('home-featured-pt-br-portrait',false);await evaluate('state.language="en-GB";save();render()');await waitFor('.v32-review-featured-rail','English tablet Featured Recipes restored')}const avatarScenes={family:await avatarScene('family',landscape),friends:await avatarScene('friends',landscape)};
  await click('#nav .tab[data-nav="world"]','World');await waitFor('#screen .v31-world-header h1','World');await dismissChefChooser();const worldRoute=await evaluate('(()=>{const screen=document.querySelector("#screen"),e=screen?.querySelector(".v31-world-header h1"),r=e?.getBoundingClientRect(),s=e?getComputedStyle(e):null;return {view:typeof view==="undefined"?"unavailable":view,heading:e?.textContent?.trim()||"",screenClass:screen?.className||"",screenText:screen?.innerText||"",visible:!!e&&!!r&&r.width>0&&r.height>0&&s?.display!=="none"&&s?.visibility!=="hidden"}})()');if(worldRoute.view!=="world"||!worldRoute.screenClass.includes("v31-world-screen")||!worldRoute.screenText.includes("World Food Adventure")||!worldRoute.visible)throw Error("Tablet world navigation did not replace the active screen with visible World content: "+JSON.stringify(worldRoute));const worldA11y=await audit('world');
  const map=await evaluate('(()=>{const svg=document.querySelector("#screen .v31-world-map"),style=svg?getComputedStyle(svg):null,wrap=document.querySelector("#screen .v31-map-wrap"),wrapStyle=wrap?getComputedStyle(wrap):null,selected=document.querySelector("#screen .v31-world-map .v31-destination.is-selected")?.dataset.v31Country||"";const controls=[...document.querySelectorAll("#screen .v31-map-controls button")].map(e=>{const b=e.getBoundingClientRect();return {w:Math.round(b.width),h:Math.round(b.height)}});return {destinationPaths:document.querySelectorAll(".v31-world-map .v31-destination[data-v31-country]").length,svgOpacity:Number(style?.opacity||0),mapArtFit:(wrapStyle?.backgroundSize||"").split(",")[0]?.trim()||"",mapBackgroundSizes:(wrapStyle?.backgroundSize||"").split(",").map(size=>size.trim()),mapAspectRatio:wrapStyle?.aspectRatio||"",selected,controls}})()');
  if(map.destinationPaths<7||map.svgOpacity<0.1||map.mapArtFit!=="contain"||!map.mapAspectRatio.startsWith("1.7")||!map.selected||map.controls.length!==0)throw Error('World map destination visibility/touch target audit failed: '+JSON.stringify(map));
  const world=await screenshot('world-'+(landscape?'landscape':'portrait'),landscape,{previousPng:readFileSync(home.path),assertExpectedUi:async()=>{const observed=await evaluate('(()=>{const screen=document.querySelector("#screen"),heading=screen?.querySelector(".v31-world-header h1"),map=screen?.querySelector(".v31-world-map"),rect=heading?.getBoundingClientRect(),style=heading?getComputedStyle(heading):null,mapRect=map?.getBoundingClientRect();return {view:typeof view==="undefined"?"unavailable":view,heading:heading?.textContent?.trim()||"",screenClass:screen?.className||"",visible:!!heading&&!!rect&&rect.width>0&&rect.height>0&&style?.display!=="none"&&style?.visibility!=="hidden",mapVisible:!!mapRect&&mapRect.width>0&&mapRect.height>0}})()');if(observed.view!=="world"||observed.heading!=="World Food Adventure"||!observed.screenClass.includes("v31-world-screen")||!observed.visible||!observed.mapVisible)throw Error("Tablet World UI was not visibly active immediately before screenshot: "+JSON.stringify(observed))}});
  await click('#nav .tab[data-nav="home"]','Home');await waitFor('.v31-hero-welcome h1','Home before library');await click('.v31-action-tiles [data-nav="library"]','Recipe library');await waitFor('.recipe-card','97-recipe library');
  const library=await evaluate('(()=>({count:document.querySelectorAll("#screen .recipe-card").length,themeIds:[12,76,5].map(id=>[...document.querySelectorAll("#screen [data-open]")].find(card=>card.dataset.open===String(id))?.dataset.v32Theme||"")}))()');
  if(library.count!==97||library.themeIds.join(',')!=='playful-purple,fresh-green,sunny-orange')throw Error('Tablet catalogue/theme audit failed: '+JSON.stringify(library));
  const exemplarExpected={12:{title:'Cheesy Corn Pancakes',theme:'playful-purple'},76:{title:'Rainbow Vegetable Noodle Toss',theme:'fresh-green'},5:{title:'Mini Pizza Bread Cups',theme:'sunny-orange'},96:{title:'Tomato Basil Pasta',theme:'unknown'},99:{title:'Vegetable Fried Rice',theme:'unknown'}};
  const libraryA11y=await audit('library');const libshot=await screenshot('library-'+(landscape?'landscape':'portrait'),landscape);
  const themeShots=[];
  for(const id of [12,76,5,96,99]){
    if(id===12)await evaluate('(()=>{state.done=(state.done||[]).filter(x=>Number(x)!==12);state.myCreations=(state.myCreations||[]).filter(x=>Number(typeof x==="object"?x.recipeId:x)!==12);step=0;save();return true})()');
    await clickRecipeCard(id,'Recipe '+id);
    const titleSelector=id===12?'.ref-hero h1':'.ref-hero h1';
    await waitFor(titleSelector,'Recipe '+id+' details');
    const expected=exemplarExpected[id],actualTitle=await evaluate(`document.querySelector(${JSON.stringify(titleSelector)})?.textContent?.trim()||""`);
    if(!expected||actualTitle!==expected.title)throw Error('Recipe detail title mismatch for '+id+': '+JSON.stringify({expected:expected?.title,actual:actualTitle}));
    const result=await evaluate('(()=>({theme:document.querySelector(".app")?.dataset.v32RecipeTheme||"unknown"}))()');
    if(result.theme!==expected.theme)throw Error('Recipe detail theme mismatch for '+id+': '+JSON.stringify({expected:expected.theme,actual:result.theme}));
    const orientationName=landscape?'landscape':'portrait';
    if(id===12){
      const viewport=await evaluate('({width:innerWidth,height:innerHeight})');
      const expectedColumns=null;
      await assertRecipe12IngredientGrid('EN-GB #12 tablet '+orientationName);
    }
    if(id>95){const layout=await assertInternationalIngredientLayout('Production #'+String(id).padStart(3,'0')+' '+orientationName);await prepareVisibleRecipeCapture('.v32-international-recipe .ref-ingredient-grid','Production #'+id+' ingredients '+orientationName);await evaluate('document.querySelector(".v32-international-recipe .ref-ingredient-grid .ref-ingredient:last-child")?.scrollIntoView({block:"end",inline:"nearest"})');if(!await evaluate('(()=>{const card=document.querySelector(".v32-international-recipe .ref-ingredient:last-child"),nav=document.querySelector("#nav"),c=card?.getBoundingClientRect(),n=nav?.getBoundingClientRect();return !!c&&!!n&&c.bottom<=n.top+1})()'))throw Error('Production international ingredient list bottom is obscured by persistent navigation');var productionIngredientScreenshot=await screenshot('international-'+id+'-ingredients-'+orientationName,landscape);}
    const image=await screenshot('theme-'+id+'-detail-'+orientationName,landscape);
    let ingredientScreenshot=null;
    if(id===12){
      const ingredientState=await prepareVisibleRecipeCapture('.ref-ingredient-grid','EN-GB #12 Ingredients '+orientationName);
      if(!ingredientState.visible)throw Error('EN-GB #12 tablet Ingredients grid is not visible before screenshot capture');
      ingredientScreenshot=await screenshot('recipe-12-ingredients-'+orientationName,landscape);
    }
    const flow=await evaluate('(()=>({selectedId:Number(selected?.id||0),stepCount:Number(document.querySelector(".ref-step-grid")?.dataset.stepCount)||document.querySelectorAll(".ref-step-card").length,activeCount:document.querySelectorAll(".ref-step-card.active").length,activeStep:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),pilot:!!document.querySelector(".reference-layout")}))()');flow.nav=await evaluate(navigationSummaryExpression());
    if(flow.selectedId!==id||flow.activeCount!==1||flow.activeStep!==1)throw Error('Recipe template first-step state failed: '+JSON.stringify({id,flow}));
    if(id===12&&(flow.stepCount!==4||!flow.pilot||flow.nav.map(x=>x.label).join('|')!=='Home|Recipes|World Adventure|Magic Pantry|Planner|My Creations'||flow.nav.map(x=>x.id).join('|')!=='home|library|world|groceries|week|creations'))throw Error('Recipe 12 pilot contract or exact six-button navigation failed: '+JSON.stringify(flow));
    const stepFiles=[];
    if(id===12){
      for(let index=1;index<=4;index++){
      const active=await evaluate('(()=>({step:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),safety:document.querySelector(".ref-safety details p")?.textContent||"",progress:Number(step||0)+1,instruction:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||"",expectedInstruction:displayStepText(selected,step)||"",canonicalInstruction:selected?.steps?.[step]||""}))()');
        if(active.step!==index||!active.safety||active.progress!==index||active.instruction!==active.expectedInstruction)throw Error('Tablet recipe 12 canonical step/safety/progress regression: '+JSON.stringify({index,active}));
        await evaluate('document.querySelector(".ref-step-card.active")?.scrollIntoView({block:"start"})');
        const name='recipe-12-step-'+index+'-'+(landscape?'landscape':'portrait')+'.png';
        stepFiles.push(await screenshot(name,landscape));
        if(index<4){await click('.ref-next','Next recipe 12 step');await pause(250)}
      }
      await click('.ref-next.finish-step','Finish recipe 12');await pause(250);
      if(!await evaluate('state.done.includes(12)&&state.myCreations.some(x=>Number(typeof x==="object"?x.recipeId:x)===12)&&!!document.querySelector(".ref-next.finish-step")'))throw Error('Tablet recipe 12 completion did not persist or render.');
    }else{
      await evaluate('document.querySelector(".ref-step-card.active")?.scrollIntoView({block:"center"})');
      stepFiles.push(await screenshot('theme-'+id+'-step-1-'+(landscape?'landscape':'portrait'),landscape));
      await click('.ref-next','Next step for recipe '+id);await pause(250);
      const stepTwo=await evaluate('Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0)');
      if(flow.stepCount>1&&stepTwo!==2)throw Error('Recipe '+id+' did not advance to its second step');
      if(flow.stepCount>1)stepFiles.push(await screenshot('theme-'+id+'-step-2-'+(landscape?'landscape':'portrait'),landscape));
      let complete=false;for(let n=0;n<=flow.stepCount;n++){
        if(await evaluate('!!document.querySelector(".ref-next.finish-step")')){await click('.ref-next.finish-step','Finish recipe '+id);await pause(250);complete=await evaluate('Array.isArray(state.done)&&state.done.includes('+id+')');break}
        await click('.ref-next','Advance recipe '+id);await pause(150)
      }
      if(!complete)throw Error('Recipe '+id+' did not reach its completion state');
    }
    const completion=await screenshot(id===12?'recipe-12-completion-'+(landscape?'landscape':'portrait')+'.png':'theme-'+id+'-completion-'+(landscape?'landscape':'portrait'),landscape);if(id>95&&!landscape){await evaluate('state.done=(state.done||[]).filter(x=>Number(x)!=='+id+');step=0;save();render()');await evaluate('state.language="pt-BR";save();render()');await waitFor('.ref-hero h1','PT-BR international recipe '+id);const ptRoute=await evaluate('(()=>({id:Number(selected?.id||0),title:document.querySelector(".ref-hero h1")?.textContent?.trim()||"",instruction:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||"",adult:document.querySelector(".v31-step-adult-cue")?.textContent?.trim()||"",safety:document.querySelector(".ref-safety p")?.textContent?.trim()||"",images:[...document.querySelectorAll(".v32-international-recipe img")].filter(x=>x.getBoundingClientRect().height>0).map(x=>x.complete&&x.naturalWidth>0)}))()');const expected=await evaluate('PT_RECIPES['+id+']');if(ptRoute.id!==id||ptRoute.title!==expected?.title||!ptRoute.instruction||!ptRoute.adult||!ptRoute.safety||ptRoute.images.some(x=>!x))throw Error('PT-BR offline international guided flow failed: '+JSON.stringify(ptRoute));const ptLayout=await assertInternationalIngredientLayout('Production PT-BR #'+String(id).padStart(3,'0')+' portrait');await prepareVisibleRecipeCapture('.v32-international-recipe .ref-ingredient-grid','Production PT-BR #'+id+' ingredients portrait');await evaluate('document.querySelector(".v32-international-recipe .ref-ingredient-grid .ref-ingredient:last-child")?.scrollIntoView({block:"end",inline:"nearest"})');if(!await evaluate('(()=>{const c=document.querySelector(".v32-international-recipe .ref-ingredient:last-child")?.getBoundingClientRect(),n=document.querySelector("#nav")?.getBoundingClientRect();return !!c&&!!n&&c.bottom<=n.top+1})()'))throw Error('PT-BR international ingredient list is obscured by persistent navigation');await screenshot('international-'+id+'-ingredients-pt-br-portrait',false);await screenshot('international-'+id+'-pt-br-portrait',false);await evaluate('state.language="en-GB";save();render()');await waitFor('.ref-hero h1','English international recipe restored '+id);}
    themeShots.push({id,title:actualTitle,expected:expected.theme,observed:result.theme,screenshot:image,ingredients:id>95?productionIngredientScreenshot:ingredientScreenshot,steps:stepFiles,completion,activeStepCount:flow.activeCount,totalSteps:flow.stepCount});
    await click('#nav .tab[data-nav="library"]','Recipe library');await waitFor('.recipe-card','Library after recipe '+id);
  }
  const recipeVisualEvidence=[];
  if(process.env.V32_G2_TARGETED_ONLY!=='1'){
  for(let id=1;id<=95;id++){
    const orientationName=landscape?'landscape':'portrait';
    await clickRecipeCard(id,'All-recipe tablet image audit');
    await waitFor('.ref-hero h1','Recipe '+id+' tablet '+orientationName+' visual audit');
    const detail=await evaluate(`(()=>({id:Number(selected?.id||0),title:document.querySelector('.ref-hero h1')?.textContent?.trim()||'',steps:Number(document.querySelector('.ref-step-grid')?.dataset.stepCount)||document.querySelectorAll('.ref-step-card').length}))()`);
    if(detail.id!==id||!detail.title||detail.steps<1)throw Error('Tablet all-recipe image audit entered the wrong detail route: '+JSON.stringify({id,detail}));
    const detailShot=await screenshot(`recipe-image-${id}-tablet-${orientationName}-detail`,landscape);
    const steps=[];
    for(let index=0;index<detail.steps;index++){
      const art=await evaluate(`(()=>{
        const id=${id},index=${index},card=document.querySelector('#screen .ref-step-card.active'),figure=card?.querySelector('.ref-step-photo, [data-v32-step-art], .storybook-action');
        const image=figure?.querySelector('img'),svg=figure?.querySelector('svg'),pending=!!document.querySelector('#screen .ref-step-photo.new-recipe-art-pending');
        const runtimeArt=NEW_RECIPE_ART?.[id]||{},source=image?.currentSrc||image?.src||'',expectedSource=runtimeArt.atlas||runtimeArt.storyboard||BATCH_ATLASES?.[id]||'';
        const atlas=!!figure?.querySelector('.atlas-cell'),meta=BATCH_META?.[id],cell=Number.isInteger(meta?.stepCells?.[index])?meta.stepCells[index]:index;
        const left=image?.style.left||'',top=image?.style.top||'',loaded=!!image&&image.complete&&image.naturalWidth>0&&image.naturalHeight>0;
        const rendered=loaded||!!svg||!!figure?.querySelector('[role="img"]');
        const association=atlas?!!expectedSource&&source===expectedSource&&left===(-((cell%3)*100)+'%')&&top===(-Math.floor(cell/3)*100+'%'):rendered;
        return {recipeId:id,stepIndex:index+1,stepNumber:Number(card?.querySelector('.ref-step-number')?.textContent||0),pending,kind:pending?'pending':atlas?'atlas':image?'image':svg?'svg':'role-image',source,expectedSource,cell,left,top,aspect:figure?getComputedStyle(figure).aspectRatio:'',naturalWidth:image?.naturalWidth||0,naturalHeight:image?.naturalHeight||0,loaded,rendered,association,status:pending?'FAIL':rendered&&association&&((atlas||image)?loaded:true)?'PASS':'FAIL'};
      })()`);
      if(art.stepNumber!==index+1)throw Error('Tablet recipe '+id+' step navigation mismatch: '+JSON.stringify(art));
      steps.push(art);
      if(index===0){await evaluate('document.querySelector(".ref-step-card.active")?.scrollIntoView({block:"center"})');var firstStepShot=await screenshot(`recipe-image-${id}-tablet-${orientationName}-step-1`,landscape)}
      if(index+1<detail.steps){await click('.ref-next','Recipe '+id+' tablet artwork next step');await pause(180)}
    }
    const dish=await evaluate(`(()=>{const id=${id},screen=document.querySelector('#screen'),art=NEW_RECIPE_ART?.[id]||{},images=[...screen.querySelectorAll('.ref-hero img,.ref-dish img,[data-dish-art] img,.v32-r12-dish img')],image=images.find(item=>!item.alt?.toLowerCase().includes('avatar'))||null,source=image?.currentSrc||image?.src||'',expected=art.dish||art.hero||INLINE_DISH_PHOTOS?.[id]||HOME_RECIPE_THUMBS?.[id]||'';return {source,expected,loaded:!!image&&image.complete&&image.naturalWidth>0,naturalWidth:image?.naturalWidth||0,naturalHeight:image?.naturalHeight||0,association:!!image&&!!source&&(!expected||source===expected),candidateCount:images.length}})()`);
    const status=dish.loaded&&dish.association&&steps.every(item=>item.status==='PASS')?'PASS':dish.candidateCount===0||steps.some(item=>item.status==='FAIL')?'FAIL':'NOT TESTED';
    recipeVisualEvidence.push({recipeId:id,title:detail.title,device:'tablet',orientation:orientationName,status,finishedDish:dish,steps,screenshots:[detailShot.path,firstStepShot?.path].filter(Boolean)});
    await click('#nav .tab[data-nav="library"]','Recipe library after image audit '+id);await waitFor('.recipe-card[data-open="1"]','Library after image audit '+id);
    if(id%10===0)console.log(`Verified tablet ${orientationName} recipe images ${id}/95`);
  }
  writeFileSync(`artifacts/v32-diagnostics/recipe-image-verification-tablet-${landscape?'landscape':'portrait'}.json`,JSON.stringify({schemaVersion:1,device:'tablet',orientation:landscape?'landscape':'portrait',recipeCount:recipeVisualEvidence.length,recipes:recipeVisualEvidence},null,2)+'\n');
  }
  return {home,newRecipeHome,newHomeRoutes,avatarScenes,world,library:libshot,themeShots,recipeVisualEvidence,accessibility:{home:homeA11y,world:worldA11y,library:libraryA11y},worldMap:map}
}
await waitFor('.v31-hero-welcome h1','Tablet home');
await dismissChefChooser();
async function capturePtBrRecipe12(landscape){
 await orientation(landscape);
 await click('#nav .tab[data-nav="home"]','Home before PT-BR #12 '+(landscape?'landscape':'portrait'));
 await waitFor('.v31-hero-welcome h1','Home before PT-BR #12 capture');
 await evaluate('(()=>{state.language="pt-BR";state.done=(state.done||[]).filter(x=>Number(x)!==12);state.myCreations=(state.myCreations||[]).filter(x=>Number(typeof x==="object"?x.recipeId:x)!==12);step=0;save();render();return state.language})()');
 await waitFor('.v32-review-featured-rail','PT-BR Featured Recipes before #12 capture');
 await click('.v31-action-tiles [data-nav="library"]','PT-BR recipe library');
 await waitFor('.recipe-card[data-open="12"]','PT-BR #12 recipe card');
 await clickRecipeCard(12,'PT-BR #12');
 await waitFor('.ref-hero h1','PT-BR #12 detail');
 const viewport=await evaluate('({width:innerWidth,height:innerHeight})');
 const expectedColumns=null;
 await assertRecipe12IngredientGrid('PT-BR #12 tablet '+(landscape?'landscape':'portrait'));
 const detailState=await prepareVisibleRecipeCapture('.ref-hero h1','PT-BR #12 detail');
 const detailCheck=await evaluate('(()=>({title:document.querySelector(".ref-hero h1")?.textContent?.trim()||"",expected:PT_RECIPES[12].title,ingredient:[...document.querySelectorAll(".ref-ingredient-grid .ref-ingredient")].map(e=>(e.innerText||e.textContent||"").replace(/\\s+/g," ").trim()).join("|"),expectedIngredient:PT_RECIPES[12].ingredients[0]}))()');
 const ptNav=await evaluate(navigationSummaryExpression());
 if(detailCheck.title!==detailCheck.expected||!detailCheck.ingredient.includes(detailCheck.expectedIngredient)||ptNav.map(x=>x.label).join('|')!=='Início|Receitas|Aventura|Despensa|Planejar|Criações'||ptNav.map(x=>x.id).join('|')!=='home|library|world|groceries|week|creations')throw Error('PT-BR #12 detail/navigation content mismatch: '+JSON.stringify({detailCheck,ptNav}));
 const suffix=landscape?'landscape':'portrait';
 const detail=await screenshot('recipe-12-pt-br-detail-'+suffix,landscape);
 const ingredientsState=await prepareVisibleRecipeCapture('.ref-ingredient-grid','PT-BR #12 Ingredients '+suffix);
 const ingredients=await screenshot('recipe-12-pt-br-ingredients-'+suffix,landscape);
 const steps=[];
 for(let index=0;index<4;index++){
  await waitForActiveStep(index+1,'PT-BR #12 '+suffix);
  const active=await evaluate('(()=>({number:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),instruction:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||"",expected:PT_RECIPES[12].steps['+index+'],safety:document.querySelector(".ref-safety details p")?.textContent?.trim()||"",expectedSafety:translateText(RECIPES.find(recipe=>Number(recipe.id)===12)?.safety||"", "pt-BR"),progress:Number(step||0)+1}))()');
  if(active.number!==index+1||active.instruction!==active.expected||!active.expectedSafety||active.safety!==active.expectedSafety||active.progress!==index+1)throw Error('PT-BR #12 step/canonical recipe-safety/progress mismatch: '+JSON.stringify({index,active}));
  const visible=await prepareVisibleRecipeCapture('.ref-step-card.active','PT-BR #12 active step '+(index+1));
  if(!visible.text.includes(active.instruction))throw Error('PT-BR #12 active screenshot target does not contain its canonical step: '+JSON.stringify({index,active,visible}));
  steps.push(await screenshot('recipe-12-pt-br-step-'+(index+1)+'-'+suffix,landscape));
  if(index<3){await click('.ref-next','Next PT-BR #12 step');await waitForActiveStep(index+2,'Next PT-BR #12 step')}
 }
 await click('.ref-next.finish-step','Finish PT-BR #12');
 let completed=false;for(let attempt=0;attempt<40;attempt++){completed=await evaluate('state.done.includes(12)&&state.myCreations.some(x=>Number(typeof x==="object"?x.recipeId:x)===12)&&!!document.querySelector(".ref-next.finish-step")');if(completed)break;await pause(100)}
 if(!completed)throw Error('PT-BR #12 completion did not persist/render within 4 seconds.');
 const completionState=await prepareVisibleRecipeCapture('.ref-next.finish-step','PT-BR #12 completion');
 const completion=await screenshot('recipe-12-pt-br-completion-'+suffix,landscape);
 return {orientation:suffix,detail,ingredients,steps,completion,visibleTargets:{detail:detailState.text,ingredients:ingredientsState.text,completion:completionState.text},decision:'visual review still required'};
}
async function waitForRecipe12Step(index,label){let last=null;for(let attempt=0;attempt<40;attempt++){last=await evaluate('(()=>({step:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),progress:Number(step||0)+1,instruction:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||""}))()');if(last.step===index&&last.progress===index)return last;await pause(100)}throw Error(label+' did not reach the expected step within 4 seconds: '+JSON.stringify({expected:index,last}))}
async function targetedRecipe12(landscape){
 const orientationName=landscape?'landscape':'portrait';
 await click('#nav .tab[data-nav="home"]','G2 Home');await waitFor('.v31-hero-welcome h1','G2 Home');
 const homeA11y=await audit('G2 home navigation');const home=await screenshot('home-'+orientationName,landscape);
 await click('#nav .tab[data-nav="library"]','G2 Recipe library');await waitFor('.recipe-card[data-open="12"]','G2 #12 recipe card');
 const library=await evaluate('(()=>({count:document.querySelectorAll("#screen .recipe-card").length,selected:Number(selected?.id||0)}))()');
 if(library.count!==97)throw Error('G2 recipe library expected all 97 searchable routes (95 canonical plus #096/#099): '+JSON.stringify(library));
 await evaluate('(()=>{state.done=(state.done||[]).filter(x=>Number(x)!==12);state.myCreations=(state.myCreations||[]).filter(x=>Number(typeof x==="object"?x.recipeId:x)!==12);step=0;save();return true})()');
 await clickRecipeCard(12,'G2 #12');await waitFor('.ref-hero h1','G2 #12 detail');
 const title=await evaluate('document.querySelector(".ref-hero h1")?.textContent?.trim()||""');
 if(title!=='Cheesy Corn Pancakes')throw Error('G2 entered the wrong recipe: '+JSON.stringify({expected:'Cheesy Corn Pancakes',title}));
 const geometry=await assertRecipe12IngredientGrid('EN-GB #12 tablet '+orientationName);
 const detail=await screenshot('theme-12-detail-'+orientationName,landscape);
 const ingredientVisible=await prepareVisibleRecipeCapture('.ref-ingredient-grid','G2 EN-GB #12 ingredients '+orientationName);
 const ingredients=await screenshot('recipe-12-ingredients-'+orientationName,landscape);
 const nav=await evaluate(navigationSummaryExpression());
 const flow=await evaluate('(()=>({stepCount:Number(document.querySelector(".ref-step-grid")?.dataset.stepCount)||document.querySelectorAll(".ref-step-card").length,activeCount:document.querySelectorAll(".ref-step-card.active").length,activeStep:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),pilot:!!document.querySelector(".reference-layout")}))()');
 if(flow.stepCount!==4||flow.activeCount!==1||flow.activeStep!==1||!flow.pilot||nav.map(x=>x.label).join('|')!=='Home|Recipes|World Adventure|Magic Pantry|Planner|My Creations'||nav.map(x=>x.id).join('|')!=='home|library|world|groceries|week|creations')throw Error('G2 #12 approved four-step flow or navigation contract failed: '+JSON.stringify({flow,nav}));
 const steps=[];
 for(let index=1;index<=4;index++){
  const active=await waitForRecipe12Step(index,'G2 #12 '+orientationName);
  const state=await evaluate('(()=>({step:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),instruction:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||"",expected:displayStepText(selected,step)||"",canonical:selected?.steps?.[step]||"",safety:document.querySelector(".ref-safety details p")?.textContent?.trim()||"",progress:Number(step||0)+1}))()');
  if(state.step!==index||state.instruction!==state.expected||!state.canonical||!state.safety||state.progress!==index)throw Error('G2 #12 step/canonical/safety/progress mismatch: '+JSON.stringify({index,active,state}));
  const illustration=await evaluate('(()=>{const card=document.querySelector(".ref-step-card.active"),figure=card?.querySelector(".ref-step-photo,.storybook-action"),svg=figure?.querySelector("svg[role=img][aria-label]"),image=figure?.querySelector("img");return {figure:!!figure,pending:!!figure?.classList.contains("new-recipe-art-pending"),svg:!!svg,label:svg?.getAttribute("aria-label")||"",imageLoaded:!!image&&image.complete&&image.naturalWidth>0&&image.naturalHeight>0,visible:!!figure&&figure.getBoundingClientRect().width>0&&figure.getBoundingClientRect().height>0}})()');
  if(!illustration.figure||illustration.pending||!illustration.visible||(!illustration.svg&&!illustration.imageLoaded)||illustration.svg&&!illustration.label.includes("Illustration: Aaria"))throw Error('G2 #12 approved illustrated step is missing, pending or unloaded: '+JSON.stringify({index,illustration}));
  await evaluate('document.querySelector(".ref-step-card.active")?.scrollIntoView({block:"start"})');
  steps.push(await screenshot('recipe-12-step-'+index+'-'+orientationName,landscape));
  if(index<4){await click('.ref-next','G2 Next #12 step');await waitForActiveStep(index+1,'G2 Next #12 step')}
 }
 await click('.ref-next.finish-step','G2 Finish #12');
 let completed=false;for(let attempt=0;attempt<40;attempt++){completed=await evaluate('state.done.includes(12)&&state.myCreations.some(x=>Number(typeof x==="object"?x.recipeId:x)===12)&&!!document.querySelector(".ref-next.finish-step")');if(completed)break;await pause(100)}
 if(!completed)throw Error('G2 #12 completion did not persist within 4 seconds');
 const completion=await screenshot('recipe-12-completion-'+orientationName,landscape);
 console.log('G2 targeted #12 tablet evidence '+orientationName+': '+JSON.stringify({geometry,detail:detail.path,ingredients:ingredients.path,steps:steps.map(x=>x.path),completion:completion.path}));
 return {home,detail,ingredients,steps,completion,geometry,library,accessibility:{home:homeA11y},visibleIngredientText:ingredientVisible.text};
}
let portraitViewport,portrait,landscapeViewport,landscape,ptBrRecipe12;
if(process.env.V32_G2_TARGETED_ONLY==='1'){
 portraitViewport=await orientation(false);portrait=await pageSet(false);
 landscapeViewport=await orientation(true);landscape=await pageSet(true);
 ptBrRecipe12={portrait:await capturePtBrRecipe12(false),landscape:await capturePtBrRecipe12(true)};
}else{
 portraitViewport=await orientation(false);portrait=await pageSet(false);
 landscapeViewport=await orientation(true);landscape=await pageSet(true);
 ptBrRecipe12={portrait:await capturePtBrRecipe12(false),landscape:await capturePtBrRecipe12(true)};
}
const report={serial,profile:'pixel_tablet',portraitViewport,landscapeViewport,orientationTrace,portrait,landscape,ptBrRecipe12,scope:'isolated V3.2 debug APK; no release or rights/A08/A09 approval'};
mkdirSync('artifacts/v32-diagnostics',{recursive:true});
writeFileSync('artifacts/v32-diagnostics/tablet-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
ws.close();
NODE

echo 'Launching the pinned, offline international Wave 1 debug review route on tablet'
adb_timeout shell am force-stop "$APP_ID"
adb_timeout shell am start -W -n "$APP_ID"/com.aaria.magickitchen.pilot.MainActivity --ez W01_ARTWORK_REVIEW true --ez W01_INTERNATIONAL_REVIEW true
adb_timeout forward --remove tcp:9222 >/dev/null 2>&1 || true
international_socket=""
for attempt in $(seq 1 30); do
  international_pid=$(adb_poll_timeout shell pidof "$APP_ID" 2>/dev/null | tr -d '\r' | awk '{print $1}' || true)
  if [ -n "$international_pid" ]; then international_socket=$(adb_poll_timeout shell cat /proc/net/unix 2>/dev/null | grep -o "webview_devtools_remote_${international_pid}" | head -1 || true); fi
  [ -n "$international_socket" ] && break
  sleep 2
done
test -n "$international_socket"
adb_timeout forward tcp:9222 "localabstract:$international_socket"
timeout --kill-after=10s 180s node .github/scripts/w01-international-review-smoke.mjs

