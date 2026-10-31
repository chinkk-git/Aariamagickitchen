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
page.setDefaultTimeout(6000);page.setDefaultNavigationTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:4173/';
async function skipWelcome(){await page.waitForTimeout(150);const b=page.getByRole('button',{name:'Skip the opening and enter the selected Home'}).first();if(await b.count()&&await b.isVisible())await b.click()}
async function openSettings(){await page.locator('button[data-nav="settings"]').first().evaluate(el=>el.click());await page.locator('[data-aaria-text-size-panel]').waitFor({state:'visible'})}
async function setSize(value){await page.locator('[data-aaria-text-size-option="'+value+'"]').click();await page.waitForFunction(v=>Number(document.documentElement.style.getPropertyValue('--aaria-text-scale'))===v/100,value)}
async function fontSize(selector){return page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))}
async function assertLayout(label){
 const result=await page.evaluate(()=>{const clipped=Array.from(document.querySelectorAll('#screen [data-aaria-text-size],#install-link-gate [data-aaria-text-size]')).filter(el=>{if(!el.getClientRects().length)return false;const cs=getComputedStyle(el);return (cs.overflowY==='hidden'||cs.overflowY==='clip'||cs.overflowX==='hidden'||cs.overflowX==='clip')&&(el.scrollHeight>el.clientHeight+3||el.scrollWidth>el.clientWidth+3)}).slice(0,8).map(el=>({text:(el.innerText||'').trim().slice(0,60),scroll:[el.scrollWidth,el.scrollHeight],client:[el.clientWidth,el.clientHeight]}));return{clipped,width:[document.documentElement.scrollWidth,document.documentElement.clientWidth]}});
 assert.deepEqual(result.clipped,[],label+' clipped readable text '+JSON.stringify(result.clipped));
 assert.ok(result.width[0]<=result.width[1]+2,label+' horizontal overflow '+JSON.stringify(result.width));
}
async function nav(id){await page.locator('.bottom .tab[data-nav="'+id+'"]').evaluate(el=>el.click())}
try{
 console.log('Load app and open Accessibility settings');
 await page.goto(base,{waitUntil:'domcontentloaded'});await skipWelcome();await openSettings();
 const baseFont=await fontSize('#screen .home-subpage h1');
 for(const value of [100,125,150,175,200]){
  await setSize(value);const measured=await fontSize('#screen .home-subpage h1');
  assert.ok(measured>=baseFont*(value/100)-0.75,'heading not scaled at '+value+'% ('+baseFont+' → '+measured+')');
  assert.equal(await page.locator('[data-aaria-text-size-option="'+value+'"]').getAttribute('aria-pressed'),'true');
 }
 console.log('Check size persistence and responsive viewport changes');
 assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.accessibility.textSize.v1')),'200');
 await page.reload({waitUntil:'domcontentloaded'});await skipWelcome();await openSettings();
 assert.ok(Math.abs(await fontSize('#screen .home-subpage h1')-baseFont*2)<1,'saved 200% preference did not restore');
 for(const viewport of [{name:'phone portrait',width:390,height:844},{name:'phone landscape',width:844,height:390},{name:'tablet portrait',width:768,height:1024},{name:'tablet landscape',width:1024,height:768}]){
  await page.setViewportSize({width:viewport.width,height:viewport.height});await page.waitForTimeout(200);
  for(const value of [175,200]){await setSize(value);await assertLayout(viewport.name+' '+value+'%')}
 }
 await setSize(100);
 console.log('Check EN-GB and PT-BR settings labels');
 await page.locator('#languageSelect').selectOption('pt-BR');await page.locator('[data-aaria-text-size-panel] h2').getByText('Acessibilidade').waitFor({state:'visible'});
 assert.ok((await page.locator('[data-aaria-text-size-panel]').innerText()).includes('Tamanho do texto'));
 await page.locator('#languageSelect').selectOption('en-GB');await page.locator('[data-aaria-text-size-panel] h2').getByText('Accessibility').waitFor({state:'visible'});
 console.log('Check large text across app sections and installation screen');
 await setSize(200);await nav('home');await page.locator('#screen h1').first().waitFor({state:'visible'});await assertLayout('Home');
 await nav('library');await page.locator('#screen h1').first().waitFor({state:'visible'});await assertLayout('Recipe library');
 await page.goto(base+'#aria/recipe/12/0',{waitUntil:'domcontentloaded'});await skipWelcome();await page.locator('#screen .ref-title h1').waitFor({state:'visible'});await assertLayout('Recipe detail');
 await nav('world');await page.locator('#screen h1').first().waitFor({state:'visible'});await assertLayout('World Adventure');
 await nav('week');await page.locator('#screen h1').first().waitFor({state:'visible'});await assertLayout('Planner');
 await nav('creations');await page.locator('#screen h1').first().waitFor({state:'visible'});await assertLayout('My Creations');
 await nav('home');await openSettings();await assertLayout('Settings');
 await page.goto(base+'?install=1',{waitUntil:'domcontentloaded'});await page.locator('#install-link-gate:not([hidden])').waitFor({state:'visible'});await assertLayout('Installation screen');
 await page.locator('#install-link-continue').click();await page.waitForFunction(()=>!new URLSearchParams(location.search).has('install'));await skipWelcome();await nav('home');
 await page.locator('button[data-nav="settings"]').first().evaluate(el=>el.click());await page.locator('[data-aaria-text-size-panel]').waitFor({state:'visible'});
 await page.locator('[data-aaria-text-size-reset]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.accessibility.textSize.v1')),'100');
 assert.deepEqual(errors,[],'browser exceptions: '+errors.join(' | '));
 console.log('PASS: text sizes 100/125/150/175/200, local persistence/reset, EN/PT, Home, Recipes, recipe detail, World, Planner, Creations, Settings, installation, phone/tablet portrait/landscape, no detected text clipping or horizontal overflow.');
}finally{await context.close();await browser.close();server.closeAllConnections?.();await new Promise(done=>server.close(done))}
