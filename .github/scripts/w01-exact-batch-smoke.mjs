import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const batch=process.argv[2];
assert.match(batch||'',/^B(?:0[1-9]|10)$/,'exact batch argument is required');
const manifest=JSON.parse(readFileSync(`tools/v3/artwork/exact-batches/${batch}/manifest.json`,'utf8'));
const adb=args=>execFileSync('timeout',['--kill-after=10s','60s','adb',...args]);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
mkdirSync('artifacts/v31-android-screenshots',{recursive:true});
mkdirSync('artifacts/v31-diagnostics',{recursive:true});
let target;
for(let i=0;i<45&&!target;i++){
  try{
    const pages=await (await fetch('http://127.0.0.1:9222/json')).json();
    target=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl&&p.url?.includes(`/artwork-review/exact/${batch}/index.html`));
  }catch{}
  if(!target)await pause(500);
}
assert.ok(target,`Android WebView did not open the exact ${batch} reviewer route`);
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let seq=0;const pending=new Map();
ws.addEventListener('message',event=>{
  const m=JSON.parse(event.data);if(!m.id||!pending.has(m.id))return;
  const {resolve,reject,timer}=pending.get(m.id);pending.delete(m.id);clearTimeout(timer);
  m.error?reject(new Error(m.error.message)):resolve(m.result);
});
function command(method,params={}){
  const id=++seq;
  const p=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`DevTools ${method} timed out`));},15000);pending.set(id,{resolve,reject,timer});});
  ws.send(JSON.stringify({id,method,params}));return p;
}
async function evaluate(expression){
  const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||'WebView evaluation failed');
  return result.result?.value;
}
await command('Runtime.enable');
await pause(500);
const data=await evaluate(`(() => ({title:document.title,heading:document.querySelector('h1')?.innerText||'',contact:(()=>{const i=document.querySelector('[data-contact-sheet]');return i?{complete:i.complete,width:i.naturalWidth,height:i.naturalHeight,box:(()=>{const r=i.getBoundingClientRect();return {width:r.width,height:r.height}})()}:null})(),atlases:[...document.querySelectorAll('img[data-atlas]')].map(i=>({id:Number(i.dataset.atlas),complete:i.complete,width:i.naturalWidth,height:i.naturalHeight,display:getComputedStyle(i).display})),panels:[...document.querySelectorAll('img[data-panel-preview]')].map(i=>({id:i.dataset.panelPreview,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight})) ,pendingText:document.querySelector('header')?.innerText||''}))()`);
assert.equal(data.title,`${batch} draft art review`);
assert.deepEqual(data.atlases.map(x=>x.id),manifest.recipeIds);
assert.equal(data.atlases.length,5);
assert.ok(data.atlases.every(x=>x.complete&&x.width===1536&&x.height===1024&&x.display!=='none'));
assert.equal(data.panels.length,30);
assert.ok(data.panels.every(x=>x.complete&&x.width===480&&x.height===480));
assert.ok(data.contact?.complete&&data.contact.width===1440&&data.contact.height===1564);
assert.match(data.pendingText,/Not approved/);
assert.match(data.pendingText,/Rights, A08 and A09 remain pending/);

async function assertOrientation(landscape){
  for(let i=0;i<30;i++){
    const state=await evaluate(`({width:innerWidth,height:innerHeight,orientation:screen.orientation?.type||'unknown'})`);
    if((state.width>state.height)===landscape)return state;
    await pause(500);
  }
  throw new Error(`WebView did not settle to ${landscape?'landscape':'portrait'}`);
}
async function capture(name,landscape){
  const viewport=await assertOrientation(landscape);
  const bytes=adb(['exec-out','screencap','-p']);
  assert.ok(bytes.length>10000,`${name} screenshot is too small`);
  assert.equal(bytes.toString('ascii',1,4),'PNG');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  assert.equal(width>height,landscape,`${name} screenshot dimensions are ${width}x${height}`);
  const path=`artifacts/v31-android-screenshots/${batch}-${name}.png`;
  writeFileSync(path,bytes);
  const written=readFileSync(path);
  assert.equal(createHash('sha256').update(written).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
  assert.ok(statSync(path).size>10000);
  return {path,width,height,bytes:written.length,sha256:createHash('sha256').update(written).digest('hex'),viewport};
}
const original=await evaluate(`({width:innerWidth,height:innerHeight})`);
if(original.width>original.height){adb(['emu','rotate']);await assertOrientation(false);}
await evaluate(`window.scrollTo(0,0)`);
await pause(700);
const portrait=await capture('portrait',false);
let landscapeView=await evaluate(`({width:innerWidth,height:innerHeight})`);
for(let i=0;i<4&&landscapeView.width<=landscapeView.height;i++){
  adb(['emu','rotate']);await pause(700);landscapeView=await evaluate(`({width:innerWidth,height:innerHeight})`);
}
assert.ok(landscapeView.width>landscapeView.height,`Could not rotate exact batch route: ${JSON.stringify(landscapeView)}`);
await evaluate(`window.scrollTo(0,0)`);await pause(700);
const landscape=await capture('landscape',true);
const result={batch,recipeIds:manifest.recipeIds,atlasCount:data.atlases.length,panelPreviewCount:data.panels.length,contactSheet:data.contact,screenshots:{portrait,landscape},independentReview:{A08:'PENDING',A09:'PENDING',artworkRights:'UNRESOLVED'}};
writeFileSync(`artifacts/v31-diagnostics/${batch}-android-review-smoke.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
ws.close();
