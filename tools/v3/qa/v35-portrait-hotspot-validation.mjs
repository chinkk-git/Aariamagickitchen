import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(process.env.GITHUB_WORKSPACE || process.cwd());
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const rel = normalize(pathname.startsWith('/') ? pathname.slice(1) : pathname);
    let file = resolve(root, rel || 'index.html');
    if (!file.startsWith(root + sep) && file !== root) throw new Error('path escaped root');
    try { if ((await stat(file)).isDirectory()) file = join(file,'index.html'); }
    catch { file = join(root,'index.html'); }
    res.writeHead(200, {'content-type':mime[extname(file)] || 'application/octet-stream','cache-control':'no-store'});
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(done=>server.listen(4173,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const results=[];
try {
  const checks=[
    {name:'Friends illustration',fx:.18,fy:.58,expected:'friends'},
    {name:'Friends sign',fx:.17,fy:.65,expected:'friends'},
    {name:'Planner illustration',fx:.85,fy:.68,expected:'planner'},
    {name:'Planner sign',fx:.85,fy:.73,expected:'planner'}
  ];
  const routeHeadings={friends:'Cook with Friends',family:'Cook with Family',planner:'My magical week',week:'My magical week'};
  for(const check of checks) {
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4173/?recovery=portrait-test#aria/home',{waitUntil:'domcontentloaded'});
    await page.locator('.fw-world').waitFor({state:'visible',timeout:20000});
    const skip=page.getByRole('button',{name:'Skip the opening and enter the selected Home'});
    if(await skip.count()) await skip.click({timeout:10000});
    const img=page.locator('.fw-scene-art img');
    await img.waitFor({state:'visible',timeout:10000});
    const point=await img.evaluate((el,{fx,fy})=>{const r=el.getBoundingClientRect();return{x:r.x+r.width*fx,y:r.y+r.height*fy}},{fx:check.fx,fy:check.fy});
    const hit=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y);const b=el?.closest('.fw-hotspot');return{route:b?.dataset.fw||null,label:b?.getAttribute('aria-label')||null}},point);
    await page.mouse.click(point.x,point.y);
    await page.waitForFunction(()=>location.hash && location.hash!=='#aria/home',{timeout:10000}).catch(()=>{});
    const actualHash=await page.evaluate(()=>location.hash);
    const actualRoute=hit.route;
    const heading=routeHeadings[actualRoute]||null;
    if(heading) await page.getByRole('heading',{name:heading,exact:false}).waitFor({state:'visible',timeout:10000}).catch(()=>{});
    const observedHeadings=await page.locator('h1,h2').allTextContents().catch(()=>[]);
    results.push({check:check.name,expected:check.expected,hitRoute:actualRoute,destinationHash:actualHash,observedHeadings,point:{x:Math.round(point.x),y:Math.round(point.y)},viewport:'390x844 portrait',result:actualRoute===check.expected?'PASS':'FAIL'});
    if(actualRoute!==check.expected) await page.screenshot({path:'/tmp/portrait-hotspot-'+check.expected+'-'+check.name.replaceAll(' ','-')+'.png'});
    await page.close();
  }
  console.log(JSON.stringify({suite:'V3.5 Food Wonderland portrait hotspot clicks',results},null,2));
  const failures=results.filter(r=>r.result!=='PASS');
  if(failures.length) throw new Error('Portrait hotspot mismatches: '+JSON.stringify(failures));
} finally {
  await context.close(); await browser.close(); await new Promise(done=>server.close(done));
}
