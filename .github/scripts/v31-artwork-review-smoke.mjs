import { execFileSync } from 'node:child_process';
import { writeFileSync, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const adb=args=>execFileSync('timeout',['--kill-after=10s','60s','adb',...args]);
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
  page=await evaluate(`(() => ({title:document.title,heading:document.querySelector('h1')?.innerText||'',text:document.body.innerText||'',images:[...document.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight}))}))()`);
  if(page?.images?.length===10&&page.images.every(x=>x.complete&&x.naturalWidth===1536&&x.naturalHeight===1024))break;
  await pause(400);
}
assert.equal(page.title,'Draft artwork review — Batch 01');
assert.match(page.heading,/Draft artwork — independent review only/);
assert.match(page.text,/Rights, A08 and A09 remain pending/);
assert.equal(page.images.length,10);
for(const img of page.images){assert.match(img.src,/^batch-01\/recipe-(1[1-9]|20)\.svg$/);assert.equal(img.naturalWidth,1536);assert.equal(img.naturalHeight,1024);}
await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
await pause(800);
const screenshot=adb(['exec-out','screencap','-p']);
assert.ok(screenshot.length>10000,`Android screenshot unexpectedly small: ${screenshot.length}`);
assert.equal(screenshot.toString('ascii',1,4),'PNG');
const output='artifacts/v31-android-screenshots/v31-artwork-review-batch-01.png';
writeFileSync(output,screenshot);
const written=readFileSync(output);assert.equal(createHash('sha256').update(written).digest('hex'),createHash('sha256').update(screenshot).digest('hex'));
assert.ok(statSync(output).size>10000);
const w=written.readUInt32BE(16),h=written.readUInt32BE(20);assert.ok(w<h,`Expected portrait review screenshot, got ${w}x${h}`);
console.log(JSON.stringify({route:target.url,title:page.title,atlases:page.images.length,allSvgImagesLoaded:true,screenshot:output,width:w,height:h,bytes:written.length}));
ws.close();
