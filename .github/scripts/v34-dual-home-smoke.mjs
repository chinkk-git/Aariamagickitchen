import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const appId = process.env.ANDROID_TEST_APP_ID;
const device = process.env.V34_DEVICE || 'phone';
const productionCandidate = process.env.V34_PRODUCTION_CANDIDATE === '1';
const testApkPreinstalled = process.env.V34_TEST_APK_PREINSTALLED === '1';
if (!appId) throw new Error('ANDROID_TEST_APP_ID is required');
const root = path.resolve(process.env.V34_ARTIFACT_DIR || 'artifacts/v34-preview', device);
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
if (testApkPreinstalled) {
  const packageInstalled = adb('shell', 'pm', 'path', appId);
  if (!packageInstalled.includes('package:')) throw new Error('The exact-source test APK must already be installed on the fresh emulator.');
} else if (productionCandidate) {
  const candidateApk = process.env.V34_PRODUCTION_APK;
  if (!candidateApk || !fs.existsSync(candidateApk)) throw new Error('The exact signed production candidate APK is required.');
  adb('install', candidateApk);
} else {
  if (!fs.existsSync(baselineApk)) throw new Error('The lower-version V3.4 APK is required for the in-place update check.');
  adb('install', '-r', baselineApk);
  adb('shell', 'pm', 'clear', appId);
}
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
  const debugUrl = new URL(target.webSocketDebuggerUrl);
  // adb forward is bound on the runner loopback; WebView may advertise the
  // Android-side socket as localhost, which can resolve to IPv6 in Node.
  if (debugUrl.hostname === 'localhost' || debugUrl.hostname === '::1') debugUrl.hostname = '127.0.0.1';
  console.log(`Connecting to WebView DevTools target ${target.url} via ${debugUrl.hostname}:${debugUrl.port}${debugUrl.pathname}`);
  return new Cdp(debugUrl.toString());
}

