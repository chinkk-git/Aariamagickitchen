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
  return { ws, evaluate };
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

function screenshot(name) {
  const png = adb(['exec-out', 'screencap', '-p']);
  if (png.length < 10_000 || png.readUInt32BE(0) !== 0x89504e47) throw new Error(`${name} is not a valid PNG screenshot`);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width >= height) throw new Error(`${name} should be a phone portrait screenshot, got ${width}x${height}`);
  writeFileSync(`${screenshots}/${name}.png`, png);
  return { name: `${name}.png`, width, height, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') };
}

let session;
const apkBytes = readFileSync('phase2-pilot/apps/aaria-android/app/build/outputs/apk/debug/app-debug.apk');
const evidence = {
  schemaVersion: 1,
  sourceCommit: process.env.GITHUB_SHA || 'local',
  workflowRunId: process.env.GITHUB_RUN_ID || 'local',
  packageId: appId,
  apkBytes: apkBytes.length,
  apkSha256: createHash('sha256').update(apkBytes).digest('hex'),
  device: 'clean Pixel 3a API 35 emulator',
  flow: [],
  screenshots: []
};
try {
  session = await connect();
  await waitFor(session.evaluate,
    `(()=>{const e=document.querySelector('.v31-hero-welcome h1');const r=e?.getBoundingClientRect();return {visible:!!e&&!!r&&r.width>0&&r.height>0,text:e?.textContent?.trim()||''}})()`,
    'Home');
  const profileDialog = await session.evaluate(`(()=>{const d=document.querySelector('#v3ProfileDialog'),r=d?.getBoundingClientRect();return !!d&&!!r&&r.width>0&&r.height>0&&getComputedStyle(d).display!=='none'})()`);
  if (profileDialog) {
    const chose = await session.evaluate(`(()=>{const chef=document.querySelector('#v3ProfileDialog [data-v3-chef]'),continueButton=document.querySelector('#v3ProfileDialog [data-v3-profile-continue]');if(!chef||!continueButton)return false;chef.click();continueButton.click();return true})()`);
    if (!chose) throw new Error('Fresh-install profile chooser could not be completed with the sample Chef profile');
    await pause(700);
  }
  evidence.flow.push({ step: 'launch', route: 'home', packageId: appId, status: 'PASS' });
  evidence.screenshots.push(screenshot('home-phone-portrait'));

  const openedWorld = await session.evaluate(`(()=>{const button=document.querySelector('[data-v31-open-world]');if(!button)return false;button.click();return true})()`);
  if (!openedWorld) throw new Error('Home Explore the World control was missing');
  const world = await waitFor(session.evaluate,
    `(()=>{const e=document.querySelector('.v31-world-header h1'),map=document.querySelector('.v31-map-art-image'),wrap=document.querySelector('.v31-map-wrap'),r=e?.getBoundingClientRect(),mapRect=map?.getBoundingClientRect(),wrapRect=wrap?.getBoundingClientRect(),expected=V31_HOME_WORLD_ART?.worldMap||'',actual=map?.src||'',visible=!!e&&!!r&&r.width>0&&r.height>0,approvedArt=expected.startsWith('data:image/png;base64,')&&actual===expected&&!!map?.complete&&map.naturalWidth>0;return {visible:visible&&approvedArt,heading:e?.textContent?.trim()||'',approvedArt,expectedPrefix:expected.slice(0,48),expectedLength:expected.length,actualPrefix:actual.slice(0,120),actualLength:actual.length,imageComplete:!!map?.complete,naturalWidth:map?.naturalWidth||0,mapArtScale:mapRect&&wrapRect?mapRect.width/wrapRect.width:0,recipeCount:document.querySelectorAll('.v31-approved-recipes [data-v31-approved-recipe]').length}})()`,
    'World Map and fully loaded approved art');
  if (world.visible) evidence.screenshots.push(screenshot('world-map-phone-portrait'));
  if (world.heading !== 'World Food Adventure' || !world.approvedArt || world.recipeCount !== 18) {
    throw new Error(`World Map sample verification failed: ${JSON.stringify(world)}`);
  }
  evidence.flow.push({ step: 'home-to-world-map', ...world, status: 'PASS' });

  const openedRecipe = await session.evaluate(`(()=>{const recipe=document.querySelector('.v31-approved-recipes [data-v31-approved-recipe="51"]');if(!recipe)return false;recipe.click();return true})()`);
  if (!openedRecipe) throw new Error('Canonical India recipe 51 link was missing from the World Map');
  const recipe = await waitFor(session.evaluate,
    `(()=>{const h=document.querySelector('.ref-hero h1'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,title:h?.textContent?.trim()||'',selectedId:Number(selected?.id||0),route:typeof view==='undefined'?'unknown':view}})()`,
    'Canonical India recipe');
  if (recipe.selectedId !== 51 || recipe.route !== 'recipe' || recipe.title !== 'Masala Cheese Toast') {
    throw new Error(`World Map recipe link opened the wrong detail: ${JSON.stringify(recipe)}`);
  }
  evidence.flow.push({ step: 'world-to-recipe', ...recipe, status: 'PASS' });
  evidence.screenshots.push(screenshot('recipe-phone-portrait'));

  session.ws.close();
  adb(['shell', 'input', 'keyevent', '4']);
  await pause(750);
  session = await connect();
  const returnedWorld = await waitFor(session.evaluate,
    `(()=>{const h=document.querySelector('.v31-world-header h1'),r=h?.getBoundingClientRect();return {visible:!!h&&!!r&&r.width>0&&r.height>0,heading:h?.textContent?.trim()||'',route:typeof view==='undefined'?'unknown':view}})()`,
    'Android Back to World Map');
  if (returnedWorld.route !== 'world' || returnedWorld.heading !== 'World Food Adventure') {
    throw new Error(`Android Back did not return from recipe to World Map: ${JSON.stringify(returnedWorld)}`);
  }
  evidence.flow.push({ step: 'android-back-to-world-map', ...returnedWorld, status: 'PASS' });
  evidence.screenshots.push(screenshot('world-map-back-phone-portrait'));

  evidence.status = 'PASS';
  evidence.completedAt = new Date().toISOString();
  writeFileSync('artifacts/v33-world-map-sample/sample-smoke.json', `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`W02 phone sample PASS: ${JSON.stringify(evidence)}`);
} catch (error) {
  evidence.status = 'FAIL';
  evidence.error = String(error?.stack || error);
  writeFileSync('artifacts/v33-world-map-sample/sample-smoke.json', `${JSON.stringify(evidence, null, 2)}\n`);
  throw error;
} finally {
  if (session?.ws?.readyState === WebSocket.OPEN) session.ws.close();
}
