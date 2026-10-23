import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const appId = process.env.ANDROID_TEST_APP_ID;
if (!appId) throw new Error('ANDROID_TEST_APP_ID is required');
const adb = args => execFileSync('adb', args, { timeout: 30_000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const screenshots = 'artifacts/v33-world-map-sample/screenshots';
mkdirSync(screenshots, { recursive: true });

async function refreshForwardedWebView() {
  let forwardedSocket='';
  for(let attempt=0;attempt<60;attempt++){
    const pids=adb(['shell','pidof',appId]).toString('utf8').trim().split(/\s+/).filter(pid=>/^\d+$/.test(pid));
    for(const pid of pids){
      const sockets=adb(['shell','cat','/proc/net/unix']).toString('utf8');
      const socket=sockets.match(new RegExp(`webview_devtools_remote_${pid}`))?.[0];
      if(!socket)continue;
      if(socket!==forwardedSocket){
        adb(['forward','--remove','tcp:9224']);
        adb(['forward','tcp:9224',`localabstract:${socket}`]);
        forwardedSocket=socket;
      }
      try{
        const targets=await(await fetch('http://127.0.0.1:9224/json')).json();
        const target=Array.isArray(targets)?targets.find(item=>item.type==='page'&&item.webSocketDebuggerUrl&&(item.url?.includes('appassets.androidplatform.net')||item.title?.includes('Magical Kitchen'))):null;
        if(target)return target;
      }catch{}
    }
    await pause(500);
  }
  throw new Error('Could not re-forward 9224 to the rotated app-owned WebView DevTools socket');
}

async function connect({ refresh = false } = {}) {
  let target;
  let lastTargets = [];
  if (!refresh) try { target = JSON.parse(process.env.ANDROID_DEVTOOLS_TARGET || 'null'); } catch { }
  else target=await refreshForwardedWebView();
  if (!target) {
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await fetch('http://127.0.0.1:9224/json');
        const targets = await response.json();
        lastTargets = Array.isArray(targets) ? targets.map(({type,url,title,webSocketDebuggerUrl})=>({type,url,title,hasWebSocket:!!webSocketDebuggerUrl})) : [];
        target = Array.isArray(targets) ? targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl &&
          (item.url?.includes('appassets.androidplatform.net') || item.title?.includes('Magical Kitchen'))) : null;
        if (target) break;
      } catch { }
      await pause(500);
    }
  }
  if (!target?.webSocketDebuggerUrl) throw new Error(`Clean phone emulator did not expose the app-owned WebView; targets=${JSON.stringify(lastTargets)}`);
  let ws,lastError='unknown';
  for(let attempt=0;attempt<(refresh?6:2);attempt++){
    if(attempt>0)target=await refreshForwardedWebView();
    ws=new WebSocket(target.webSocketDebuggerUrl);
    try{
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('DevTools WebSocket handshake timed out')),8000);
        ws.addEventListener('open',()=>{clearTimeout(timer);resolve()}, {once:true});
        ws.addEventListener('error',event=>{clearTimeout(timer);reject(new Error(`DevTools WebSocket handshake failed: ${event.message||'connection error'}`))}, {once:true});
      });
      lastError='';break;
    }catch(error){
      lastError=String(error?.message||error);
      try{ws.close()}catch{}
      if(attempt+1<(refresh?6:2))await pause(500);
    }
  }
  if(lastError)throw new Error(`Could not connect to the app-owned WebView target after retries: ${lastError}; target=${target?.webSocketDebuggerUrl||'missing'}`);
  const pending = new Map();
  let sequence = 0;
  ws.addEventListener('message', async event => {
    let raw = event.data;
    if (typeof raw !== 'string') raw = typeof raw?.text === 'function' ? await raw.text() : Buffer.from(raw).toString('utf8');
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(timer);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  });
  const failPending=reason=>{for(const {reject,timer} of pending.values()){clearTimeout(timer);reject(new Error(reason))}pending.clear()};
  ws.addEventListener('close',()=>failPending('Android WebView DevTools target closed'));
  ws.addEventListener('error',()=>failPending('Android WebView DevTools target disconnected'));
  const command = (method, params = {}) => {
    const id = ++sequence;
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`WebView DevTools timeout: ${method}`)); }, 15_000);
      pending.set(id, { resolve, reject, timer });
    });
    ws.send(JSON.stringify({ id, method, params }));
    return response;
  };
  await command('Runtime.enable');
  const evaluate = async expression => {
    const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'WebView expression failed');
    return response.result?.value;
  };
  return { ws, command, evaluate };
}

