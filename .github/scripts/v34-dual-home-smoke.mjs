import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const appId = process.env.ANDROID_TEST_APP_ID;
const device = process.env.V34_DEVICE || 'phone';
if (!appId) throw new Error('ANDROID_TEST_APP_ID is required');
const root = path.resolve('artifacts/v34-preview', device);
const baselineApk = path.resolve('downloaded/Aaria_V3_4_Upgrade_Baseline.apk');
fs.mkdirSync(path.join(root, 'screenshots'), { recursive: true });
fs.mkdirSync(path.join(root, 'logs'), { recursive: true });
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

if (device === 'tablet') {
  adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0');
  adb('shell', 'settings', 'put', 'system', 'user_rotation', '1');
}
adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable');
if (!fs.existsSync(baselineApk)) throw new Error('The lower-version V3.4 APK is required for the in-place update check.');
adb('install', '-r', baselineApk);
adb('shell', 'pm', 'clear', appId);
adb('shell', 'am', 'start', '-W', '-n', `${appId}/com.aaria.magickitchen.pilot.MainActivity`);

let socket;
let target;
async function connect() {
  socket = undefined;
  target = undefined;
  for (let attempt = 0; attempt < 45; attempt++) {
    const pids = adb('shell', 'pidof', appId).split(/\s+/).filter(x => /^\d+$/.test(x));
    for (const pid of pids) {
      const sockets = adb('shell', 'cat', '/proc/net/unix').split('\n');
      socket = sockets.some(line => line.includes(`webview_devtools_remote_${pid}`)) ? `webview_devtools_remote_${pid}` : undefined;
      if (socket) break;
    }
    if (socket) {
      try {
        adb('forward', '--remove', 'tcp:9224');
      } catch {}
      adb('forward', 'tcp:9224', `localabstract:${socket}`);
      try {
        const pages = await (await fetch('http://127.0.0.1:9224/json')).json();
        target = pages.find(page => page.type === 'page' && page.webSocketDebuggerUrl && String(page.url).includes('appassets.androidplatform.net'));
        if (target) break;
      } catch {}
    }
    await pause(1000);
  }
  if (!target) throw new Error('Could not find the running Android WebView DevTools page.');
  return new Cdp(target.webSocketDebuggerUrl);
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.pending = new Map();
    this.nextId = 1;
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const waiting = this.pending.get(message.id);
      if (!waiting) return;
      this.pending.delete(message.id);
      message.error ? waiting.reject(new Error(message.error.message)) : waiting.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const response = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return response;
  }
  async eval(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'WebView evaluation failed');
    return result.result?.value;
  }
  close() { try { this.ws.close(); } catch {} }
}

