#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts/v32-android-screenshots/tablet artifacts/v32-diagnostics
capture_tablet_logcat_on_exit(){ result=$?; trap - EXIT; if [ "$result" -ne 0 ]; then mkdir -p artifacts/v32-diagnostics; timeout --kill-after=2s 15s adb logcat -d -t 4000 > artifacts/v32-diagnostics/tablet-logcat.txt 2>&1 || true; timeout --kill-after=2s 15s adb shell dumpsys activity activities > artifacts/v32-diagnostics/tablet-activity.txt 2>&1 || true; fi; exit "$result"; }
trap capture_tablet_logcat_on_exit EXIT
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
APP_ID=${ANDROID_TEST_APP_ID:-"com.aaria.magickitchen.pilot.v32review${GITHUB_RUN_NUMBER:-local}"}
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
timeout --kill-after=10s 1800s node --input-type=module <<'NODE'
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,unlinkSync,writeFileSync} from 'node:fs';
import {clickByDatasetExpression,clickSelectorExpression,navigationSummaryExpression} from './tools/v3/android-webview-smoke-expressions.mjs';
import {captureDistinctPng} from './.github/scripts/android-screenshot-orientation.mjs';
const serial=process.env.ANDROID_SERIAL;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const adb=args=>execFileSync('timeout',['--kill-after=5s','60s','adb','-s',serial,...args],{maxBuffer:32*1024*1024});
async function dismissSystemAnr(){
  try{
    const quick=args=>execFileSync('timeout',['--kill-after=2s','5s','adb','-s',serial,...args],{maxBuffer:4*1024*1024});
    quick(['shell','uiautomator','dump','/sdcard/w02-tablet-anr.xml']);
    const hierarchy=quick(['shell','cat','/sdcard/w02-tablet-anr.xml']).toString().replace(/\r/g,'');
    const node=(hierarchy.match(/<node\b[^>]*>/g)||[]).find(x=>/\btext="Wait"/.test(x));
    const bounds=node?.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if(!bounds)return false;
    const x=Math.round((Number(bounds[1])+Number(bounds[3]))/2),y=Math.round((Number(bounds[2])+Number(bounds[4]))/2);
    console.warn('Tablet system ANR dialog detected; selecting Wait before retrying the interaction');
    adb(['shell','input','tap',String(x),String(y)]);
    await pause(1500);
    return true;
  }catch{return false}
}
 await pause(5000);
 console.log('Allowing Pixel Tablet first-boot activity/configuration changes to settle before attaching WebView DevTools');
 let target=null,lastTargets=[];
