import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize,resolve,sep} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=resolve(process.env.GITHUB_WORKSPACE||process.cwd());
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};

const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),rel=normalize(pathname.startsWith('/')?pathname.slice(1):pathname);let file=resolve(root,rel||'index.html');if(!file.startsWith(root+sep)&&file!==root)throw Error('path escaped');if((await stat(file)).isDirectory())file=join(file,'index.html');const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404);res.end('not found')}});
await new Promise(done=>server.listen(4173,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,timeout:15000}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
page.setDefaultTimeout(4000);page.setDefaultNavigationTimeout(8000);page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:4173/';
async function check(label){console.log('CHECK: '+label)}
async function bounded(label,operation,ms=5000){await check(label+' started');let timer;try{const result=await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('TIMEOUT: '+label+' after '+ms+'ms')),ms)})]);await check(label+' completed');return result}finally{clearTimeout(timer)}}
async function skipWelcome(){await check('inspect welcome skip');const b=page.getByRole('button',{name:'Skip the opening and enter the selected Home'}).first();if(await b.count()&&await b.isVisible())await b.click({force:true,timeout:3000});await check('welcome skip completed')}
async function settings(navigate=true){if(navigate){await bounded('Settings navigation action',async()=>{const hotspot=page.locator('.fw-dest-settings:visible').last();if(await hotspot.count())return hotspot.click({force:true,timeout:3000});return page.locator('button.home-settings:visible').last().click({force:true,timeout:3000})});await bounded('Settings route/hash update',()=>page.waitForFunction(()=>location.hash==='#aria/settings',undefined,{timeout:4000}))}else{await bounded('Settings route/hash on startup',()=>page.waitForFunction(()=>location.hash==='#aria/settings',undefined,{timeout:4000}))}await bounded('Settings screen rendering',()=>page.locator('#screen .home-subpage h1').waitFor({state:'visible',timeout:4000}));await bounded('Text Size panel visibility',()=>page.locator('[data-aaria-text-size-panel]').waitFor({state:'visible',timeout:4000}))}
async function size(value){await page.locator('[data-aaria-text-size-option="'+value+'"]').click({timeout:3000});await page.waitForFunction(v=>Number(document.documentElement.style.getPropertyValue('--aaria-text-scale'))===v/100,value,{timeout:2000})}
async function nav(id){await page.locator('.bottom .tab[data-nav="'+id+'"]').evaluate(el=>el.click())}
async function text(selector,label,clip=false){const el=page.locator(selector).first();await el.waitFor({state:'visible',timeout:4000});const d=await el.evaluate(n=>{const s=getComputedStyle(n);return{font:parseFloat(s.fontSize),sh:n.scrollHeight,ch:n.clientHeight,sw:n.scrollWidth,cw:n.clientWidth,ox:s.overflowX,oy:s.overflowY}});assert.ok(d.font>0,label+' has no font size');if(clip)assert.ok(!(((d.ox==='hidden'||d.ox==='clip')&&d.sw>d.cw+3)||((d.oy==='hidden'||d.oy==='clip')&&d.sh>d.ch+3)),label+' clipped '+JSON.stringify(d));return d.font}
try{
 await check('load Settings and exercise five choices');
 await bounded('page startup',()=>page.goto(base,{waitUntil:'domcontentloaded',timeout:8000}),10000);await skipWelcome();await settings(true);
 const original=await text('#screen .home-subpage h1','Settings heading');
 for(const n of [100,125,150,175,200]){await size(n);const f=await text('#screen .home-subpage h1','Settings '+n+'%',n>=175);assert.ok(f>=original*n/100-.75,n+'% failed to scale: '+f);assert.equal(await page.locator('[data-aaria-text-size-option="'+n+'"]').getAttribute('aria-pressed'),'true')}
 assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.accessibility.textSize.v1')),'200');
 await check('reload and restore saved 200% choice');
 await bounded('saved-preference page reload',()=>page.reload({waitUntil:'domcontentloaded',timeout:8000}),10000);await skipWelcome();await settings(false);assert.ok(Math.abs(await text('#screen .home-subpage h1','restored 200%')-original*2)<1);
 await check('EN-GB and PT-BR labels');
 await page.locator('#languageSelect').selectOption('pt-BR');await page.getByText('Acessibilidade',{exact:true}).waitFor({state:'visible',timeout:4000});assert.ok((await page.locator('[data-aaria-text-size-panel]').innerText()).includes('Tamanho do texto'));
 await page.locator('#languageSelect').selectOption('en-GB');await page.getByText('Accessibility',{exact:true}).waitFor({state:'visible',timeout:4000});
 await check('critical screens and recipe detail at 200%; clipping at 175/200');
 await size(200);await nav('home');await text('#screen h1','Home',true);
 await nav('library');await text('#screen h1','Recipe library',true);
 await bounded('recipe route startup',()=>page.goto(base+'#aria/recipe/12/0',{waitUntil:'domcontentloaded',timeout:8000}),10000);await skipWelcome();
 await text('#screen .ref-title h1','Recipe title 200%',true);await text('#screen .ref-ingredients','Recipe ingredients 200%',true);await text('#screen .ref-tools','Recipe equipment 200%',true);await text('#screen .ref-step-grid','Recipe steps 200%',true);
 await size(175);await text('#screen .ref-title h1','Recipe title 175%',true);await size(200);
 await nav('world');await text('#screen h1','World Adventure',true);await nav('week');await text('#screen h1','Planner',true);await nav('creations');await text('#screen h1','My Creations',true);
 await nav('home');await settings();await text('#screen .home-subpage h1','Settings 200%',true);
 await check('phone portrait and landscape');
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);await size(175);await text('#screen .home-subpage h1','Phone landscape 175%',true);await size(200);await text('#screen .home-subpage h1','Phone landscape 200%',true);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
 assert.deepEqual(errors,[],'runtime errors '+errors.join(' | '));await check('PASS');
 console.log('PASS: five values, saved preference, EN/PT, Home/Recipes/Recipe/World/Planner/Creations/Settings, phone portrait/landscape, recipe clipping at 175%/200%.');
}finally{await Promise.race([context.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});server.closeAllConnections?.();await new Promise(resolve=>{const timer=setTimeout(resolve,1000);timer.unref?.();server.close(()=>{clearTimeout(timer);resolve()})})}
