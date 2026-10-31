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
page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>console.error('Unexpected download',d.url(),d.suggestedFilename()));
const base='http://127.0.0.1:4173/';
async function skipWelcome(){await page.waitForTimeout(150);const b=page.getByRole('button',{name:'Skip the opening and enter the selected Home'}).first();if(await b.count()&&await b.isVisible())await b.click()}
async function openSettings(){await page.locator('button[data-nav="settings"]').first().evaluate(el=>el.click());await page.locator('[data-aaria-text-size-panel]').waitFor({state:'visible',timeout:10000})}
async function setSize(value){await page.locator('[data-aaria-text-size-option="'+value+'"]').click();await page.waitForFunction(v=>Number(document.documentElement.style.getPropertyValue('--aaria-text-scale'))===v/100,value)}
async function fontSize(selector){return page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))}
async function assertNoClippedText(){
 const clipped=await page.evaluate(()=>Array.from(document.querySelectorAll('#screen [data-aaria-text-size],#install-link-gate [data-aaria-text-size]')).filter(el=>{
  if(!el.getClientRects().length)return false;
  const cs=getComputedStyle(el);
  return (cs.overflowY==='hidden'||cs.overflowY==='clip'||cs.overflowX==='hidden'||cs.overflowX==='clip') && (el.scrollHeight>el.clientHeight+3 || el.scrollWidth>el.clientWidth+3);
 }).slice(0,12).map(el=>({tag:el.tagName,text:(el.innerText||el.value||'').trim().slice(0,80),scroll:[el.scrollWidth,el.scrollHeight],client:[el.clientWidth,el.clientHeight]})));
 assert.deepEqual(clipped,[], 'text clipped at current size: '+JSON.stringify(clipped));
 const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 assert.ok(width.scroll<=width.client+2,'horizontal page overflow: '+JSON.stringify(width));
}
async function checkScreen(selector,label){
 await page.locator(selector).first().waitFor({state:'visible',timeout:10000});
 const px=await fontSize(selector);
 assert.ok(px>0,label+' readable text has no measured font');
 await assertNoClippedText();
 return px;
}
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});await skipWelcome();await openSettings();
 const widths=[{name:'phone portrait',width:390,height:844},{name:'phone landscape',width:844,height:390},{name:'tablet portrait',width:768,height:1024},{name:'tablet landscape',width:1024,height:768}];
 for(const viewport of widths){
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  await page.goto(base,{waitUntil:'load'});await skipWelcome();await openSettings();
  const baseline=await fontSize('#screen .home-subpage h1');
  for(const value of [100,125,150,175,200]){
   await setSize(value);
   const measured=await fontSize('#screen .home-subpage h1');
   assert.ok(measured>=baseline*(value/100)-0.75,viewport.name+' settings heading did not scale at '+value+'% ('+baseline+' → '+measured+')');
   assert.equal(await page.locator('[data-aaria-text-size-option="'+value+'"]').getAttribute('aria-pressed'),'true');
   if(value===175||value===200)await assertNoClippedText();
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.accessibility.textSize.v1')),'200','preference was not saved');
  await page.reload({waitUntil:'load'});await skipWelcome();await openSettings();
  assert.ok(Math.abs(await fontSize('#screen .home-subpage h1')-baseline*2)<1,'saved 200% preference did not restore');
  await setSize(100);
 }
 // PT-BR labels and UI selection remain localized; returning to EN updates the same settings panel.
 await page.locator('#languageSelect').selectOption('pt-BR');await page.locator('[data-aaria-text-size-panel] h2').getByText('Acessibilidade').waitFor({state:'visible'});
 assert.ok(await page.locator('[data-aaria-text-size-panel]').innerText().then(t=>t.includes('Tamanho do texto')));
 await page.locator('#languageSelect').selectOption('en-GB');await page.locator('[data-aaria-text-size-panel] h2').getByText('Accessibility').waitFor({state:'visible'});
 // Exercise global scaling on representative navigation, recipe, planner, creation and install screens at larger sizes.
 await setSize(175);
 await page.locator('.bottom .tab[data-nav="home"]').evaluate(el=>el.click());await checkScreen('#screen h1','Home');
 await page.locator('.bottom .tab[data-nav="library"]').evaluate(el=>el.click());await checkScreen('#screen h1','Recipe library');
 await page.goto(base+'#aria/recipe/12/0',{waitUntil:'load'});await skipWelcome();await page.locator('#screen .ref-title h1').waitFor({state:'visible'});await checkScreen('#screen .ref-title h1','Recipe detail');
 await page.locator('.bottom .tab[data-nav="world"]').evaluate(el=>el.click());await checkScreen('#screen h1','World Adventure');
 await page.locator('.bottom .tab[data-nav="week"]').evaluate(el=>el.click());await checkScreen('#screen h1','Planner');
 await page.locator('.bottom .tab[data-nav="creations"]').evaluate(el=>el.click());await checkScreen('#screen h1','My Creations');
 await page.locator('.bottom .tab[data-nav="home"]').click();await openSettings();await setSize(200);await checkScreen('#screen .home-subpage h1','Settings');
 await page.goto(base+'?install=1',{waitUntil:'load'});await page.locator('#install-link-gate:not([hidden])').waitFor({state:'visible'});await checkScreen('#install-link-title','Installation screen');
 await page.locator('#install-link-continue').click();await page.waitForFunction(()=>!new URLSearchParams(location.search).has('install'));await skipWelcome();await openSettings();await assertNoClippedText();
 await page.locator('[data-aaria-text-size-reset]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.accessibility.textSize.v1')),'100');
 assert.deepEqual(errors,[],'browser exceptions: '+errors.join(' | '));
 console.log('Global text-size checks passed: 100/125/150/175/200%, EN-GB/PT-BR, local persistence and reset, Home, Recipes, recipe detail, World Adventure, Planner, My Creations, Settings, installation screen, four phone/tablet portrait/landscape viewports, no checked text clipping or horizontal overflow.');
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done))}