for(let i=0;i<60&&!target;i++){
  try{const list=await(await fetch('http://127.0.0.1:9223/json')).json();lastTargets=list.map(x=>({url:x.url,title:x.title,type:x.type}));target=list.find(x=>x.type==='page'&&x.webSocketDebuggerUrl&&x.title?.includes('Magical Kitchen'))}catch{}
  if(!target)await pause(500);
}
if(!target)throw Error('Tablet WebView did not become title-ready within 30 seconds: '+JSON.stringify(lastTargets));
console.log('Tablet WebView DevTools target: '+JSON.stringify({url:target.url,title:target.title,id:target.id}));
let ws=null,lastSocketError='';
for(let attempt=1;attempt<=6&&!ws;attempt++){
  const candidate=new WebSocket(target.webSocketDebuggerUrl);
  try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('DevTools WebSocket open timed out after 5 seconds')),5000);candidate.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});candidate.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('DevTools WebSocket handshake error'))},{once:true})});ws=candidate}
  catch(error){lastSocketError=error.message;try{candidate.close()}catch{};await pause(300)}
}
if(!ws)throw Error('Tablet DevTools socket failed after 6 bounded attempts: '+lastSocketError+'; target='+JSON.stringify({url:target.url,title:target.title,id:target.id}));
ws.addEventListener('error',event=>console.error('Tablet WebView DevTools socket error: '+String(event.message||event.type)));
let seq=0;const pending=new Map();
ws.addEventListener('message',async event=>{let data=event.data;if(typeof data!=='string')data=typeof data?.text==='function'?await data.text():Buffer.from(data).toString('utf8');let msg;try{msg=JSON.parse(data)}catch{return}if(!msg.id||!pending.has(msg.id))return;const p=pending.get(msg.id);pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result)});
ws.addEventListener('close',event=>{const error=new Error('Tablet WebView DevTools socket closed: '+JSON.stringify({code:event.code,reason:event.reason,wasClean:event.wasClean}));for(const [id,p] of pending){pending.delete(id);clearTimeout(p.timer);p.reject(error)}console.error(error.message)});
async function command(method,params={}){const id=++seq;const p=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('DevTools timeout: '+method+'; target='+JSON.stringify({url:target.url,title:target.title,id:target.id})+'; pending='+pending.size))},30000);pending.set(id,{resolve,reject,timer})});ws.send(JSON.stringify({id,method,params}));return await p}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text||'WebView evaluation failed');return r.result?.value}
await command('Page.enable');
await command('Runtime.enable');
console.log('Tablet WebView DevTools Page and Runtime domains are enabled');
async function waitFor(selector,label){let last='';for(let i=0;i<40;i++){const x=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');const r=e?.getBoundingClientRect();const hidden=e?[...function*(){for(let n=e;n&&n!==document.documentElement;n=n.parentElement)yield n}()].some(n=>{const s=getComputedStyle(n);return s.display==="none"||s.visibility==="hidden"||Number(s.opacity)===0}):true;return {ok:!!e&&!!r&&r.width>0&&r.height>0&&!hidden,text:e?.innerText||""}})()');last=JSON.stringify(x);if(x.ok)return x;await pause(250)}throw Error(label+' not visible: '+last)}
async function dismissChefChooser(){const present=await evaluate('(()=>{const d=document.querySelector("#v3ProfileDialog");if(!d)return false;const r=d.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(d).display!=="none"})()');if(present){console.log('Selecting Chef A for the disposable Aaria tablet profile');const selected=await evaluate(clickSelectorExpression('#v3ProfileDialog [data-v3-chef]'));if(!selected||!await evaluate('document.querySelector("#v3ProfileDialog [data-v3-chef]")?.getAttribute("aria-pressed")==="true"'))throw Error('Chef chooser was visible but Chef A could not be selected');const clicked=await evaluate(clickSelectorExpression('#v3ProfileDialog [data-v3-profile-continue]'));if(!clicked)throw Error('Chef chooser was visible but could not be continued');await pause(700);const remains=await evaluate('!!document.querySelector("#v3ProfileDialog")');if(remains)throw Error('Chef chooser remained open after selecting Chef A')} }
async function click(selector,label){const ok=await evaluate(clickSelectorExpression(selector));if(!ok)throw Error(label+' control missing')}
async function touch(selector,label){const point=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+'),r=e?.getBoundingClientRect();return {visible:!!e&&!!r&&r.width>0&&r.height>0&&getComputedStyle(e).visibility!=="hidden",x:r?(r.left+r.right)/2:0,y:r?(r.top+r.bottom)/2:0}})()');if(!point.visible)throw Error(label+' Android touch target missing: '+JSON.stringify(point));await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:82}]});await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(180);return point}
async function dragGlobe(dx){const point=await evaluate(`(()=>{const e=document.querySelector('#v33-world-globe-host .aria-world-globe__stage'),r=e?.getBoundingClientRect();return {visible:!!r&&r.width>0&&r.height>0,x:r?(r.left+r.right)/2:0,y:r?(r.top+r.bottom)/2:0}})()`);if(!point.visible)throw Error('Globe drag stage missing');await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:83}]});await command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+dx,y:point.y,id:83}]});await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(220)}
async function clickRecipeCard(id,label){const ok=await evaluate(clickByDatasetExpression('#screen [data-open]','open',id));if(!ok)throw Error(label+' recipe card missing')}
async function assertRecipe12IngredientGrid(label){const layout=await evaluate('(()=>{const grid=document.querySelector(".ref-ingredient-grid"),screen=document.querySelector("#screen"),main=document.querySelector(".reference-main"),sidebar=document.querySelector(".ref-sidebar"),panel=grid?.closest(".ref-ingredients"),nav=document.querySelector("#nav");if(!grid||!screen||!main||!panel)return {missing:true};const navRect=nav?.getBoundingClientRect(),navTop=navRect?.top||innerHeight,side=sidebar?.getBoundingClientRect(),sideStyle=sidebar&&getComputedStyle(sidebar),sidebarOverlap=side&&sideStyle.display!=="none"&&sideStyle.visibility!=="hidden"?Math.max(0,Math.min(innerWidth,side.right)-Math.max(0,side.left)):0,usableWidth=innerWidth-sidebarOverlap,cards=[...grid.querySelectorAll(".ref-ingredient")],cols=getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).length,boxes=cards.map(card=>{const art=card.querySelector(".ref-ingredient-icon"),name=card.querySelector(".ref-ingredient-icon + span"),input=card.querySelector("input[type=checkbox]"),cr=card.getBoundingClientRect(),ar=art?.getBoundingClientRect(),nr=name?.getBoundingClientRect(),ir=input?.getBoundingClientRect(),range=document.createRange();if(name)range.selectNodeContents(name);return {card:{left:cr.left,right:cr.right,top:cr.top,bottom:cr.bottom},art:ar&&{left:ar.left,right:ar.right,top:ar.top,bottom:ar.bottom},name:nr&&{left:nr.left,right:nr.right,top:nr.top,bottom:nr.bottom,scrollWidth:name.scrollWidth,clientWidth:name.clientWidth,lines:range.getClientRects().length},input:ir&&{width:ir.width,height:ir.height,labels:input.labels?.length||0,labelText:input.closest("label")?.innerText||""}}});return {width:innerWidth,usableWidth,sidebarOverlap,navTop,documentWidth:document.documentElement.scrollWidth,screen:screen.getBoundingClientRect().width,main:main.getBoundingClientRect().width,ingredientPanel:panel.getBoundingClientRect().width,grid:grid.getBoundingClientRect().width,gridColumns:getComputedStyle(grid).gridTemplateColumns,cols,rows:new Set(boxes.map(x=>Math.round(x.card.top))).size,count:cards.length,boxes}})()');if(layout.missing||layout.count!==6||layout.cols<1||layout.cols>6||layout.rows!==Math.ceil(6/layout.cols)||layout.documentWidth>layout.width+1||layout.usableWidth<layout.width*.6||layout.ingredientPanel<layout.usableWidth*.58||layout.grid<layout.ingredientPanel*.90||layout.main<layout.usableWidth*.82)throw Error(label+' approved ingredient grid does not use its landscape ingredient panel or has invalid card geometry: '+JSON.stringify(layout));for(let i=0;i<layout.boxes.length;i++){const c=layout.boxes[i],overlap=c.art&&c.name&&c.art.right>c.name.left&&c.art.left<c.name.right&&c.art.bottom>c.name.top&&c.art.top<c.name.bottom;if(!c.art||!c.name||!c.input||overlap||c.card.bottom>layout.navTop+1||c.input.width<12||c.input.height<12||c.input.labels<1||!c.input.labelText.trim()||c.name.scrollWidth>c.name.clientWidth+1||c.name.lines>8)throw Error(label+' ingredient '+(i+1)+' overlaps, clips or lacks a labeled checkbox: '+JSON.stringify({layout,card:c}))}return layout}
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
        await pause(800);
        after=await viewport();
        if((after.w>after.h)===landscape){
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
async function screenshot(name,landscape,options={}){let attempt=0;const captured=await captureDistinctPng({label:name,previousPng:options.previousPng,assertExpectedUi:options.assertExpectedUi,wait:pause,attempts:20,retryDelayMs:1000,capturePng:async()=>{await dismissSystemAnr();await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await pause(500);if(options.assertExpectedUi)await options.assertExpectedUi();const suffix=Date.now()+'-'+attempt++,remote='/sdcard/v32-tablet-'+name+'-'+suffix+'.png',pending='artifacts/v32-android-screenshots/tablet/.'+name+'.pending-'+suffix;adb(['shell','screencap','-p',remote]);adb(['pull',remote,pending]);const png=readFileSync(pending);unlinkSync(pending);adb(['shell','rm','-f',remote]);return png}});const {png,width:w,height:h}=captured;if(landscape?w<=h:w>=h)throw Error(name+' has incorrect screenshot orientation '+w+'x'+h);const path='artifacts/v32-android-screenshots/tablet/'+name+'.png';writeFileSync(path,png);return {path,width:w,height:h,bytes:png.length}}
async function prepareVisibleRecipeCapture(selector,label){const first=await evaluate('(()=>{const screen=document.querySelector("#screen"),e=screen?.querySelector('+JSON.stringify(selector)+');if(!e)return {visible:false,reason:"missing target"};e.scrollIntoView({block:"center",inline:"nearest"});const r=e.getBoundingClientRect(),root=screen.getBoundingClientRect(),s=getComputedStyle(e);return {visible:s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0&&r.bottom>root.top&&r.top<root.bottom&&r.right>root.left&&r.left<root.right,text:(e.innerText||e.textContent||"").trim()}})()');if(!first?.visible)throw Error(label+' is not inside the visible app screen before capture: '+JSON.stringify(first));await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await pause(500);const settled=await evaluate('(()=>{const screen=document.querySelector("#screen"),e=screen?.querySelector('+JSON.stringify(selector)+');if(!e)return {visible:false,reason:"target disappeared"};const r=e.getBoundingClientRect(),root=screen.getBoundingClientRect(),s=getComputedStyle(e);return {visible:s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0&&r.bottom>root.top&&r.top<root.bottom&&r.right>root.left&&r.left<root.right,text:(e.innerText||e.textContent||"").trim()}})()');if(!settled?.visible)throw Error(label+' left the active app screen before capture: '+JSON.stringify(settled));return settled}
async function pageSet(landscape){
  await click('#nav .tab[data-nav="home"]','Home');await waitFor('.v31-hero-welcome h1','Home');
  const verifyHomeNewRecipes=async(locale)=>{await evaluate(`state.language=${JSON.stringify(locale)};save();render()`);await waitFor('.v32-new-recipes-grid',locale+' Home New Recipes');const result=await evaluate(`(()=>{const rail=document.querySelector('.v32-new-recipes-grid'),cards=[...document.querySelectorAll('.v32-new-recipe-card')],images=cards.map(card=>card.querySelector('img')),titles=cards.map(card=>card.querySelector('strong')?.textContent?.trim()||''),badges=cards.map(card=>card.querySelector('.v32-new-recipe-badge')?.textContent?.trim()||''),style=rail?getComputedStyle(rail):null,titleMetrics=cards.map(card=>{const title=card.querySelector('strong'),range=document.createRange();if(title)range.selectNodeContents(title);return {lines:range.getClientRects().length,scrollWidth:title?.scrollWidth||0,clientWidth:title?.clientWidth||0,scrollHeight:title?.scrollHeight||0,clientHeight:title?.clientHeight||0}});return {ids:cards.map(card=>Number(card.dataset.open)),overflowX:style?.overflowX||'',direction:style?.flexDirection||'',images:images.map(image=>!!image&&image.complete&&image.naturalWidth>0),titles,badges,titleMetrics}})()`);const expected=locale==='pt-BR'?['Massa com tomate e manjericão','Arroz frito com legumes']:['Tomato Basil Pasta','Vegetable Fried Rice'],badge=locale==='pt-BR'?'NOVA':'NEW';if(JSON.stringify(result.ids)!=='[96,99]'||result.overflowX!=='auto'||!result.images.every(Boolean)||JSON.stringify(result.titles)!==JSON.stringify(expected)||result.badges.some(label=>label!==badge)||result.titleMetrics.some(x=>x.lines>2||x.scrollWidth>x.clientWidth+1||x.scrollHeight>x.clientHeight+1))throw Error((locale==='pt-BR'?'PT-BR Home New Recipes compact carousel failed: ':'Home New Recipes compact horizontal carousel failed: ')+JSON.stringify(result));const name=`home-new-recipes-${locale==='pt-BR'?'pt-br-':''}${landscape?'landscape':'portrait'}`;return await screenshot(name,landscape)};
  const homeNewRecipes={enGB:await verifyHomeNewRecipes('en-GB'),ptBR:await verifyHomeNewRecipes('pt-BR')};await evaluate('state.language="en-GB";save();render()');await waitFor('.v31-hero-welcome h1','English Home restored');
  const featured=await evaluate('(()=>{const rail=document.querySelector(".v32-review-featured-rail"),style=rail?getComputedStyle(rail):null,cards=[...document.querySelectorAll(".v32-review-featured-card")];return {ids:cards.map(e=>Number(e.dataset.v32ReviewFeaturedId)),contract:rail?.dataset.v32FeaturedIds||"",overflowX:style?.overflowX||"",title:cards[0]?.querySelector("strong")?.textContent?.trim()||"",heading:document.querySelector(".v32-review-featured-section h2")?.textContent?.trim()||""}})()');if(JSON.stringify(featured.ids)!=="[12]"||featured.contract!=="12"||featured.overflowX!=="auto"||featured.title!=="Cheesy Corn Pancakes"||featured.heading!=="⭐ Featured Recipes")throw Error("Tablet Featured Recipes must contain only review-pilot recipe #12 in a horizontal rail: "+JSON.stringify(featured));const homeA11y=await audit('home');const home=await screenshot('home-'+(landscape?'landscape':'portrait'),landscape);const avatarScenes={family:await avatarScene('family',landscape),friends:await avatarScene('friends',landscape)};
  await click('#nav .tab[data-nav="world"]','World');await waitFor('#v33-world-globe-host .aria-world-globe','World Adventure globe');await dismissChefChooser();
  const worldA11y=await audit('world');const orientationName=landscape?'landscape':'portrait';
  const globe=await evaluate(`(()=>{const root=document.querySelector('#v33-world-globe-host .aria-world-globe'),sphere=root?.querySelector('.aria-world-globe__sphere'),stage=root?.querySelector('.aria-world-globe__stage'),flag=root?.querySelector('.aria-world-globe__flag[aria-label="India"]'),guide=root?.querySelector('.aria-world-globe__guide'),sparkle=root?.querySelector('.v33-globe-sparkle-trail'),hint=root?.querySelector('.v33-spin-hint'),arrows=hint?.querySelector('.v33-spin-arrows'),arrowPaths=arrows?.querySelectorAll('path'),arrowRect=arrows?.getBoundingClientRect(),arrowStyle=arrows?getComputedStyle(arrows):null,rr=root?.getBoundingClientRect(),sr=sphere?.getBoundingClientRect(),str=stage?.getBoundingClientRect(),fr=flag?.getBoundingClientRect(),gr=guide?.getBoundingClientRect(),spr=sparkle?.getBoundingClientRect(),hr=hint?.getBoundingClientRect();return {view:typeof view==='undefined'?'unavailable':view,heading:root?.querySelector('.aria-world-globe__eyebrow')?.textContent?.trim()||'',occupancy:rr&&innerWidth?rr.width*rr.height/(innerWidth*innerHeight):0,sphere:{width:sr?.width||0,height:sr?.height||0},stage:{width:str?.width||0,height:str?.height||0},flag:{width:fr?.width||0,height:fr?.height||0},guideLoaded:!!guide?.complete&&guide.naturalWidth>0,guideVisible:!!gr&&gr.width>0&&gr.height>str.height*.25&&getComputedStyle(guide).display!=='none',guide:gr&&{width:gr.width,height:gr.height},sparkleLoaded:!!sparkle?.complete&&sparkle.naturalWidth>0,sparkleVisible:!!spr&&spr.width>0&&getComputedStyle(sparkle).display!=='none',hintText:hint?.querySelector('span')?.textContent?.trim()||'',hintVisible:!!hr&&hr.width>0&&hr.height>0&&getComputedStyle(hint).visibility!=='hidden'&&getComputedStyle(hint).display!=='none',hintOpacity:hint?getComputedStyle(hint).opacity:'',arrowsPathCount:arrowPaths?.length||0,arrowsVisible:!!arrowPaths&&arrowPaths.length>=2&&!!arrowRect&&arrowRect.width>0&&arrowRect.height>0&&arrowStyle?.display!=='none'&&arrowStyle?.visibility!=='hidden'&&arrowStyle?.opacity!=='0',countries:[...root?.querySelectorAll('.aria-world-globe__flag')||[]].map(e=>e.getAttribute('aria-label'))}})()`);
  if(globe.view!=='world'||globe.heading!=='World Adventure'||globe.sphere.width<180||globe.flag.width<48||globe.flag.height<48||!globe.guideLoaded||!globe.guideVisible||!globe.sparkleLoaded||!globe.sparkleVisible||globe.occupancy<.65||!globe.countries.includes('India')||(!landscape&&(!globe.hintVisible||globe.hintText!=='Swipe to spin the globe!'||!globe.arrowsVisible))||(landscape&&globe.hintVisible))throw Error('Tablet live globe geometry/Aaria artwork/spin hint/accessibility audit failed: '+JSON.stringify(globe));
  const world=await screenshot('world-map-tablet-'+orientationName,landscape,{assertExpectedUi:async()=>{const active=await evaluate(`(()=>{const root=document.querySelector('#v33-world-globe-host .aria-world-globe'),r=root?.getBoundingClientRect();return {view:typeof view==='undefined'?'unavailable':view,visible:!!r&&r.width>0&&r.height>0,heading:root?.querySelector('.aria-world-globe__eyebrow')?.textContent?.trim()||''}})()`);if(active.view!=='world'||!active.visible||active.heading!=='World Adventure')throw Error('Tablet live globe not visibly active before screenshot: '+JSON.stringify(active))}});writeFileSync('artifacts/v32-android-screenshots/tablet/world-map-geometry-'+orientationName+'.json',JSON.stringify(globe,null,2)+'\n');
  if(!landscape){await dragGlobe(140);const hintDismissed=await evaluate(`(()=>{const stage=document.querySelector('#v33-world-globe-host .aria-world-globe__stage'),hint=stage?.querySelector('.v33-spin-hint');return {spun:stage?.classList.contains('has-user-spun')||false,hidden:!hint||getComputedStyle(hint).visibility==='hidden'||getComputedStyle(hint).opacity==='0'}})()`);if(!hintDismissed.spun||!hintDismissed.hidden)throw Error('Android globe drag did not dismiss the portrait spin hint: '+JSON.stringify(hintDismissed))}
  await touch('#v33-world-globe-host .aria-world-globe__surprise','Surprise Me');await waitFor('#v33-world-globe-host .aria-world-globe__panel:not(.is-selected) p','Surprise Me landing prompt');
  let landing=null;for(let attempt=0;attempt<80;attempt++){landing=await evaluate(`(()=>{const s=v33GlobeController?.getState?.(),c=s?.pending?v33WorldHost?.getCountry(s.pending):null,flag=[...document.querySelectorAll('#v33-world-globe-host .aria-world-globe__flag')].find(e=>e.classList.contains('is-pending'));return {state:s||null,label:c?.label||'',pendingVisible:!!flag,aria:flag?.getAttribute('aria-label')||'',prompt:document.querySelector('#v33-world-globe-host .aria-world-globe__panel p')?.textContent||''}})()`);if(landing.pendingVisible&&landing.prompt.includes('Tap the highlighted flag'))break;await pause(250)}if(!landing?.state?.pending||landing.state.selected||!landing.pendingVisible)throw Error('Surprise Me did not land on a visible flag awaiting explicit selection: '+JSON.stringify(landing));await touch('#v33-world-globe-host .aria-world-globe__flag.is-pending','Landed country flag');await waitFor('#v33-world-globe-host .aria-world-globe__panel.is-selected h2','Explicit flag selection');
  let selected=await evaluate(`(()=>({state:v33GlobeController?.getState?.()||null,country:document.querySelector('#v33-world-globe-host .aria-world-globe__panel h2')?.textContent?.trim()||''}))()`);if(selected.state?.selected!==landing.state.pending||selected.state?.pending||!selected.country)throw Error('Explicit flag touch did not select the Surprise Me destination: '+JSON.stringify({landing,selected}));
  if(selected.state.selected!=='india'){let indiaVisible=false;for(let attempt=0;attempt<6;attempt++){indiaVisible=await evaluate(`!!document.querySelector('#v33-world-globe-host .aria-world-globe__flag[aria-label="India"]')`);if(indiaVisible)break;await dragGlobe(attempt%2===0?160:-320)}if(!indiaVisible)throw Error('India flag did not rotate into the visible hemisphere after Android globe drags');await touch('#v33-world-globe-host .aria-world-globe__flag[aria-label="India"]','India country flag');await waitFor('#v33-world-globe-host .aria-world-globe__panel.is-selected h2','India country panel');selected=await evaluate(`(()=>({state:v33GlobeController?.getState?.()||null,country:document.querySelector('#v33-world-globe-host .aria-world-globe__panel h2')?.textContent?.trim()||''}))()`)}
  const india=await evaluate(`(()=>({country:document.querySelector('#v33-world-globe-host .aria-world-globe__panel h2')?.textContent?.trim()||'',ids:[...document.querySelectorAll('#v33-world-globe-host .aria-world-globe__recipe[data-recipe-id]')].map(e=>Number(e.dataset.recipeId))}))()`);if(selected.state?.selected!=='india'||india.country!=='India'||india.ids.length!==18||india.ids.join(',')!=='51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74')throw Error('Tablet India panel must contain the 18 canonical recipes: '+JSON.stringify({selected,india}));
  const country=await screenshot('world-country-tablet-'+orientationName,landscape,{previousPng:readFileSync(world.path)});await touch('#v33-world-globe-host .aria-world-globe__recipe[data-recipe-id="51"]','Recipe #51');await waitFor('#screen .ref-hero h1','Recipe #51 route');const recipe=await evaluate(`(()=>({view:typeof view==='undefined'?'unavailable':view,title:document.querySelector('#screen h1')?.textContent?.trim()||'',text:document.querySelector('#screen')?.innerText||''}))()`);if(recipe.view==='world'||recipe.title!=='Masala Cheese Toast'||!recipe.text.includes('Masala Cheese Toast'))throw Error('Tablet recipe navigation did not open canonical recipe #51: '+JSON.stringify(recipe));await dismissSystemAnr();const recipeShot=await screenshot('world-recipe-51-tablet-'+orientationName,landscape,{previousPng:readFileSync(country.path)});await dismissSystemAnr();adb(['shell','input','keyevent','4']);await pause(800);let backState=await evaluate(`(()=>({view:typeof view==='undefined'?'unavailable':view,country:document.querySelector('#v33-world-globe-host .aria-world-globe__panel.is-selected h2')?.textContent?.trim()||'',count:document.querySelectorAll('#v33-world-globe-host .aria-world-globe__recipe[data-recipe-id]').length}))()`);if(backState.view!=='world'||backState.country!=='India'||backState.count!==18){if(await dismissSystemAnr()){adb(['shell','input','keyevent','4']);await waitFor('#v33-world-globe-host .aria-world-globe__panel.is-selected h2','Android Back to India after system ANR recovery')}else await waitFor('#v33-world-globe-host .aria-world-globe__panel.is-selected h2','Android Back to India')}const restored=await evaluate(`(()=>({view:typeof view==='undefined'?'unavailable':view,country:document.querySelector('#v33-world-globe-host .aria-world-globe__panel.is-selected h2')?.textContent?.trim()||'',count:document.querySelectorAll('#v33-world-globe-host .aria-world-globe__recipe[data-recipe-id]').length}))()`);if(restored.view!=='world'||restored.country!=='India'||restored.count!==18)throw Error('Android Back did not restore the 18-card India panel: '+JSON.stringify(restored));writeFileSync('artifacts/v32-android-screenshots/tablet/world-interaction-'+orientationName+'.json',JSON.stringify({surprise:landing,selected,india,recipe,androidBack:restored,screenshots:{world:world.path,country:country.path,recipe:recipeShot.path}},null,2)+'\n');
await click('#nav .tab[data-nav="home"]','Home');await waitFor('.v31-hero-welcome h1','Home before library');await click('.v31-action-tiles [data-nav="library"]','Recipe library');await waitFor('.recipe-card','97-recipe library');
  const library=await evaluate('(()=>({count:document.querySelectorAll("#screen .recipe-card").length,themeIds:[12,76,5].map(id=>[...document.querySelectorAll("#screen [data-open]")].find(card=>card.dataset.open===String(id))?.dataset.v32Theme||"")}))()');
  if(library.count!==97||library.themeIds.join(',')!=='playful-purple,fresh-green,sunny-orange'||await evaluate('RECIPES.map(r=>r.id).filter(id=>id===96||id===99).join(",")')!=='96,99')throw Error('Tablet catalogue/theme audit failed: '+JSON.stringify(library));
  const exemplarExpected={12:{title:'Cheesy Corn Pancakes',theme:'playful-purple'},76:{title:'Rainbow Vegetable Noodle Toss',theme:'fresh-green'},5:{title:'Mini Pizza Bread Cups',theme:'sunny-orange'},96:{title:'Tomato Basil Pasta',theme:'sunny-orange'},99:{title:'Vegetable Fried Rice',theme:'fresh-green'}};
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
    const completion=await screenshot(id===12?'recipe-12-completion-'+(landscape?'landscape':'portrait')+'.png':'theme-'+id+'-completion-'+(landscape?'landscape':'portrait'),landscape);
    themeShots.push({id,title:actualTitle,expected:expected.theme,observed:result.theme,screenshot:image,ingredients:ingredientScreenshot,steps:stepFiles,completion,activeStepCount:flow.activeCount,totalSteps:flow.stepCount});
    await click('#nav .tab[data-nav="library"]','Recipe library');await waitFor('.recipe-card','Library after recipe '+id);
  }
  const internationalScreens=[];
  async function assertInternationalCompactIngredientLabels(id,locale){
    const result=await evaluate(`(()=>{const grid=document.querySelector('.ref-ingredient-grid'),cards=[...document.querySelectorAll('.ref-ingredient-grid .ref-ingredient')],labels=cards.map(card=>({text:card.querySelector('.v32-ingredient-label')?.innerText?.trim()||'',name:card.querySelector('.v32-ingredient-label b')?.textContent?.trim()||'',amount:card.querySelector('.v32-ingredient-label small')?.textContent?.trim()||'',scrollWidth:card.querySelector('.v32-ingredient-label')?.scrollWidth||0,clientWidth:card.querySelector('.v32-ingredient-label')?.clientWidth||0}));return {cols:getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).length,count:cards.length,labels,yield:document.querySelector('.ref-hero')?.innerText||'',board:[...document.querySelectorAll('.ref-tool-grid .ref-tool')].map(x=>({chip:x.querySelector('.v32-equipment-chip')?.textContent?.trim()||'',role:x.querySelector('.v32-tool-role')?.textContent?.trim()||'',images:x.querySelectorAll('img,svg').length,icon:x.querySelector('img,svg')||null})),safety:document.querySelector('.ref-safety details p')?.textContent?.trim()||''}})()`);
    if(result.cols!==3||result.count<5||result.labels.some(x=>!x.name||!x.amount||x.scrollWidth>x.clientWidth+1)||!result.board.length||result.board.some(x=>!x.chip||!x.role||x.images!==0||x.icon)||!result.safety)throw Error(`International ${id} ${locale} three-column ingredients or text-only Prep Board failed: `+JSON.stringify(result));
    if(/makes\s+makes|rende\s+rende/i.test(result.yield))throw Error('International recipe has a duplicated localized yield label: '+JSON.stringify(result));
    return result;
  }
  for(const id of [96,99])for(const locale of ['en-GB','pt-BR']){
    await click('#nav .tab[data-nav="home"]','Home before international '+id+' '+locale);await waitFor('.v31-hero-welcome h1','Home before international '+id+' '+locale);
    await evaluate(`state.language=${JSON.stringify(locale)};save();render()`);await waitFor('.v31-hero-welcome h1','Localized Home before international '+id+' '+locale);
    const clickState=await evaluate(`(()=>{const button=document.querySelector('.v32-new-recipe-card[data-open="${id}"]');button?.click();return {clicked:!!button,recordAvailable:RECIPES.some(r=>Number(r.id)===${id}),openRecipeType:typeof openRecipe,viewAfter:view,selectedId:Number(selected?.id||0)}})()`);
    if(!clickState.clicked||!clickState.recordAvailable||clickState.selectedId!==id)throw Error('Home New Recipes recipe click did not open the shared route: '+JSON.stringify(clickState));
    await waitFor('.ref-hero h1','Home New Recipes recipe '+id);
    const initial=await evaluate(`(()=>{const source=V32_INTL_BY_ID.get(${id})?.item.locales[${JSON.stringify(locale)}];return {title:document.querySelector('.ref-hero h1')?.textContent?.trim()||'',selected:Number(selected?.id||0),view,ingredients:document.querySelectorAll('.ref-ingredient-grid .ref-ingredient').length,steps:Number(selected?.steps?.length||0),first:{instruction:document.querySelector('.ref-step-card.active .ref-step-copy p')?.textContent?.trim()||'',expectedInstruction:source?.steps?.[0]?.instruction||selected?.steps?.[0]||''}}})()`);
    if(initial.selected!==id||!initial.title||initial.ingredients<5||initial.steps<1||initial.first.instruction!==initial.first.expectedInstruction)throw Error('International shared renderer first step/canonical recipe mismatch: '+JSON.stringify({id,locale,initial}));
    if(locale==='en-GB')await assertInternationalCompactIngredientLabels(id,'en-GB');else await assertInternationalCompactIngredientLabels(id,'pt-BR');
    const orientationName=landscape?'landscape':'portrait',tag=`international-${id}-${locale==='pt-BR'?'pt-br':'en-gb'}-${orientationName}`;
    const detail=await screenshot(tag+'-detail',landscape),productionIngredientScreenshot=await screenshot(tag+'-ingredients',landscape);
    let previousInternationalStep=readFileSync(productionIngredientScreenshot.path),ptIngredientShot=null,previousPtStep=null;
    if(locale==='pt-BR'){ptIngredientShot=productionIngredientScreenshot;previousPtStep=readFileSync(ptIngredientShot.path)}
    const sideBySide=await evaluate(`(()=>{const art=document.querySelector('.ref-step-card.active .ref-step-photo'),copy=document.querySelector('.ref-step-card.active .ref-step-copy'),a=art?.getBoundingClientRect(),c=copy?.getBoundingClientRect();return !!a&&!!c&&a.width>160&&c.width>120&&Math.abs(a.top-c.top)<Math.max(a.height,c.height)*.5&&a.left<c.left&&a.right<=c.left+20})()`);
    if(landscape&&!sideBySide)throw Error('Landscape recipe artwork/instructions are not side by side for '+id+' '+locale);
    const stepShots=[];
    for(let index=0;index<initial.steps;index++){
      const localizedEnStep=await evaluate(`(()=>{const source=V32_INTL_BY_ID.get(${id})?.item.locales['en-GB'];return {instruction:document.querySelector('.ref-step-card.active .ref-step-copy p')?.textContent?.trim()||'',expected:source?.steps?.[${index}]?.instruction||displayStepText(selected,step)||'',index:Number(document.querySelector('.ref-step-card.active .ref-step-number')?.textContent||0),safety:document.querySelector('.ref-safety details p')?.textContent?.trim()||''}})()`);
      const localizedPtStep=locale==='pt-BR'?await evaluate(`(()=>{const source=V32_INTL_BY_ID.get(${id})?.item.locales['pt-BR'];return {instruction:document.querySelector('.ref-step-card.active .ref-step-copy p')?.textContent?.trim()||'',expected:source?.steps?.[${index}]?.instruction||displayStepText(selected,step)||'',index:Number(document.querySelector('.ref-step-card.active .ref-step-number')?.textContent||0)}})()`):null;
      const expected=locale==='pt-BR'?{steps:[localizedPtStep.expected]}:null,ptRoute=locale==='pt-BR'?{instruction:localizedPtStep.instruction,expected:expected.steps[0]}:null;
      if((locale==='en-GB'&&localizedEnStep.instruction!==localizedEnStep.expected)||(locale==='pt-BR'&&(localizedPtStep.instruction!==localizedPtStep.expected||(index===0&&ptRoute.instruction!==expected?.steps?.[0])))||localizedEnStep.index!==index+1||!localizedEnStep.safety)throw Error(`Localized ${locale} step/safety mismatch for ${id}: `+JSON.stringify({localizedEnStep,localizedPtStep,ptRoute}));
      let shot;if(locale==='pt-BR')shot=await screenshot(tag+'-step-'+(index+1),landscape,{previousPng:previousPtStep});else shot=await screenshot(tag+'-step-'+(index+1),landscape,{previousPng:previousInternationalStep});
      previousInternationalStep=readFileSync(shot.path);if(locale==='pt-BR')previousPtStep=readFileSync(shot.path);
      stepShots.push(shot);
      if(index+1<initial.steps){await click('.ref-next','International recipe '+id+' next step');await pause(180)}
    }
    internationalScreens.push({id,locale,orientation:orientationName,title:initial.title,detail,ingredients:productionIngredientScreenshot,steps:stepShots});
    await click('#nav .tab[data-nav="library"]','Recipe library after international '+id);await waitFor('.recipe-card[data-open="1"]','Library after international '+id);
  }
  await evaluate('state.language="en-GB";save();render()');
  const recipeVisualEvidence=[];
  // G2 is a targeted tablet gate. G3 covers every integrated route on phone;
  // keep tablet artwork verification to the owner pilot and both new recipes.
  for(const id of [12,96,99]){
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
    console.log(`Verified tablet ${orientationName} representative recipe image ${id}; coverage ${recipeVisualEvidence.length}/3`);
  }
  writeFileSync(`artifacts/v32-diagnostics/recipe-image-verification-tablet-${landscape?'landscape':'portrait'}.json`,JSON.stringify({schemaVersion:1,device:'tablet',orientation:landscape?'landscape':'portrait',recipeCount:recipeVisualEvidence.length,recipes:recipeVisualEvidence},null,2)+'\n');
  return {home,homeNewRecipes,avatarScenes,world,library:libshot,themeShots,internationalScreens,recipeVisualEvidence,accessibility:{home:homeA11y,world:worldA11y,library:libraryA11y},worldMap:globe,worldInteraction:restored}
}
await pause(6000);
await waitFor('.v31-hero-welcome h1','Tablet home');
await dismissChefChooser();
const portraitViewport=await orientation(false);
const portrait=await pageSet(false);
const landscapeViewport=await orientation(true);
const landscape=await pageSet(true);
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
 const detailCheck=await evaluate('(()=>({title:document.querySelector(".ref-hero h1")?.textContent?.trim()||"",expected:PT_RECIPES[12].title,ingredient:[...document.querySelectorAll(".ref-ingredient-grid .ref-ingredient")].map(e=>(e.innerText||e.textContent||"").replace(/\\s+/g," ").trim()).join("|"),expectedIngredient:PT_RECIPES[12].ingredients[0]}))()');const ptNav=await evaluate(navigationSummaryExpression());
 if(detailCheck.title!==detailCheck.expected||!detailCheck.ingredient.includes(detailCheck.expectedIngredient)||ptNav.map(x=>x.label).join('|')!=='Início|Receitas|Aventura|Despensa|Planejar|Criações'||ptNav.map(x=>x.id).join('|')!=='home|library|world|groceries|week|creations')throw Error('PT-BR #12 detail/navigation content mismatch: '+JSON.stringify({detailCheck,ptNav}));
 const suffix=landscape?'landscape':'portrait';
 const detail=await screenshot('recipe-12-pt-br-detail-'+suffix,landscape);
 const ingredientsState=await prepareVisibleRecipeCapture('.ref-ingredient-grid','PT-BR #12 Ingredients '+suffix);
 const ingredients=await screenshot('recipe-12-pt-br-ingredients-'+suffix,landscape);
 const prepBoardState=await prepareVisibleRecipeCapture('.ref-tool-grid,.v32-r12-equipment-list','PT-BR #12 Magic Recipe Prep Board '+suffix);const prepBoardAudit=await evaluate('(()=>{const items=[...document.querySelectorAll(".ref-tool-grid .ref-tool,.v32-r12-equipment-list li")];return {count:items.length,chips:items.filter(x=>x.querySelector(".v32-equipment-chip")||x.querySelector("small")).length,roles:document.querySelectorAll(".v32-tool-role").length,icons:[...document.querySelectorAll(".ref-tool-grid .ref-tool,.v32-r12-equipment-list li")].filter(x=>x.querySelector("img,svg")).length}})()');if(!prepBoardAudit.count||prepBoardAudit.chips!==prepBoardAudit.count||prepBoardAudit.icons!==0)throw Error('PT-BR #12 Magic Recipe Prep Board must use text-only equipment chips: '+JSON.stringify(prepBoardAudit));const prepBoard=await screenshot('recipe-12-pt-br-prep-board-'+suffix,landscape);
 const steps=[];
 for(let index=0;index<4;index++){
  let active=null;
  for(let attempt=0;attempt<30;attempt++){
   active=await evaluate('(()=>({number:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),instruction:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||"",expected:PT_RECIPES[12].steps['+index+'],safety:document.querySelector(".storybook-safety p,.ref-safety details p")?.textContent?.trim()||"",expectedSafety:translateText(RECIPES.find(recipe=>Number(recipe.id)===12)?.safety||"", "pt-BR"),progress:Number(step||0)+1}))()');
   if(active.number===index+1)break;
   await pause(250);
  }
  if(active.number!==index+1||active.instruction!==active.expected||active.safety!==active.expectedSafety||active.progress!==index+1)throw Error('PT-BR #12 step/safety/progress mismatch: '+JSON.stringify({index,active}));
  const visible=await prepareVisibleRecipeCapture('.ref-step-card.active','PT-BR #12 active step '+(index+1));
  if(!visible.text.includes(active.instruction))throw Error('PT-BR #12 active screenshot target does not contain its canonical step: '+JSON.stringify({index,active,visible}));
  steps.push(await screenshot('recipe-12-pt-br-step-'+(index+1)+'-'+suffix,landscape));
  if(index<3){await click('.ref-next','Next PT-BR #12 step');await pause(250)}
 }
 await click('.ref-next.finish-step','Finish PT-BR #12');await pause(300);
 if(!await evaluate('state.done.includes(12)&&state.myCreations.some(x=>Number(typeof x==="object"?x.recipeId:x)===12)&&!!document.querySelector(".ref-next.finish-step")'))throw Error('PT-BR #12 completion did not persist/render.');
 const completionState=await prepareVisibleRecipeCapture('.ref-next.finish-step','PT-BR #12 completion');
 const completion=await screenshot('recipe-12-pt-br-completion-'+suffix,landscape);
 return {orientation:suffix,detail,ingredients,prepBoard,prepBoardState,prepBoardAudit,steps,completion,visibleTargets:{detail:detailState.text,ingredients:ingredientsState.text,completion:completionState.text},decision:'visual review still required'};
}
const ptBrRecipe12={portrait:await capturePtBrRecipe12(false),landscape:await capturePtBrRecipe12(true)};
const report={serial,profile:'pixel_tablet',portraitViewport,landscapeViewport,orientationTrace,portrait,landscape,ptBrRecipe12,scope:'isolated V3.2 debug APK; no release or rights/A08/A09 approval'};
mkdirSync('artifacts/v32-diagnostics',{recursive:true});
writeFileSync('artifacts/v32-diagnostics/tablet-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
ws.close();
NODE

