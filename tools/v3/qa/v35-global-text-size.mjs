import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize,resolve,sep} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=resolve(process.env.GITHUB_WORKSPACE||process.cwd());
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),rel=normalize(pathname.startsWith('/')?pathname.slice(1):pathname);let file=resolve(root,rel||'index.html');if(!file.startsWith(root+sep)&&file!==root)throw Error('path escaped');if((await stat(file)).isDirectory())file=join(file,'index.html');const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404);res.end('not found')}});
await new Promise(done=>server.listen(4173,'127.0.0.1',done));
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
page.setDefaultTimeout(5000);page.setDefaultNavigationTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:4173/';
async function skipWelcome(){await page.waitForTimeout(120);const b=page.getByRole('button',{name:'Skip the opening and enter the selected Home'}).first();if(await b.count()&&await b.isVisible())await b.click()}
async function openSettings(){await page.locator('button[data-nav="settings"]').first().evaluate(el=>el.click());await page.locator('[data-aaria-text-size-panel]').waitFor({state:'visible'})}
async function setSize(value){await page.locator('[data-aaria-text-size-option="'+value+'"]').evaluate(el=>el.click());await page.waitForFunction(v=>Number(document.documentElement.style.getPropertyValue('--aaria-text-scale'))===v/100,value,{timeout:4000})}
async function nav(id){await page.locator('.bottom .tab[data-nav="'+id+'"]').evaluate(el=>el.click())}
async function fontSize(selector){return page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))}
async function assertLayout(label){
 const data=await page.evaluate(()=>{const selectors='#screen h1,#screen h2,#screen p,#screen button,#screen label,#install-link-gate h1,#install-link-gate p,#install-link-gate button';const clipped=Array.from(document.querySelectorAll(selectors)).filter(el=>el.getClientRects().length).filter(el=>{const s=getComputedStyle(el);return(s.overflow==='hidden'||s.overflow==='clip'||s.overflowX==='hidden'||s.overflowY==='hidden'||s.overflowX==='clip'||s.overflowY==='clip')&&(el.scrollWidth>el.clientWidth+3||el.scrollHeight>el.clientHeight+3)}).map(el=>(el.innerText||'').trim().slice(0,50)).filter(Boolean).slice(0,8);return{clipped,width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}});
 assert.deepEqual(data.clipped,[],label+' clipped essential text '+JSON.stringify(data.clipped));
 assert.ok(data.width<=data.client+2,label+' horizontal overflow '+JSON.stringify(data));
}
try{
 console.log('Load app and verify five text sizes');
 await page.goto(base,{waitUntil:'domcontentloaded'});await skipWelcome();await openSettings();
 const initial=await fontSize('#screen .home-subpage h1');
 for(const size of [100,125,150,175,200]){
  await setSize(size);const actual=await fontSize('#screen .home-subpage h1');
  assert.ok(actual>=initial*(size/100)-0.75,'setting '+size+'% produces '+actual+'px from '+initial+'px');
  assert.equal(await page.locator('[data-aaria-text-size-option="'+size+'"]').getAttribute('aria-pressed'),'true');
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.accessibility.textSize.v1')),'200');
 await page.reload({waitUntil:'domcontentloaded'});await skipWelcome();await openSettings();
 assert.ok(Math.abs(await fontSize('#screen .home-subpage h1')-initial*2)<1,'saved 200% preference did not restore');
 console.log('Verify rotation, tablet layouts and language labels');
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:768,height:1024},{width:1024,height:768}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(180);
  await setSize(175);assertLayout('175% viewport '+viewport.width+'x'+viewport.height);
  await setSize(200);assertLayout('200% viewport '+viewport.width+'x'+viewport.height);
 }
 await page.locator('#languageSelect').selectOption('pt-BR');await page.locator('[data-aaria-text-size-panel] h2').getByText('Acessibilidade').waitFor({state:'visible'});
 assert.ok((await page.locator('[data-aaria-text-size-panel]').innerText()).includes('Tamanho do texto'));
 await page.locator('#languageSelect').selectOption('en-GB');await page.locator('[data-aaria-text-size-panel] h2').getByText('Accessibility').waitFor({state:'visible'});
 console.log('Verify global scaling in app screens and install flow');
 await setSize(200);
 await nav('home');await page.locator('#screen h1').first().waitFor({state:'visible'});assertLayout('Home');
 await nav('library');await page.locator('#screen h1').first().waitFor({state:'visible'});assertLayout('Recipe library');
 await page.goto(base+'#aria/recipe/12/0',{waitUntil:'domcontentloaded'});await skipWelcome();await page.locator('#screen .ref-title h1').waitFor({state:'visible'});assertLayout('Recipe detail');
 await nav('world');await page.locator('#screen h1').first().waitFor({state:'visible'});assertLayout('World Adventure');
 await nav('week');await page.locator('#screen h1').first().waitFor({state:'visible'});assertLayout('Planner');
 await nav('creations');await page.locator('#screen h1').first().waitFor({state:'visible'});assertLayout('My Creations');
 await nav('home');await openSettings();assertLayout('Settings');
 await page.goto(base+'?install=1',{waitUntil:'domcontentloaded'});await page.locator('#install-link-gate:not([hidden])').waitFor({state:'visible'});assertLayout('Installation');
 await page.locator('#install-link-continue').evaluate(el=>el.click());await page.waitForFunction(()=>!new URLSearchParams(location.search).has('install'),null,{timeout:4000});await skipWelcome();
 await openSettings();await page.locator('[data-aaria-text-size-reset]').evaluate(el=>el.click());
 assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.accessibility.textSize.v1')),'100');
 assert.deepEqual(errors,[],'browser exceptions: '+errors.join(' | '));
 console.log('PASS: 5 sizes, EN/PT, saved preference/reset, four phone/tablet portrait/landscape sizes, Home, Recipes, recipe detail, World, Planner, My Creations, Settings and installation; no checked clipping or horizontal overflow.');
}finally{await context.close();await browser.close();server.closeAllConnections?.();await new Promise(done=>server.close(done))}
