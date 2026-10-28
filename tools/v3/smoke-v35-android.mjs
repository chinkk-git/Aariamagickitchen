#!/usr/bin/env node
// Screenshot-free Android WebView smoke check. The shell wrapper installs the
// review APK, starts the Activity and forwards its WebView DevTools socket.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const output=resolve(process.env.V35_SMOKE_OUTPUT||'artifacts/v35-android-smoke');
mkdirSync(output,{recursive:true});
const targetsDeadline=Date.now()+60000;
let target;
while(Date.now()<targetsDeadline){
  const response=await fetch('http://127.0.0.1:9222/json');
  const targets=await response.json();
  target=targets.find(item=>item.type==='page'&&/appassets\.androidplatform\.net/.test(item.url||''));
  if(target)break;
  await new Promise(resolveDelay=>setTimeout(resolveDelay,250));
}
assert.ok(target?.webSocketDebuggerUrl,'Android WebView DevTools page not found');

const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();
let nextId=0;
await new Promise((resolveOpen,reject)=>{
  socket.addEventListener('open',resolveOpen,{once:true});
  socket.addEventListener('error',reject,{once:true});
});
socket.addEventListener('message',event=>{
  let message;
  try{message=JSON.parse(String(event.data));}catch{return;}
  if(!message.id)return;
  const task=pending.get(message.id);
  if(!task)return;
  pending.delete(message.id);
  message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);
});
function cdp(method,params={},timeout=15000){
  const id=++nextId;
  return new Promise((resolveCall,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timed out waiting for ${method}`));},timeout);
    pending.set(id,{resolve:value=>{clearTimeout(timer);resolveCall(value);},reject:error=>{clearTimeout(timer);reject(error);}});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression){
  const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||result.exceptionDetails.exception?.description||'WebView evaluation failed');
  return result.result?.value;
}
async function waitFor(expression,label,timeout=30000){
  const start=Date.now();
  while(Date.now()-start<timeout){
    if(await evaluate(expression))return;
    await new Promise(resolveDelay=>setTimeout(resolveDelay,150));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
async function click(selector){
  const ok=await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)return false;node.click();return true})()`);
  assert.equal(ok,true,`Required control missing: ${selector}`);
}
async function openHomeCountry(code,slug,expectedIds){
  await click(`[data-v31-card-country="${code}"]`);
  await waitFor(`view==='world'&&v33GlobeController?.getState()?.selected===${JSON.stringify(slug)}&&document.querySelector('.aria-world-globe__panel.is-selected')`,`${code} country list`);
  const state=await evaluate(`(()=>({ids:[...document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]')].map(item=>Number(item.dataset.recipeId)),images:[...document.querySelectorAll('.aria-world-globe__recipe img')].map(item=>item.getAttribute('src'))}))()`);
  assert.deepEqual(state.ids,expectedIds,`${code} country recipe IDs`);
  assert.equal(state.images.length,expectedIds.length,`${code} country recipe thumbnails`);
  if(code==='IND'){
    assert.ok(state.images[0]&&!/plate|placeholder/i.test(state.images[0]),'India #051 must use its recipe artwork');
    assert.ok(state.images[6]&&!/plate|placeholder/i.test(state.images[6]),'India #057 must use its recipe artwork');
  }
  const loaded=await evaluate(`(async()=>{const images=[...document.querySelectorAll('.aria-world-globe__recipe img')];images.forEach(image=>image.loading='eager');return await Promise.all(images.map(async image=>{try{await image.decode();return image.naturalWidth>0}catch{return false}}))})()`);
  assert.ok(loaded.every(Boolean),`${code} country recipe artwork failed to load`);
  await click('.aria-world-globe__close');
  await waitFor(`view==='world'&&!document.querySelector('.aria-world-globe__panel.is-selected')`,`${code} country list close`);
}

try{
  await waitFor(`document.readyState==='complete'&&view==='home'&&document.querySelector('.v31-approved-home')`,'Magical Adventure Home');
  // First install presents the existing profile chooser before the application
  // Welcome. Complete it on the disposable review package, then verify the
  // Welcome arrow before exercising any navigation.
  if(await evaluate(`!!document.querySelector('#v3ProfileDialog')`)){
    await evaluate(`(()=>{const input=document.querySelector('#v3ProfileName');if(input)input.value='Android review';document.querySelector('[data-v3-chef="CHEF_A"]')?.click();document.querySelector('[data-v3-profile-continue]')?.click();return true})()`);
  }
  await waitFor(`!!document.querySelector('#v35-welcome')`,'Welcome screen');
  const welcome=await evaluate(`(()=>({title:document.querySelector('#v35-welcome h1')?.textContent.trim(),arrow:!!document.querySelector('#v35-welcome [data-v35-enter]'),homeInert:document.querySelector('#screen')?.hasAttribute('inert')}))()`);
  assert.ok(welcome.title,'Welcome title must render');
  assert.equal(welcome.arrow,true,'Welcome arrow must be present');
  assert.equal(welcome.homeInert,true,'Home must not be interactive before Welcome is dismissed');
  await click('#v35-welcome [data-v35-enter]');
  await waitFor(`!document.querySelector('#v35-welcome')&&view==='home'&&document.querySelector('.v31-approved-home')`,'Magical Adventure after Welcome');

  // Simulate a legacy route/state selecting Classic Home. V3.5 must resolve it
  // to the sole approved Home and must expose no Classic Home selector.
  const legacyHome=await evaluate(`(()=>{view='classic-home';render();return view==='home'&&!!document.querySelector('.v31-approved-home')})()`);
  assert.equal(legacyHome,true,'legacy Classic Home route must be ignored');
  const initial=await evaluate(`(()=>({url:location.href,count:RECIPES.length,unique:new Set(RECIPES.map(recipe=>Number(recipe.id))).size,settings:!!document.querySelector('.v3-settings')}))()`);
  assert.equal(initial.count,116,'runtime recipe count');
  assert.equal(initial.unique,116,'runtime recipe IDs must be unique');
  assert.equal(initial.settings,true,'Magical Home Settings control');

  await click('.v3-settings');
  await waitFor(`view==='settings'&&document.querySelector('#screen')`,'Settings route');
  const noClassicToggle=await evaluate(`!Array.from(document.querySelectorAll('button,[role="switch"],input')).some(node=>/classic home|home style|home experience/i.test((node.textContent||'')+' '+(node.getAttribute('aria-label')||'')+' '+(node.getAttribute('name')||'')))`);
  assert.equal(noClassicToggle,true,'Classic Home must not appear in Settings');
  await click('#nav .tab[data-nav="home"]');
  await waitFor(`view==='home'&&document.querySelector('.v31-approved-home')`,'return from Settings to Home');

  await click('#nav .tab[data-nav="world"]');
  await waitFor(`view==='world'&&document.querySelector('.aria-world-globe')`,'World globe');
  assert.equal(await evaluate('v33GlobeController?.getState()?.selected'),null,'World entry must begin without a selected country');
  const visibleFlag=await evaluate(`(()=>{const flag=document.querySelector('.aria-world-globe__flag[data-country-id]');if(!flag)return false;flag.click();return true})()`);
  assert.equal(visibleFlag,true,'World globe must expose a selectable country flag');
  await waitFor(`view==='world'&&document.querySelector('.aria-world-globe__panel.is-selected')`,'World flag country list');
  await click('.aria-world-globe__close');
  await waitFor(`view==='world'&&!document.querySelector('.aria-world-globe__panel.is-selected')`,'World flag list close');

  await click('#nav .tab[data-nav="home"]');
  await waitFor(`view==='home'`,'Home from World');
  await openHomeCountry('IND','india',[51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74]);
  await click('#nav .tab[data-nav="home"]');
  await waitFor(`view==='home'`,'Home before China route');
  await openHomeCountry('CHN','china',[99,100,101]);
  await click('#nav .tab[data-nav="home"]');
  await waitFor(`view==='home'`,'Home before Vietnam route');
  await openHomeCountry('VNM','vietnam',[108,109,110,111,112,113,114,115,116]);

  await click('#nav .tab[data-nav="library"]');
  await waitFor(`view==='library'&&document.querySelectorAll('.recipe-card').length===116`,'All Recipes list');
  await click('.recipe-card[data-open="116"]');
  await waitFor(`view==='recipe'&&Number(selected?.id)===116&&document.querySelector('#screen .ref-title h1')`,'canonical recipe #116 detail');
  const detail=await evaluate(`({id:Number(selected.id),title:document.querySelector('#screen .ref-title h1').textContent.trim(),template:document.querySelector('.app')?.classList.contains('v32-international-active')})`);
  assert.equal(detail.id,116);
  assert.equal(detail.template,true,'recipe #116 must use the international recipe template');
  assert.ok(detail.title,'recipe #116 title must render');
  assert.equal(await evaluate(`Boolean(document.querySelector('#screen'))`),true,'recipe screen must remain attached');

  const result={
    status:'PASS',
    webviewUrl:target.url,
    packageId:process.env.V35_SMOKE_PACKAGE||'',
    welcomeAndSingleHome:'PASS',home:'PASS',settings:'PASS',worldGlobeAndFlag:'PASS',
    indiaRecipeIds:[51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74],
    chinaRecipeIds:[99,100,101],vietnamRecipeIds:[108,109,110,111,112,113,114,115,116],
    chinaAndVietnamThumbnails:'PASS',allRecipesCount:116,
    recipe116Detail:'PASS',screenshots:'NOT CAPTURED'
  };
  writeFileSync(resolve(output,'smoke-result.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}finally{
  socket.close();
}