async function waitFor(evaluate, expression, label) {
  let last;
  for (let attempt = 0; attempt < 60; attempt++) {
    last = await evaluate(expression);
    if (last?.visible) return last;
    await pause(250);
  }
  throw new Error(`${label} did not render: ${JSON.stringify(last)}`);
}

function screenshot(name, orientation = 'portrait') {
  const png = adb(['exec-out', 'screencap', '-p']);
  if (png.length < 10_000 || png.readUInt32BE(0) !== 0x89504e47) throw new Error(`${name} is not a valid PNG screenshot`);
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  if (orientation === 'portrait' && width >= height) throw new Error(`${name} should be portrait, got ${width}x${height}`);
  if (orientation === 'landscape' && width <= height) throw new Error(`${name} should be landscape, got ${width}x${height}`);
  writeFileSync(`${screenshots}/${name}.png`, png);
  return { name: `${name}.png`, width, height, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') };
}

async function stableScreenshot(session,name,orientation='portrait',previousSha256=null){
  let previousFrame=null,lastFrame=null,repeats=0;
  for(let attempt=0;attempt<14;attempt++){
    await session.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await pause(350);
    lastFrame=screenshot(name,orientation);
    if(lastFrame.sha256===previousFrame)repeats++;else repeats=0;
    if(repeats>=1&&(!previousSha256||lastFrame.sha256!==previousSha256))return lastFrame;
    previousFrame=lastFrame.sha256;
    await pause(250);
  }
  throw new Error(`${name} framebuffer did not settle to a new visible screen: ${JSON.stringify({previousSha256,lastFrame,repeats})}`);
}

async function tap(session, selector, label) {
  const point = await session.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e?.getBoundingClientRect();return {visible:!!e&&!!r&&r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden',x:r?(r.left+r.right)/2:0,y:r?(r.top+r.bottom)/2:0}})()`);
  if (!point.visible) throw new Error(`${label} is missing or unreachable: ${JSON.stringify(point)}`);
  await session.command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, id: 41 }] });
  await session.command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return point;
}

async function tapAfterAndroidScroll(session, selector, label) {
  let last=null;
  for(let attempt=0;attempt<8;attempt++){
    last=await session.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e?.getBoundingClientRect();return {visible:!!e&&!!r&&r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden',x:r?(r.left+r.right)/2:innerWidth/2,top:r?.top??0,bottom:r?.bottom??0,width:innerWidth,height:innerHeight,scrollY,scrollHeight:document.documentElement.scrollHeight}})()`);
    if(!last.visible)throw new Error(`${label} is missing while scrolling: ${JSON.stringify(last)}`);
    if(last.top>=8&&last.bottom<=last.height*.82)return tap(session,selector,label);
    const x=Math.max(8,Math.min(last.width-8,last.x));
    const down=last.top<8;
    const startY=down?last.height*.35:last.height*.82,endY=down?last.height*.82:last.height*.35;
    await session.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:startY,id:73}]});
    await pause(80);
    await session.command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:(startY+endY)/2,id:73}]});
    await pause(80);
    await session.command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:endY,id:73}]});
    await session.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await pause(350);
  }
  throw new Error(`${label} stayed outside the Android touch-safe viewport after native swipe attempts: ${JSON.stringify(last)}`);
}

async function currentRotation() {
  const status=adb(['shell','dumpsys','window']).toString('utf8');
  const rotation=status.match(/mRotation=(\d)/)?.[1]||status.match(/mRotation=ROTATION_(0|90|180|270)/)?.[1];
  const normalized=rotation==='90'?'1':rotation==='180'?'2':rotation==='270'?'3':rotation;
  if(!['0','1','2','3'].includes(normalized||''))throw new Error(`Could not read Android display rotation: ${rotation||'unknown'}`);
  return Number(normalized);
}

