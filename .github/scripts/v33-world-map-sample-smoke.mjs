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
  if(await session.evaluate(`!!document.querySelector('.aria-world-globe__stage')`))await setMotionPreference(session,'reduce');
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

async function setMotionPreference(session, value) {
  await session.command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value }] });
  await pause(120);
}

async function motionSnapshot(session, name, orientation) {
  const metrics = await session.evaluate(`(()=>{const stage=document.querySelector('.aria-world-globe__stage'),stars=[...document.querySelectorAll('.v33-globe-magic-star')],particles=[...document.querySelectorAll('.v33-globe-magic-particle')];return {rotation:Number(v33GlobeController?.getState?.().rotation||0),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,orbit:getComputedStyle(stage,'::before').animationName,sparkles:getComputedStyle(stage,'::after').animationName,stars:stars.map(x=>getComputedStyle(x).animationName),particles:particles.map(x=>getComputedStyle(x).animationName)}})()`);
  return { ...metrics, frame: screenshot(name, orientation) };
}

function rotationDistance(start, end) {
  return Math.abs(((end - start + 540) % 360) - 180);
}

async function tap(session, selector, label) {
  const point = await session.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e?.getBoundingClientRect();return {visible:!!e&&!!r&&r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden',x:r?(r.left+r.right)/2:0,y:r?(r.top+r.bottom)/2:0}})()`);
  if (!point.visible) throw new Error(`${label} is missing or unreachable: ${JSON.stringify(point)}`);
  await session.command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, id: 41 }] });
  await session.command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(180);
  return point;
}

