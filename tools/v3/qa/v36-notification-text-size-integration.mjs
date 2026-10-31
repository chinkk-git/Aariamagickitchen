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
  await page.goto('http://127.0.0.1:4174/?notice=%2Fsettings%2Faccessibility%2Ftext-size',{waitUntil:'domcontentloaded',timeout:10000});
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
  }
  await page.locator('#languageSelect').selectOption('pt-BR');
  await page.getByText('Tamanho do texto',{exact:false}).first().waitFor({state:'visible',timeout:4000});
  await page.locator('#languageSelect').selectOption('en-GB');
  await page.getByText('Text Size',{exact:false}).first().waitFor({state:'visible',timeout:4000});
  assert.deepEqual(errors,[],'runtime errors: '+errors.join(' | '));
  console.log('PASS: notification cold-start opens Text Size settings, consumes the route, supports all five scales and EN-GB/PT-BR.');
}finally{
  await Promise.race([context.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});
  await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});
  server.closeAllConnections?.();await new Promise(resolve=>{const timer=setTimeout(resolve,1000);timer.unref?.();server.close(()=>{clearTimeout(timer);resolve();});});
}
