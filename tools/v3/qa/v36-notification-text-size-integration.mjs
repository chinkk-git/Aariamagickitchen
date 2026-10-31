import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize,resolve,sep} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.env.GITHUB_WORKSPACE||process.cwd());
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),rel=normalize(pathname.startsWith('/')?pathname.slice(1):pathname);let file=resolve(root,rel||'index.html');if(!file.startsWith(root+sep)&&file!==root)throw Error('path escaped');if((await stat(file)).isDirectory())file=join(file,'index.html');res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('not found');}});
await new Promise(done=>server.listen(4174,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,timeout:15000});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
const page=await context.newPage(),errors=[];page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
try{
  const openRoute=async route=>{
    await page.goto('http://127.0.0.1:4174/?notice='+encodeURIComponent(route),{waitUntil:'domcontentloaded',timeout:10000});
    const welcome=page.locator('#v35-palace-welcome');
    if(await welcome.count()&&await welcome.isVisible()){
      const skip=welcome.locator('.v35-skip');
      if(await skip.count()&&await skip.isVisible())await skip.click({force:true,timeout:3000});
      await welcome.waitFor({state:'detached',timeout:5000});
    }
  };
  await openRoute('/settings/accessibility/text-size');
  await page.locator('[data-aaria-text-size-panel]').waitFor({state:'visible',timeout:10000});
  assert.match(await page.locator('#screen').innerText(),/Settings|Accessibility/);
  assert.ok(!new URL(page.url()).searchParams.has('notice'),'notification destination should be consumed during navigation');
  for(const value of [100,125,150,175,200]){
    const option=page.locator('[data-aaria-text-size-option="'+value+'"]').first();
    await option.click();
    await page.waitForFunction(v=>Number(document.documentElement.style.getPropertyValue('--aaria-text-scale'))===v/100,value,{timeout:3000});
    assert.equal(await option.getAttribute('aria-pressed'),'true',value+'% should be selected');
    const metrics=await option.evaluate(el=>{const r=el.getBoundingClientRect();return{right:r.right,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}});
    assert.ok(metrics.right<=metrics.viewport+2&&metrics.scrollWidth<=metrics.viewport+2,value+'% notification destination has horizontal overflow');
    await openRoute('/settings/notifications');
    const notificationMetrics=await page.locator('#screen').evaluate(el=>({right:el.getBoundingClientRect().right,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    assert.ok(notificationMetrics.right<=notificationMetrics.viewport+2&&notificationMetrics.scrollWidth<=notificationMetrics.viewport+2,value+'% notification settings has horizontal overflow');
    await openRoute('/settings/accessibility/text-size');
  }
  await page.locator('#languageSelect').selectOption('pt-BR');
  await page.getByText('Tamanho do texto',{exact:false}).first().waitFor({state:'visible',timeout:4000});
  await page.locator('#languageSelect').selectOption('en-GB');
  await page.getByText('Text Size',{exact:false}).first().waitFor({state:'visible',timeout:4000});
  await openRoute('/recipes/new/111,112,113,114,115,116');
  const recipeCards=page.locator('#screen [data-open]');
  await page.waitForFunction(()=>document.querySelectorAll('#screen [data-open]').length===6,null,{timeout:6000});
  assert.deepEqual(await recipeCards.evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.open))),[111,112,113,114,115,116],'New Recipes deep link must show exactly the requested recipe IDs');
  assert.ok(!new URL(page.url()).searchParams.has('notice'),'New Recipes notification destination should be consumed');
  await openRoute('/whats-new');
  await page.getByRole('heading',{name:'What’s New'}).waitFor({state:'visible',timeout:5000});
  assert.match(await page.locator('#screen').innerText(),/What.s New/,'What’s New notification destination should open the inbox');
  assert.ok(!new URL(page.url()).searchParams.has('notice'),'What’s New notification destination should be consumed');
  await openRoute('/recipe/112');
  await page.waitForFunction(()=>location.hash.startsWith('#aria/recipe/112/'),null,{timeout:5000});
  assert.match(await page.locator('#screen').innerText(),/Tofu|tofu|Phở|Pho/i,'recipe 112 deep link must show the canonical Tofu & Vegetable Phở detail');
  assert.ok(!new URL(page.url()).searchParams.has('notice'),'recipe 112 notification destination should be consumed');
  await openRoute('/settings/notifications');
  await page.locator('#screen .an-push [data-push-lifecycle="test"]').waitFor({state:'attached',timeout:5000});
  assert.ok(await page.locator('#screen .an-push [data-push-lifecycle="test"]').isHidden(),'Test-send control stays hidden until the Worker and consent adapter are configured');
  for(const viewport of [{width:844,height:390},{width:1024,height:768}]){
    await page.setViewportSize(viewport);
    const metrics=await page.locator('#screen').evaluate(el=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,right:el.getBoundingClientRect().right}));
    assert.ok(metrics.scrollWidth<=metrics.width+2&&metrics.right<=metrics.width+2,`notification interface overflows at ${viewport.width}x${viewport.height}`);
  }
  assert.deepEqual(errors,[],'runtime errors: '+errors.join(' | '));
  console.log('PASS: notification cold-start routes to Text Size (all five scales), exact New Recipes IDs, What’s New and disabled-by-default test-send control in EN-GB/PT-BR.');
}finally{
  await Promise.race([context.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});
  await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});
  server.closeAllConnections?.();await new Promise(resolve=>{const timer=setTimeout(resolve,1000);timer.unref?.();server.close(()=>{clearTimeout(timer);resolve();});});
}
