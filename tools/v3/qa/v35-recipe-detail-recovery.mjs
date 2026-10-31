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
page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:4173/';
async function skipWelcome(){await page.waitForTimeout(150);const b=page.getByRole('button',{name:'Skip the opening and enter the selected Home'}).first();if(await b.count()&&await b.isVisible())await b.click()}
async function detail(id){await page.locator('#screen .ref-title h1').waitFor({state:'visible',timeout:12000});assert.ok((await page.locator('#screen .ref-title h1').innerText()).trim());assert.ok(await page.locator('#screen .ref-ingredients').count(),`ingredients #${id}`);assert.ok(await page.locator('#screen .ref-tools').count(),`equipment #${id}`);assert.ok(await page.locator('#screen .ref-step-grid').count(),`steps #${id}`);assert.equal(await page.locator('#screen .ref-step-grid .ref-step-card.active').count(),1);assert.equal(await page.locator('.v35-review-banner').count(),0,`internal release banner on #${id}`);const screen=await page.locator('#screen').innerText();assert.doesNotMatch(screen,/DRAFT · NOT RELEASED|REVIEW ONLY|Independent review, safety, accessibility|RASCUNHO · NÃO LANÇADA|SOMENTE PARA REVISÃO|Revisões independentes, segurança, acessibilidade/i,`internal release messaging on #${id}`);return page.evaluate(()=>location.hash)}
try{
 for(const id of [1,12,66,96,99,111,116]){
  console.log('Checking direct recipe',id);
  await page.goto(`${base}#aria/recipe/${id}/0`,{waitUntil:'load'});
  await skipWelcome();
  try { assert.equal(await detail(id),`#aria/recipe/${id}/0`); }
  catch(error) {
    const snapshot=await page.evaluate(()=>({url:location.href,hash:location.hash,screen:document.querySelector('#screen')?.innerText.slice(0,900),welcome:!!document.getElementById('v35-palace-welcome')}));
    console.error('Recipe detail diagnostic',JSON.stringify({id,snapshot,errors}));
    throw error;
  }
  if(id===12){await page.locator('#screen [data-action="nextstep"]').click();await page.waitForFunction(()=>document.querySelector('#screen .ref-step-grid .ref-step-card.active .ref-step-title')?.dataset.step==='1');await page.locator('#screen [data-action="prevstep"]').click();await page.waitForFunction(()=>document.querySelector('#screen .ref-step-grid .ref-step-card.active .ref-step-title')?.dataset.step==='0')}}
 await page.goto(base,{waitUntil:'load'});await skipWelcome();await page.getByRole('button',{name:'Explore All Recipes'}).click();await page.getByText('116 magical recipes to explore',{exact:true}).waitFor({state:'visible',timeout:10000});await page.locator('#screen button[data-open="66"]').click();await detail(66);await page.locator('#screen [data-action="favorite"]').click();await page.locator('.bottom .tab[data-nav="library"]').click();await page.locator('#screen button[data-filter="Favorites"]').click();await page.locator('#screen button[data-open="66"]').waitFor({state:'visible'});await page.locator('#screen button[data-open="66"]').click();await detail(66);
 await page.locator('.bottom .tab[data-nav="world"]').click();await page.getByRole('button',{name:'India',exact:true}).click();await page.getByRole('button',{name:/Open recipe: Masala Cheese Toast/}).click();await detail(51);
 await page.goto(base+'?install=1',{waitUntil:'load'});await page.getByRole('button',{name:'Continue in Browser'}).click();await page.waitForFunction(()=>!new URLSearchParams(location.search).has('install'));await skipWelcome();await page.getByRole('button',{name:'Explore All Recipes'}).click();await page.getByText('116 magical recipes to explore',{exact:true}).waitFor({state:'visible',timeout:10000});
 await page.goto(base+'#aria/recipe/96/0',{waitUntil:'load'});await skipWelcome();await page.locator('#languageSelect').selectOption('pt-BR');await detail(96);assert.doesNotMatch(await page.locator('#screen').innerText(),/RASCUNHO · NÃO LANÇADA|SOMENTE PARA REVISÃO|Revisões independentes, segurança, acessibilidade/i);
 await page.evaluate(()=>localStorage.setItem('aaria.v35.homeExperience','magical'));await page.goto(base,{waitUntil:'load'});await skipWelcome();await page.locator('#screen .home-book-primary').waitFor({state:'visible',timeout:10000});await page.locator('#languageSelect').selectOption('en-GB');await page.getByText('Browse all 116 magical recipes',{exact:true}).waitFor({state:'visible',timeout:10000});await page.locator('#languageSelect').selectOption('pt-BR');await page.getByText('Explore todas as 116 receitas mágicas',{exact:true}).waitFor({state:'visible',timeout:10000});
 assert.deepEqual(errors,[],`recipe exceptions: ${errors.join(' | ')}`);
 console.log('Recipe recovery browser checks passed: direct IDs 001/012/066/096/099/111/116, ingredient/equipment/step panels, Next/Back, All Recipes, Favorites, World country recipe list, and install continuation.');
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done))}