async function setOrientation(session, landscape) {
  let lastViewport=null,lastRotation=await currentRotation();
  for(let turn=0;turn<4;turn++){
    lastRotation=await currentRotation();
    if((lastRotation%2===1)===landscape){
      let stable=0;
      for(let i=0;i<20;i++){
        await pause(300);
        lastViewport=await session.evaluate('({width:innerWidth,height:innerHeight})');
        if((lastViewport.width>lastViewport.height)===landscape){if(++stable===3)return session}else stable=0;
      }
    }
    adb(['emu','rotate']);
    for(let i=0;i<20;i++){
      await pause(300);
      lastRotation=await currentRotation();
      if((lastRotation%2===1)===landscape)break;
    }
    if((lastRotation%2===1)===landscape){
      try{session.ws.close()}catch{}
      session=await connect({refresh:true});
      let stable=0;
      for(let i=0;i<20;i++){
        await pause(300);
        lastViewport=await session.evaluate('({width:innerWidth,height:innerHeight})');
        if((lastViewport.width>lastViewport.height)===landscape){if(++stable===3)return session}else stable=0;
      }
    }
  }
  throw new Error(`Phone emulator did not reach ${landscape?'landscape':'portrait'} orientation: ${JSON.stringify({rotation:lastRotation,viewport:lastViewport})}`);
}

let session;
const apkBytes = readFileSync('phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk');
const evidence = {
  schemaVersion: 3,
  sourceCommit: process.env.GITHUB_SHA || 'local',
  workflowRunId: process.env.GITHUB_RUN_ID || 'local',
  packageId: appId,
  apkBytes: apkBytes.length,
  apkSha256: createHash('sha256').update(apkBytes).digest('hex'),
  device: 'clean Pixel 3a API 35 emulator',
  flow: [], geometry: [], screenshots: [], logs: []
};
const evalWorld = `(()=>{const screen=document.querySelector('#screen.v31-world-screen'),viewport=document.querySelector('[data-w02-fixed-map]'),art=document.querySelector('.w02-map-art'),image=document.querySelector('.v31-map-art-image'),marker=document.querySelector('.w02-country-marker'),sr=screen?.getBoundingClientRect(),vr=viewport?.getBoundingClientRect(),ar=art?.getBoundingClientRect(),ir=image?.getBoundingClientRect(),mr=marker?.getBoundingClientRect(),vs=viewport?getComputedStyle(viewport):null,ims=image?getComputedStyle(image):null,expected=V31_HOME_WORLD_ART?.worldMap||'',ratio=(a,b)=>a&&b?Math.abs(a/b-1):Infinity,artAspect=ar?.width&&ar?.height?ar.width/ar.height:0,imageAspect=image?.naturalWidth&&image?.naturalHeight?image.naturalWidth/image.naturalHeight:0,occupancy=sr&&vr?vr.width*vr.height/(sr.width*sr.height):0,markerAnchor=mr?{x:(mr.left+mr.right)/2,y:(mr.top+mr.bottom)/2}:null,markerLocal=ar&&markerAnchor?{x:(markerAnchor.x-ar.left)/ar.width,y:(markerAnchor.y-ar.top)/ar.height}:null,forbiddenControls=document.querySelectorAll('[data-v31-zoom],[data-v31-pan-toggle],.v31-map-pin,.v31-world-map').length,recipeCount=document.querySelectorAll('.w02-country-recipes [data-v31-approved-recipe]').length;return {visible:!!vr&&vr.width>0&&vr.height>0,route:typeof view==='undefined'?'unknown':view,heading:document.querySelector('.w02-map-header h1')?.textContent?.trim()||'',approvedArt:expected.startsWith('data:image/webp;base64,')&&image?.src===expected&&image.complete&&image.naturalWidth>0,occupancy,viewport:{x:vr?.x||0,y:vr?.y||0,width:vr?.width||0,height:vr?.height||0},art:{x:ar?.x||0,y:ar?.y||0,width:ar?.width||0,height:ar?.height||0,aspect:artAspect},image:{x:ir?.x||0,y:ir?.y||0,width:ir?.width||0,height:ir?.height||0,aspect:imageAspect,objectFit:ims?.objectFit||''},viewportStyle:{borderWidth:vs?.borderWidth||'',borderRadius:vs?.borderRadius||''},marker:{visible:!!mr&&mr.width>=48&&mr.height>=48&&mr.left>=ar?.left&&mr.right<=ar?.right&&mr.top>=ar?.top&&mr.bottom<=ar?.bottom,width:mr?.width||0,height:mr?.height||0,local:markerLocal,rect:mr?{left:mr.left,right:mr.right,top:mr.top,bottom:mr.bottom}:null},countryCodes:[...document.querySelectorAll('[data-v31-country]')].map(x=>x.dataset.v31Country),forbiddenControls,recipeCount}})()`;
function assertMap(map, label) {
  if (!map.visible || map.route !== 'world' || map.heading !== 'World Map' || !map.approvedArt || map.occupancy < .85 || map.occupancy > .95 || Math.abs(map.art.aspect - 717/389) > .02 || map.image.objectFit !== 'contain' || Math.abs(map.image.aspect - 717/389) > .02 || map.viewportStyle.borderWidth !== '0px' || Number.parseFloat(map.viewportStyle.borderRadius) > 2 || !map.marker.visible || map.countryCodes.join(',') !== 'IND' || map.forbiddenControls !== 0) {
    throw new Error(`${label} fixed World Map acceptance failed: ${JSON.stringify(map)}`);
  }
}

