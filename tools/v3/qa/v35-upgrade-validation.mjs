#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const APPROVED_BASE_HEAD = 'c10d56e27ea27e60dd02c804ea95cb9a3b7e1e75';
const PRODUCTION_URL = process.env.AARIA_PRODUCTION_URL || 'https://chinkk-git.github.io/Aariamagickitchen/';
const CANDIDATE_ROOT = path.resolve(process.env.AARIA_CANDIDATE_ROOT || process.cwd());
const HOST = '127.0.0.1';
const PORT = Number(process.env.AARIA_QA_PORT || 4173);
const REPORT = path.resolve(process.env.AARIA_QA_REPORT || 'aaria-v35-upgrade-report.json');
const NOOP_SW = `self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));`;

function assert(condition, message) { if (!condition) throw new Error(message); }
function formatError(error) {
  if (error instanceof Error) return error.stack || `${error.name||'Error'}: ${error.message||'No error message'}`;
  if (error === null) return 'Non-Error rejection: null';
  if (error === undefined) return 'Non-Error rejection: undefined';
  try { return JSON.stringify(error) ?? String(error); } catch { return String(error); }
}
function runGit(...args) { return execFileSync('git', args, { cwd: CANDIDATE_ROOT, encoding: 'utf8' }).trim(); }
function mime(file) {
  return ({ '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
    '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json',
    '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml',
    '.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav' })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function main() {
  const head = runGit('rev-parse', 'HEAD');
  const branch = runGit('branch', '--show-current');
  assert(branch === 'release/v3.5-html-recovery-20261030', `Expected release branch, found ${branch}.`);
  try { execFileSync('git', ['merge-base','--is-ancestor',APPROVED_BASE_HEAD,head], {cwd:CANDIDATE_ROOT,stdio:'ignore'}); }
  catch { throw new Error(`Approved release base ${APPROVED_BASE_HEAD} is not an ancestor of ${head}. Refusing to test a different source state.`); }
  const candidateIndex = path.join(CANDIDATE_ROOT, 'index.html');
  await fs.access(candidateIndex);
  const prodResponse = await fetch(PRODUCTION_URL, { redirect: 'follow', cache: 'no-store' });
  assert(prodResponse.ok, `Production HTML fetch failed: HTTP ${prodResponse.status} ${prodResponse.url}`);
  const oldHtml = Buffer.from(await prodResponse.arrayBuffer());
  assert(oldHtml.length > 100_000, `Unexpectedly small production HTML (${oldHtml.length} bytes); refusing to run an invalid upgrade test.`);
  const oldHtmlText = oldHtml.toString('utf8');
  assert(/95\s+recipes|95 recipes|All 95 recipes/i.test(oldHtmlText), 'Fetched production HTML does not contain the expected old 95-recipe marker. Confirm the production URL before testing.');
  let oldServiceWorkerUrl=null, oldServiceWorkerCacheName=null;
  try {
    const oldSwUrl=new URL('sw.js',PRODUCTION_URL); const oldSw=await fetch(oldSwUrl,{redirect:'follow',cache:'no-store'});
    oldServiceWorkerUrl=oldSw.url;
    if(oldSw.ok){const source=await oldSw.text();oldServiceWorkerCacheName=source.match(/(?:CACHE_NAME|CACHE_VERSION)\s*=\s*['"`]([^'"`]+)['"`]/)?.[1]||null;}
  } catch {}
  const require = createRequire(import.meta.url);
  const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

  let stage = 'production';
  const serverErrors = [];
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, `http://${HOST}:${PORT}`).pathname;
      if (pathname === '/favicon.ico') { res.writeHead(204, {'cache-control':'no-store'}); res.end(); return; }
      if (pathname === '/__qa/upgrade' && req.method === 'POST') { stage = 'candidate'; res.writeHead(204, { 'Cache-Control':'no-store' }); res.end(); return; }
      if (pathname === '/__qa/stage') { res.writeHead(200, {'content-type':'application/json','cache-control':'no-store'}); res.end(JSON.stringify({stage,head})); return; }
      if (pathname === '/sw.js' || pathname.endsWith('/sw.js')) {
        if (stage === 'production') { res.writeHead(200, {'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','service-worker-allowed':'/'}); res.end(NOOP_SW); return; }
      }
      if (stage === 'candidate') {
        const decoded = decodeURIComponent(pathname);
        const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
        const file = path.resolve(CANDIDATE_ROOT, relative);
        assert(file === CANDIDATE_ROOT || file.startsWith(CANDIDATE_ROOT + path.sep), 'Path traversal blocked');
        const body = await fs.readFile(file);
        res.writeHead(200, {'content-type':mime(file),'cache-control':'no-store','service-worker-allowed':'/'}); res.end(body); return;
      }
      const productionBase = new URL(PRODUCTION_URL);
      const upstream = new URL(productionBase.origin);
      upstream.pathname = productionBase.pathname.replace(/\/$/, '') + pathname;
      upstream.search = new URL(req.url, `http://${HOST}:${PORT}`).search;
      const proxied = await fetch(upstream, { headers: { 'user-agent':'Aaria-V3.5-upgrade-validation/1.0' }, redirect:'follow', cache:'no-store' });
      const headers = Object.fromEntries(proxied.headers.entries());
      delete headers['content-encoding']; delete headers['content-length']; delete headers['transfer-encoding'];
      headers['cache-control'] = 'no-store';
      res.writeHead(proxied.status, headers); res.end(Buffer.from(await proxied.arrayBuffer()));
    } catch (error) {
      serverErrors.push(String(error?.stack || error));
      if (!res.headersSent) res.writeHead(error.code === 'ENOENT' ? 404 : 500, {'content-type':'text/plain','cache-control':'no-store'});
      res.end(error.code === 'ENOENT' ? 'Not found' : `QA server error: ${error.message}`);
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT, HOST, resolve); });
  const origin = `http://${HOST}:${PORT}`;
  const report = { approvedBaseHead:APPROVED_BASE_HEAD, actualHead:head, branch, productionUrl:prodResponse.url, productionHtmlBytes:oldHtml.length,
    oldServiceWorkerUrl, oldServiceWorkerCacheName,
    origin, generatedAt:new Date().toISOString(), results:[], limitations:['WebKit is a desktop browser simulation; it is not physical iOS Safari. Chromium is not Android Chrome/WebView hardware evidence.'] };

  async function runEngine(name, engine) {
    const result = { engine:name, status:'FAIL', dataPreservation:null, recipes:null, cacheTransition:'NOT_APPLICABLE', pageErrors:[], failedAssets:[] };
    let browser, context, page;
    try {
    browser = await engine.launch({ headless:true });
    context = await browser.newContext({ serviceWorkers:'allow', viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
    page = await context.newPage();
    page.on('pageerror', e => result.pageErrors.push(e.message));
    page.on('requestfailed', r => { if (r.url().startsWith(origin)) result.failedAssets.push({url:r.url(),error:r.failure()?.errorText}); });
    page.on('response', r => { if (r.url().startsWith(origin) && r.status() >= 400 && !r.url().includes('/__qa/')) result.failedAssets.push({url:r.url(),status:r.status()}); });
    await context.addInitScript(targetOrigin => {
      if (location.origin !== targetOrigin) return;
      if (sessionStorage.getItem('__aaria_v35_upgrade_seeded')) return;
      const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII=';
      const saved={weeks:{},done:[3],checks:{3:[true]},stories:[],favorites:[3],grocerySelected:[],language:'en-GB',
        myCreations:[{recipeId:3,completedAt:'2026-10-01T12:00:00.000Z',photoDataUrl:photo,qaFixture:'synthetic-photo'}],myCreationsV35MigrationComplete:true,
        qaProfilePreference:{soundMuted:true,measurement:'metric'}};
      localStorage.setItem('aariaPrivateKitchenV4',JSON.stringify(saved));
      localStorage.setItem('myMagicalKitchenProfilesV1',JSON.stringify({activeId:'qa-profile-1',profiles:[{id:'qa-profile-1',name:'Synthetic QA Profile',snapshot:saved},{id:'qa-profile-2',name:'Secondary Synthetic Profile',snapshot:{language:'pt-BR',favorites:[5]}}]}));
      localStorage.setItem('aaria.v35.homeExperience','magical');
      localStorage.setItem('aaria.v35.wonderlandMuted','true');
      localStorage.setItem('aaria.qa.fixture.preferences',JSON.stringify({theme:'approved',locale:'en-GB',soundMuted:true}));
      sessionStorage.setItem('__aaria_v35_upgrade_seeded','yes');
    }, origin);
      await page.goto(origin + '/', {waitUntil:'domcontentloaded',timeout:90000});
      await page.waitForSelector('#screen', {timeout:30000});
      await page.waitForTimeout(1500);
      const before = await page.evaluate(async oldCacheName => {
        let qaStep='fixture database open';
        try {
        const idbFailure=(operation,error)=>new Error(operation+': '+(error&&typeof error==='object'?((error.name||'IndexedDB error')+': '+(error.message||'no message')):('IndexedDB event supplied '+String(error))));
        const request = (db, action, label) => new Promise((resolve,reject) => {
          let tx;
          try { tx=db.transaction(['profiles','creations','photos','preferences'],'readwrite'); action(tx); }
          catch(error) { reject(idbFailure(label+' setup',error)); return; }
          tx.oncomplete=()=>resolve();
          const eventFailure=(event,kind)=>{const target=event?.target;const targetError=target&&target!==tx?target.error:null;const storeName=target?.source?.name||'unknown store';const error=targetError||tx.error||event?.error;return idbFailure(label+kind+' from '+storeName,error);};
          tx.onerror=event=>reject(eventFailure(event,' transaction error'));
          tx.onabort=event=>reject(eventFailure(event,' transaction aborted'));
        });
        const opened = await new Promise((resolve,reject) => {
          const r=indexedDB.open('AariaV35UpgradeFixture',1);
          r.onupgradeneeded=()=>{ for(const name of ['profiles','creations','photos','preferences']) if(!r.result.objectStoreNames.contains(name)) r.result.createObjectStore(name,{keyPath:'id'}); };
          r.onsuccess=()=>resolve(r.result);
          r.onerror=()=>reject(idbFailure('open synthetic fixture database',r.error));
          r.onblocked=()=>reject(new Error('open synthetic fixture database was blocked'));
        });
        qaStep='synthetic photo decode';
        const photoBytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
        qaStep='write synthetic fixture records';
        await request(opened,tx=>{ tx.objectStore('profiles').put({id:'qa-profile-1',name:'Synthetic QA Profile'}); tx.objectStore('creations').put({id:'qa-creation-1',recipeId:3,createdAt:'2026-10-01T12:00:00.000Z'}); tx.objectStore('photos').put({id:'qa-photo-1',creationId:'qa-creation-1',blob:new Blob([photoBytes],{type:'image/png'})}); tx.objectStore('preferences').put({id:'home',value:'magical'}); },'write synthetic fixture records');
        qaStep='close synthetic fixture database';
        opened.close();
        qaStep='cache snapshot';
        if ('caches' in window) {
          const names=[...new Set([oldCacheName,'aaria-web-v3.5-old-95-recipes'].filter(Boolean))];
          for(const name of names){const c=await caches.open(name);await c.put('/__qa/old-catalog-marker',new Response('95'));}
        }
        qaStep='localStorage snapshot';
        const ls={}; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls[k]=localStorage.getItem(k)}
        qaStep='IndexedDB enumeration';
        const dbList=await indexedDB.databases(); const dbs={};
        for(const info of dbList){if(!info.name)continue;const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(info.name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const stores={};
          for(const storeName of db.objectStoreNames){const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readonly'),r=tx.objectStore(storeName).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});stores[storeName]=await Promise.all(rows.map(async row=>{if(row?.blob instanceof Blob){const b64=btoa(String.fromCharCode(...new Uint8Array(await row.blob.arrayBuffer())));return {...row,blob:{type:row.blob.type,size:row.blob.size,base64:b64}}}return row}));} dbs[info.name]=stores;db.close();}
        qaStep='old-stage text capture';
        return {ls,dbs,oldRenderedText:document.body.innerText.slice(0,2000)};
        } catch(error) {
          const isObject=error!==null&&(typeof error==='object'||typeof error==='function');
          return {__qaEvaluationError:{
            step:qaStep,
            name:isObject?String(error.name||'Error'):'NonErrorRejection',
            message:isObject?String(error.message||error.name||'Unknown browser error'):`Non-Error rejection value: ${String(error)}`,
            stack:isObject&&typeof error.stack==='string'?error.stack:''
          }};
        }
      }, oldServiceWorkerCacheName);
      assert(!before?.__qaEvaluationError, `${name}: pre-upgrade snapshot failed at ${before.__qaEvaluationError?.step||'unknown'}: ${before.__qaEvaluationError?.name||''}: ${before.__qaEvaluationError?.message||''}`);
      assert(/95\s+recipes|All 95 recipes/i.test(before.oldRenderedText) || /95\s+recipes|All 95 recipes/i.test(oldHtmlText), `${name}: old-stage 95-recipe content was not observed.`);
      await page.evaluate(async () => { const r=await fetch('/__qa/upgrade',{method:'POST',cache:'no-store'}); if(!r.ok)throw new Error('stage switch failed '+r.status); });
      await page.reload({waitUntil:'domcontentloaded',timeout:90000});
      await page.waitForSelector('#screen', {timeout:30000});
      await page.waitForTimeout(5000);
      const after = await page.evaluate(async () => {
        const ls={}; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls[k]=localStorage.getItem(k)}
        const dbList=await indexedDB.databases(); const dbs={};
        for(const info of dbList){if(!info.name)continue;const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(info.name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const stores={};
          for(const storeName of db.objectStoreNames){const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readonly'),r=tx.objectStore(storeName).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});stores[storeName]=await Promise.all(rows.map(async row=>{if(row?.blob instanceof Blob){const b64=btoa(String.fromCharCode(...new Uint8Array(await row.blob.arrayBuffer())));return {...row,blob:{type:row.blob.type,size:row.blob.size,base64:b64}}}return row}));} dbs[info.name]=stores;db.close();}
        return {ls,dbs};
      });
      const removedLS=Object.keys(before.ls).filter(k=>!(k in after.ls));
      const modifiedLS=Object.entries(before.ls).filter(([k,v])=>after.ls[k]!==v).map(([k])=>k);
      const missingDB=[];
      for(const [dbName,stores] of Object.entries(before.dbs)) for(const [store,rows] of Object.entries(stores)) {
        const now=after.dbs[dbName]?.[store]||[];
        for(const row of rows) if(!now.some(n=>JSON.stringify(n)===JSON.stringify(row))) missingDB.push(`${dbName}/${store}/${row.id||'row'}`);
      }
      const fixture = await page.evaluate(() => ({profile:JSON.parse(localStorage.getItem('myMagicalKitchenProfilesV1')||'{}'),state:JSON.parse(localStorage.getItem('aariaPrivateKitchenV4')||'{}'),home:localStorage.getItem('aaria.v35.homeExperience'),photo:localStorage.getItem('aariaPrivateKitchenV4')||''}));
      assert(removedLS.length===0, `${name}: localStorage records removed: ${removedLS.join(', ')}`);
      assert(missingDB.length===0, `${name}: IndexedDB records changed or missing: ${missingDB.join(', ')}`);
      const unexpectedModifiedLS=modifiedLS.filter(k=>!['aariaPrivateKitchenV4','myMagicalKitchenProfilesV1'].includes(k));
      assert(unexpectedModifiedLS.length===0, `${name}: unrelated localStorage records changed: ${unexpectedModifiedLS.join(', ')}`);
      assert(fixture.profile.profiles?.length===2 && fixture.profile.activeId==='qa-profile-1', `${name}: profile fixture missing after upgrade.`);
      assert(fixture.state.myCreations?.some(x=>x.qaFixture==='synthetic-photo' && x.photoDataUrl?.startsWith('data:image/png;base64,')) && fixture.state.favorites?.includes(3) && fixture.state.done?.includes(3), `${name}: creation/photo/favourite/completion fixture missing after upgrade.`);
      const originalState=JSON.parse(before.ls.aariaPrivateKitchenV4);
      for(const key of ['weeks','done','checks','stories','favorites','grocerySelected','language','myCreations','qaProfilePreference'])
        assert(JSON.stringify(fixture.state[key])===JSON.stringify(originalState[key]), `${name}: saved app-state field '${key}' changed during upgrade.`);
      const originalProfiles=JSON.parse(before.ls.myMagicalKitchenProfilesV1);
      for(const original of originalProfiles.profiles){
        const current=fixture.profile.profiles.find(profile=>profile.id===original.id);
        assert(current?.name===original.name, `${name}: saved profile '${original.id}' was lost or renamed.`);
        for(const key of ['language','favorites']) assert(JSON.stringify(current.snapshot?.[key])===JSON.stringify(original.snapshot?.[key]), `${name}: profile '${original.id}' field '${key}' changed.`);
      }
      assert(fixture.home==='magical', `${name}: selected Magical home preference changed.`);
      assert(after.ls['aaria.v35.wonderlandMuted']==='true' && after.ls['aaria.qa.fixture.preferences']===before.ls['aaria.qa.fixture.preferences'], `${name}: mute or preference setting changed.`);
      const portraitLayout=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,nav:!!document.querySelector('#nav')}));
      assert(portraitLayout.documentWidth<=portraitLayout.width+2 && portraitLayout.nav, `${name}: portrait layout overflow or navigation missing: ${JSON.stringify(portraitLayout)}`);
      await page.setViewportSize({width:844,height:390});
      const landscapeLayout=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,nav:!!document.querySelector('#nav')}));
      assert(landscapeLayout.documentWidth<=landscapeLayout.width+2 && landscapeLayout.nav, `${name}: landscape layout overflow or navigation missing: ${JSON.stringify(landscapeLayout)}`);
      result.dataPreservation={status:'PASS',localStorageKeys:Object.keys(before.ls).length,removedLocalStorageKeys:removedLS,applicationKeysNormalized:modifiedLS,indexedDBs:Object.keys(before.dbs).length,syntheticProfile:true,creationAndPhoto:true,favourites:true,preferences:true,homeSelection:fixture.home,portraitLayout,landscapeLayout};
      await page.setViewportSize({width:390,height:844});
      const welcome=page.locator('#v35-palace-welcome');
      if(await welcome.count()){
        await page.locator('#v35-palace-welcome .v35-skip').click({timeout:15000});
        await welcome.waitFor({state:'detached',timeout:15000});
      }
      await page.locator('#nav [data-nav="library"]').first().click({timeout:15000});
      await page.waitForTimeout(1000);
      const recipeCheck=await page.evaluate(()=>{
        const rows=[...document.querySelectorAll('#screen [data-open]')];
        const ids=[...new Set(rows.map(e=>Number(e.dataset.open)).filter(Number.isFinite))].sort((a,b)=>a-b);
        const body=document.querySelector('#screen')?.innerText||'';
        return {visibleCards:rows.length,uniqueIds:ids.length,minId:ids[0]??null,maxId:ids.at(-1)??null,bodyStart:body.slice(0,300)};
      });
      assert(recipeCheck.uniqueIds===116 && recipeCheck.minId===1 && recipeCheck.maxId===116, `${name}: expected 116 distinct recipe cards, observed ${JSON.stringify(recipeCheck)}`);
      assert(!/All 95 recipes|Browse all 95 recipes/i.test(recipeCheck.bodyStart), `${name}: old 95-recipe label remains in the recipe screen.`);
      result.recipes={status:'PASS',...recipeCheck};
      const swState=await page.evaluate(async()=>{
        if(!('serviceWorker'in navigator)||!('caches'in window))return {supported:false};
        let registration=null;try{registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await registration.update();}catch(e){return {supported:true,error:String(e)};}
        await new Promise(resolve=>{if(registration.active?.state==='activated')return resolve();const w=registration.installing||registration.waiting||registration.active;if(!w)return resolve();const t=setTimeout(resolve,15000);w.addEventListener('statechange',()=>{if(w.state==='activated'){clearTimeout(t);resolve()}})});
        const keys=await caches.keys();return {supported:true,active:!!registration.active,keys};
      });
      if(swState.supported){
        assert(swState.active && swState.keys.includes('aaria-web-v3.5-85f537591449-r1'), `${name}: V3.5 service worker/cache did not activate: ${JSON.stringify(swState)}`);
        assert(!swState.keys.some(k=>k.startsWith('aaria-web-v3.5-')&&k!=='aaria-web-v3.5-85f537591449-r1'), `${name}: stale V3.5 cache remains: ${JSON.stringify(swState.keys)}`);
        if(oldServiceWorkerCacheName)assert(!swState.keys.includes(oldServiceWorkerCacheName), `${name}: the current production cache '${oldServiceWorkerCacheName}' was not retired: ${JSON.stringify(swState.keys)}`);
        result.cacheTransition='PASS';
      } else result.cacheTransition='UNSUPPORTED_IN_ENGINE';
      assert(result.pageErrors.length===0, `${name}: browser page errors: ${result.pageErrors.join(' | ')}`);
      assert(result.failedAssets.length===0, `${name}: failed app assets: ${JSON.stringify(result.failedAssets.slice(0,10))}`);
      result.status='PASS';
    } catch(error) {
      result.error=formatError(error);
      if(page) { try { const imagePath=REPORT.replace(/\.json$/i,`-${name.toLowerCase()}-failure.png`); await page.screenshot({path:imagePath,fullPage:true,timeout:10000}); result.failureScreenshot=imagePath; } catch {} }
    }
    finally { if(context)await context.close(); if(browser)await browser.close(); }
    return result;
  }

  try {
    report.results.push(await runEngine('Chromium',chromium));
    try { report.results.push(await runEngine('WebKit-desktop-simulation',webkit)); }
    catch(error) { report.results.push({engine:'WebKit-desktop-simulation',status:'UNAVAILABLE',error:String(error)}); }
  } finally {
    await new Promise(resolve=>server.close(resolve));
    report.serverErrors=serverErrors.slice(0,20);
    report.overall=report.results.every(x=>x.status==='PASS')?'PASS':'FAIL';
    await fs.writeFile(REPORT,JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify(report,null,2));
  if(report.overall!=='PASS')process.exitCode=1;
}

main().catch(async error=>{
  const report={overall:'FAIL',fatalError:formatError(error),generatedAt:new Date().toISOString()};
  const output=path.resolve(process.env.AARIA_QA_REPORT||'aaria-v35-upgrade-report.json');
  try { await fs.writeFile(output,JSON.stringify(report,null,2)+'\n'); report.evidenceReport=output; }
  catch(writeError) { report.evidenceWriteError=String(writeError?.message||writeError); }
  console.error(JSON.stringify(report,null,2));
  process.exitCode=1;
});