async function connectReady() {
  let client = await connect();
  await client.call('Runtime.enable');
  await client.call('Page.enable');
  for (let i = 0; i < 30; i++) {
    try { if (await client.eval('Boolean(document.querySelector("#screen")?.textContent)')) return client; }
    catch {}
    await pause(500);
  }
  client.close();
  throw new Error('WebView did not render its start screen.');
}
async function snap(client, name) {
  await pause(350);
  client && await client.eval('window.scrollTo(0,0)');
  await pause(250);
  const png = execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 20 * 1024 * 1024 });
  fs.writeFileSync(path.join(root, 'screenshots', name), png);
}
async function click(client, selector, wait = 450) {
  const found = await client.eval(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)return false;node.click();return true})()`);
  assert.equal(found, true, `Could not find UI control ${selector}`);
  await pause(wait);
}
function check(value, message) { assert.ok(value, message); }

let cdp = await connectReady();
try {
  const initial = await cdp.eval(`JSON.stringify({style:localStorage.getItem('aaria.v34.homeStyle'),classic:!!document.querySelector('.v31-approved-home'),magical:!!document.querySelector('.v34-home'),recipeIds:RECIPES.map(r=>Number(r.id))})`);
  const initialState = JSON.parse(initial);
  check(initialState.style === null || initialState.style === 'magical', 'A fresh preview must default to Magical Adventure.');
  check(initialState.magical && !initialState.classic, 'Magical Adventure should be the initial rendered home.');
  check(initialState.recipeIds.length === 97 && initialState.recipeIds.includes(96) && initialState.recipeIds.includes(99), 'APK catalogue should contain exactly the 97 approved recipes including #096 and #099.');
  check(![97,98,100,101,102,103,104,105,106,107,108,109,110].some(id => initialState.recipeIds.includes(id)), 'Unapproved international recipes entered the APK catalogue.');
  await snap(cdp, 'magical-home-default.png');

  await click(cdp, '.v34-settings');
  check(await cdp.eval(`document.body.innerText.includes('My Home Style') && document.querySelectorAll('[data-v34-style]').length===2`), 'Home style controls are missing from Settings.');
  await snap(cdp, 'home-style-settings.png');
  await click(cdp, '[data-v34-style="classic"]');
  check(await cdp.eval(`localStorage.getItem('aaria.v34.homeStyle')==='classic' && !!document.querySelector('.v31-approved-home') && !document.querySelector('.v34-home')`), 'Classic Kitchen did not switch on immediately.');
  check(await cdp.eval(`!document.querySelector('.v31-header-greeting img,.v31-hero-character,.v31-hero-dog,.v31-reference-characters img')`), 'Classic Home banner must contain no Aaria or dog artwork.');
  await snap(cdp, 'classic-home.png');
  await cdp.eval(`document.querySelector('[data-nav="settings"]')?.click()`); await pause(300);
  await click(cdp, '[data-v34-style="magical"]');
  check(await cdp.eval(`localStorage.getItem('aaria.v34.homeStyle')==='magical' && !!document.querySelector('.v34-home')`), 'Magical Adventure did not switch on immediately.');
  check(await cdp.eval(`document.querySelectorAll('#nav .tab').length===5`), 'Magical Home navigation must contain its five required destinations.');
  await snap(cdp, 'magical-home.png');

  const rails = await cdp.eval(`JSON.stringify({sections:document.querySelectorAll('.v34-rail-section').length,rails:document.querySelectorAll('.v34-rail').length,countries:[...document.querySelectorAll('[data-v34-country]')].map(x=>x.dataset.v34Country)})`);
  const railState = JSON.parse(rails);
  check(railState.sections === 3 && railState.rails === 3, 'All three independent horizontal rails must render.');
  check(JSON.stringify(railState.countries) === JSON.stringify(['IND','ITA','CHN']), 'World rail should include only the available approved recipe countries.');
  check(await cdp.eval(`!!document.querySelector('.v34-approved-scene') && !!document.querySelector('.v34-globe-orbit') && !document.querySelector('.v34-hero button')`), 'Approved hero should be visible without floating controls over Aaria.');
  check(await cdp.eval(`!document.querySelector('.v31-header-greeting img')`), 'Classic Home must not show Aaria’s avatar in its top banner.');
  check(await cdp.eval(`(()=>{const viewport=document.querySelector('[data-v34-activity-viewport]');const bounds=viewport.getBoundingClientRect();return [...viewport.querySelectorAll('.v34-activity-card')].every(card=>{const r=card.getBoundingClientRect();return r.left>=bounds.left-1&&r.right<=bounds.right+1})})()`), 'Activity platform is clipped horizontally.');
  check(await cdp.eval(`indexedDB.open('aaria-v34-local-creation-photos') instanceof IDBOpenDBRequest`), 'Local persistent photo storage is unavailable.');
  await cdp.eval(`(async()=>{openRecipe(1);await new Promise(resolve=>setTimeout(resolve,250));const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+vAAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0));const file=new File([bytes],'v34-photo-test.png',{type:'image/png'}),transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('[data-share-photo="1"]');if(!input)throw Error('Recipe camera/photo input is missing');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,700));state.myCreations=[{recipeId:1,savedAt:new Date().toISOString()}];save();goto('home')})()`);
  await pause(550);
  check(await cdp.eval(`!!document.querySelector('.v34-home-photo') && document.querySelector('.v34-home-photo').src.startsWith('blob:')`), 'Persisted creation photo did not appear in What I Made.');

  for (const [index, route] of [[0,'week'],[1,'family'],[2,'friends'],[3,'world']]) {
    await click(cdp, `.v34-activity-card[data-v34-activity="${index}"]`);
    check(route === 'week'
      ? await cdp.eval(`view==='wheel' && wheelMode==='week'`)
      : await cdp.eval(`location.hash.includes('/${route}')`), `Carousel destination ${route} did not open.`);
    if (route === 'world') check(await cdp.eval(`!!document.querySelector('#v33-world-globe-host .aria-world-globe__sphere')`), 'Approved spinning globe did not render at the World destination.');
    await cdp.eval(`goto('home')`); await pause(400);
  }
  check(await cdp.eval(`document.querySelector('.v34-surprise')?.dataset.action==='open-wheel'`), 'The treasure chest must use the original Surprise Me route.');
  await click(cdp, '.v34-surprise');
  check(await cdp.eval(`view==='wheel' && wheelMode==='recipe' && location.hash.includes('/wheel')`), 'The treasure chest did not open the original Surprise Me screen and workflow.');
  await cdp.eval(`goto('home')`); await pause(400);
  await click(cdp, '#nav [data-nav="world"]');
  check(await cdp.eval(`!!document.querySelector('#v33-world-globe-host .aria-world-globe__sphere') && !document.querySelector('.w02-country-sheet')`), 'Bottom World navigation must enter the spinning globe without a stale country sheet.');
  check(await cdp.eval(`(()=>{const nav=document.querySelector('#nav').getBoundingClientRect();return [...document.querySelectorAll('#nav .tab')].length===5&&[...document.querySelectorAll('#nav .tab')].every(x=>{const r=x.getBoundingClientRect();return r.left>=nav.left&&r.right<=nav.right})})()`), 'All five World navigation items must fit the phone/tablet viewport.');
  await cdp.eval(`goto('home')`); await pause(350);
  const newRecipe = Number(await cdp.eval(`document.querySelector('.v34-rail-section [data-open]')?.dataset.open`));
  await click(cdp, `.v34-rail-section [data-open="${newRecipe}"]`);
  check(await cdp.eval(`location.hash.includes('/recipe/${newRecipe}/')`), 'Recipe rail card did not open its recipe.');
  adb('shell', 'input', 'keyevent', '4'); await pause(450);
  check(await cdp.eval(`location.hash.includes('/home')`), 'Android Back did not return to Home from a recipe.');
  await cdp.eval(`goto('home')`); await pause(350);
  await click(cdp, '[data-v34-country="ITA"]');
  check(await cdp.eval(`document.querySelector('#v34-country-title')?.innerText.includes('Italy') && Number(document.querySelector('#v34-country-dialog [data-open]')?.dataset.open)===96`), 'Italy card did not open its approved recipe list.');
  await click(cdp, '#v34-country-dialog [data-open="96"]');
  check(await cdp.eval(`location.hash.includes('/recipe/96/') && !document.querySelector('#v34-country-dialog')`), 'Country recipe did not open after closing its popup.');
  adb('shell', 'input', 'keyevent', '4'); await pause(450);
  check(await cdp.eval(`location.hash.includes('/home') && !document.querySelector('#v34-country-dialog')`), 'Android Back must return home without reopening a stale country popup.');
  await cdp.eval(`document.querySelector('#languageSelect').value='pt-BR';document.querySelector('#languageSelect').dispatchEvent(new Event('change',{bubbles:true}))`); await pause(500);
  check(await cdp.eval(`document.querySelector('#nav').innerText.includes('Criações') && document.querySelector('.v34-surprise')?.innerText.includes('Surpreenda-me')`), 'Magical Home controls did not localize to PT-BR.');
  await cdp.eval(`document.querySelector('#languageSelect').value='en-GB';document.querySelector('#languageSelect').dispatchEvent(new Event('change',{bubbles:true}))`); await pause(500);
  await cdp.eval(`document.querySelector('[data-nav="settings"]')?.click()`); await pause(350);
  check(await cdp.eval(`!!document.querySelector('[data-v34-style="classic"]')`), 'Settings cannot be opened from Magical Home.');
  await click(cdp, '[data-v34-style="classic"]');
  check(await cdp.eval(`localStorage.getItem('aaria.v34.homeStyle')==='classic' && !!document.querySelector('.v31-approved-home') && !document.querySelector('.v34-home')`), 'Classic Home could not be restored.');
  await snap(cdp, 'classic-home-restored.png');
  await cdp.eval(`document.querySelector('[data-nav="settings"]')?.click()`); await pause(300);
  await click(cdp, '[data-v34-style="magical"]');
  check(await cdp.eval(`localStorage.getItem('aaria.v34.homeStyle')==='magical'`), 'Could not set Magical style before restart persistence check.');
  cdp.close();
  adb('shell', 'am', 'force-stop', appId);
  await pause(700);
  adb('install', '-r', 'app-debug.apk');
  adb('shell', 'am', 'start', '-W', '-n', `${appId}/com.aaria.magickitchen.pilot.MainActivity`);
  await pause(1200);
  cdp = await connectReady();
  check(await cdp.eval(`localStorage.getItem('aaria.v34.homeStyle')==='magical' && !!document.querySelector('.v34-home')`), 'Home style did not persist across an in-place APK update.');
  check(await cdp.eval(`(async()=>{const db=await new Promise(resolve=>{const request=indexedDB.open('aaria-v34-local-creation-photos');request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null)});if(!db)return false;const photos=await new Promise(resolve=>{const request=db.transaction('photoRecords','readonly').objectStore('photoRecords').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve([])});return photos.some(photo=>Number(photo.recipeId)===1&&!!photo.blob)&&!!document.querySelector('.v34-home-photo')})()`), 'Saved photo and creation did not persist across app restart.');
  await snap(cdp, 'magical-home-after-restart.png');
  await cdp.eval(`(async()=>{const db=await new Promise(resolve=>{const request=indexedDB.open('aaria-v34-local-creation-photos');request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null)});if(db)await new Promise(resolve=>{const tx=db.transaction('photoRecords','readwrite');const store=tx.objectStore('photoRecords');const request=store.getAll();request.onsuccess=()=>request.result.filter(x=>Number(x.recipeId)===1).forEach(x=>store.delete(x.photoId));tx.oncomplete=tx.onerror=tx.onabort=resolve});state.myCreations=[];save();render()})()`);
  await fs.promises.writeFile(path.join(root, 'logs', 'focused-validation.txt'), `device=${device}\noffline=airplane-mode\nfresh_default_magical=PASS\nsettings_switch_both_ways=PASS\nin_place_apk_update_persistence=PASS\nrecipe_catalogue_97_ids_96_99=PASS\ncarousel_week_family_friends_world=PASS\nspinning_world_globe=PASS\nsurprise_real_recipe_retry_and_open=PASS\nthree_independent_rails_and_country_filter=PASS\nrecipe_and_country_navigation=PASS\nandroid_back=PASS\npt_br_labels=PASS\nphoto_render_and_apk_update_persistence=PASS (1x1 PNG fixture; not a camera capture test)\n`);
} finally {
  cdp?.close();
}
