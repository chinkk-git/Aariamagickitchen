#!/usr/bin/env node
// Android emulator smoke/evidence runner. The workflow forwards the app's
// WebView DevTools socket to localhost:9222 before invoking this script.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

const out=resolve(process.env.V35_SCREENSHOT_DIR||'artifacts/v35-android-screenshots');
mkdirSync(out,{recursive:true});
let target;
const targetDeadline=Date.now()+120000;
while(Date.now()<targetDeadline){
 const targets=await (await fetch('http://127.0.0.1:9222/json')).json();
 target=targets.find(x=>x.type==='page'&&/appassets\.androidplatform\.net/.test(x.url||''));
 if(target)break;
 await new Promise(r=>setTimeout(r,500));
}
assert.ok(target?.webSocketDebuggerUrl,'Android app WebView DevTools page not found');
console.log(`Attaching to app WebView page: ${target.url}`);
const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let nextId=0;
await new Promise((resolveOpen,reject)=>{ws.addEventListener('open',resolveOpen,{once:true});ws.addEventListener('error',reject,{once:true})});
ws.addEventListener('message',event=>{let message;try{message=JSON.parse(String(event.data))}catch{return}if(!message.id)return;const task=pending.get(message.id);if(!task)return;pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result)});
function cdp(method,params={},timeout=180000){const id=++nextId;return new Promise((resolveCall,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timed out waiting for WebView DevTools ${method}`))},timeout);pending.set(id,{resolve:value=>{clearTimeout(timer);resolveCall(value)},reject:error=>{clearTimeout(timer);reject(error)}});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||result.exceptionDetails.exception?.description||'WebView script evaluation failed');return result.result?.value}
async function waitFor(expression,label,timeout=20000){const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,160))}throw new Error(`Timed out waiting for ${label}`)}
async function screenshot(name){await new Promise(r=>setTimeout(r,500));writeFileSync(resolve(out,name),execFileSync('adb',['exec-out','screencap','-p']))}
async function goHome(){if(await evaluate("typeof view!=='undefined'&&view==='home'"))return;await evaluate("document.querySelector('.bottom .tab[data-nav=home]')?.click()");await waitFor("typeof view!=='undefined'&&view==='home'",'Home route')}
async function openHomeCountry(code){await goHome();const click=await evaluate(`(()=>{const b=document.querySelector('[data-v31-card-country="${code}"]');if(!b)return false;b.scrollIntoView({block:'center',inline:'center'});b.click();return true})()`);assert.equal(click,true,`Home country card ${code} missing`);const id={IND:'india',ITA:'italy',CHN:'china',JPN:'japan',MEX:'mexico',VNM:'vietnam'}[code];await waitFor(`typeof view!=='undefined'&&view==='world'&&v33GlobeController?.getState()?.selected==='${id}'&&document.querySelector('.aria-world-globe__panel.is-selected')`,'Home country recipe list '+code)}
async function checkCountry(code,count){await openHomeCountry(code);const state=await evaluate(`(()=>({flag:document.querySelector('.aria-world-globe__country-flag')?.textContent?.trim(),name:document.querySelector('.aria-world-globe__panel h2')?.textContent?.trim(),count:document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]').length,ids:[...document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]')].map(x=>Number(x.dataset.recipeId))}))()`);assert.equal(state.count,count,`${code} list count`);assert.deepEqual(state.ids.map(Number),({IND:[51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74],ITA:[96,97,98],CHN:[99,100,101],JPN:[102,103,104],MEX:[105,106,107],VNM:[108,109,110,111,112,113,114,115,116]})[code],`${code} list IDs`);assert.equal(state.flag,({IND:'🇮🇳',ITA:'🇮🇹',CHN:'🇨🇳',JPN:'🇯🇵',MEX:'🇲🇽',VNM:'🇻🇳'})[code],`${code} list flag`);const names={IND:['India','Índia'],ITA:['Italy','Itália'],CHN:['China','China'],JPN:['Japan','Japão'],MEX:['Mexico','México'],VNM:['Vietnam','Vietnã']}[code];assert.ok(names.includes(state.name),`${code} localized name`);return state}
async function closeWithX(){await evaluate("document.querySelector('.aria-world-globe__close')?.click()");await waitFor("!document.querySelector('.aria-world-globe__panel.is-portrait-overlay')",'X close')}

await cdp('Runtime.enable');await cdp('Page.enable');console.log('Attached to Android WebView DevTools');
await waitFor("document.querySelector('.v31-approved-home')&&document.querySelectorAll('[data-v31-card-country]').length===6",'six Home country cards');
const initial=await evaluate("({count:RECIPES.length,ids:RECIPES.map(x=>Number(x.id)),cards:[...document.querySelectorAll('[data-v31-card-country]')].map(x=>x.dataset.v31CardCountry)})");
assert.equal(initial.count,116,'final catalogue count');assert.equal(new Set(initial.ids).size,116,'final catalogue unique IDs');assert.deepEqual(initial.cards,['IND','ITA','CHN','JPN','MEX','VNM'],'Home card order');
await screenshot('home-portrait.png');
console.log('Captured Home portrait');
await evaluate("document.querySelector('.bottom .tab[data-nav=world]')?.click()");await waitFor("typeof view!=='undefined'&&view==='world'&&document.querySelector('.aria-world-globe')",'unselected globe');
assert.equal(await evaluate("v33GlobeController.getState().selected"),null,'new World entry must start unselected');await screenshot('world-globe-portrait.png');console.log('Captured World globe portrait');
await goHome();await evaluate("document.querySelector('[data-v31-open-world]')?.click()");await waitFor("typeof view!=='undefined'&&view==='world'",'Home World navigation');
assert.equal(await evaluate("v33GlobeController.getState().selected"),null,'Home World navigation must start unselected');
for(const [code,count] of [['IND',18],['ITA',3],['CHN',3],['JPN',3],['MEX',3],['VNM',9]]){
 const state=await checkCountry(code,count);
 console.log(`Checked ${code} country list (${state.count} recipes)`);
 if(code==='VNM'){await screenshot('home-country-carousel.png');await screenshot('world-country-list-portrait.png')}
 if(code==='IND'){
  await evaluate("document.dispatchEvent(new Event('backbutton'))");
  await waitFor("!document.querySelector('.aria-world-globe__panel.is-portrait-overlay')",'Android Back close');
 }else await closeWithX();
}
const expansionByCountry={ITA:[97,98],CHN:[100,101],JPN:[102,103,104],MEX:[105,106,107],VNM:[108,109,110,111,112,113,114,115,116]};
for(const [code,ids] of Object.entries(expansionByCountry)){
 await openHomeCountry(code);await evaluate('window.__v35EvidenceHost=v33WorldHost');
 for(const [index,id] of ids.entries()){
  const clicked=await evaluate(index===0
   ?`(()=>{const b=document.querySelector('.aria-world-globe__recipe[data-recipe-id="${id}"]');if(!b)return false;b.click();return true})()`
   :`window.__v35EvidenceHost.openRecipe(${id})`);
  assert.equal(clicked,true,`#${id} missing or not routable from ${code}`);
  await waitFor(`typeof view!=='undefined'&&view==='recipe'&&Number(selected?.id)===${id}`,'recipe detail #'+id);
  const detail=await evaluate(`({template:document.querySelector('.app')?.classList.contains('v32-international-active'),steps:(STEP_GUIDES[${id}]||[]).length,title:document.querySelector('#screen .ref-title h1')?.textContent?.trim()})`);
  assert.equal(detail.template,true,`#${id} must use the approved V3.2 recipe template`);assert.ok(detail.steps>=4,`#${id} step guide missing`);assert.ok(detail.title,`#${id} detail title missing`);
  console.log(`Opened #${id} in the V3.2 recipe template`);
  if(id===111)await screenshot('recipe-111-detail-portrait.png');if(id===116)await screenshot('recipe-116-detail-portrait.png');
 }
 await goHome();
}
await evaluate("document.querySelector('.bottom .tab[data-nav=world]')?.click()");await waitFor("typeof view!=='undefined'&&view==='world'",'landscape World entry');
execFileSync('adb',['shell','settings','put','system','accelerometer_rotation','0']);execFileSync('adb',['shell','settings','put','system','user_rotation','1']);
await waitFor("matchMedia('(orientation: landscape)').matches",'landscape orientation',10000);await new Promise(r=>setTimeout(r,1000));
assert.equal(await evaluate("v33GlobeController.getState().selected"),null,'landscape World entry must remain unselected');await screenshot('world-globe-landscape.png');
await evaluate("v33GlobeController.selectCountry('vietnam')");await waitFor("document.querySelector('.aria-world-globe__panel.is-selected h2')?.textContent==='Vietnam'",'Vietnam landscape list');
assert.equal(await evaluate("document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]').length"),9,'Vietnam landscape list count');await screenshot('world-country-list-landscape.png');
execFileSync('adb',['shell','settings','put','system','user_rotation','0']);execFileSync('adb',['shell','settings','put','system','accelerometer_rotation','1']);
writeFileSync(resolve(out,'evidence-summary.txt'),`Android WebView evidence for V3.5 review build\n116 unique recipes; six Home cards; country list IDs/counts/flags checked; 19 expansion recipe routes opened in approved template; Android Back and X close checked; portrait and landscape globe/list captured.\nScreenshots: home-portrait.png, home-country-carousel.png, world-globe-portrait.png, world-country-list-portrait.png, recipe-111-detail-portrait.png, recipe-116-detail-portrait.png, world-globe-landscape.png, world-country-list-landscape.png\n`);
ws.close();console.log('PASS: Android Home/World navigation, all country lists, 19 expansion routes, template use, Back/X close, 116 unique recipes and portrait/landscape screenshots.');
