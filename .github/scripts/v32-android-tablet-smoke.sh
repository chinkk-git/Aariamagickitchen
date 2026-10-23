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
timeout --kill-after=10s 2520s node --input-type=module <<'NODE'
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,unlinkSync,writeFileSync} from 'node:fs';
import {clickByDatasetExpression,clickSelectorExpression,navigationSummaryExpression} from './tools/v3/android-webview-smoke-expressions.mjs';
import {captureDistinctPng} from './.github/scripts/android-screenshot-orientation.mjs';
const serial=process.env.ANDROID_SERIAL;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const adb=args=>execFileSync('timeout',['--kill-after=5s','60s','adb','-s',serial,...args],{maxBuffer:32*1024*1024});
let target=null;
for(let i=0;i<60&&!target;i++){
  try{const list=await(await fetch('http://127.0.0.1:9223/json')).json();target=list.find(x=>x.type==='page'&&x.webSocketDebuggerUrl&&(x.url?.includes('appassets.androidplatform.net')||x.title?.includes('Magical Kitchen')))}catch{}
  if(!target)await pause(500);
}
if(!target)throw Error('Tablet app-owned WebView target missing');
console.log('Tablet WebView DevTools target: '+JSON.stringify({url:target.url,title:target.title,id:target.id}));
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
ws.addEventListener('close',event=>console.error('Tablet WebView DevTools socket closed: '+JSON.stringify({code:event.code,reason:event.reason,wasClean:event.wasClean})));
ws.addEventListener('error',event=>console.error('Tablet WebView DevTools socket error: '+String(event.message||event.type)));
let seq=0;const pending=new Map();
ws.addEventListener('message',async event=>{let data=event.data;if(typeof data!=='string')data=typeof data?.text==='function'?await data.text():Buffer.from(data).toString('utf8');let msg;try{msg=JSON.parse(data)}catch{return}if(!msg.id||!pending.has(msg.id))return;const p=pending.get(msg.id);pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result)});
async function command(method,params={}){const id=++seq;const p=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('DevTools timeout: '+method+'; target='+JSON.stringify({url:target.url,title:target.title,id:target.id})+'; pending='+pending.size))},30000);pending.set(id,{resolve,reject,timer})});ws.send(JSON.stringify({id,method,params}));return await p}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text||'WebView evaluation failed');return r.result?.value}
await command('Page.enable');
await command('Runtime.enable');
console.log('Tablet WebView DevTools Page and Runtime domains are enabled');
async function waitFor(selector,label){let last='';for(let i=0;i<40;i++){const x=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');const r=e?.getBoundingClientRect();const hidden=e?[...function*(){for(let n=e;n&&n!==document.documentElement;n=n.parentElement)yield n}()].some(n=>{const s=getComputedStyle(n);return s.display==="none"||s.visibility==="hidden"||Number(s.opacity)===0}):true;return {ok:!!e&&!!r&&r.width>0&&r.height>0&&!hidden,text:e?.innerText||""}})()');last=JSON.stringify(x);if(x.ok)return x;await pause(250)}throw Error(label+' not visible: '+last)}
async function dismissChefChooser(){const present=await evaluate('(()=>{const d=document.querySelector("#v3ProfileDialog");if(!d)return false;const r=d.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(d).display!=="none"})()');if(present){console.log('Selecting Chef A for the disposable Aaria tablet profile');const selected=await evaluate(clickSelectorExpression('#v3ProfileDialog [data-v3-chef]'));if(!selected||!await evaluate('document.querySelector("#v3ProfileDialog [data-v3-chef]")?.getAttribute("aria-pressed")==="true"'))throw Error('Chef chooser was visible but Chef A could not be selected');const clicked=await evaluate(clickSelectorExpression('#v3ProfileDialog [data-v3-profile-continue]'));if(!clicked)throw Error('Chef chooser was visible but could not be continued');await pause(700);const remains=await evaluate('!!document.querySelector("#v3ProfileDialog")');if(remains)throw Error('Chef chooser remained open after selecting Chef A')} }
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
async function screenshot(name,landscape,options={}){let attempt=0;const captured=await captureDistinctPng({label:name,previousPng:options.previousPng,assertExpectedUi:options.assertExpectedUi,wait:pause,attempts:20,retryDelayMs:1000,capturePng:async()=>{await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await pause(500);if(options.assertExpectedUi)await options.assertExpectedUi();const suffix=Date.now()+'-'+attempt++,remote='/sdcard/v32-tablet-'+name+'-'+suffix+'.png',pending='artifacts/v32-android-screenshots/tablet/.'+name+'.pending-'+suffix;adb(['shell','screencap','-p',remote]);adb(['pull',remote,pending]);const png=readFileSync(pending);unlinkSync(pending);adb(['shell','rm','-f',remote]);return png}});const {png,width:w,height:h}=captured;if(landscape?w<=h:w>=h)throw Error(name+' has incorrect screenshot orientation '+w+'x'+h);const path='artifacts/v32-android-screenshots/tablet/'+name+'.png';writeFileSync(path,png);return {path,width:w,height:h,bytes:png.length}}
async function prepareVisibleRecipeCapture(selector,label){const first=await evaluate('(()=>{const screen=document.querySelector("#screen"),e=screen?.querySelector('+JSON.stringify(selector)+');if(!e)return {visible:false,reason:"missing target"};e.scrollIntoView({block:"center",inline:"nearest"});const r=e.getBoundingClientRect(),root=screen.getBoundingClientRect(),s=getComputedStyle(e);return {visible:s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0&&r.bottom>root.top&&r.top<root.bottom&&r.right>root.left&&r.left<root.right,text:(e.innerText||e.textContent||"").trim()}})()');if(!first?.visible)throw Error(label+' is not inside the visible app screen before capture: '+JSON.stringify(first));await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await pause(500);const settled=await evaluate('(()=>{const screen=document.querySelector("#screen"),e=screen?.querySelector('+JSON.stringify(selector)+');if(!e)return {visible:false,reason:"target disappeared"};const r=e.getBoundingClientRect(),root=screen.getBoundingClientRect(),s=getComputedStyle(e);return {visible:s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0&&r.bottom>root.top&&r.top<root.bottom&&r.right>root.left&&r.left<root.right,text:(e.innerText||e.textContent||"").trim()}})()');if(!settled?.visible)throw Error(label+' left the active app screen before capture: '+JSON.stringify(settled));return settled}
async function pageSet(landscape){
  await click('#nav .tab[data-nav="home"]','Home');await waitFor('.v31-hero-welcome h1','Home');const featured=await evaluate('(()=>{const rail=document.querySelector(".v32-review-featured-rail"),style=rail?getComputedStyle(rail):null,cards=[...document.querySelectorAll(".v32-review-featured-card")];return {ids:cards.map(e=>Number(e.dataset.v32ReviewFeaturedId)),contract:rail?.dataset.v32FeaturedIds||"",overflowX:style?.overflowX||"",title:cards[0]?.querySelector("strong")?.textContent?.trim()||"",heading:document.querySelector(".v32-review-featured-section h2")?.textContent?.trim()||""}})()');if(JSON.stringify(featured.ids)!=="[12]"||featured.contract!=="12"||featured.overflowX!=="auto"||featured.title!=="Cheesy Corn Pancakes"||featured.heading!=="⭐ Featured Recipes")throw Error("Tablet Featured Recipes must contain only review-pilot recipe #12 in a horizontal rail: "+JSON.stringify(featured));const homeA11y=await audit('home');const home=await screenshot('home-'+(landscape?'landscape':'portrait'),landscape);if(!landscape){await evaluate('state.language="pt-BR";save();render()');await waitFor('.v32-review-featured-rail','PT-BR tablet Featured Recipes');const ptFeatured=await evaluate('(()=>({ids:[...document.querySelectorAll(".v32-review-featured-card")].map(e=>Number(e.dataset.v32ReviewFeaturedId)),title:document.querySelector(".v32-review-featured-card strong")?.textContent?.trim()||"",heading:document.querySelector(".v32-review-featured-section h2")?.textContent?.trim()||""}))()');if(JSON.stringify(ptFeatured.ids)!=="[12]"||ptFeatured.title!=="Panquequinhas de milho com queijo"||ptFeatured.heading!=="⭐ Receitas em destaque")throw Error("PT-BR tablet Featured Recipes mismatch: "+JSON.stringify(ptFeatured));await screenshot('home-featured-pt-br-portrait',false);await evaluate('state.language="en-GB";save();render()');await waitFor('.v32-review-featured-rail','English tablet Featured Recipes restored')}const avatarScenes={family:await avatarScene('family',landscape),friends:await avatarScene('friends',landscape)};
  await click('#nav .tab[data-nav="world"]','World');await waitFor('#screen .w02-map-header h1','World');await dismissChefChooser();const worldRoute=await evaluate('(()=>{const screen=document.querySelector("#screen"),e=screen?.querySelector(".w02-map-header h1"),r=e?.getBoundingClientRect(),s=e?getComputedStyle(e):null;return {view:typeof view==="undefined"?"unavailable":view,heading:e?.textContent?.trim()||"",screenClass:screen?.className||"",screenText:screen?.innerText||"",visible:!!e&&!!r&&r.width>0&&r.height>0&&s?.display!=="none"&&s?.visibility!=="hidden"}})()');if(worldRoute.view!=="world"||!worldRoute.screenClass.includes("v31-world-screen")||!worldRoute.screenText.includes("World Map")||!worldRoute.visible)throw Error("Tablet fixed World Map navigation did not replace the active screen: "+JSON.stringify(worldRoute));const worldA11y=await audit('world');
  let approvedMapImageReady=false;for(let attempt=0;attempt<60;attempt++){approvedMapImageReady=await evaluate('(()=>{const image=document.querySelector("#screen .v31-map-art-image"),expected=V31_HOME_WORLD_ART.worldMap;return !!image&&image.src===expected&&image.complete&&image.naturalWidth>0})()');if(approvedMapImageReady)break;await pause(250)}if(!approvedMapImageReady)throw Error('Approved World Map image did not load on tablet '+(landscape?'landscape':'portrait'));
  const map=await evaluate(`(()=>{const screen=document.querySelector("#screen.v31-world-screen"),viewport=document.querySelector("#screen [data-w02-fixed-map]"),art=document.querySelector("#screen .w02-map-art"),image=document.querySelector("#screen .v31-map-art-image"),marker=document.querySelector("#screen .w02-country-marker"),sr=screen?.getBoundingClientRect(),vr=viewport?.getBoundingClientRect(),ar=art?.getBoundingClientRect(),mr=marker?.getBoundingClientRect(),expected=V31_HOME_WORLD_ART.worldMap,style=viewport?getComputedStyle(viewport):null,occupancy=sr&&vr?vr.width*vr.height/(sr.width*sr.height):0,aspect=ar?.width&&ar?.height?ar.width/ar.height:0,artAspect=image?.naturalWidth&&image?.naturalHeight?image.naturalWidth/image.naturalHeight:0,local=ar&&mr?{x:((mr.left+mr.right)/2-ar.left)/ar.width,y:((mr.top+mr.bottom)/2-ar.top)/ar.height}:null;return {approvedArt:expected.startsWith("data:image/webp;base64,")&&image?.src===expected&&image.complete&&image.naturalWidth>0,occupancy,aspect,artAspect,objectFit:image?getComputedStyle(image).objectFit:"",borderWidth:style?.borderWidth||"",borderRadius:style?.borderRadius||"",countries:[...document.querySelectorAll("#screen [data-v31-country]")].map(e=>e.dataset.v31Country),marker:{width:mr?.width||0,height:mr?.height||0,local},screen:{width:sr?.width,height:sr?.height},viewport:{width:vr?.width,height:vr?.height}}})()`);
  if(!map.approvedArt||map.occupancy<0.85||map.occupancy>0.95||Math.abs(map.aspect-717/389)>0.02||Math.abs(map.artAspect-717/389)>0.02||map.objectFit!=="contain"||map.borderWidth!=="0px"||Number.parseFloat(map.borderRadius)>2||JSON.stringify(map.countries)!==JSON.stringify(["IND"])||map.marker.width<48||map.marker.height<48||Math.abs(map.marker.local.x-.69)>.02||Math.abs(map.marker.local.y-.47)>.02)throw Error("Rendered fixed-map geometry/art/marker audit failed: "+JSON.stringify(map));
  const orientationName=landscape?"landscape":"portrait";const world=await screenshot("world-map-tablet-"+orientationName,landscape,{previousPng:readFileSync(home.path),assertExpectedUi:async()=>{const observed=await evaluate(`(()=>{const screen=document.querySelector("#screen"),heading=screen?.querySelector(".w02-map-header h1"),map=screen?.querySelector("[data-w02-fixed-map]"),rect=heading?.getBoundingClientRect(),mapRect=map?.getBoundingClientRect();return {view:typeof view==="undefined"?"unavailable":view,heading:heading?.textContent?.trim()||"",screenClass:screen?.className||"",visible:!!rect&&rect.width>0&&rect.height>0,mapVisible:!!mapRect&&mapRect.width>0&&mapRect.height>0}})()`);if(observed.view!=="world"||observed.heading!=="World Map"||!observed.screenClass.includes("v31-world-screen")||!observed.visible||!observed.mapVisible)throw Error("Tablet World Map not visibly active before screenshot: "+JSON.stringify(observed))}});writeFileSync("artifacts/v32-android-screenshots/tablet/world-map-geometry-"+orientationName+".json",JSON.stringify(map,null,2)+"\n");
  await evaluate(`document.querySelector(".w02-country-marker")?.click()`);const indiaCards=await evaluate(`({country:document.querySelector("#v33-country-title")?.textContent?.trim()||"",count:document.querySelectorAll(".w02-country-recipes [data-v31-approved-recipe]").length})`);if(indiaCards.country!=="India"||indiaCards.count!==18)throw Error("Tablet India route must expose the 18 canonical recipes: "+JSON.stringify(indiaCards));
await click('#nav .tab[data-nav="home"]','Home');await waitFor('.v31-hero-welcome h1','Home before library');await click('.v31-action-tiles [data-nav="library"]','Recipe library');await waitFor('.recipe-card','95-recipe library');
  const library=await evaluate('(()=>({count:document.querySelectorAll("#screen .recipe-card").length,themeIds:[12,76,5].map(id=>[...document.querySelectorAll("#screen [data-open]")].find(card=>card.dataset.open===String(id))?.dataset.v32Theme||"")}))()');
  if(library.count!==95||library.themeIds.join(',')!=='playful-purple,fresh-green,sunny-orange')throw Error('Tablet catalogue/theme audit failed: '+JSON.stringify(library));
  const exemplarExpected={12:{title:'Cheesy Corn Pancakes',theme:'playful-purple'},76:{title:'Rainbow Vegetable Noodle Toss',theme:'fresh-green'},5:{title:'Mini Pizza Bread Cups',theme:'sunny-orange'}};
  const libraryA11y=await audit('library');const libshot=await screenshot('library-'+(landscape?'landscape':'portrait'),landscape);
  const themeShots=[];
  for(const id of [12,76,5]){
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
  const recipeVisualEvidence=[];
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
  return {home,avatarScenes,world,library:libshot,themeShots,recipeVisualEvidence,accessibility:{home:homeA11y,world:worldA11y,library:libraryA11y},worldMap:map}
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
 const detailCheck=await evaluate('(()=>({title:document.querySelector(".ref-hero h1")?.textContent?.trim()||"",expected:PT_RECIPES[12].title,ingredient:[...document.querySelectorAll(".ref-ingredient-grid .ref-ingredient")].map(e=>(e.innerText||e.textContent||"").replace(/\\s+/g," ").trim()).join("|"),expectedIngredient:PT_RECIPES[12].ingredients[0],nav:[...document.querySelectorAll("#nav .tab")].map(e=>e.lastChild?.textContent?.trim()||"").join("|"),navIds:[...document.querySelectorAll("#nav .tab")].map(e=>e.dataset.nav).join("|")}))()');
 if(detailCheck.title!==detailCheck.expected||!detailCheck.ingredient.includes(detailCheck.expectedIngredient)||detailCheck.nav!=='Início|Receitas|Aventura|Despensa|Planejar|Criações'||detailCheck.navIds!=='home|library|world|groceries|week|creations')throw Error('PT-BR #12 detail/navigation content mismatch: '+JSON.stringify(detailCheck));
 const suffix=landscape?'landscape':'portrait';
 const detail=await screenshot('recipe-12-pt-br-detail-'+suffix,landscape);
 const ingredientsState=await prepareVisibleRecipeCapture('.ref-ingredient-grid','PT-BR #12 Ingredients '+suffix);
 const ingredients=await screenshot('recipe-12-pt-br-ingredients-'+suffix,landscape);
 const steps=[];
 for(let index=0;index<4;index++){
  let active=null;
  for(let attempt=0;attempt<30;attempt++){
   active=await evaluate('(()=>({number:Number(document.querySelector(".ref-step-card.active .ref-step-number")?.textContent||0),instruction:document.querySelector(".ref-step-card.active .ref-step-copy p")?.textContent?.trim()||"",expected:PT_RECIPES[12].steps['+index+'],safety:document.querySelector(".ref-safety details p")?.textContent?.trim()||"",expectedSafety:translateText(RECIPES.find(r=>Number(r.id)===12).safety,"pt-BR"),progress:Number(step||0)+1}))()');
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
 return {orientation:suffix,detail,ingredients,steps,completion,visibleTargets:{detail:detailState.text,ingredients:ingredientsState.text,completion:completionState.text},decision:'visual review still required'};
}
const ptBrRecipe12={portrait:await capturePtBrRecipe12(false),landscape:await capturePtBrRecipe12(true)};
const report={serial,profile:'pixel_tablet',portraitViewport,landscapeViewport,orientationTrace,portrait,landscape,ptBrRecipe12,scope:'isolated V3.2 debug APK; no release or rights/A08/A09 approval'};
mkdirSync('artifacts/v32-diagnostics',{recursive:true});
writeFileSync('artifacts/v32-diagnostics/tablet-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
ws.close();
NODE