async function dragGlobe(session, dx) {
  const point=await session.evaluate(`(()=>{const e=document.querySelector('.aria-world-globe__stage'),r=e?.getBoundingClientRect();return {visible:!!r&&r.width>0&&r.height>0,x:r?(r.left+r.right)/2:0,y:r?(r.top+r.bottom)/2:0}})()`);
  if(!point.visible)throw new Error('Magical Spinning Globe drag stage is missing');
  await session.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:93}]});
  await pause(80);
  await session.command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+dx,y:point.y,id:93}]});
  await pause(100);
  // End with a stationary move so synthetic touch timing cannot add a large
  // inertial fling that sends a target flag straight back behind the globe.
  await session.command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+dx,y:point.y,id:93}]});
  await pause(80);
  await session.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(250);
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
  flow: [], geometry: [], motion: [], screenshots: [], logs: []
};
const evalWorld = `(()=>{
  const screen=document.querySelector('#screen.v31-world-screen'),globe=document.querySelector('.aria-world-globe'),sphere=document.querySelector('.aria-world-globe__sphere'),stage=document.querySelector('.aria-world-globe__stage'),atlas=document.querySelector('.aria-world-globe__atlas'),flags=document.querySelector('.aria-world-globe__flags'),avatar=document.querySelector('.aria-world-globe__guide'),hand=document.querySelector('.aria-world-globe__guide-hand'),flag=[...document.querySelectorAll('.aria-world-globe__flag')].find(x=>x.getAttribute('aria-label')==='India');
  const sr=screen?.getBoundingClientRect(),gr=globe?.getBoundingClientRect(),str=stage?.getBoundingClientRect(),br=sphere?.getBoundingClientRect(),atr=atlas?.getBoundingClientRect(),flr=flags?.getBoundingClientRect(),fr=flag?.getBoundingClientRect(),ar=avatar?.getBoundingClientRect(),hr=hand?.getBoundingClientRect(),handStyle=hand?getComputedStyle(hand):null,flagsStyle=flags?getComputedStyle(flags):null,handClip=hr?{left:hr.left+hr.width*.61,right:hr.left+hr.width,top:hr.top+hr.height*.27,bottom:hr.top+hr.height*.46}:null,handOverlap=!!handClip&&!!br?Math.max(0,Math.min(handClip.right,br.right)-Math.max(handClip.left,br.left))*Math.max(0,Math.min(handClip.bottom,br.bottom)-Math.max(handClip.top,br.top)):0;
  const landPaths=[...(atlas?.querySelectorAll('.aria-globe-map-land')||[])],landBoxes=landPaths.map(x=>x.getBBox()),landBounds=landBoxes.length?landBoxes.reduce((b,r)=>({left:Math.min(b.left,r.x),top:Math.min(b.top,r.y),right:Math.max(b.right,r.x+r.width),bottom:Math.max(b.bottom,r.y+r.height)}),{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity}):null;
  const landBoundsCoverage=landBounds?(landBounds.right-landBounds.left)*(landBounds.bottom-landBounds.top)/1000000:0,atlasScale=br&&atr?atr.width/br.width:0,flagsScale=br&&flr?flr.width/br.width:0,flagsInStage=!!str&&[...(flags?.querySelectorAll('.aria-world-globe__flag')||[])].every(x=>{const r=x.getBoundingClientRect();return r.left>=str.left&&r.right<=str.right&&r.top>=str.top&&r.bottom<=str.bottom}),flagCentersInSphere=!!br&&[...(flags?.querySelectorAll('.aria-world-globe__flag')||[])].every(x=>{const r=x.getBoundingClientRect(),cx=br.left+br.width/2,cy=br.top+br.height/2,rad=Math.min(br.width,br.height)/2-2,dx=(r.left+r.right)/2-cx,dy=(r.top+r.bottom)/2-cy;return dx*dx+dy*dy<=rad*rad});
  const before=getComputedStyle(stage,'::before'),after=getComputedStyle(stage,'::after'),orbitWidth=parseFloat(before.width)||0,orbitHeight=parseFloat(before.height)||0,orbitX=(str?.left||0)+(parseFloat(before.left)||0),orbitY=(str?.top||0)+(parseFloat(before.top)||0),centerOffset=!!str&&!!br?Math.hypot(orbitX-(br.left+br.width/2),orbitY-(br.top+br.height/2)):999;
  const sparkle=document.querySelector('.v33-globe-sparkle-trail'),sparkleRect=sparkle?.getBoundingClientRect();
  return {visible:!!globe&&gr?.width>0&&gr?.height>0,moduleVersion:window.AariaWorldAdventureGlobe?.version||'',route:typeof view==='undefined'?'unknown':view,heading:document.querySelector('.aria-world-globe__eyebrow')?.textContent?.trim()||'',avatarPresent:!!avatar?.complete&&avatar.naturalWidth>0,pointingAariaArtwork:avatar?.src===V33_WORLD_ARTWORK.pointingAaria?'approved-transparent-png':'missing',sparklePresent:!!sparkle?.complete&&sparkle.naturalWidth>0,occupancy:sr&&gr?gr.width*gr.height/(sr.width*sr.height):0,viewport:{width:innerWidth,height:innerHeight},globe:{x:gr?.x||0,y:gr?.y||0,width:gr?.width||0,height:gr?.height||0},stage:{x:str?.x||0,y:str?.y||0,width:str?.width||0,height:str?.height||0},sphere:{x:br?.x||0,y:br?.y||0,width:br?.width||0,height:br?.height||0},mapEmbellishment:{atlasScale,flagsScale,landPathCount:landPaths.length,landBoundsCoverage,flagsInStage,flagCentersInSphere,orbit:before.animationName,sparkles:after.animationName,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,orbitGeometry:{width:orbitWidth,height:orbitHeight,circularity:orbitWidth?Math.abs(orbitWidth-orbitHeight)/orbitWidth:1,centerOffset}},marker:{visible:!!fr&&fr.width>=48&&fr.height>=48,insideSphere:!!fr&&!!br&&fr.left>=br.left&&fr.right<=br.right&&fr.top>=br.top&&fr.bottom<=br.bottom,width:fr?.width||0,height:fr?.height||0,rect:fr?{left:fr.left,right:fr.right,top:fr.top,bottom:fr.bottom}:null},countryCodes:[...document.querySelectorAll('.aria-world-globe__flag')].map(x=>x.getAttribute('aria-label')),configuredCountryCodes:v33WorldHost?.countries||[],configuredIndiaRecipeCount:v33WorldHost?.getCountry?.('IND')?.recipes?.length||0,recipeCount:document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]').length,avatar:{present:!!avatar?.complete&&avatar.naturalWidth>0,visible:!!avatar&&getComputedStyle(avatar).display!=='none',width:ar?.width||0,height:ar?.height||0},pointingHand:{visible:!!hand&&hand.complete&&hand.naturalWidth>0&&handStyle?.display!=='none'&&handStyle?.clipPath!=='none',overlapArea:handOverlap,flagsAbove:!!flagsStyle&&Number(flagsStyle.zIndex)>Number(handStyle?.zIndex||0),flagsInStage:!!stage&&flags?.parentElement===stage},sparkle:{visible:!!sparkleRect&&sparkleRect.width>0&&getComputedStyle(sparkle).display!=='none',width:sparkleRect?.width||0,height:sparkleRect?.height||0}}})()`;
function assertMap(map, label, { requireVisibleIndia = true, requirePointingHand = false } = {}) {
  const motionPass = map.mapEmbellishment.reducedMotion
    ? map.mapEmbellishment.orbit === 'none' && map.mapEmbellishment.sparkles === 'none'
    : map.mapEmbellishment.orbit === 'v33-orbit-turn' && map.mapEmbellishment.sparkles === 'v33-sparkle-twinkle';
  const orbit = map.mapEmbellishment.orbitGeometry;
  const widthUse = map.globe.width / map.viewport.width;
  if (!map.visible || map.route !== 'world' || !map.heading || !map.avatarPresent || map.pointingAariaArtwork!=='approved-transparent-png' || !map.avatar.visible || map.avatar.height < map.stage.height * .25 || !map.sparklePresent || !map.sparkle.visible || map.moduleVersion !== '0.3.0-natural-earth-orthographic' || map.occupancy < .98 || map.sphere.width < 180 || (requireVisibleIndia && (!map.marker.visible || !map.marker.insideSphere || !map.countryCodes.includes('India'))) || (requirePointingHand && (!map.pointingHand.visible || map.pointingHand.overlapArea < 1 || !map.pointingHand.flagsAbove || !map.pointingHand.flagsInStage)) || map.configuredIndiaRecipeCount !== 18 || !map.configuredCountryCodes.includes('IND') || map.mapEmbellishment.atlasScale < 1.08 || map.mapEmbellishment.flagsScale < 1.08 || Math.abs(map.mapEmbellishment.atlasScale - map.mapEmbellishment.flagsScale) > .02 || map.mapEmbellishment.landPathCount < 30 || map.mapEmbellishment.landBoundsCoverage < .48 || !map.mapEmbellishment.flagsInStage || !map.mapEmbellishment.flagCentersInSphere || !motionPass || orbit.circularity > .01 || orbit.centerOffset > 1.5 || widthUse < .96) {
    throw new Error(`${label} Magical Spinning Globe smoke failed: ${JSON.stringify(map)}`);
  }
}

