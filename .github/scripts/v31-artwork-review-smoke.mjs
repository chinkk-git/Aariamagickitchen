import { execFileSync } from 'node:child_process';
import { writeFileSync, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { captureOrientedPng } from './android-screenshot-orientation.mjs';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const adb=args=>execFileSync('timeout',['--kill-after=10s','60s','adb',...args]);
async function currentRotation(){
  const status=adb(['shell','dumpsys','window']).toString('utf8');
  const value=status.match(/mRotation=(\d)/)?.[1]||status.match(/mRotation=ROTATION_(0|90|180|270)/)?.[1];
  const normalized=value==='90'?'1':value==='180'?'2':value==='270'?'3':value;
  assert.ok(['0','1','2','3'].includes(normalized),`Could not read Android display rotation: ${normalized||'unknown'}`);
  return Number(normalized);
}
const captureReviewPng=()=>captureOrientedPng({
  expectedOrientation:'portrait',
  readRotation:currentRotation,
  rotate:()=>adb(['emu','rotate']),
  capturePng:()=>adb(['exec-out','screencap','-p'])
});
let target;
for(let i=0;i<30&&!target;i++){
  const pages=await (await fetch('http://127.0.0.1:9222/json')).json();
  target=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl&&p.url?.includes('/artwork-review/index.html'));
  if(!target)await pause(500);
}
assert.ok(target,'Android WebView did not open the debug-only artwork review route');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let id=0;const pending=new Map();
ws.addEventListener('message',event=>{
  const m=JSON.parse(event.data);if(!m.id||!pending.has(m.id))return;
  const {resolve,reject,timer}=pending.get(m.id);pending.delete(m.id);clearTimeout(timer);
  m.error?reject(new Error(m.error.message)):resolve(m.result);
});
function evaluate(expression){
  const commandId=++id;
  const result=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(commandId);reject(new Error('WebView evaluation timeout'));},15000);pending.set(commandId,{resolve,reject,timer});});
  ws.send(JSON.stringify({id:commandId,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));
  return result.then(r=>{if(r.exceptionDetails)throw new Error(r.exceptionDetails.text||'WebView evaluation failed');return r.result.value;});
}
async function command(method,params={}){
  const commandId=++id;
  const result=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(commandId);reject(new Error(`DevTools ${method} timeout`));},15000);pending.set(commandId,{resolve,reject,timer});});
  ws.send(JSON.stringify({id:commandId,method,params}));
  return result;
}
await command('Runtime.enable');
let page;
for(let i=0;i<30;i++){
  page=await evaluate(`(() => ({title:document.title,heading:document.querySelector('h1')?.innerText||'',text:document.body.innerText||'',images:[...document.querySelectorAll('img')].map(i=>{const r=i.getBoundingClientRect();return {src:i.getAttribute('src'),complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,width:r.width,height:r.height,display:getComputedStyle(i).display}})}))()`);
  if(page?.images?.length===50&&page.images.every(x=>x.complete&&x.naturalWidth===1536&&x.naturalHeight===1024))break;
  await pause(400);
}
assert.equal(page.title,'Draft artwork review — Batches 01–05');
assert.match(page.heading,/Draft artwork — independent review only/);
assert.match(page.text,/Rights, A08 and A09 remain pending/);
assert.equal(page.images.length,50);
for(const img of page.images){assert.match(img.src,/^batch-01\/recipe-(?:1[1-9]|20)\.svg$|^batch-02\/recipe-(?:2[1-6]|2[89]|3[01])\.svg$|^batch-03\/recipe-(?:3[2-8]|4[1-3])\.svg$|^batch-04\/recipe-(?:4[4-9]|50|5[234])\.svg$|^batch-05\/recipe-(?:5[5-9]|6[0-2]|6[45])\.svg$/);assert.equal(img.naturalWidth,1536);assert.equal(img.naturalHeight,1024);}
assert.ok(page.images[0].width>=180&&page.images[0].height>=100,`First draft atlas is not visibly laid out: ${JSON.stringify(page.images[0])}`);
assert.notEqual(page.images[0].display,'none');
await evaluate(`document.querySelector('img')?.scrollIntoView({block:'center'})`);
await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
await pause(800);
const {png:screenshot,width:w,height:h,rotation}=await captureReviewPng();
assert.ok(screenshot.length>10000,`Android screenshot unexpectedly small: ${screenshot.length}`);
const output='artifacts/v31-android-screenshots/v31-artwork-review-batches-01-05.png';
writeFileSync(output,screenshot);
const written=readFileSync(output);assert.equal(createHash('sha256').update(written).digest('hex'),createHash('sha256').update(screenshot).digest('hex'));
assert.ok(statSync(output).size>10000);
assert.ok(w<h,`Expected portrait review screenshot, got ${w}x${h}`);
await evaluate(`document.querySelector('img[src="batch-04/recipe-48.svg"]')?.scrollIntoView({block:'center'})`);
await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
await pause(800);
const legacyLayout=await evaluate(`(() => {const i=document.querySelector('img[src="batch-04/recipe-48.svg"]');const r=i?.getBoundingClientRect();return {complete:i?.complete,naturalWidth:i?.naturalWidth,naturalHeight:i?.naturalHeight,width:r?.width,height:r?.height,display:i?getComputedStyle(i).display:null}})()`);
assert.equal(legacyLayout.complete,true);assert.equal(legacyLayout.naturalWidth,1536);assert.equal(legacyLayout.naturalHeight,1024);
assert.ok(legacyLayout.width>=180&&legacyLayout.height>=100,`Recipe 48 draft atlas is not visibly laid out: ${JSON.stringify(legacyLayout)}`);
assert.notEqual(legacyLayout.display,'none');
const {png:legacyScreenshot,width:legacyWidth,height:legacyHeight,rotation:legacyRotation}=await captureReviewPng();
assert.ok(legacyScreenshot.length>10000);
assert.ok(legacyWidth<legacyHeight,`Expected portrait legacy review screenshot, got ${legacyWidth}x${legacyHeight}`);
const legacyOutput='artifacts/v31-android-screenshots/v31-artwork-review-recipe-48.png';writeFileSync(legacyOutput,legacyScreenshot);
const legacyWritten=readFileSync(legacyOutput);assert.equal(createHash('sha256').update(legacyWritten).digest('hex'),createHash('sha256').update(legacyScreenshot).digest('hex'));
console.log(JSON.stringify({route:target.url,title:page.title,atlases:page.images.length,allSvgImagesLoaded:true,screenshots:[{path:output,width:w,height:h,rotation,orientation:'portrait',bytes:written.length},{path:legacyOutput,width:legacyWidth,height:legacyHeight,rotation:legacyRotation,orientation:'portrait',bytes:legacyWritten.length}]}));
ws.close();
