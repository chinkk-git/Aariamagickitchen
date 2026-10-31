import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize,resolve,sep} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const baselineRoot=resolve(process.env.BASELINE_ROOT||'');
const latestRoot=resolve(process.env.LATEST_ROOT||process.env.GITHUB_WORKSPACE||process.cwd());
if(!process.env.BASELINE_ROOT)throw new Error('BASELINE_ROOT must point to the deployed production checkout');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
let currentRoot=baselineRoot;
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),rel=normalize(pathname.startsWith('/')?pathname.slice(1):pathname);let file=resolve(currentRoot,rel||'index.html');if(!file.startsWith(currentRoot+sep)&&file!==currentRoot)throw Error('path escaped');if((await stat(file)).isDirectory())file=join(file,'index.html');res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('not found');}});
await new Promise(done=>server.listen(4175,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,timeout:15000});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
const page=await context.newPage();page.setDefaultTimeout(15000);
try{
  await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;return reg.active?.scriptURL;});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:15000});
  const before=await page.evaluate(async()=>{
    const manifest=await fetch('./manifest.webmanifest').then(r=>r.json());
    const installedData={weeks:{'2035-01-01':{meal:112}},done:[112],checks:{'2035-01-01':[112]},stories:['saved-story'],favorites:[112],grocerySelected:['tofu']};
    localStorage.setItem('aariaPrivateKitchenV4',JSON.stringify(installedData));
    localStorage.setItem('aaria.accessibility.textSize.v1','175');
    localStorage.setItem('aaria.notifications.settings.v1',JSON.stringify({recipes:true,features:false,countries:true,updates:true,push:false}));
    return{manifest,data:localStorage.getItem('aariaPrivateKitchenV4'),textSize:localStorage.getItem('aaria.accessibility.textSize.v1'),prefs:localStorage.getItem('aaria.notifications.settings.v1'),cacheNames:await caches.keys(),timeOrigin:performance.timeOrigin};
  });
  assert.equal(before.manifest.id,'./');assert.equal(before.manifest.scope,'./');assert.equal(before.manifest.start_url,'./index.html');
  currentRoot=latestRoot;
  const update=await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();return true;});
  assert.equal(update,true);
  await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.scriptURL&&((await caches.keys()).includes('aaria-web-v3.5-85f537591449-r2'));},null,{timeout:20000});
  const afterActivation=await page.evaluate(()=>({url:location.href,timeOrigin:performance.timeOrigin,controller:navigator.serviceWorker.controller?.scriptURL}));
  assert.equal(afterActivation.url,'http://127.0.0.1:4175/','activation does not navigate or open a second app window');
  assert.equal(afterActivation.timeOrigin,before.timeOrigin,'activation does not restart an open app automatically');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(document.querySelector('#notification-bell'))||Boolean(window.AariaNotifications),null,{timeout:15000});
  const after=await page.evaluate(async()=>({
    manifest:await fetch('./manifest.webmanifest').then(r=>r.json()),
    data:localStorage.getItem('aariaPrivateKitchenV4'),
    textSize:localStorage.getItem('aaria.accessibility.textSize.v1'),
    prefs:localStorage.getItem('aaria.notifications.settings.v1'),
    hasInbox:typeof window.AariaNotifications==='object',
    active:navigator.serviceWorker.controller?.scriptURL
  }));
  assert.equal(after.manifest.id,before.manifest.id);assert.equal(after.manifest.scope,before.manifest.scope);assert.equal(after.manifest.start_url,before.manifest.start_url);
  assert.equal(after.data,before.data,'recipe progress, favorites, creations/planner data remain byte-for-byte intact');
  assert.equal(after.textSize,before.textSize,'text-size choice remains intact');
  assert.equal(after.prefs,before.prefs,'notification preferences survive app restart');
  assert.ok(after.hasInbox,'notification functionality is available after reopening the existing installation');
  console.log('PASS: browser installation simulation upgraded from deployed main without reinstall/data clearing; manifest identity and stored app data survived, SW activation did not force-reload, and notification UI loaded after restart. This is automated browser evidence, not physical Android/iOS evidence.');
}finally{
  await Promise.race([context.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});
  await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});
  server.closeAllConnections?.();await new Promise(resolve=>{const timer=setTimeout(resolve,1000);timer.unref?.();server.close(()=>{clearTimeout(timer);resolve();});});
}