try {
  session = await connect();
  await setMotionPreference(session, 'no-preference');
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
  const world=await waitFor(session.evaluate,evalWorld,'Magical Spinning Globe');
  await pause(250);
  const portraitMotionStart=await motionSnapshot(session,'world-map-phone-portrait-motion-start','portrait');evidence.screenshots.push(portraitMotionStart.frame);
  await pause(2200);
  const portraitMotionEnd=await motionSnapshot(session,'world-map-phone-portrait-motion-end','portrait');evidence.screenshots.push(portraitMotionEnd.frame);
  const portraitDegrees=rotationDistance(portraitMotionStart.rotation,portraitMotionEnd.rotation);
  if(portraitMotionStart.reduced||portraitMotionStart.orbit!=='v33-orbit-turn'||portraitMotionStart.sparkles!=='v33-sparkle-twinkle'||portraitMotionStart.stars.length!==8||portraitMotionStart.stars.some(name=>name!=='v33-star-twinkle')||portraitMotionStart.particles.length!==6||portraitMotionStart.particles.some(name=>name!=='v33-particle-drift')||portraitDegrees<2.5||portraitMotionStart.frame.sha256===portraitMotionEnd.frame.sha256)throw new Error(`Animation-enabled portrait did not show globe/orbit/star/particle motion: ${JSON.stringify({portraitMotionStart,portraitMotionEnd,portraitDegrees})}`);
  evidence.motion.push({device:'phone',orientation:'portrait',mode:'animation-enabled',startDegrees:portraitMotionStart.rotation,endDegrees:portraitMotionEnd.rotation,rotationDegrees:portraitDegrees,orbit:portraitMotionEnd.orbit,sparkles:portraitMotionEnd.sparkles,stars:portraitMotionEnd.stars,particles:portraitMotionEnd.particles,frames:[portraitMotionStart.frame.name,portraitMotionEnd.frame.name],frameHashes:[portraitMotionStart.frame.sha256,portraitMotionEnd.frame.sha256],status:'PASS'});
  const mapShot=portraitMotionEnd.frame;
  if(mapShot.sha256===homeScreenshot.sha256)throw new Error('Android framebuffer remained on Home after the World Map route rendered');
  assertMap(world,'phone portrait',{requirePointingHand:true});evidence.geometry.push({device:'phone',orientation:'portrait',...world});
  await setMotionPreference(session, 'reduce');
  const reducedPortraitStart=await motionSnapshot(session,'world-map-phone-portrait-reduced-motion','portrait');
  await pause(900);
  const reducedPortraitEnd=await motionSnapshot(session,'world-map-phone-portrait-reduced-motion-settled','portrait');
  const reducedPortraitDegrees=rotationDistance(reducedPortraitStart.rotation,reducedPortraitEnd.rotation);
  if(!reducedPortraitStart.reduced||reducedPortraitStart.orbit!=='none'||reducedPortraitStart.sparkles!=='none'||reducedPortraitStart.stars.some(name=>name!=='none')||reducedPortraitStart.particles.some(name=>name!=='none')||reducedPortraitDegrees>.1)throw new Error(`Reduced-motion portrait did not remain static: ${JSON.stringify({reducedPortraitStart,reducedPortraitEnd,reducedPortraitDegrees})}`);
  evidence.screenshots.push(reducedPortraitStart.frame,reducedPortraitEnd.frame);
  evidence.motion.push({device:'phone',orientation:'portrait',mode:'reduced-motion',rotationDegrees:reducedPortraitDegrees,orbit:reducedPortraitEnd.orbit,sparkles:reducedPortraitEnd.sparkles,stars:reducedPortraitEnd.stars,particles:reducedPortraitEnd.particles,frames:[reducedPortraitStart.frame.name,reducedPortraitEnd.frame.name],status:'PASS'});
  evidence.flow.push({step:'home-touch-to-magical-spinning-globe',target:openTarget,status:'PASS'});

  await tap(session,'.aria-world-globe__surprise','Surprise Me');
  const surprise=await waitFor(session.evaluate,`(()=>{const state=v33GlobeController?.getState?.()||{};const pending=state.pending||null;return {visible:!!pending&&!state.selected,pending,selected:state.selected||null,message:document.querySelector('.aria-world-globe__empty-state p')?.textContent?.trim()||''}})()`,'Surprise Me country hint');
  if(!surprise.pending||surprise.selected||!surprise.message.includes('Tap the highlighted flag'))throw new Error(`Surprise Me must suggest a country and wait for a flag tap: ${JSON.stringify(surprise)}`);
  evidence.flow.push({step:'surprise-me-waits-for-explicit-flag-selection',...surprise,status:'PASS'});
  await waitFor(session.evaluate,`(()=>{const f=document.querySelector('.aria-world-globe__flag.is-pending');return {visible:!!f&&document.activeElement===f}})()`,'settled Surprise Me flag');
  const selectedFlag=await tap(session,'.aria-world-globe__flag.is-pending','Select the suggested country flag');
  const selectedCountry=await waitFor(session.evaluate,`(()=>{const state=v33GlobeController?.getState?.()||{},title=document.querySelector('.aria-world-globe__panel-head h2');const selectedFlag=[...document.querySelectorAll('.aria-world-globe__flag.is-selected')][0];return {visible:!!title&&!!state.selected&&!state.pending,name:title?.textContent?.trim()||'',flagName:selectedFlag?.getAttribute('aria-label')||'',selected:state.selected||null}})()`,'explicit suggested country flag selection');
  if(!selectedCountry.name||selectedCountry.name!==selectedCountry.flagName||selectedCountry.selected!==surprise.pending)throw new Error(`Explicit flag selection did not open the suggested country: ${JSON.stringify({surprise,selectedCountry})}`);
  evidence.flow.push({step:'android-touch-selects-suggested-flag',target:selectedFlag,...selectedCountry,status:'PASS'});
  if(selectedCountry.selected!=='india'){let indiaVisible=false;for(let attempt=0;attempt<6;attempt++){indiaVisible=await session.evaluate(`!!document.querySelector('.aria-world-globe__flag[aria-label="India"]')`);if(indiaVisible)break;await dragGlobe(session,attempt%2===0?160:-320)}if(!indiaVisible)throw new Error('India flag did not rotate into the visible hemisphere after Android globe drags');const indiaFlag=await tap(session,'.aria-world-globe__flag[aria-label="India"]','Explicitly select India');const indiaCountry=await waitFor(session.evaluate,`(()=>{const state=v33GlobeController?.getState?.()||{},title=document.querySelector('.aria-world-globe__panel-head h2');return {visible:!!title&&!!state.selected&&!state.pending,name:title?.textContent?.trim()||'',selected:state.selected||null}})()`,'explicit India flag selection');if(indiaCountry.name!=='India'||indiaCountry.selected!=='india')throw new Error(`Explicit India selection opened the wrong country: ${JSON.stringify(indiaCountry)}`);evidence.flow.push({step:'android-touch-selects-india-flag-for-canonical-recipe-check',target:indiaFlag,...indiaCountry,status:'PASS'});}
  await setMotionPreference(session,'reduce');
  const country=await waitFor(session.evaluate,`(()=>{const panel=document.querySelector('.aria-world-globe__panel'),title=panel?.querySelector('.aria-world-globe__panel-head h2'),r=panel?.getBoundingClientRect(),x=panel?.querySelector('.aria-world-globe__close'),xr=x?.getBoundingClientRect(),cards=[...document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]')];return {visible:!!title&&!!r&&r.width>=innerWidth*.98&&r.height>=innerHeight*.95&&panel.classList.contains('is-portrait-overlay'),name:title?.textContent?.trim()||'',x:{visible:!!x&&!!xr&&xr.width>=48&&xr.height>=48&&x.getAttribute('aria-label')==='Close country recipes',top:xr?.top||0,right:xr?.right||0},viewportWidth:innerWidth,cards:cards.map(x=>Number(x.dataset.recipeId)),cardMinHeight:Math.min(...cards.map(x=>x.getBoundingClientRect().height)),rotation:Number(v33GlobeController?.getState?.().rotation||0),selected:v33GlobeController?.getState?.().selected||null,locale:state.language,stamps:(state.worldStamps||[]).slice()}})()`,'full-screen India recipe list and X close');
  if(country.name!=='India'||country.cards.length!==18||new Set(country.cards).size!==18||country.cards.some(id=>id<1||id>95)||country.cardMinHeight<88||!country.x.visible||country.x.top>80||country.x.right>country.viewportWidth||country.selected!=='india')throw new Error(`India full-screen overlay, large cards or accessible X failed: ${JSON.stringify(country)}`);
  evidence.flow.push({step:'android-touch-india-country-cards',recipeIds:country.cards,status:'PASS'});
  const countryShot=await stableScreenshot(session,'country-preview-phone-portrait','portrait',mapShot.sha256);evidence.screenshots.push(countryShot);
  const closeButtonShot=await stableScreenshot(session,'country-x-close-phone-portrait','portrait');evidence.screenshots.push(closeButtonShot);
  if(countryShot.sha256===mapShot.sha256)throw new Error('Android framebuffer did not capture the India country-card overlay');
  const dismissRotation=country.rotation,dismissLocale=country.locale,dismissStamps=JSON.stringify(country.stamps);
  await tap(session,'.aria-world-globe__close','Close country recipes with the accessible X');
  const xDismiss=await waitFor(session.evaluate,`(()=>{const p=document.querySelector('.aria-world-globe__panel'),s=v33GlobeController?.getState?.()||{};return {visible:!p?.classList.contains('is-portrait-overlay')&&p?.classList.contains('is-portrait-dismissed'),selected:s.selected||null,rotation:Number(s.rotation||0),locale:state.language,stamps:JSON.stringify(state.worldStamps||[])}})()`,'portrait country X dismissal');
  if(!xDismiss.visible||xDismiss.selected!=='india'||xDismiss.rotation!==dismissRotation||xDismiss.locale!==dismissLocale||xDismiss.stamps!==dismissStamps)throw new Error(`X must close only the list and preserve globe, locale and Passport state: ${JSON.stringify({country,xDismiss})}`);
  evidence.flow.push({step:'portrait-x-closes-country-list-preserving-globe-state',...xDismiss,status:'PASS'});
  await tap(session,'.aria-world-globe__flag[aria-label="India"]','Reopen India recipes from the preserved globe');
  const reopened=await waitFor(session.evaluate,`(()=>{const p=document.querySelector('.aria-world-globe__panel'),s=v33GlobeController?.getState?.()||{};return {visible:p?.classList.contains('is-portrait-overlay'),selected:s.selected||null,rotation:Number(s.rotation||0)}})()`,'portrait country list reopen');
  if(!reopened.visible||reopened.selected!=='india'||reopened.rotation!==dismissRotation)throw new Error(`Reopening India recipes changed the globe selection or rotation: ${JSON.stringify(reopened)}`);
  session.ws.close();adb(['shell','input','keyevent','4']);await pause(700);session=await connect();
  const backDismiss=await waitFor(session.evaluate,`(()=>{const p=document.querySelector('.aria-world-globe__panel'),s=v33GlobeController?.getState?.()||{};return {visible:!p?.classList.contains('is-portrait-overlay')&&p?.classList.contains('is-portrait-dismissed'),selected:s.selected||null,rotation:Number(s.rotation||0),locale:state.language,stamps:JSON.stringify(state.worldStamps||[])}})()`,'Android Back closes portrait recipe list');
  if(!backDismiss.visible||backDismiss.selected!=='india'||backDismiss.rotation!==dismissRotation||backDismiss.locale!==dismissLocale||backDismiss.stamps!==dismissStamps)throw new Error(`Android Back must close only the list and preserve globe, locale and Passport state: ${JSON.stringify({country,backDismiss})}`);
  evidence.flow.push({step:'android-back-closes-country-list-preserving-globe-state',...backDismiss,status:'PASS'});
  await tap(session,'.aria-world-globe__flag[aria-label="India"]','Reopen India recipes after Android Back');
  await waitFor(session.evaluate,`(()=>({visible:document.querySelector('.aria-world-globe__panel')?.classList.contains('is-portrait-overlay')}))()`,'India recipe overlay reopened after Back');
  const recipeTarget=await tap(session,'.aria-world-globe__recipe[data-recipe-id="51"]','Open canonical recipe #51');
  const recipe=await waitFor(session.evaluate,`(()=>{const h=document.querySelector('.ref-hero h1'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,title:h?.textContent?.trim()||'',id:Number(selected?.id||0),route:typeof view==='undefined'?'unknown':view}})()`,'canonical India recipe');
  if(recipe.id!==51||recipe.route!=='recipe'||recipe.title!=='Masala Cheese Toast')throw new Error(`Country recipe card opened the wrong route: ${JSON.stringify(recipe)}`);
  evidence.flow.push({step:'country-card-to-existing-recipe-details',target:recipeTarget,...recipe,status:'PASS'});
  const recipeShot=await stableScreenshot(session,'recipe-navigation-phone-portrait','portrait',countryShot.sha256);
  if(recipeShot.sha256===countryShot.sha256)throw new Error('Android framebuffer still shows country cards after canonical recipe navigation');
  evidence.screenshots.push(recipeShot);
  session.ws.close();adb(['shell','input','keyevent','4']);await pause(700);session=await connect();
  const returned=await waitFor(session.evaluate,`(()=>{const p=document.querySelector('.aria-world-globe__panel'),h=p?.querySelector('.aria-world-globe__panel-head h2'),r=p?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>=innerWidth*.98&&r.height>=innerHeight*.95&&p.classList.contains('is-portrait-overlay'),route:typeof view==='undefined'?'unknown':view,country:h?.textContent?.trim()||'',cards:document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]').length}})()`,'Android Back to India recipe overlay');
  if(returned.route!=='world'||returned.country!=='India'||returned.cards!==18||!returned.visible)throw new Error(`Android Back did not restore the India recipe overlay: ${JSON.stringify(returned)}`);
  evidence.flow.push({step:'android-back-restores-country-cards',...returned,status:'PASS'});
  await setMotionPreference(session,'reduce');
  const backShot=await stableScreenshot(session,'world-map-back-phone-portrait','portrait',recipeShot.sha256);evidence.screenshots.push(backShot);

  adb(['shell','input','keyevent','4']);await pause(400);const clearedForLandscape=await waitFor(session.evaluate,`(()=>({selected:v33GlobeController?.getState?.().selected||null,route:typeof view==='undefined'?'unknown':view}))()`,'clear country selection before landscape idle-spin check');if(clearedForLandscape.route!=='world'||clearedForLandscape.selected!==null)throw new Error(`A second Android Back should clear the preserved country selection before landscape idle-spin validation: ${JSON.stringify(clearedForLandscape)}`);session=await setOrientation(session,true);
  await setMotionPreference(session,'no-preference');
  const landscapeMotionStart=await motionSnapshot(session,'world-map-phone-landscape-motion-start','landscape');evidence.screenshots.push(landscapeMotionStart.frame);
  await pause(2200);
  const landscapeMotionEnd=await motionSnapshot(session,'world-map-phone-landscape-motion-end','landscape');evidence.screenshots.push(landscapeMotionEnd.frame);
  const landscapeDegrees=rotationDistance(landscapeMotionStart.rotation,landscapeMotionEnd.rotation);
  if(landscapeMotionStart.reduced||landscapeMotionStart.orbit!=='v33-orbit-turn'||landscapeMotionStart.sparkles!=='v33-sparkle-twinkle'||landscapeMotionStart.stars.length!==8||landscapeMotionStart.stars.some(name=>name!=='v33-star-twinkle')||landscapeMotionStart.particles.length!==6||landscapeMotionStart.particles.some(name=>name!=='v33-particle-drift')||landscapeDegrees<2.5||landscapeMotionStart.frame.sha256===landscapeMotionEnd.frame.sha256)throw new Error(`Animation-enabled landscape did not show globe/orbit/star/particle motion: ${JSON.stringify({landscapeMotionStart,landscapeMotionEnd,landscapeDegrees})}`);
  evidence.motion.push({device:'phone',orientation:'landscape',mode:'animation-enabled',startDegrees:landscapeMotionStart.rotation,endDegrees:landscapeMotionEnd.rotation,rotationDegrees:landscapeDegrees,orbit:landscapeMotionEnd.orbit,sparkles:landscapeMotionEnd.sparkles,stars:landscapeMotionEnd.stars,particles:landscapeMotionEnd.particles,frames:[landscapeMotionStart.frame.name,landscapeMotionEnd.frame.name],frameHashes:[landscapeMotionStart.frame.sha256,landscapeMotionEnd.frame.sha256],status:'PASS'});
  const landscape=await session.evaluate(`(()=>{const m=${evalWorld};m.viewport={width:innerWidth,height:innerHeight};return m})()`);assertMap(landscape,'phone landscape',{requireVisibleIndia:false});
  const landscapeFrozen=await session.evaluate(`(()=>{const panel=document.querySelector('.aria-world-globe__panel'),hand=document.querySelector('.aria-world-globe__guide-hand'),flags=document.querySelector('.aria-world-globe__flags'),sphere=document.querySelector('.aria-world-globe__sphere');return {panelPosition:panel?getComputedStyle(panel).position:'missing',overlay:!!panel?.classList.contains('is-portrait-overlay'),handDisplay:hand?getComputedStyle(hand).display:'missing',flagsRemainInSphere:!!sphere&&flags?.parentElement===sphere,viewport:{width:innerWidth,height:innerHeight}}})()`);
  if(landscapeFrozen.viewport.width<=landscapeFrozen.viewport.height||landscapeFrozen.panelPosition!=='relative'||landscapeFrozen.overlay||landscapeFrozen.handDisplay!=='none'||!landscapeFrozen.flagsRemainInSphere)throw new Error(`Landscape approved panel, artwork and flag layering changed: ${JSON.stringify(landscapeFrozen)}`);
  evidence.flow.push({step:'approved-landscape-layout-and-layering-non-regression',...landscapeFrozen,status:'PASS'});
  evidence.geometry.push({device:'phone',orientation:'landscape',...landscape});
  await setMotionPreference(session,'reduce');
  const reducedLandscapeStart=await motionSnapshot(session,'world-map-phone-landscape-reduced-motion','landscape');await pause(900);const reducedLandscapeEnd=await motionSnapshot(session,'world-map-phone-landscape-reduced-motion-settled','landscape');
  const reducedLandscapeDegrees=rotationDistance(reducedLandscapeStart.rotation,reducedLandscapeEnd.rotation);
  if(!reducedLandscapeStart.reduced||reducedLandscapeStart.orbit!=='none'||reducedLandscapeStart.sparkles!=='none'||reducedLandscapeStart.stars.some(name=>name!=='none')||reducedLandscapeStart.particles.some(name=>name!=='none')||reducedLandscapeDegrees>.1)throw new Error(`Reduced-motion landscape did not remain static: ${JSON.stringify({reducedLandscapeStart,reducedLandscapeEnd,reducedLandscapeDegrees})}`);
  evidence.screenshots.push(reducedLandscapeStart.frame,reducedLandscapeEnd.frame,await stableScreenshot(session,'world-map-phone-landscape','landscape',backShot.sha256));
  evidence.motion.push({device:'phone',orientation:'landscape',mode:'reduced-motion',rotationDegrees:reducedLandscapeDegrees,orbit:reducedLandscapeEnd.orbit,sparkles:reducedLandscapeEnd.sparkles,stars:reducedLandscapeEnd.stars,particles:reducedLandscapeEnd.particles,frames:[reducedLandscapeStart.frame.name,reducedLandscapeEnd.frame.name],status:'PASS'});
  evidence.flow.push({step:'globe-orientation-reflow',orientation:'landscape',viewport:await session.evaluate('({width:innerWidth,height:innerHeight})'),status:'PASS'});
  session=await setOrientation(session,false);
  await setMotionPreference(session,'reduce');

  await session.evaluate(`(()=>{state.language='pt-BR';render()})()`);
  const ptIndiaStatus=`(()=>{const heading=document.querySelector('.aria-world-globe__eyebrow')?.textContent?.trim()||'',flag=document.querySelector('.aria-world-globe__flag[aria-label="Índia"]'),sphere=document.querySelector('.aria-world-globe__sphere'),r=flag?.getBoundingClientRect(),s=sphere?.getBoundingClientRect(),style=flag?getComputedStyle(flag):null;const cx=s?(s.left+s.right)/2:0,cy=s?(s.top+s.bottom)/2:0,rad=s?Math.min(s.width,s.height)/2-2:0,corners=r?[[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]]:[];const contained=!!r&&!!s&&corners.every(([x,y])=>(x-cx)*(x-cx)+(y-cy)*(y-cy)<=rad*rad);return {visible:heading==='Aventura pelo mundo'&&!!flag&&flag.isConnected&&!!r&&r.width>=48&&r.height>=48&&!!style&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>.05&&contained,heading,marker:flag?.textContent?.trim()||'',label:flag?.getAttribute('aria-label')||'',rotation:Number(v33GlobeController?.getState?.().rotation||0),contained}})()`;
  let indiaPtMarker=false,ptIndia=null;for(let attempt=0;attempt<8;attempt++){ptIndia=await session.evaluate(ptIndiaStatus);if(ptIndia.visible){await pause(120);ptIndia=await session.evaluate(ptIndiaStatus);if(ptIndia.visible){indiaPtMarker=true;break}}const current=Number(ptIndia.rotation),target=-78,delta=((target-current+540)%360)-180;await dragGlobe(session,Math.max(-100,Math.min(100,delta/.55)))}if(!indiaPtMarker)throw new Error(`Could not rotate the localized PT-BR India marker fully into view: ${JSON.stringify(ptIndia)}`);
  const locale=await waitFor(session.evaluate,ptIndiaStatus,'PT-BR globe and visible India flag');
  if(locale.heading!=='Aventura pelo mundo'||locale.marker!=='🇮🇳'||!locale.label.includes('Índia'))throw new Error(`PT-BR globe localisation failed: ${JSON.stringify(locale)}`);
  evidence.flow.push({step:'PT-BR-globe-localisation',...locale,status:'PASS'});
  const ptIndiaTarget=await tap(session,'.aria-world-globe__flag[aria-label="Índia"]','Select localized PT-BR India marker');
  const ptIndiaSelection=await waitFor(session.evaluate,`(()=>{const s=v33GlobeController?.getState?.()||{};return {visible:s.selected==='india'&&!s.pending,selected:s.selected}})()`,'PT-BR India marker selection');
  evidence.flow.push({step:'PT-BR-touch-selects-India-marker',target:ptIndiaTarget,...ptIndiaSelection,status:'PASS'});
  const ptCards=await session.evaluate(`({title:document.querySelector('.aria-world-globe__panel-head h2')?.textContent?.trim()||'',count:document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]').length,first:document.querySelector('.aria-world-globe__recipe strong')?.textContent?.trim()||''})`);
  if(ptCards.title!=='Índia'||ptCards.count!==18)throw new Error(`PT-BR India cards failed: ${JSON.stringify(ptCards)}`);
  evidence.flow.push({step:'PT-BR-country-cards',...ptCards,status:'PASS'});
  await session.evaluate(`v33GlobeController?.handleBack?.()`);await pause(300);await session.evaluate(`state.language='en-GB';render()`);await setMotionPreference(session,'reduce');

  const emptyPassportBase=await stableScreenshot(session,'world-map-before-empty-passport-phone-portrait');evidence.screenshots.push(emptyPassportBase);
  await tap(session,'.aria-world-globe__passport','Open empty Food Passport');
  const passport=await session.evaluate(`(()=>({title:document.querySelector('#v33-passport-title')?.textContent?.trim()||'',stamps:[...document.querySelectorAll('.w02-passport-stamps .v31-stamp')].map(x=>x.textContent.trim()),done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice()}))()`);
  if(passport.title!=='My Food Passport'||passport.stamps.length||passport.done.length||passport.worldStamps.length)throw new Error(`Viewing map/passport must not award progress: ${JSON.stringify(passport)}`);
  evidence.flow.push({step:'food-passport-view-without-reward',...passport,status:'PASS'});
  evidence.screenshots.push(await stableScreenshot(session,'food-passport-phone-portrait','portrait',emptyPassportBase.sha256));
  await tap(session,'[data-v33-passport-close]','Close empty Food Passport');
  const passportClosed=await waitFor(session.evaluate,`(()=>({visible:!document.querySelector('.v33-passport-overlay'),overlay:!!document.querySelector('.v33-passport-overlay'),flags:[...document.querySelectorAll('.aria-world-globe__flag')].map(x=>x.getAttribute('aria-label'))}))()`,'empty Food Passport dismissal');
  if(passportClosed.overlay||!passportClosed.flags.includes('India'))throw new Error(`Closing Food Passport must restore the English globe flags: ${JSON.stringify(passportClosed)}`);
  evidence.flow.push({step:'food-passport-close-restores-globe',flags:passportClosed.flags,status:'PASS'});
  await tap(session,'.aria-world-globe__flag[aria-label="India"]','Open India after passport');
  await waitFor(session.evaluate,`(()=>{const h=document.querySelector('.aria-world-globe__panel-head h2'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,name:h?.textContent?.trim()||''}})()`,'India cards for completion');
  await tap(session,'.aria-world-globe__recipe[data-recipe-id="51"]','Open recipe 51 for completion');
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
  const completionBack=await waitFor(session.evaluate,`(()=>{const h=document.querySelector('.aria-world-globe__panel-head h2'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,route:typeof view==='undefined'?'unknown':view,country:h?.textContent?.trim()||'',cards:document.querySelectorAll('.aria-world-globe__recipe[data-recipe-id]').length}})()`,'Android Back after recipe completion');
  if(completionBack.route!=='world'||completionBack.country!=='India'||completionBack.cards!==18)throw new Error(`Android Back did not restore the country panel after recipe completion: ${JSON.stringify(completionBack)}`);
  await session.evaluate(`v33GlobeController?.handleBack?.()`);await pause(300);
  const earnedPassportBase=await stableScreenshot(session,'world-map-before-earned-passport-phone-portrait');evidence.screenshots.push(earnedPassportBase);
  await tap(session,'.aria-world-globe__passport','Open earned Food Passport');
  const earned=await session.evaluate(`(()=>({title:document.querySelector('#v33-passport-title')?.textContent?.trim()||'',stamps:[...document.querySelectorAll('.w02-passport-stamps .v31-stamp')].map(x=>x.textContent.trim()),done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice()}))()`);
  if(earned.title!=='My Food Passport'||earned.stamps.length!==1||!earned.stamps[0].includes('India')||earned.done.filter(id=>id===51).length!==1||earned.worldStamps.filter(code=>code==='IND').length!==1)throw new Error(`Completed canonical recipe did not produce exactly one India Food Passport stamp: ${JSON.stringify(earned)}`);
  evidence.flow.push({step:'food-passport-after-canonical-completion',...earned,status:'PASS'});
  evidence.screenshots.push(await stableScreenshot(session,'food-passport-earned-phone-portrait','portrait',earnedPassportBase.sha256));
  session.ws.close();adb(['shell','am','force-stop',appId]);adb(['shell','cmd','connectivity','airplane-mode','enable']);adb(['shell','monkey','-p',appId,'1']);await pause(1200);session=await connect();
  await waitFor(session.evaluate,`(()=>{const h=document.querySelector('.v31-hero-welcome h1'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0}})()`,'offline relaunch Home');
  await session.evaluate(`document.querySelector('[data-v31-open-world]')?.click()`);await waitFor(session.evaluate,evalWorld,'offline relaunch Magical Globe');
  const offlinePassportBase=await stableScreenshot(session,'world-map-before-offline-passport-phone-portrait');evidence.screenshots.push(offlinePassportBase);
  await tap(session,'.aria-world-globe__passport','Open Food Passport offline');
  const persisted=await session.evaluate(`(()=>({title:document.querySelector('#v33-passport-title')?.textContent?.trim()||'',stamps:[...document.querySelectorAll('.w02-passport-stamps .v31-stamp')].map(x=>x.textContent.trim()),done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice()}))()`);
  const airplane=adb(['shell','cmd','connectivity','airplane-mode']).toString('utf8').trim().toLowerCase();
  if(persisted.title!=='My Food Passport'||persisted.stamps.length!==1||!persisted.stamps[0].includes('India')||persisted.done.filter(id=>id===51).length!==1||persisted.worldStamps.filter(code=>code==='IND').length!==1||airplane!=='enabled')throw new Error(`Food Passport offline restart persistence failed: ${JSON.stringify({persisted,airplane})}`);
  evidence.flow.push({step:'food-passport-offline-restart-persistence',...persisted,airplane,status:'PASS'});evidence.screenshots.push(await stableScreenshot(session,'food-passport-offline-phone-portrait','portrait',offlinePassportBase.sha256));
  evidence.logs=adb(['logcat','-d','-t','2500']).toString('utf8').split('\n').filter(line=>line.includes(appId)||line.includes('ANR in')).slice(-250);
  if(evidence.logs.some(line=>line.includes('ANR in')&&line.includes(appId)))throw new Error('Android logcat contains an ANR for the World Map sample package');
  evidence.status='PASS';evidence.completedAt=new Date().toISOString();
  writeFileSync('artifacts/v33-world-map-sample/sample-smoke.json',`${JSON.stringify(evidence,null,2)}\n`);
  console.log(`W02 Magical Spinning Globe phone smoke PASS: ${JSON.stringify(evidence)}`);
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
