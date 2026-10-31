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
async function bounded(label,operation,ms=5000){await check(label+' started');let timer;try{const result=await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('TIMEOUT: '+label+' after '+ms+'ms')),ms)})]);await check(label+' completed');return result}catch(error){if(label==='Settings screen rendering'){const diag=await Promise.race([page.evaluate(()=>({hash:location.hash,view:typeof view==='undefined'?null:view,screenText:document.querySelector('#screen')?.innerText?.slice(0,1200),screenHtml:document.querySelector('#screen')?.innerHTML?.slice(0,1800),appInert:document.querySelector('.app')?.hasAttribute('inert'),welcome:!!document.querySelector('#v35-palace-welcome')})).catch(e=>({diagnosticError:e.message})),new Promise(resolve=>setTimeout(()=>resolve({diagnosticError:'diagnostic evaluate timed out after 1000ms'}),1000))]);console.log('DIAGNOSTIC: '+JSON.stringify({pageUrl:page.url(),pageErrors:errors,dom:diag}));}throw error}finally{clearTimeout(timer)}}
async function skipWelcome(){await check('inspect Palace Welcome skip');const current=page.locator('#v35-palace-welcome .v35-skip');if(await current.count()&&await current.isVisible()){await bounded('Palace Welcome Skip action',()=>current.click({force:true,timeout:3000}));await bounded('Palace Welcome dismissal',()=>page.locator('#v35-palace-welcome').waitFor({state:'detached',timeout:4000}))}else{const legacy=page.getByRole('button',{name:'Skip the opening and enter the selected Home'}).first();if(await legacy.count()&&await legacy.isVisible())await bounded('Legacy welcome skip action',()=>legacy.click({force:true,timeout:3000}))}await check('welcome skip completed')}
async function settings(){await bounded('Settings route navigation',()=>page.goto(base+'#aria/settings',{waitUntil:'domcontentloaded',timeout:8000}),10000);await bounded('Settings route/hash assertion',()=>assert.equal(new URL(page.url()).hash,'#aria/settings','Settings route hash mismatch'));await bounded('Settings screen rendering',()=>page.locator('#screen .home-subpage h1').waitFor({state:'visible',timeout:4000}));await bounded('Text Size panel visibility',()=>page.locator('[data-aaria-text-size-panel]').waitFor({state:'visible',timeout:4000}))}
async function size(value){await page.locator('[data-aaria-text-size-option="'+value+'"]').click({timeout:3000});await page.waitForFunction(v=>Number(document.documentElement.style.getPropertyValue('--aaria-text-scale'))===v/100,value,{timeout:2000})}
async function nav(id){await page.locator('.bottom .tab[data-nav="'+id+'"]').evaluate(el=>el.click())}
async function text(selector,label,clip=false){const el=page.locator(selector).first();await el.waitFor({state:'visible',timeout:4000});const d=await el.evaluate(n=>{const s=getComputedStyle(n);return{font:parseFloat(s.fontSize),sh:n.scrollHeight,ch:n.clientHeight,sw:n.scrollWidth,cw:n.clientWidth,ox:s.overflowX,oy:s.overflowY}});assert.ok(d.font>0,label+' has no font size');if(clip)assert.ok(!(((d.ox==='hidden'||d.ox==='clip')&&d.sw>d.cw+3)||((d.oy==='hidden'||d.oy==='clip')&&d.sh>d.ch+3)),label+' clipped '+JSON.stringify(d));return d.font}
try{
 await check('load Settings and exercise five choices');
 await bounded('page startup',()=>page.goto(base,{waitUntil:'domcontentloaded',timeout:8000}),10000);await skipWelcome();await settings();
 const original=await text('#screen .home-subpage h1','Settings heading');
 for(const n of [100,125,150,175,200]){await size(n);const f=await text('#screen .home-subpage h1','Settings '+n+'%',n>=175);assert.ok(f>=original*n/100-.75,n+'% failed to scale: '+f);assert.equal(await page.locator('[data-aaria-text-size-option="'+n+'"]').getAttribute('aria-pressed'),'true')}
 assert.equal(await page.evaluate(()=>localStorage.getItem('aaria.accessibility.textSize.v1')),'200');
 await check('reload and restore saved 200% choice');
 await bounded('saved-preference page reload',()=>page.reload({waitUntil:'domcontentloaded',timeout:8000}),10000);await skipWelcome();await settings();assert.ok(Math.abs(await text('#screen .home-subpage h1','restored 200%')-original*2)<1);
 await check('EN-GB and PT-BR labels');
 await page.locator('#languageSelect').selectOption('pt-BR');await page.getByText('Acessibilidade',{exact:true}).waitFor({state:'visible',timeout:4000});assert.ok((await page.locator('[data-aaria-text-size-panel]').innerText()).includes('Tamanho do texto'));
 await page.locator('#languageSelect').selectOption('en-GB');await page.getByText('Accessibility',{exact:true}).waitFor({state:'visible',timeout:4000});
 await check('critical screens and recipe detail at 200%; clipping at 175/200');
 await size(100);await nav('home');await page.locator('#foodWonderland').waitFor({state:'visible',timeout:4000});const artworkAt100=await page.locator('#foodWonderland .fw-scene-art img').evaluate(img=>{const r=img.getBoundingClientRect();return{width:r.width,height:r.height}});await settings();await size(200);await nav('home');await page.locator('#foodWonderland').waitFor({state:'visible',timeout:4000});const artworkAt200=await page.locator('#foodWonderland .fw-scene-art img').evaluate(img=>{const r=img.getBoundingClientRect();return{width:r.width,height:r.height}});assert.ok(Math.abs(artworkAt200.width-artworkAt100.width)<1&&Math.abs(artworkAt200.height-artworkAt100.height)<1,'Text scaling changed Food Wonderland artwork dimensions');await check('Home visible and scene artwork unchanged at 100%/200%');
 await nav('library');await text('#screen .topbar h2','Recipe library',true);const recipeIds=await page.locator('.recipe-card[data-open]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-open'))));assert.equal(new Set(recipeIds).size,116,'canonical catalogue IDs');assert.equal(recipeIds.length,116,'recipe cards available');
 await check('All Recipes filters: five sizes, EN/PT, phone/tablet portrait and landscape');
 const filterViewports=[{name:'phone portrait',width:390,height:844},{name:'phone landscape',width:844,height:390},{name:'tablet portrait',width:800,height:1280},{name:'tablet landscape',width:1280,height:800}];
 for(const language of ['en-GB','pt-BR']){
   await page.locator('#languageSelect').selectOption(language);
   for(const n of [100,125,150,175,200]){
     await settings();await size(n);await nav('library');await page.locator('.filters').waitFor({state:'visible',timeout:4000});
     for(const v of filterViewports){
       await page.setViewportSize({width:v.width,height:v.height});
       const d=await page.locator('.filters').evaluate(track=>{
         const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{w:r.width,h:r.height,font:parseFloat(s.fontSize),whiteSpace:s.whiteSpace,flexShrink:s.flexShrink,scrollW:e.scrollWidth,clientW:e.clientWidth,scrollH:e.scrollHeight,clientH:e.clientHeight}};
         const chips=[...track.querySelectorAll(':scope > .chip')].map(box);
         const sky=document.querySelector('.app:has(.filters) .enchanted-sky'),screen=document.querySelector('.app:has(.filters) #screen');
         return{trackH:track.getBoundingClientRect().height,trackScrollW:track.scrollWidth,trackClientW:track.clientWidth,chips,skyZ:sky?getComputedStyle(sky).zIndex:null,skyPointer:sky?getComputedStyle(sky).pointerEvents:null,screenZ:screen?getComputedStyle(screen).zIndex:null};
       });
       assert.equal(d.chips.length,14,language+' filter count at '+n+'%');
       assert.ok(d.trackH<=150,v.name+' filter row grew too tall at '+language+' '+n+'%: '+JSON.stringify(d));
       assert.ok(d.trackScrollW>d.trackClientW,v.name+' filters do not provide horizontal overflow at '+language+' '+n+'%');
       assert.ok(d.chips.every(c=>c.h>=44&&c.h<=110),v.name+' category chip dimensions are distorted at '+language+' '+n+'%: '+JSON.stringify(d.chips));
       assert.ok(d.chips.every(c=>c.whiteSpace==='nowrap'&&c.flexShrink==='0'),v.name+' category label wraps or chip shrinks at '+language+' '+n+'%');
       assert.ok(d.chips.every(c=>c.scrollW<=c.clientW+2&&c.scrollH<=c.clientH+2),v.name+' category label is clipped at '+language+' '+n+'%');
       if(language==='en-GB'&&n===200&&v.name==='phone portrait'){
         assert.equal(d.skyZ,'0','decorative layer must stay behind All Recipes content');assert.equal(d.skyPointer,'none','decorative artwork must not intercept taps');assert.equal(d.screenZ,'1','All Recipes content must paint above decoration');
         const all=page.getByRole('button',{name:'All',exact:true}),breakfast=page.getByRole('button',{name:'Breakfast',exact:true});
         await breakfast.click({timeout:3000});let filtered=await page.locator('.recipe-card').count();assert.ok(filtered>0&&filtered<116,'category filter action failed');
         await all.click({timeout:3000});await page.locator('#search').fill('Banana',{timeout:3000});filtered=await page.locator('.recipe-card').count();assert.ok(filtered>0&&filtered<116,'recipe search failed');await page.locator('#search').fill('');
         const selects=page.locator('#screen select');assert.equal(await selects.count(),2,'cooking and ingredient filters visible');
         await selects.nth(0).selectOption({label:'Air fryer'},{timeout:3000});filtered=await page.locator('.recipe-card').count();assert.ok(filtered>0&&filtered<116,'cooking method filter failed');
         await selects.nth(0).selectOption({label:'All methods'},{timeout:3000});
         await selects.nth(1).selectOption({label:'Fruit'},{timeout:3000});filtered=await page.locator('.recipe-card').count();assert.ok(filtered>0&&filtered<116,'ingredient filter failed');
         await selects.nth(1).selectOption({label:'All ingredients'},{timeout:3000});
       }
     }
   }
 }
 await page.locator('#languageSelect').selectOption('en-GB');await nav('library');
 await check('All Recipes filter geometry and controls pass EN/PT × 5 sizes × 4 orientations');

 await bounded('recipe route startup',()=>page.goto(base+'#aria/recipe/12/0',{waitUntil:'domcontentloaded',timeout:8000}),10000);await skipWelcome();
 await text('#screen .ref-title h1','Recipe title 200%',true);await text('#screen .ref-ingredients','Recipe ingredients 200%',true);await text('#screen .ref-tools','Recipe equipment 200%',true);await text('#screen .ref-step-grid','Recipe steps 200%',true);
 await settings();await size(175);await bounded('recipe route at 175%',()=>page.goto(base+'#aria/recipe/12/0',{waitUntil:'domcontentloaded',timeout:8000}),10000);await skipWelcome();await text('#screen .ref-title h1','Recipe title 175%',true);await settings();await size(200);
 await nav('world');await text('#screen h1','World Adventure',true);await nav('week');await text('#screen .topbar h2','Planner',true);await nav('creations');await text('#screen h1','My Creations',true);
 await nav('home');await settings();await text('#screen .home-subpage h1','Settings 200%',true);
 await check('recipe screen at five sizes across phone/tablet portrait and landscape');
 const responsiveViewports=[{name:'phone portrait',width:390,height:844},{name:'phone landscape',width:844,height:390},{name:'tablet portrait',width:800,height:1280},{name:'tablet landscape',width:1280,height:800}];
 let art100=null;
 for(const n of [100,125,150,175,200]){
   await settings();await size(n);
   await bounded('recipe 105 route at '+n+'%',()=>page.goto(base+'#aria/recipe/105/0',{waitUntil:'domcontentloaded',timeout:8000}),10000);await skipWelcome();
   const tipLabel=await page.locator('.ref-chef-tip span').innerText();const tipText=(await page.locator('.ref-chef-tip p').innerText()).trim();const canonical=(await page.locator('.ref-step-card.active .v32-step-safety').innerText()).replace(/^(Safety|Segurança):\s*/i,'').trim();
   assert.equal(tipLabel,n===100?'🛡️ Safety tip':'🛡️ Safety tip','English canonical safety label');assert.equal(tipText,canonical,'Chef tip must equal unmodified canonical step safety');assert.ok(/An adult uses/.test(tipText),'adult safety instruction retained');assert.ok(/allergens and cross-contact/.test(tipText),'allergy warning retained');
   for(const v of responsiveViewports){
     await page.setViewportSize({width:v.width,height:v.height});await page.waitForTimeout(180);await page.locator('.ref-step-actions').evaluate(el=>el.scrollIntoView({block:'center'}));
     const m=await page.locator('.ref-step-actions').evaluate(el=>{const box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};const parent=box(el),back=box(el.querySelector('.ref-back')),dots=box(el.querySelector('.ref-dots')),next=box(el.querySelector('.ref-next')),dotButtons=[...el.querySelectorAll('.ref-dot')].map(box),img=document.querySelector('.ref-step-card.active .ref-step-photo img'),ir=img?.getBoundingClientRect();return{parent,back,dots,next,dotButtons,art:ir?{w:ir.width,h:ir.height,nw:img.naturalWidth,nh:img.naturalHeight,fit:getComputedStyle(img).objectFit}:null}});
     assert.ok(m.parent.x>=-1&&m.parent.right<=v.width+1,v.name+' actions outside viewport at '+n+'%: '+JSON.stringify(m.parent));
     for(const [label,b] of [['Back',m.back],['progress',m.dots],['Next',m.next]])assert.ok(b.x>=m.parent.x-1&&b.right<=m.parent.right+1,label+' escapes action row at '+v.name+' '+n+'%');
     const overlap=(a,b)=>a.x<b.right-2&&a.right>b.x+2&&a.y<b.bottom-2&&a.bottom>b.y+2;
     assert.ok(!overlap(m.back,m.dots)&&!overlap(m.dots,m.next)&&!overlap(m.back,m.next),'step controls overlap at '+v.name+' '+n+'%');
     if(n===100)assert.ok(m.dotButtons.every(b=>b.w<=16&&b.h<=16),'100% progress dots retain approved 12px appearance');
     else assert.ok(m.dotButtons.every(b=>b.w>=44&&b.h>=44),'scaled progress targets remain at least 44px');
     assert.ok(m.art&&m.art.nw>0&&m.art.nh>0&&m.art.w>0&&m.art.h>0&&['cover','contain'].includes(m.art.fit),'step artwork load/object-fit changed at '+v.name+' '+n+'%');
     if(n===100&&v.name==='phone portrait')art100=m.art;
     if(n===200&&v.name==='phone portrait')assert.ok(Math.abs(m.art.w-art100.w)<1&&Math.abs(m.art.h-art100.h)<1&&m.art.fit===art100.fit,'font size changed step artwork dimensions or crop behavior');
     const nextButton=page.locator('.ref-next'),backButton=page.locator('.ref-back');
     if(n===150&&v.name==='tablet landscape'){
       await nextButton.click({timeout:3000});await page.waitForFunction(()=>document.querySelector('.ref-dots')?.getAttribute('aria-label')==='Step 2 of 5',null,{timeout:3000});
       await backButton.click({timeout:3000});await page.waitForFunction(()=>document.querySelector('.ref-dots')?.getAttribute('aria-label')==='Step 1 of 5',null,{timeout:3000});
     }
   }
 }
 await page.locator('#languageSelect').selectOption('pt-BR');await page.locator('.ref-chef-tip span').waitFor({state:'visible',timeout:4000});assert.equal((await page.locator('.ref-chef-tip span').innerText()).trim(),'🛡️ Dica de segurança');const ptTip=(await page.locator('.ref-chef-tip p').innerText()).trim();assert.equal(ptTip,(await page.locator('.ref-step-card.active .v32-step-safety').innerText()).replace(/^(Safety|Segurança):\s*/i,'').trim(),'PT-BR canonical safety preserved');
 await check('recipe controls and safety copy verified across all responsive cases');
 assert.deepEqual(errors,[],'runtime errors '+errors.join(' | '));await check('PASS');
 console.log('PASS: five values and persistence; EN/PT; 116 recipe IDs; recipe step controls and canonical safety at 5 sizes × 4 phone/tablet orientations; navigation and existing critical screens.');
}finally{await Promise.race([context.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]).catch(()=>{});server.closeAllConnections?.();await new Promise(resolve=>{const timer=setTimeout(resolve,1000);timer.unref?.();server.close(()=>{clearTimeout(timer);resolve()})})}
