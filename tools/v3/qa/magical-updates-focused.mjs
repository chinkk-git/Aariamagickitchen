import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize,resolve,sep} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.env.GITHUB_WORKSPACE||process.cwd());
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),rel=normalize(pathname.startsWith('/')?pathname.slice(1):pathname);let file=resolve(root,rel||'index.html');if(!file.startsWith(root+sep)&&file!==root)throw Error('path escaped');if((await stat(file)).isDirectory())file=join(file,'index.html');res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('not found');}});
await new Promise(done=>server.listen(4176,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,timeout:15000});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
const page=await context.newPage(),errors=[];page.setDefaultTimeout(5000);page.setDefaultNavigationTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
const base='http://127.0.0.1:4176/';

async function skipWelcome(){
  const palace=page.locator('#v35-palace-welcome .v35-skip');
  if(await palace.count()&&await palace.isVisible()){await palace.click({force:true});await page.locator('#v35-palace-welcome').waitFor({state:'detached'});return;}
  const legacy=page.getByRole('button',{name:'Skip the opening and enter the selected Home'}).first();
  if(await legacy.count()&&await legacy.isVisible())await legacy.click({force:true});
}
async function visibleBell(){const bell=page.locator('[data-magical-updates-open]').first();await bell.waitFor({state:'visible'});return bell;}
async function assertTouchTarget(){const box=await (await visibleBell()).boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,'bell touch target is below 44 CSS pixels');assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=page.viewportSize().width+1,'bell lies outside the viewport');}
async function assertBesideSettings(selector){const boxes=await page.evaluate(s=>{const a=document.querySelector(s),b=document.querySelector('[data-magical-updates-open]');if(!a||!b)return null;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return{gear:{x:x.x,y:x.y,right:x.right,width:x.width,height:x.height},bell:{x:y.x,y:y.y,right:y.right,width:y.width,height:y.height}}},selector);assert.ok(boxes,`settings gear and bell exist: ${selector}`);assert.ok(boxes.bell.x>=boxes.gear.right-2,'bell must sit directly beside the Settings gear');assert.ok(Math.abs(boxes.bell.y-boxes.gear.y)<12,'bell and Settings gear should share the same header row');}
async function openUpdates(){await (await visibleBell()).click();await page.locator('#screen .mu-page').waitFor({state:'visible'});}
async function goHome(){await page.locator('[data-mu-action="home"]').click();await page.locator('#screen .mu-page').waitFor({state:'detached'});}

try{
  await page.goto(base,{waitUntil:'domcontentloaded'});await skipWelcome();
  await page.locator('#foodWonderland').waitFor({state:'visible'});
  let bell=await visibleBell();await assertTouchTarget();
  await assertBesideSettings('.fw-more .mu-home-settings');
  assert.equal(await bell.getAttribute('aria-label'),'Open Magical Updates, 1 unread');
  assert.equal(await page.locator('[data-magical-updates-badge]').innerText(),'1');
  await page.locator('.fw-more .mu-home-settings').click();
  await page.waitForFunction(()=>location.hash==='#aria/settings');
  await page.evaluate(()=>location.hash='#aria/home');
  await page.locator('#foodWonderland').waitFor({state:'visible'});
  await visibleBell();

  await page.setViewportSize({width:844,height:390});await assertTouchTarget();
  await page.setViewportSize({width:390,height:844});
  await openUpdates();
  assert.equal(await page.locator('.mu-announcement-title').innerText(),'A Magical Trip to Vietnam! 🇻🇳🍜');
  assert.equal(await page.locator('.mu-announcement-body').innerText(),'Ready for a tasty adventure? Discover the new Tofu & Vegetable Phở recipe! ✨');
  assert.equal(await page.locator('.mu-page-mark').getAttribute('src'),'./aaria-pwa-icon-192.png');
  await page.locator('[data-mu-action="toggle-read"]').click();
  assert.equal(await page.locator('[data-mu-read-state]').innerText(),'Read');
  assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.magicalUpdates.read.v1')),'["vietnam-pho-recipe-112"]');
  await goHome();
  assert.ok(await page.locator('[data-magical-updates-badge]').isHidden(),'badge must be hidden once read');
  await openUpdates();
  await page.locator('[data-mu-action="toggle-read"]').click();
  assert.equal(await page.locator('[data-mu-read-state]').innerText(),'Unread');
  await goHome();
  assert.equal(await page.locator('[data-magical-updates-badge]').innerText(),'1','unread state updates immediately');
  await openUpdates();
  await page.locator('[data-mu-action="open-recipe"]').click();
  await page.waitForFunction(()=>location.hash==='#aria/recipe/112/0');
  const recipeTitle=page.locator('#screen h1:visible').filter({hasText:'Tofu & Vegetable Phở'}).first();await recipeTitle.waitFor({state:'visible'});assert.equal((await recipeTitle.innerText()).trim(),'Tofu & Vegetable Phở','Recipe #112 title is visible in the active detail screen');
  assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.magicalUpdates.read.v1')),'["vietnam-pho-recipe-112"]','opening the recipe marks its announcement read');

  await page.evaluate(()=>{localStorage.setItem('aaria.v35.homeExperience','magical');location.hash='#aria/home';});
  await page.reload({waitUntil:'domcontentloaded'});await skipWelcome();
  await page.locator('.v34-home').waitFor({state:'visible'});
  bell=await visibleBell();await assertTouchTarget();
  await assertBesideSettings('.v34-home-utility .v34-settings');
  await page.setViewportSize({width:844,height:390});await assertTouchTarget();await assertBesideSettings('.v34-home-utility .v34-settings');
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.locator('[data-magical-updates-badge]').isHidden(),'read state persists across restart and Home change');
  await page.locator('.v34-home-utility .v34-settings').click();
  await page.waitForFunction(()=>location.hash==='#aria/settings');
  await page.evaluate(()=>location.hash='#aria/home');
  await page.locator('.v34-home').waitFor({state:'visible'});
  await visibleBell();

  await openUpdates();
  assert.equal(await page.locator('[data-mu-read-state]').innerText(),'Read');
  await page.locator('[data-mu-action="toggle-read"]').click();
  assert.equal(await page.locator('[data-mu-read-state]').innerText(),'Unread');
  await goHome();
  assert.equal(await page.locator('[data-magical-updates-badge]').innerText(),'1','same shared count appears on Magical Adventure');
  await page.evaluate(()=>{localStorage.setItem('aaria.v35.homeExperience','wonderland');location.hash='#aria/home';});
  await page.reload({waitUntil:'domcontentloaded'});await skipWelcome();
  await page.locator('#foodWonderland').waitFor({state:'visible'});
  await visibleBell();await assertTouchTarget();
  assert.equal(await page.locator('[data-magical-updates-badge]').innerText(),'1','unread state is shared when switching back to Food Wonderland');
  await openUpdates();await page.locator('[data-mu-action="toggle-read"]').click();
  assert.equal(await page.locator('[data-mu-read-state]').innerText(),'Read');
  await goHome();
  assert.ok(await page.locator('[data-magical-updates-badge]').isHidden(),'read action hides unread count');
  assert.deepEqual(errors,[],'no browser runtime errors');
  console.log('PASS: Magical Updates bell, both Homes, shared unread count, local persistence, official app icon, exact content, responsive touch targets and Recipe #112 navigation.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
