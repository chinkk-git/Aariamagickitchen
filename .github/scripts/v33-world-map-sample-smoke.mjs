import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const appId = process.env.ANDROID_TEST_APP_ID;
if (!appId) throw new Error('ANDROID_TEST_APP_ID is required');
const adb = args => execFileSync('adb', args, { timeout: 30_000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const screenshots = 'artifacts/v33-world-map-sample/screenshots';
mkdirSync(screenshots, { recursive: true });

async function connect() {
  let target;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const targets = await (await fetch('http://127.0.0.1:9224/json')).json();
      target = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl &&
        (item.url?.includes('appassets.androidplatform.net') || item.title?.includes('Magical Kitchen')));
      if (target) break;
    } catch { }
    await pause(500);
  }
  if (!target) throw new Error('Clean phone emulator did not expose the app-owned WebView');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
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
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (orientation === 'portrait' && width >= height) throw new Error(`${name} should be a phone portrait screenshot, got ${width}x${height}`);
  if (orientation === 'landscape' && width <= height) throw new Error(`${name} should be a phone landscape screenshot, got ${width}x${height}`);
  writeFileSync(`${screenshots}/${name}.png`, png);
  return { name: `${name}.png`, width, height, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') };
}

let session;
const apkBytes = readFileSync('phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk');
const evidence = {
  schemaVersion: 2,
  sourceCommit: process.env.GITHUB_SHA || 'local',
  workflowRunId: process.env.GITHUB_RUN_ID || 'local',
  packageId: appId,
  apkBytes: apkBytes.length,
  apkSha256: createHash('sha256').update(apkBytes).digest('hex'),
  device: 'clean Pixel 3a API 35 emulator',
  flow: [],
  geometry: [],
  gestures: [],
  screenshots: []
};
const evalWorld = `(()=>{const screen=document.querySelector('#screen.v31-world-screen'),wrap=document.querySelector('[data-v33-map-viewport]'),space=document.querySelector('.v31-map-world-space'),image=document.querySelector('.v31-map-art-image'),screenRect=screen?.getBoundingClientRect(),wrapRect=wrap?.getBoundingClientRect(),spaceRect=space?.getBoundingClientRect(),imageRect=image?.getBoundingClientRect(),expected=V31_HOME_WORLD_ART?.worldMap||'',imageStyle=image?getComputedStyle(image):null,wrapStyle=wrap?getComputedStyle(wrap):null,approvedArt=expected.startsWith('data:image/webp;base64,')&&image?.src===expected&&image.complete&&image.naturalWidth>0,occupancy=screenRect&&wrapRect?wrapRect.width*wrapRect.height/(screenRect.width*screenRect.height):0,imageAspect=image?.naturalWidth&&image?.naturalHeight?image.naturalWidth/image.naturalHeight:0,renderedImageAspect=imageRect?.width&&imageRect?.height?imageRect.width/imageRect.height:0,framed=Number.parseFloat(wrapStyle?.borderWidth||'0')>0||Number.parseFloat(wrapStyle?.borderRadius||'0')>2,pins=[...document.querySelectorAll('.v31-map-pin')],ids=pins.map(p=>p.dataset.v31Country),markerGeometry=pins.map(pin=>{const hit=pin.querySelector('.v31-pin-hit'),box=hit?.getBBox(),anchor=pin.getScreenCTM(),x=Number(pin.dataset.mapX),y=Number(pin.dataset.mapY),rect=box&&anchor?[[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]].map(([px,py])=>new DOMPoint(px,py).matrixTransform(anchor)):[],left=Math.min(...rect.map(p=>p.x)),right=Math.max(...rect.map(p=>p.x)),top=Math.min(...rect.map(p=>p.y)),bottom=Math.max(...rect.map(p=>p.y)),expectedX=wrapRect&&v31MapBaseWidth?wrapRect.x+wrapRect.width/2+v31PanX+(x*v31MapBaseWidth/1000-v31MapBaseWidth/2)*v31MapZoom:NaN,expectedY=wrapRect&&v31MapBaseHeight?wrapRect.y+wrapRect.height/2+v31PanY+(y*v31MapBaseHeight/V33_MAP_HEIGHT-v31MapBaseHeight/2)*v31MapZoom:NaN,anchorX=anchor?.e??NaN,anchorY=anchor?.f??NaN;return {code:pin.dataset.v31Country,hitWidth:right-left,hitHeight:bottom-top,geographicAnchorError:Math.hypot(anchorX-expectedX,anchorY-expectedY),screenAnchor:{x:anchorX,y:anchorY},expectedAnchor:{x:expectedX,y:expectedY},hitRect:rect.length?{left,right,top,bottom}:null}}),overlapPairs=markerGeometry.flatMap((a,i)=>markerGeometry.slice(i+1).filter(b=>a.hitRect&&b.hitRect&&a.hitRect.left<b.hitRect.right&&a.hitRect.right>b.hitRect.left&&a.hitRect.top<b.hitRect.bottom&&a.hitRect.bottom>b.hitRect.top).map(b=>a.code+':'+b.code)),recipeCount=document.querySelectorAll('.v33-preview-recipe-list [data-v31-approved-recipe]').length;return {visible:!!wrapRect&&wrapRect.width>0&&wrapRect.height>0,heading:document.querySelector('.v31-world-header h1')?.textContent?.trim()||'',route:typeof view==='undefined'?'unknown':view,approvedArt,artNaturalWidth:image?.naturalWidth||0,artNaturalHeight:image?.naturalHeight||0,imageAspect,renderedImageAspect,objectFit:imageStyle?.objectFit||'',deviceScaleFactor:devicePixelRatio||1,occupancy,framed,mapAspect:spaceRect?.width&&spaceRect?.height?spaceRect.width/spaceRect.height:0,markers:ids,markerGeometry,overlapPairs,recipeCount,zoom:typeof v31MapZoom==='number'?v31MapZoom:0,panX:typeof v31PanX==='number'?v31PanX:0,panY:typeof v31PanY==='number'?v31PanY:0,baseWidth:typeof v31MapBaseWidth==='number'?v31MapBaseWidth:0,baseHeight:typeof v31MapBaseHeight==='number'?v31MapBaseHeight:0,wrap:wrapRect?{x:wrapRect.x,y:wrapRect.y,width:wrapRect.width,height:wrapRect.height}:null}})()`;
function assertGeometry(g, label) {
  if (g.route !== 'world' || g.heading !== 'World Map' || !g.approvedArt || g.occupancy < 0.85 || g.occupancy > 0.95 || g.framed || Math.abs(g.mapAspect - 717/389) > 0.02 || Math.abs(g.imageAspect - g.renderedImageAspect) > 0.02 || g.markers.length !== 6 || !['IND','ITA','CHN','JPN','MEX','VNM'].every(code=>g.markers.includes(code)) || g.markerGeometry?.length !== 6 || g.markerGeometry.some(m=>m.hitWidth<44||m.hitHeight<44||m.geographicAnchorError>2) || g.overlapPairs?.length) {
    throw new Error(`${label} rendered map geometry/art acceptance failed: ${JSON.stringify(g)}`);
  }
}
async function setOrientation(landscape) {
  adb(['shell','settings','put','system','accelerometer_rotation','0']);
  const target = landscape ? 'landscape' : 'portrait';
  const rotations = landscape ? [1,3,0,2] : [0,2,1,3];
  for (const rotation of rotations) {
    adb(['shell','settings','put','system','user_rotation',String(rotation)]);
    for (let i=0;i<20;i++) {
      await pause(300);
      const viewport=await session.evaluate('({width:innerWidth,height:innerHeight})');
      if ((viewport.width>viewport.height)===landscape) { await pause(500); return viewport; }
    }
  }
  throw new Error(`Phone emulator did not reach ${target} orientation`);
}
try {
  session = await connect();
  await waitFor(session.evaluate,
    `(()=>{const e=document.querySelector('.v31-hero-welcome h1');const r=e?.getBoundingClientRect();return {visible:!!e&&!!r&&r.width>0&&r.height>0,text:e?.textContent?.trim()||''}})()`, 'Home');
  const profileDialog = await session.evaluate(`(()=>{const d=document.querySelector('#v3ProfileDialog'),r=d?.getBoundingClientRect();return !!d&&!!r&&r.width>0&&r.height>0&&getComputedStyle(d).display!=='none'})()`);
  if (profileDialog) {
    const chose = await session.evaluate(`(()=>{const chef=document.querySelector('#v3ProfileDialog [data-v3-chef]'),continueButton=document.querySelector('#v3ProfileDialog [data-v3-profile-continue]');if(!chef||!continueButton)return false;chef.click();continueButton.click();return true})()`);
    if (!chose) throw new Error('Fresh-install profile chooser could not be completed with the sample Chef profile');
    await pause(700);
  }
  evidence.flow.push({ step:'clean-install-launch',route:'home',packageId:appId,status:'PASS' });
  const homeScreenshot = screenshot('home-phone-portrait');
  evidence.screenshots.push(homeScreenshot);
  const homeWorldTarget = await session.evaluate(`(()=>{const button=document.querySelector('[data-v31-open-world]'),r=button?.getBoundingClientRect();return {visible:!!button&&!!r&&r.width>0&&r.height>0&&getComputedStyle(button).visibility!=='hidden',x:r?(r.left+r.right)/2:0,y:r?(r.top+r.bottom)/2:0}})()`);
  if (!homeWorldTarget.visible) throw new Error('Home Explore the World control was missing or unreachable');
  await session.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:homeWorldTarget.x,y:homeWorldTarget.y,id:10}]});
  await session.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  let world=await waitFor(session.evaluate,evalWorld,'World Map with approved art');
  assertGeometry(world,'Phone portrait');
  evidence.geometry.push({device:'phone',orientation:'portrait',...world});
  evidence.flow.push({step:'home-to-world-map',...world,homeWorldTarget,status:'PASS'});
  await session.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  await pause(400);
  const worldScreenshot = screenshot('world-map-phone-portrait');
  if (worldScreenshot.sha256 === homeScreenshot.sha256) throw new Error('Android-rendered pixels remained on Home after the World Map DOM route loaded');
  evidence.screenshots.push(worldScreenshot);

  // Tap the rendered India marker through Chromium's Android touch dispatch; this verifies the real SVG hit target rather than invoking its DOM click handler.
  const indiaTarget = world.markerGeometry.find(marker=>marker.code==='IND')?.screenAnchor;
  if (!indiaTarget || indiaTarget.x<world.wrap.x || indiaTarget.x>world.wrap.x+world.wrap.width || indiaTarget.y<world.wrap.y || indiaTarget.y>world.wrap.y+world.wrap.height) throw new Error(`India marker is not inside the portrait touch viewport: ${JSON.stringify(indiaTarget)}`);
  await session.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:indiaTarget.x,y:indiaTarget.y,id:31}]});
  await session.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const indiaTouch = await waitFor(session.evaluate,`(()=>{const title=document.querySelector('#v33-country-title');return {visible:!!title,name:title?.textContent?.trim()||'',recipes:document.querySelectorAll('.v33-preview-recipe-list [data-v31-approved-recipe]').length}})()`,'Android touch country preview');
  if (indiaTouch.name!=='India'||indiaTouch.recipes!==18) throw new Error(`Android touch missed the India marker or canonical recipe list: ${JSON.stringify(indiaTouch)}`);
  evidence.flow.push({step:'android-touch-country-marker',...indiaTouch,screenAnchor:indiaTarget,status:'PASS'});
  await session.evaluate(`document.querySelector('[data-v31-panel-close]')?.click()`);

  // Real Android touch injection through Chrome DevTools exercises WebView pointer routing.
  let wrap=world.wrap,cx=wrap.x+wrap.width*.49,cy=wrap.y+wrap.height*.53;
  await session.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-36,y:cy,id:11},{x:cx+36,y:cy,id:12}]});
  await session.command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-86,y:cy,id:11},{x:cx+86,y:cy,id:12}]});
  await pause(350);
  await session.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await pause(300);
  let zoomed=await session.evaluate(evalWorld);
  assertGeometry(zoomed,'Phone portrait after pinch');
  if (!(zoomed.zoom>1&&zoomed.zoom<=3)) throw new Error(`Pinch zoom was not bounded or did not change camera: ${JSON.stringify(zoomed)}`);
  evidence.gestures.push({gesture:'two-finger-pinch',before:world.zoom,after:zoomed.zoom,status:'PASS'});
  evidence.screenshots.push(screenshot('zoomed-continent-phone-portrait'));
  const reset=await session.evaluate(`(()=>{document.querySelector('.v33-map-reset')?.click();return {zoom:v31MapZoom,panX:v31PanX,panY:v31PanY}})()`);
  if(reset.zoom!==1||Math.abs(reset.panX+world.baseWidth*.2)>2||Math.abs(reset.panY)>2)throw new Error(`Globe reset did not return to the portrait world focus: ${JSON.stringify(reset)}`);
  const dragStart=await session.evaluate(evalWorld),dragWrap=dragStart.wrap;
  const physical=adb(['shell','wm','size']).toString('utf8').match(/Physical size: (\d+)x(\d+)/);
  const displayW=Number(physical?.[1]||1080),displayH=Number(physical?.[2]||2220),scaleX=displayW/(await session.evaluate('innerWidth')),scaleY=displayH/(await session.evaluate('innerHeight'));
  const x1=Math.round((dragWrap.x+dragWrap.width*.32)*scaleX),x2=Math.round((dragWrap.x+dragWrap.width*.44)*scaleX),y=Math.round((dragWrap.y+dragWrap.height*.54)*scaleY);
  adb(['shell','input','touchscreen','swipe',String(x1),String(y),String(x2),String(y),'450']);
  await pause(350);
  const dragged=await session.evaluate(evalWorld);
  assertGeometry(dragged,'Phone portrait after pan');
  if(Math.abs(dragged.panX-dragStart.panX)<8)throw new Error(`One-finger drag did not pan the map: ${JSON.stringify({before:dragStart.panX,after:dragged.panX})}`);
  const indiaMarker=await session.evaluate(`(()=>{const pin=document.querySelector('.v31-map-pin[data-v31-country="IND"]'),r=pin?.getBoundingClientRect(),wrap=document.querySelector('.v31-map-wrap')?.getBoundingClientRect();return {visible:!!r&&!!wrap&&r.width>0&&r.height>0&&r.right>wrap.left&&r.left<wrap.right&&r.bottom>wrap.top&&r.top<wrap.bottom,centerX:r?r.left+r.width/2:0,centerY:r?r.top+r.height/2:0}})()`);
  if(!indiaMarker.visible)throw new Error(`India marker lost alignment/visibility after pan: ${JSON.stringify(indiaMarker)}`);
  evidence.gestures.push({gesture:'one-finger-drag',before:dragStart.panX,after:dragged.panX,marker:indiaMarker,status:'PASS'});
  await session.evaluate(`document.querySelector('.v33-map-reset')?.click()`);

  await setOrientation(true);
  const phoneLandscape=await session.evaluate(evalWorld);assertGeometry(phoneLandscape,'Phone landscape');
  evidence.geometry.push({device:'phone',orientation:'landscape',...phoneLandscape});
  evidence.screenshots.push(screenshot('world-map-phone-landscape','landscape'));
  await setOrientation(false);
  world=await session.evaluate(evalWorld);assertGeometry(world,'Phone portrait after rotation');
  wrap=world.wrap;cx=wrap.x+wrap.width*.49;cy=wrap.y+wrap.height*.53;
  await session.command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-45,y:cy,id:21},{x:cx+45,y:cy,id:22}]});
  await session.command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-60,y:cy,id:21},{x:cx+60,y:cy,id:22}]});
  await pause(300);await session.command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(250);
  world=await session.evaluate(evalWorld);assertGeometry(world,'Phone portrait before country preview');
  if(!(world.zoom>1&&world.zoom<=3))throw new Error(`Persistent map-position test pinch failed: ${JSON.stringify(world)}`);

  const locale=await session.evaluate(`(()=>{state.language='pt-BR';render();return {heading:document.querySelector('.v31-world-header h1')?.textContent?.trim()||'',indiaLabel:document.querySelector('.v31-map-pin[data-v31-country="IND"]')?.getAttribute('aria-label')||'',englishOnlyDraftLinks:document.querySelectorAll('.v33-preview-recipe-list [data-v31-approved-recipe]').length};})()`);
  if(locale.heading!=='Mapa do mundo'||!locale.indiaLabel.includes('Índia')||locale.englishOnlyDraftLinks!==0)throw new Error(`PT-BR map preview language gate failed: ${JSON.stringify(locale)}`);
  const ptTap=await session.evaluate(`(()=>{document.querySelector('.v31-map-pin[data-v31-country="IND"]')?.click();return {name:document.querySelector('#v33-country-title')?.textContent?.trim()||'',recipes:document.querySelectorAll('.v33-preview-recipe-list [data-v31-approved-recipe]').length}})()`);
  if(ptTap.name!=='Índia'||ptTap.recipes!==18)throw new Error(`PT-BR country preview/canonical mapping failed: ${JSON.stringify(ptTap)}`);
  evidence.flow.push({step:'PT-BR-country-preview',...ptTap,status:'PASS'});
  await session.evaluate(`document.querySelector('[data-v31-panel-close]')?.click();state.language='en-GB';render()`);
  await pause(400);
  const country=await session.evaluate(`(()=>{document.querySelector('.v31-map-pin[data-v31-country="IND"]')?.click();return {name:document.querySelector('#v33-country-title')?.textContent?.trim()||'',recipes:[...document.querySelectorAll('.v33-preview-recipe-list [data-v31-approved-recipe]')].map(e=>Number(e.dataset.v31ApprovedRecipe)),camera:{zoom:v31MapZoom,x:v31PanX,y:v31PanY}}})()`);
  if(country.name!=='India'||country.recipes.length!==18||country.recipes.some(id=>id<1||id>95))throw new Error(`Country preview is not restricted to the 18 canonical India recipes: ${JSON.stringify(country)}`);
  evidence.flow.push({step:'country-preview',...country,status:'PASS'});
  evidence.screenshots.push(screenshot('country-preview-phone-portrait'));
  const openRecipe=await session.evaluate(`(()=>{document.querySelector('.v33-preview-recipe-list [data-v31-approved-recipe="51"]')?.click();return true})()`);
  if(!openRecipe)throw new Error('Canonical India recipe 51 link was missing from the country preview');
  const recipe=await waitFor(session.evaluate,`(()=>{const h=document.querySelector('.ref-hero h1'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,title:h?.textContent?.trim()||'',selectedId:Number(selected?.id||0),route:typeof view==='undefined'?'unknown':view}})()`,'Canonical India recipe');
  if(recipe.selectedId!==51||recipe.route!=='recipe'||recipe.title!=='Masala Cheese Toast')throw new Error(`Country preview opened wrong recipe: ${JSON.stringify(recipe)}`);
  evidence.flow.push({step:'country-to-canonical-recipe',...recipe,status:'PASS'});
  evidence.screenshots.push(screenshot('recipe-navigation-phone-portrait'));
  const cameraBeforeBack=country.camera;
  session.ws.close();adb(['shell','input','keyevent','4']);await pause(750);session=await connect();
  const returnedWorld=await waitFor(session.evaluate,`(()=>{const h=document.querySelector('.v31-world-header h1'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,heading:h?.textContent?.trim()||'',route:typeof view==='undefined'?'unknown':view,country:document.querySelector('#v33-country-title')?.textContent?.trim()||'',camera:{zoom:v31MapZoom,x:v31PanX,y:v31PanY}}})()`,'Android Back to country preview');
  if(returnedWorld.route!=='world'||returnedWorld.heading!=='World Map'||returnedWorld.country!=='India'||JSON.stringify(returnedWorld.camera)!==JSON.stringify(cameraBeforeBack))throw new Error(`Android Back did not restore the exact map/country state: ${JSON.stringify({returnedWorld,cameraBeforeBack})}`);
  evidence.flow.push({step:'android-back-restores-map-position',...returnedWorld,status:'PASS'});
  evidence.screenshots.push(screenshot('world-map-back-phone-portrait'));
  // Back closes the preview first, then the passport is opened without changing map state.
  session.ws.close();adb(['shell','input','keyevent','4']);await pause(400);session=await connect();
  const passport=await session.evaluate(`(()=>{document.querySelector('.v33-passport-button')?.click();return {title:document.querySelector('#v33-passport-title')?.textContent?.trim()||'',stamps:[...document.querySelectorAll('.v33-passport-stamps .v31-stamp')].map(x=>x.textContent.trim()),done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice(),camera:{zoom:v31MapZoom,x:v31PanX,y:v31PanY}}})()`);
  if(passport.title!=='My Food Passport'||passport.stamps.length!==new Set(passport.stamps).size||passport.done.length||passport.worldStamps.length)throw new Error(`Viewing a country/passport awarded a stamp or changed clean-install progress: ${JSON.stringify(passport)}`);
  evidence.flow.push({step:'food-passport-view-without-reward',...passport,status:'PASS'});
  session.ws.close();adb(['shell','input','keyevent','4']);await pause(400);session=await connect();
  const passportBack=await session.evaluate(`(()=>({route:typeof view==='undefined'?'unknown':view,country:document.querySelector('#v33-country-title')?.textContent?.trim()||'',camera:{zoom:v31MapZoom,x:v31PanX,y:v31PanY}}))()`);
  if(passportBack.route!=='world'||passportBack.country!=='India'||JSON.stringify(passportBack.camera)!==JSON.stringify(passport.camera))throw new Error(`Android Back from Food Passport did not restore the same map position: ${JSON.stringify({passportBack,passport})}`);
  evidence.flow.push({step:'passport-back-restores-map-position',...passportBack,status:'PASS'});

  // Seed a valid completed-recipe passport fixture only on the clean emulator, then prove app-owned storage survives force-stop/relaunch offline.
  const seeded=await session.evaluate(`(()=>{state.done=[51];state.worldStamps=['IND'];save();return {done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice()}})()`);
  if(seeded.done.join(',')!=='51'||seeded.worldStamps.join(',')!=='IND')throw new Error(`Could not prepare clean-emulator persistence fixture: ${JSON.stringify(seeded)}`);
  evidence.flow.push({step:'prepare-clean-emulator-persistence-fixture',...seeded,fixtureOnly:true,status:'PASS'});
  session.ws.close();adb(['shell','am','force-stop',appId]);adb(['shell','cmd','connectivity','airplane-mode','enable']);
  adb(['shell','monkey','-p',appId,'1']);await pause(1200);session=await connect();
  await waitFor(session.evaluate,`(()=>{const e=document.querySelector('.v31-hero-welcome h1'),r=e?.getBoundingClientRect();return {visible:!!e&&!!r&&r.width>0&&r.height>0}})()`,'offline relaunch Home');
  await session.evaluate(`(()=>{document.querySelector('[data-v31-open-world]')?.click();return true})()`);
  await waitFor(session.evaluate,evalWorld,'offline relaunch World Map');
  const persistedPassport=await session.evaluate(`(()=>{document.querySelector('.v33-passport-button')?.click();return {title:document.querySelector('#v33-passport-title')?.textContent?.trim()||'',stamps:[...document.querySelectorAll('.v33-passport-stamps .v31-stamp')].map(x=>x.textContent.trim()),done:(state.done||[]).map(Number),worldStamps:(state.worldStamps||[]).slice()}})()`);
  const deviceAirplane=adb(['shell','cmd','connectivity','airplane-mode']).toString('utf8').trim().toLowerCase();
  if(persistedPassport.title!=='My Food Passport'||persistedPassport.stamps.length!==1||!persistedPassport.stamps[0].includes('India')||persistedPassport.done.join(',')!=='51'||persistedPassport.worldStamps.join(',')!=='IND'||deviceAirplane!=='enabled')throw new Error(`Food Passport did not persist its completed canonical recipe stamp across offline relaunch: ${JSON.stringify({persistedPassport,deviceAirplane})}`);
  evidence.flow.push({step:'food-passport-offline-restart-persistence',...persistedPassport,deviceAirplane,status:'PASS'});
  evidence.screenshots.push(screenshot('food-passport-phone-portrait'));
  evidence.status='PASS';evidence.completedAt=new Date().toISOString();
  writeFileSync('artifacts/v33-world-map-sample/sample-smoke.json',`${JSON.stringify(evidence,null,2)}\n`);
  console.log(`W02 Adventure Explorer phone smoke PASS: ${JSON.stringify(evidence)}`);
} catch (error) {
  evidence.status='FAIL';evidence.error=String(error?.stack||error);
  writeFileSync('artifacts/v33-world-map-sample/sample-smoke.json',`${JSON.stringify(evidence,null,2)}\n`);
  throw error;
} finally {
  try { adb(['shell','cmd','connectivity','airplane-mode','disable']); } catch { /* the emulator is disposable; keep cleanup from masking the recorded smoke failure */ }
  adb(['shell','settings','put','system','accelerometer_rotation','1']);
  if(session?.ws?.readyState===WebSocket.OPEN)session.ws.close();
}