function withTimeout(promise, timeoutMs, description) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${description} timed out after ${timeoutMs} ms`)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.pending = new Map();
    this.nextId = 1;
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', () => reject(new Error(`WebView DevTools WebSocket error (readyState=${this.ws.readyState})`)), { once: true });
      this.ws.addEventListener('close', event => reject(new Error(`WebView DevTools WebSocket closed before opening (code=${event.code})`)), { once: true });
    });
    this.ready = withTimeout(this.ready, 12_000, 'WebView DevTools WebSocket handshake');
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const waiting = this.pending.get(message.id);
      if (!waiting) return;
      this.pending.delete(message.id);
      message.error ? waiting.reject(new Error(message.error.message)) : waiting.resolve(message.result);
    });
  }
  async call(method, params = {}, timeoutMs = 12_000) {
    await this.ready;
    const id = this.nextId++;
    const response = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return withTimeout(response, timeoutMs, `WebView DevTools ${method} response`);
  }
  async eval(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }, 45_000);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'WebView evaluation failed');
    return result.result?.value;
  }
  close() { try { this.ws.close(); } catch {} }
}

async function connectReady() {
  let client = await connect();
  await client.call('Runtime.enable', {}, 45_000);
  await client.call('Page.enable', {}, 45_000);
  for (let i = 0; i < 30; i++) {
    try { if (await client.eval('Boolean(document.querySelector("#screen")?.textContent)')) return client; }
    catch {}
    await pause(500);
  }
  client.close();
  throw new Error('WebView did not render its start screen.');
}
async function snap(client, name, scrollTop = true) {
  await pause(350);
  if (scrollTop) client && await client.eval('window.scrollTo(0,0)');
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
async function waitFor(client, expression, message, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    if (await client.eval(expression)) return;
    await pause(250);
  }
  throw new Error(message);
}
async function androidBack(client) {
  adb('shell', 'input', 'keyevent', '4');
  await pause(800);
  return client;
}

async function resolveFirstRunProfile(client) {
  const present = await client.eval("!!document.querySelector('#v3ProfileDialog [data-v3-profile-continue]')");
  if (!present) return;
  check(await client.eval("!!document.querySelector('#v3ProfileDialog [data-v3-chef=\\\"CHEF_A\\\"]')"), 'First-run profile setup must offer Chef A.');
  await client.eval("document.querySelector('#v3ProfileDialog [data-v3-chef=\\\"CHEF_A\\\"]').click()");
  await client.eval("document.querySelector('#v3ProfileDialog [data-v3-profile-continue]').click()");
  await waitFor(client, "!document.querySelector('#v3ProfileDialog')", 'First-run profile chooser did not close after choosing Chef A.');
}

if (process.env.V34_RELEASE_FOCUSED === '1') {
  let focused = await connectReady();
  try {
    await resolveFirstRunProfile(focused);
    await waitFor(focused, "!!document.querySelector('#v34-welcome') && !!document.querySelector('.app')?.hasAttribute('inert')", 'Cold launch did not hold Home behind the welcome screen.');
    check(await focused.eval("!!document.querySelector('#v34-welcome') && !!document.querySelector('.app')?.hasAttribute('inert')"), 'Cold launch did not hold Home behind the welcome screen.');
    await snap(focused, 'welcome-cold-launch.png');
    await click(focused, '.v34-welcome-next');
    await click(focused, '.v34-welcome-next');
    await androidBack(focused);
    check(await focused.eval("!!document.querySelector('#v34-welcome') && document.querySelector('.v34-welcome-status')?.textContent==='Scene 2 of 3'"), 'Android system Back did not move from welcome scene three to scene two.');
    await click(focused, '.v34-welcome-next');
    await click(focused, '.v34-welcome-enter');
    check(await focused.eval("!document.querySelector('#v34-welcome') && !!document.querySelector('.v34-home') && localStorage.getItem('aaria.v34.homeStyle')!=='classic'"), 'Welcome Enter did not open the selected default Magical Home.');

    await click(focused, '.v34-activity-card[data-v34-activity="2"]');
    check(await focused.eval("!document.querySelector('.v32-avatar-cast,.v32-friend-portraits,.v32-friend-portrait') && document.querySelectorAll('.v32-group-screen [data-open]').length>0"), 'Friends page must remove portraits while retaining its recipe navigation.');
    await snap(focused, 'friends-no-avatar-grid.png');
    await focused.eval('goto(\'home\')'); await pause(400);

    for (const [country, recipeId, title] of [['ITA',96,'Italy'],['CHN',99,'China']]) {
      await focused.eval(`document.querySelector('[data-v34-country="${country}"]')?.scrollIntoView({block:'center',inline:'center'})`); await pause(500);
      check(await focused.eval(`(()=>{const card=document.querySelector('[data-v34-country="${country}"]');const image=card?.querySelector('.v34-country-art img');return !!card&&!!image&&image.complete&&image.naturalWidth>0&&!card.textContent.includes('<img')})()`), `${title} card image is missing or raw HTML leaked into the card.`);
      await snap(focused, `${country.toLowerCase()}-country-card.png`, false);
      await click(focused, `[data-v34-country="${country}"]`);
      check(await focused.eval(`document.querySelector('#v34-country-title')?.innerText.includes('${title}') && Number(document.querySelector('#v34-country-dialog [data-open]')?.dataset.open)===${recipeId}`), `${title} card opened the wrong recipe list.`);
      await click(focused, `#v34-country-dialog [data-open="${recipeId}"]`);
      check(await focused.eval(`location.hash.includes('/recipe/${recipeId}/') && !document.querySelector('#v34-country-dialog')`), `${title} selection did not close its country popup and open recipe ${recipeId}.`);
      if (country === 'ITA') {
        await androidBack(focused);
        await waitFor(focused, "view==='home' && !!document.querySelector('.v34-home') && !document.querySelector('#v34-country-dialog')", 'Android Back from the Italy recipe did not return to Home with the country popup closed.');
      } else {
        await focused.eval('goto(\'home\')'); await pause(400);
      }
    }

    // World entry, repeat entry, recipe return, and carousel entry use the actual APK WebView.
    await click(focused, '#nav [data-nav="world"]');
    const defaultGlobe = "view==='world' && !!document.querySelector('#v33-world-globe-host .aria-world-globe__sphere') && v33GlobeController?.getState()?.selected===null && v31SelectedCountry===null && v31MapPanel==='' && !document.querySelector('.v34-country-dialog')";
    check(await focused.eval(defaultGlobe), 'Bottom World entry did not open an unselected default globe.');
    await click(focused, '#nav [data-nav="world"]');
    check(await focused.eval(defaultGlobe), 'Repeated bottom World tap did not reset the globe.');
    const indiaFlag = '.aria-world-globe__flag[data-country-id="india"]';
    check(await focused.eval(`!!document.querySelector(${JSON.stringify(indiaFlag)})`), 'India flag was not available on the globe.');
    await click(focused, indiaFlag);
    check(await focused.eval("v33GlobeController?.getState()?.selected==='india'"), 'India could not be selected on the spinning globe.');
    await click(focused, '.aria-world-globe__recipe[data-recipe-id="51"]');
    check(await focused.eval("view==='recipe' && Number(selected?.id)===51"), 'India globe recipe did not open recipe 51.');
    await androidBack(focused);
    await waitFor(focused, "view==='world' && v33GlobeController?.getState()?.selected===null && !document.querySelector('.aria-world-globe__panel')?.getAttribute('aria-modal')", 'Android Back from a World recipe did not return to a clean default globe.');
    await click(focused, '#nav [data-nav="home"]');
    await click(focused, '.v34-activity-card[data-v34-activity="3"]');
    check(await focused.eval(defaultGlobe), 'Home carousel World entry did not open an unselected default globe.');
    await focused.eval('goto(\'home\')'); await pause(400);

    const photoName = `00000000-0000-4000-8000-${device === 'tablet' ? '000000000002' : '000000000001'}.jpg`;
    const photoFixture = path.join(root, 'photo-fixture.jpg');
    fs.writeFileSync(photoFixture, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+vAAAAABJRU5ErkJggg==', 'base64'));
    adb('push', photoFixture, '/data/local/tmp/aaria-v34-camera-fixture.jpg');
    adb('shell', 'run-as', appId, 'mkdir', '-p', 'files/dish-creations');
    adb('shell', 'run-as', appId, 'cp', '/data/local/tmp/aaria-v34-camera-fixture.jpg', `files/dish-creations/${photoName}`);
    await focused.eval(`(async()=>{openRecipe(1);await new Promise(resolve=>setTimeout(resolve,250));await window.aariaHandleNativeDishPhoto(1,${JSON.stringify(photoName)});await new Promise(resolve=>setTimeout(resolve,900))})()`);
    check(await focused.eval(`state.myCreations.some(x=>Number(x.recipeId)===1&&x.photoUrl?.includes('/dish-photo/')) && !!document.querySelector('.cook-post-preview img')`), 'Saved photo did not update the recipe preview.');
    check(await focused.eval(`sharePostBlobs[1] instanceof Blob && sharePostBlobs[1].type==='image/png' && document.querySelector('.cook-post-preview img')?.src===sharePostUrls[1] && shareCook.toString().includes('sharePostBlobs') && !shareCook.toString().includes('ingredients')`), 'Share photo is not connected to the saved photo post payload.');
    await snap(focused, 'saved-photo-share-preview.png');
    await focused.eval("goto('home')");
    await waitFor(focused, `(()=>{const img=document.querySelector('[data-v34-photo-rail] [data-open="1"] .v34-home-photo');return !!img&&img.src.includes('/dish-photo/')&&img.complete&&img.naturalWidth>0})()`, 'Saved photo did not render as a valid image in What I Made after navigation.');
    await snap(focused, 'what-i-made-saved-photo.png');
    await click(focused, '#nav [data-nav="creations"]');
    await waitFor(focused, `(()=>{const img=document.querySelector('[data-v34-photo-rail] [data-open="1"] .v34-home-photo');return !!img&&img.src.includes('/dish-photo/')&&img.complete&&img.naturalWidth>0})()`, 'Saved photo did not render in My Creations.');
    await snap(focused, 'my-creations-saved-photo.png');

    adb('shell', 'am', 'force-stop', appId);
    adb('shell', 'am', 'start', '-W', '-n', `${appId}/com.aaria.magickitchen.pilot.MainActivity`);
    focused.close(); await pause(1000); focused=await connectReady();
    check(await focused.eval("!!document.querySelector('#v34-welcome') && localStorage.getItem('aaria.v34.homeStyle')!=='classic'"), 'Relaunch did not preserve the selected Home style behind Welcome.');
    await click(focused, '.v34-welcome-skip');
    await waitFor(focused, "view==='home' && !!document.querySelector('.v34-home')", 'Welcome Skip did not return to the selected Home after relaunch.');
    await waitFor(focused, `(()=>{const img=document.querySelector('[data-v34-photo-rail] [data-open="1"] .v34-home-photo');return !!img&&img.src.includes('/dish-photo/')&&img.complete&&img.naturalWidth>0})()`, 'Saved photo did not survive app restart in What I Made.');
    const persistentPhoto = await focused.eval(`(async()=>{const db=await new Promise(resolve=>{const request=indexedDB.open('aaria-v34-local-creation-photos');request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null)});if(!db||!db.objectStoreNames.contains('photoRecords'))return false;const records=await new Promise(resolve=>{const request=db.transaction('photoRecords','readonly').objectStore('photoRecords').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve([])});return records.filter(item=>Number(item.recipeId)===1&&item.blob instanceof Blob).length===1})()`);
    check(persistentPhoto, 'Saved photo was missing or duplicated in persistent photo storage after restart.');
    await click(focused, '#nav [data-nav="creations"]');
    await waitFor(focused, `(()=>{const img=document.querySelector('[data-v34-photo-rail] [data-open="1"] .v34-home-photo');return !!img&&img.src.includes('/dish-photo/')&&img.complete&&img.naturalWidth>0})()`, 'My Creations lost the photo after app restart.');
    await fs.promises.writeFile(path.join(root, 'logs', 'focused-validation.txt'), `device=${device}\nwelcome_cold_launch_enter_and_system_back=PASS\nwelcome_skip_and_style_persistence_after_restart=PASS\nfriends_avatar_grid_removed_recipes_present=PASS\nitaly_art_navigation_popup_close_and_android_back=PASS\nchina_art_and_recipe_99_navigation=PASS\nworld_bottom_repeat_and_home_carousel_default_globe=PASS\nworld_recipe_android_back_resets_globe=PASS\nsaved_photo_recipe_preview_what-i-made_my-creations=PASS\nsaved_photo_persistence_after_restart_and_no_duplicate=PASS\nshare_photo_uses_saved_post_image_blob_not_ingredients=PASS (native parent-confirmed Android share sheet not automated)\nphysical_camera_capture=NOT TESTED (fixture validates bridge/storage/renderer only)\nproduction_baseline_upgrade=NOT TESTED IN THIS DEVICE CHECK\n`);
  } finally {
    focused?.close();
    try { adb('shell', 'run-as', appId, 'rm', '-f', `files/dish-creations/00000000-0000-4000-8000-${device === 'tablet' ? '000000000002' : '000000000001'}.jpg`); } catch {}
  }
  process.exit(0);
}