try {
  session = await connect();
  const home = await waitFor(session.evaluate, `(()=>{const e=document.querySelector('.v31-hero-welcome h1'),r=e?.getBoundingClientRect();return {visible:!!e&&!!r&&r.width>0&&r.height>0,text:e?.textContent?.trim()||''}})()`, 'Home');
  const profileDialog = await session.evaluate(`(()=>{const d=document.querySelector('#v3ProfileDialog'),r=d?.getBoundingClientRect();return !!d&&!!r&&r.width>0&&r.height>0&&getComputedStyle(d).display!=='none'})()`);
  if (profileDialog) {
    const chose = await session.evaluate(`(()=>{const chef=document.querySelector('#v3ProfileDialog [data-v3-chef]'),continueButton=document.querySelector('#v3ProfileDialog [data-v3-profile-continue]');if(!chef||!continueButton)return false;chef.click();continueButton.click();return true})()`);
    if (!chose) throw new Error('Fresh-install profile chooser could not be completed with the sample Chef profile');
    await pause(700);
  }
  evidence.flow.push({step:'clean-install-launch',route:'home',packageId:appId,status:'PASS'});
  const homeScreenshot=await stableScreenshot(session,'home-phone-portrait');evidence.screenshots.push(homeScreenshot);
  const openTarget=await tap(session,'[data-v31-open-world]','Explore the World');
  const world=await waitFor(session.evaluate,evalWorld,'fixed World Map');
  const mapShot=await stableScreenshot(session,'world-map-phone-portrait','portrait',homeScreenshot.sha256);evidence.screenshots.push(mapShot);
  if(mapShot.sha256===homeScreenshot.sha256)throw new Error('Android framebuffer remained on Home after the World Map route rendered');
  assertMap(world,'phone portrait');evidence.geometry.push({device:'phone',orientation:'portrait',...world});
  evidence.flow.push({step:'home-touch-to-fixed-world-map',target:openTarget,status:'PASS'});

  const marker=world.marker.rect;
  await session.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:(marker.left+marker.right)/2,y:(marker.top+marker.bottom)/2,id:52}]});
  await session.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const country=await waitFor(session.evaluate,`(()=>{const title=document.querySelector('#v33-country-title'),r=title?.getBoundingClientRect();return {visible:!!title&&!!r&&r.width>0&&r.height>0,name:title?.textContent?.trim()||'',ids:[...document.querySelectorAll('.w02-country-recipes [data-v31-approved-recipe]')].map(x=>Number(x.dataset.v31ApprovedRecipe))}})()`,'India recipe cards');
  if(country.name!=='India'||country.ids.length!==18||new Set(country.ids).size!==18||country.ids.some(id=>id<1||id>95))throw new Error(`India must expose only its 18 existing canonical recipes: ${JSON.stringify(country)}`);
  evidence.flow.push({step:'android-touch-india-country-cards',recipeIds:country.ids,status:'PASS'});
  const countryShot=await stableScreenshot(session,'country-preview-phone-portrait','portrait',mapShot.sha256);evidence.screenshots.push(countryShot);
  if(countryShot.sha256===mapShot.sha256)throw new Error('Android framebuffer did not capture the India country-card overlay');
  await session.evaluate(`document.querySelector('.w02-country-recipes [data-v31-approved-recipe="51"]')?.click()`);
  const recipe=await waitFor(session.evaluate,`(()=>{const h=document.querySelector('.ref-hero h1'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,title:h?.textContent?.trim()||'',id:Number(selected?.id||0),route:typeof view==='undefined'?'unknown':view}})()`,'canonical India recipe');
  if(recipe.id!==51||recipe.route!=='recipe'||recipe.title!=='Masala Cheese Toast')throw new Error(`Country recipe card opened the wrong route: ${JSON.stringify(recipe)}`);
  evidence.flow.push({step:'country-card-to-existing-recipe-details',...recipe,status:'PASS'});
  const recipeShot=await stableScreenshot(session,'recipe-navigation-phone-portrait','portrait',countryShot.sha256);
  if(recipeShot.sha256===countryShot.sha256)throw new Error('Android framebuffer still shows country cards after canonical recipe navigation');
  evidence.screenshots.push(recipeShot);
  session.ws.close();adb(['shell','input','keyevent','4']);await pause(700);session=await connect();
  const returned=await waitFor(session.evaluate,`(()=>{const h=document.querySelector('#v33-country-title'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,route:typeof view==='undefined'?'unknown':view,country:h?.textContent?.trim()||'',cards:document.querySelectorAll('.w02-country-recipes [data-v31-approved-recipe]').length}})()`,'Android Back to India recipe cards');
  if(returned.route!=='world'||returned.country!=='India'||returned.cards!==18)throw new Error(`Android Back did not restore the India cards: ${JSON.stringify(returned)}`);
  evidence.flow.push({step:'android-back-restores-country-cards',...returned,status:'PASS'});
  const backShot=await stableScreenshot(session,'world-map-back-phone-portrait','portrait',recipeShot.sha256);evidence.screenshots.push(backShot);

  adb(['shell','input','keyevent','4']);await pause(400);session=await setOrientation(session,true);
  const landscape=await session.evaluate(evalWorld);assertMap(landscape,'phone landscape');
  evidence.geometry.push({device:'phone',orientation:'landscape',...landscape});
  evidence.screenshots.push(await stableScreenshot(session,'world-map-phone-landscape','landscape',backShot.sha256));
  evidence.flow.push({step:'fixed-map-orientation-reflow',orientation:'landscape',viewport:await session.evaluate('({width:innerWidth,height:innerHeight})'),status:'PASS'});
  session=await setOrientation(session,false);

  const locale=await session.evaluate(`(()=>{state.language='pt-BR';render();return {heading:document.querySelector('.w02-map-header h1')?.textContent?.trim()||'',marker:document.querySelector('.w02-country-marker')?.textContent?.trim()||'',label:document.querySelector('.w02-country-marker')?.getAttribute('aria-label')||''}})()`);
  if(locale.heading!=='Mapa do mundo'||locale.marker!=='🇮🇳Índia'||!locale.label.includes('Índia'))throw new Error(`PT-BR fixed map localisation failed: ${JSON.stringify(locale)}`);
  evidence.flow.push({step:'PT-BR-map-localisation',...locale,status:'PASS'});
  await session.evaluate(`document.querySelector('.w02-country-marker')?.click()`);
  const ptCards=await session.evaluate(`({title:document.querySelector('#v33-country-title')?.textContent?.trim()||'',count:document.querySelectorAll('.w02-country-recipes [data-v31-approved-recipe]').length,first:document.querySelector('.w02-country-recipes [data-v31-approved-recipe] strong')?.textContent?.trim()||''})`);
  if(ptCards.title!=='Índia'||ptCards.count!==18)throw new Error(`PT-BR India cards failed: ${JSON.stringify(ptCards)}`);
  evidence.flow.push({step:'PT-BR-country-cards',...ptCards,status:'PASS'});
  await session.evaluate(`history.back()`);await pause(300);await session.evaluate(`state.language='en-GB';render()`);

  const emptyPassportBase=await stableScreenshot(session,'world-map-before-empty-passport-phone-portrait');evidence.screenshots.push(emptyPassportBase);
  await tap(session,'.w02-passport-button','Open empty Food Passport');
  const passport=await session.evaluate(`(()=>({title:document.querySelector('#v33-passport-title')?.textContent?.trim()||'',stamps:[...document.querySelectorAll('.w02-passport-stamps .v31-stamp')].map(x=>x.textContent.trim()),done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice()}))()`);
  if(passport.title!=='My Food Passport'||passport.stamps.length||passport.done.length||passport.worldStamps.length)throw new Error(`Viewing map/passport must not award progress: ${JSON.stringify(passport)}`);
  evidence.flow.push({step:'food-passport-view-without-reward',...passport,status:'PASS'});
  evidence.screenshots.push(await stableScreenshot(session,'food-passport-phone-portrait','portrait',emptyPassportBase.sha256));
  await tap(session,'.w02-passport-sheet .w02-sheet-close','Close empty Food Passport');
  await tap(session,'.w02-country-marker','Open India after passport');
  await waitFor(session.evaluate,`(()=>{const h=document.querySelector('#v33-country-title'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,name:h?.textContent?.trim()||''}})()`,'India cards for completion');
  await tap(session,'.w02-country-recipes [data-v31-approved-recipe="51"]','Open recipe 51 for completion');
  const completionStart=await session.evaluate(`({id:Number(selected?.id||0),stepCount:selected?.steps?.length||0,step:Number(step||0)})`);
  if(completionStart.id!==51||completionStart.stepCount<1||completionStart.step!==0)throw new Error(`Canonical recipe completion did not start at step one: ${JSON.stringify(completionStart)}`);
  for(let index=0;index<completionStart.stepCount;index++){
    await tapAfterAndroidScroll(session,'.ref-step-actions .ref-next[data-action="nextstep"]',`Complete recipe 51 step ${index+1}`);
    const expectedStep=index+1;
    const progress=await waitFor(session.evaluate,`(()=>{const done=(state.done||[]).some(value=>Number(value)===51);return {visible:done||Number(step)===${expectedStep},step:Number(step||0),done,stamps:(state.worldStamps||[]).slice()}})()`,`recipe 51 completion step ${expectedStep}`);
    if(index<completionStart.stepCount-1&&(!progress.visible||progress.done||progress.step!==expectedStep))throw new Error(`Recipe 51 did not advance through its real step UI: ${JSON.stringify(progress)}`);
    if(index===completionStart.stepCount-1&&!progress.done)throw new Error(`Finishing recipe 51 did not record completion: ${JSON.stringify(progress)}`);
  }
  const completed=await session.evaluate(`({done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice(),profileId:v3ProfileState.activeId||null})`);
  if(completed.done.filter(id=>id===51).length!==1||completed.worldStamps.filter(code=>code==='IND').length!==1||!completed.profileId)throw new Error(`Actual recipe completion did not persist one India stamp in the active profile: ${JSON.stringify(completed)}`);
  evidence.flow.push({step:'complete-canonical-recipe-through-real-step-controls',recipeId:51,...completionStart,...completed,status:'PASS'});
  session.ws.close();adb(['shell','input','keyevent','4']);await pause(600);session=await connect();
  const completionBack=await waitFor(session.evaluate,`(()=>{const h=document.querySelector('#v33-country-title'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,route:typeof view==='undefined'?'unknown':view,country:h?.textContent?.trim()||'',cards:document.querySelectorAll('.w02-country-recipes [data-v31-approved-recipe]').length}})()`,'Android Back after recipe completion');
  if(completionBack.route!=='world'||completionBack.country!=='India'||completionBack.cards!==18)throw new Error(`Android Back did not restore the country panel after recipe completion: ${JSON.stringify(completionBack)}`);
  await tap(session,'.w02-country-sheet .w02-sheet-close','Close India cards after completion');
  const earnedPassportBase=await stableScreenshot(session,'world-map-before-earned-passport-phone-portrait');evidence.screenshots.push(earnedPassportBase);
  await tap(session,'.w02-passport-button','Open earned Food Passport');
  const earned=await session.evaluate(`(()=>({title:document.querySelector('#v33-passport-title')?.textContent?.trim()||'',stamps:[...document.querySelectorAll('.w02-passport-stamps .v31-stamp')].map(x=>x.textContent.trim()),done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice()}))()`);
  if(earned.title!=='My Food Passport'||earned.stamps.length!==1||!earned.stamps[0].includes('India')||earned.done.filter(id=>id===51).length!==1||earned.worldStamps.filter(code=>code==='IND').length!==1)throw new Error(`Completed canonical recipe did not produce exactly one India Food Passport stamp: ${JSON.stringify(earned)}`);
  evidence.flow.push({step:'food-passport-after-canonical-completion',...earned,status:'PASS'});
  evidence.screenshots.push(await stableScreenshot(session,'food-passport-earned-phone-portrait','portrait',earnedPassportBase.sha256));
  session.ws.close();adb(['shell','am','force-stop',appId]);adb(['shell','cmd','connectivity','airplane-mode','enable']);adb(['shell','monkey','-p',appId,'1']);await pause(1200);session=await connect();
  await waitFor(session.evaluate,`(()=>{const h=document.querySelector('.v31-hero-welcome h1'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0}})()`,'offline relaunch Home');
  await session.evaluate(`document.querySelector('[data-v31-open-world]')?.click()`);await waitFor(session.evaluate,evalWorld,'offline relaunch World Map');
  const offlinePassportBase=await stableScreenshot(session,'world-map-before-offline-passport-phone-portrait');evidence.screenshots.push(offlinePassportBase);
  await tap(session,'.w02-passport-button','Open Food Passport offline');
  const persisted=await session.evaluate(`(()=>({title:document.querySelector('#v33-passport-title')?.textContent?.trim()||'',stamps:[...document.querySelectorAll('.w02-passport-stamps .v31-stamp')].map(x=>x.textContent.trim()),done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice()}))()`);
  const airplane=adb(['shell','cmd','connectivity','airplane-mode']).toString('utf8').trim().toLowerCase();
  if(persisted.title!=='My Food Passport'||persisted.stamps.length!==1||!persisted.stamps[0].includes('India')||persisted.done.filter(id=>id===51).length!==1||persisted.worldStamps.filter(code=>code==='IND').length!==1||airplane!=='enabled')throw new Error(`Food Passport offline restart persistence failed: ${JSON.stringify({persisted,airplane})}`);
  evidence.flow.push({step:'food-passport-offline-restart-persistence',...persisted,airplane,status:'PASS'});evidence.screenshots.push(await stableScreenshot(session,'food-passport-offline-phone-portrait','portrait',offlinePassportBase.sha256));
  evidence.logs=adb(['logcat','-d','-t','2500']).toString('utf8').split('\n').filter(line=>line.includes(appId)||line.includes('ANR in')).slice(-250);
  if(evidence.logs.some(line=>line.includes('ANR in')&&line.includes(appId)))throw new Error('Android logcat contains an ANR for the World Map sample package');
  evidence.status='PASS';evidence.completedAt=new Date().toISOString();
  writeFileSync('artifacts/v33-world-map-sample/sample-smoke.json',`${JSON.stringify(evidence,null,2)}\n`);
  console.log(`W02 fixed World Map phone smoke PASS: ${JSON.stringify(evidence)}`);
} catch(error) {
  evidence.status='FAIL';evidence.error=String(error?.stack||error);
  try{evidence.logs=adb(['logcat','-d','-t','2500']).toString('utf8').split('\n').filter(line=>line.includes(appId)||line.includes('ANR in')).slice(-250)}catch{}
  writeFileSync('artifacts/v33-world-map-sample/sample-smoke.json',`${JSON.stringify(evidence,null,2)}\n`);
  throw error;
} finally {
  try{adb(['shell','cmd','connectivity','airplane-mode','disable'])}catch{}
  adb(['shell','settings','put','system','accelerometer_rotation','1']);
  if(session?.ws.readyState===WebSocket.OPEN)session.ws.close();
}
