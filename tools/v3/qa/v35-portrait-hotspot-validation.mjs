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
    {name:'Friends illustration',fx:.18,fy:.58,expected:'friends',heading:'Cook with Friends'},
    {name:'Friends sign',fx:.17,fy:.65,expected:'friends',heading:'Cook with Friends'},
    {name:'Planner illustration',fx:.85,fy:.68,expected:'planner',heading:'My magical week'},
    {name:'Planner sign',fx:.85,fy:.73,expected:'planner',heading:'My magical week'}
  ];
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
    if(hit.route!==check.expected){
      await page.screenshot({path:'/tmp/portrait-hotspot-'+check.expected+'-'+check.name.replaceAll(' ','-')+'.png'});
      throw new Error(check.name+': expected '+check.expected+', actual hit '+JSON.stringify(hit));
    }
    await page.mouse.click(point.x,point.y);
    await page.getByRole('heading',{name:check.heading,exact:false}).waitFor({state:'visible',timeout:10000});
    results.push({check:check.name,result:'PASS',route:hit.route,destination:check.heading,viewport:'390x844 portrait'});
    await page.close();
  }
  console.log(JSON.stringify({suite:'V3.5 Food Wonderland portrait hotspot clicks',result:'PASS',results},null,2));
} finally {
  await context.close(); await browser.close(); await new Promise(done=>server.close(done));
}