let cdp = await connectReady();
try {
  check(await cdp.eval("!!document.querySelector('#v34-welcome') && document.querySelector('.v34-welcome-status')?.innerText.includes('Scene 1')"), 'The approved welcome screen did not open first.');
  check(await cdp.eval("document.querySelector('.v34-welcome-frame')?.getAttribute('aria-label').includes('Preparing something magical')"), 'Welcome scene 1 text/art is missing.');
  check(await cdp.eval("!document.querySelector('#v34-welcome-boot') && document.querySelector('#v34-welcome') && document.querySelector('.app')?.hasAttribute('inert')"), 'Interactive welcome did not replace the first-paint cover before Home became usable.');
  await snap(cdp, 'welcome-cold-launch.png');
  await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  check(await cdp.eval("getComputedStyle(document.querySelector('.v34-welcome-particle')).display==='none' && getComputedStyle(document.querySelector('.v34-welcome-enter')).animationName==='none'"), 'Welcome animations did not respect reduced motion.');
  await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await click(cdp, '.v34-welcome-next');
  check(await cdp.eval("document.querySelector('.v34-welcome-frame')?.getAttribute('aria-label').includes('Mixing fun, flavours and surprises')"), 'Next did not show welcome scene 2.');
  await click(cdp, '.v34-welcome-back');
  check(await cdp.eval("document.querySelector('.v34-welcome-status')?.innerText.includes('Scene 1')"), 'Back did not return to welcome scene 1.');
  await click(cdp, '.v34-welcome-next');
  await click(cdp, '.v34-welcome-next');
  check(await cdp.eval("document.querySelector('.v34-welcome-status')?.innerText.includes('Scene 3') && !document.querySelector('.v34-welcome-enter-wrap').hidden"), 'Final welcome scene or glowing Enter arrow is missing.');
  await pause(1100);
  check(await cdp.eval("!!document.querySelector('#v34-welcome')"), 'The final welcome scene dismissed itself.');
  await click(cdp, '.v34-welcome-enter');
  check(await cdp.eval("!document.querySelector('#v34-welcome') && !!document.querySelector('.v34-home') && localStorage.getItem('aaria.v34.homeStyle')===null"), 'Enter did not open default Magical Home without overwriting Home Style.');
  await cdp.eval("localStorage.setItem('aaria.v34.homeStyle','classic');sessionStorage.removeItem('aaria.v34.welcome.dismissed');location.reload()");
  cdp.close();
  await pause(700);
  cdp = await connectReady();
  check(await cdp.eval("!!document.querySelector('#v34-welcome') && localStorage.getItem('aaria.v34.homeStyle')==='classic'"), 'Saved Classic preference was not preserved at welcome entry.');
  await click(cdp, '.v34-welcome-skip');
  check(await cdp.eval("!document.querySelector('#v34-welcome') && !!document.querySelector('.home-top') && localStorage.getItem('aaria.v34.homeStyle')==='classic'"), 'Skip did not open the saved Classic Home.');
  await cdp.eval("localStorage.setItem('aaria.v34.homeStyle','magical');goto('home')");
  await pause(450);
  const initial = await cdp.eval(`JSON.stringify({style:localStorage.getItem('aaria.v34.homeStyle'),classic:!!document.querySelector('.home-top'),magical:!!document.querySelector('.v34-home'),recipeIds:RECIPES.map(r=>Number(r.id))})`);
  const initialState = JSON.parse(initial);
  check(initialState.style === null || initialState.style === 'magical', 'A fresh preview must default to Magical Adventure.');
  check(initialState.magical && !initialState.classic, 'Magical Adventure should be the initial rendered home.');
  check(initialState.recipeIds.length === 97 && initialState.recipeIds.includes(96) && initialState.recipeIds.includes(99), 'APK catalogue should contain exactly the 97 approved recipes including #096 and #099.');
  check(![97,98,100,101,102,103,104,105,106,107,108,109,110].some(id => initialState.recipeIds.includes(id)), 'Unapproved international recipes entered the APK catalogue.');
  await snap(cdp, 'magical-home-initial.png');

  await click(cdp, '.v34-settings');
  check(await cdp.eval(`document.body.innerText.includes('My Home Style') && document.querySelectorAll('[data-v34-style]').length===2`), 'Home style controls are missing from Settings.');
  await snap(cdp, 'home-style-settings.png');
  await click(cdp, '[data-v34-style="classic"]');
  check(await cdp.eval(`localStorage.getItem('aaria.v34.homeStyle')==='classic' && !!document.querySelector('.home-top')`), 'Classic Kitchen did not switch on immediately.');
  await click(cdp, '.home-settings');
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
  const photoName = '00000000-0000-4000-8000-000000000001.jpg';
  const photoFixture = path.join(root, 'photo-fixture.jpg');
  fs.writeFileSync(photoFixture, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+vAAAAABJRU5ErkJggg==', 'base64'));
  adb('push', photoFixture, '/data/local/tmp/aaria-v34-camera-fixture.jpg');
  adb('shell', 'run-as', appId, 'sh', '-c', `mkdir -p files/dish-creations && cp /data/local/tmp/aaria-v34-camera-fixture.jpg files/dish-creations/${photoName}`);
  await cdp.eval(`(async()=>{openRecipe(1);await new Promise(resolve=>setTimeout(resolve,250));await window.aariaHandleNativeDishPhoto(1,${JSON.stringify(photoName)});await new Promise(resolve=>setTimeout(resolve,900))})()`);
  check(await cdp.eval(`state.myCreations.some(x=>Number(x.recipeId)===1&&x.photoUrl?.includes('/dish-photo/')) && !!document.querySelector('.cook-post-preview img')`), 'Captured-photo callback did not persist and immediately display the recipe photo.');
  check(await cdp.eval(`!document.querySelector('.cook-post-share')?.disabled && sharePostBlobs[1] instanceof Blob && sharePostBlobs[1].type==='image/png' && document.querySelector('.cook-post-preview img')?.src===sharePostUrls[1] && shareCook.toString().includes('sharePostBlobs') && !shareCook.toString().includes('ingredients')`), 'Share photo is not wired to the generated saved-photo post.');
  await cdp.eval(`goto('home')`); await pause(500);
  check(await cdp.eval(`!!document.querySelector('.v34-home-photo') && document.querySelector('.v34-home-photo').src.includes('/dish-photo/')`), 'Saved photo did not appear in What I Made.');
  await cdp.eval(`document.querySelector('#nav [data-nav="creations"]')?.click()`); await pause(500);
  check(await cdp.eval(`!!document.querySelector('[data-v34-photo-rail] .v34-home-photo')`), 'Saved photo did not appear in My Creations.');
  await cdp.eval(`goto('home')`); await pause(400);

  for (const [index, route] of [[0,'week'],[1,'family'],[2,'friends'],[3,'world']]) {
    await click(cdp, `.v34-activity-card[data-v34-activity="${index}"]`);
    check(route === 'week'
      ? await cdp.eval(`view==='wheel' && wheelMode==='week'`)
      : await cdp.eval(`location.hash.includes('/${route}')`), `Carousel destination ${route} did not open.`);
    if (route === 'friends') {
      check(await cdp.eval(`!document.querySelector('.v32-avatar-cast,.v32-friend-portraits,.v32-friend-portrait') && document.querySelectorAll('.v32-group-screen [data-open]').length>0`), 'Friends page must have no friend portrait grid while retaining recipe cards.');
      await snap(cdp, 'friends-no-avatar-grid.png');
    }
    if (route === 'world') check(await cdp.eval(`!!document.querySelector('#v33-world-globe-host .aria-world-globe__sphere') && v31SelectedCountry===null && v31MapPanel==='' && !document.querySelector('.v34-country-dialog')`), 'World carousel entry must reset to an unselected globe with no popup.');
    await cdp.eval(`goto('home')`); await pause(400);
  }
  check(await cdp.eval(`document.querySelector('.v34-surprise')?.dataset.action==='open-wheel'`), 'The treasure chest must use the original Surprise Me route.');
  await click(cdp, '.v34-surprise');
  check(await cdp.eval(`view==='wheel' && wheelMode==='recipe' && location.hash.includes('/wheel')`), 'The treasure chest did not open the original Surprise Me screen and workflow.');
  await cdp.eval(`goto('home')`); await pause(400);
  const newRecipe = Number(await cdp.eval(`document.querySelector('.v34-rail-section [data-open]')?.dataset.open`));
  await click(cdp, `.v34-rail-section [data-open="${newRecipe}"]`);
  check(await cdp.eval(`location.hash.includes('/recipe/${newRecipe}/')`), 'Recipe rail card did not open its recipe.');
  adb('shell', 'input', 'keyevent', '4'); await pause(450);
  check(await cdp.eval(`location.hash.includes('/home')`), 'Android Back did not return to Home from a recipe.');
  await cdp.eval(`goto('home')`); await pause(350);
  await cdp.eval(`window.v34EnterGlobeFirst(true)`); await pause(350);
  await cdp.eval(`document.querySelector('[data-country-id="india"]')?.click()`); await pause(350);
  check(await cdp.eval(`v33GlobeController?.getState?.().selected==='india'`), 'World globe could not select India.');
  await cdp.eval(`goto('home')`); await pause(350);
  await cdp.eval(`window.v34EnterGlobeFirst(true)`); await pause(350);
  check(await cdp.eval(`v31SelectedCountry===null && v31MapPanel==='' && v33GlobeController?.getState?.().selected==null && !!document.querySelector('#v33-world-globe-host .aria-world-globe__sphere')`), 'World nav entry after country selection did not reset to the default globe.');
  await cdp.eval(`window.v34EnterGlobeFirst(true);window.v34EnterGlobeFirst(true)`); await pause(350);
  check(await cdp.eval(`v31SelectedCountry===null && v33GlobeController?.getState?.().selected==null`), 'Repeated World taps did not reset the globe.');
  await cdp.eval(`goto('home')`); await pause(350);
  for (const [country, recipeId, title] of [['ITA',96,'Italy'],['CHN',99,'China']]) {
    await cdp.eval(`document.querySelector('[data-v34-country="${country}"]')?.scrollIntoView({block:'center',inline:'center'})`); await pause(450);
    check(await cdp.eval(`(()=>{const card=document.querySelector('[data-v34-country="${country}"]');const image=card?.querySelector('.v34-country-art img');return !!card&&!!image&&image.complete&&image.naturalWidth>0&&!card.textContent.includes('<img')})()`), `${title} card artwork failed to load or leaked raw markup.`);
    await snap(cdp, `${country.toLowerCase()}-country-card.png`, false);
    await click(cdp, `[data-v34-country="${country}"]`);
    check(await cdp.eval(`document.querySelector('#v34-country-title')?.innerText.includes('${title}') && Number(document.querySelector('#v34-country-dialog [data-open]')?.dataset.open)===${recipeId}`), `${title} card did not open its approved recipe list.`);
    await click(cdp, `#v34-country-dialog [data-open="${recipeId}"]`);
    check(await cdp.eval(`location.hash.includes('/recipe/${recipeId}/') && !document.querySelector('#v34-country-dialog')`), `${title} country recipe did not open after closing its popup.`);
    await cdp.eval(`goto('home')`); await pause(350);
  }
  adb('shell', 'input', 'keyevent', '4'); await pause(450);
  check(await cdp.eval(`location.hash.includes('/home') && !document.querySelector('#v34-country-dialog')`), 'Android Back must return home without reopening a stale country popup.');
  await cdp.eval(`window.v34EnterGlobeFirst(true)`); await pause(350);
  check(await cdp.eval(`v31SelectedCountry===null && v33GlobeController?.getState?.().selected==null && !document.querySelector('.aria-world-globe__recipe-list')`), 'World entry after a recipe popup must show only the default globe.');
  await cdp.eval(`goto('home')`); await pause(350);
  await cdp.eval(`document.querySelector('#languageSelect').value='pt-BR';document.querySelector('#languageSelect').dispatchEvent(new Event('change',{bubbles:true}))`); await pause(500);
  check(await cdp.eval(`document.querySelector('#nav').innerText.includes('Criações') && document.querySelector('.v34-surprise')?.innerText.includes('Surpreenda-me')`), 'Magical Home controls did not localize to PT-BR.');
  await cdp.eval(`document.querySelector('#languageSelect').value='en-GB';document.querySelector('#languageSelect').dispatchEvent(new Event('change',{bubbles:true}))`); await pause(500);
  await cdp.eval(`document.querySelector('[data-nav="settings"]')?.click()`); await pause(350);
  check(await cdp.eval(`!!document.querySelector('[data-v34-style="classic"]')`), 'Settings cannot be opened from Magical Home.');
  await click(cdp, '[data-v34-style="classic"]');
  check(await cdp.eval(`localStorage.getItem('aaria.v34.homeStyle')==='classic' && !!document.querySelector('.home-top') && !document.querySelector('.v34-home')`), 'Classic Home could not be restored.');
  await snap(cdp, 'classic-home-restored.png');
  await click(cdp, '.home-settings');
  await click(cdp, '[data-v34-style="magical"]');
  check(await cdp.eval(`localStorage.getItem('aaria.v34.homeStyle')==='magical'`), 'Could not set Magical style before restart persistence check.');
  cdp.close();
  adb('shell', 'am', 'force-stop', appId);
  await pause(700);
  adb('install', '-r', 'app-debug.apk');
  adb('shell', 'am', 'start', '-W', '-n', `${appId}/com.aaria.magickitchen.pilot.MainActivity`);
  await pause(1200);
  cdp = await connectReady();
  check(await cdp.eval(`!!document.querySelector('#v34-welcome') && !!document.querySelector('.v34-welcome-frame') && localStorage.getItem('aaria.v34.homeStyle')==='magical'`), 'Relaunch did not show the approved welcome before the saved Magical Home.');
  await snap(cdp, 'welcome-relaunch.png');
  await click(cdp, '.v34-welcome-enter');
  check(await cdp.eval(`localStorage.getItem('aaria.v34.homeStyle')==='magical' && !!document.querySelector('.v34-home')`), 'Enter after relaunch did not open the saved Home style.');
  check(await cdp.eval(`(async()=>{const db=await new Promise(resolve=>{const request=indexedDB.open('aaria-v34-local-creation-photos');request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null)});if(!db||!db.objectStoreNames.contains('photoRecords'))return false;const photos=await new Promise(resolve=>{const request=db.transaction('photoRecords','readonly').objectStore('photoRecords').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve([])});return photos.some(photo=>Number(photo.recipeId)===1&&photo.blob instanceof Blob)&&state.myCreations.some(x=>Number(x.recipeId)===1&&x.photoUrl)&&!!document.querySelector('.v34-home-photo')})()`), 'Saved photo and creation did not persist across app relaunch and in-place update.');
  await cdp.eval(`openRecipe(1)`); await pause(900);
  check(await cdp.eval(`!document.querySelector('.cook-post-share')?.disabled && sharePostBlobs[1] instanceof Blob && sharePostBlobs[1].type==='image/png' && document.querySelector('.cook-post-preview img')?.src===sharePostUrls[1] && shareCook.toString().includes('sharePostBlobs') && !shareCook.toString().includes('ingredients')`), 'Saved photo post was not rehydrated for Share photo after relaunch.');
  await snap(cdp, 'recipe-saved-photo-share-after-relaunch.png');
  await cdp.eval(`goto('home')`); await pause(350);
  await snap(cdp, 'magical-home-after-relaunch.png');
  await cdp.eval(`(async()=>{const db=await new Promise(resolve=>{const request=indexedDB.open('aaria-v34-local-creation-photos');request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null)});if(db)await new Promise(resolve=>{const tx=db.transaction('photoRecords','readwrite');tx.objectStore('photoRecords').clear();tx.oncomplete=tx.onerror=tx.onabort=resolve});state.myCreations=[];save();render()})()`);
  adb('shell', 'run-as', appId, 'rm', `files/dish-creations/${photoName}`);
  await fs.promises.writeFile(path.join(root, 'logs', 'focused-validation.txt'), `device=${device}\noffline=airplane-mode\nfresh_default_magical=PASS\nsettings_switch_both_ways=PASS\nin_place_apk_update_persistence=PASS\nrecipe_catalogue_97_ids_96_99=PASS\ncarousel_week_family_friends_world=PASS\nworld_bottom_and_carousel_default_globe=PASS\nworld_india_and_popup_reset=PASS\nworld_repeated_tap_reset=PASS\nsurprise_original_route=PASS\nthree_independent_rails_and_country_filter=PASS\nrecipe_and_country_navigation=PASS\nandroid_back=PASS\npt_br_labels=PASS\nphoto_capture_callback_persistent_file_recipe_gallery_and_update=PASS (device camera UI not automated; actual camera launch/capture remains a manual device check)\nshare_photo_saved_post_payload_immediate_and_after_relaunch=PASS\ncountry_art_italy_china_and_recipe_navigation=PASS\nfriends_portrait_grid_removed_recipe_navigation_preserved=PASS\nwelcome_cold_launch_relaunch_and_no_home_flash_cover=PASS\n`);
} finally {
  cdp?.close();
}
