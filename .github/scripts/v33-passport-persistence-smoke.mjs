import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const appId = process.env.ANDROID_TEST_APP_ID || `com.aaria.magickitchen.pilot.v33map${process.env.GITHUB_RUN_NUMBER || 'local'}`;
const activity = `${appId}/com.aaria.magickitchen.pilot.MainActivity`;
const serialArgs = process.env.ANDROID_SERIAL ? ['-s', process.env.ANDROID_SERIAL] : [];
const adb = args => execFileSync('adb', [...serialArgs, ...args], { timeout: 45_000, stdio: ['ignore', 'pipe', 'pipe'] });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function setAirplaneMode(enabled) {
  const state = String(enabled);
  adb(['shell', 'settings', 'put', 'global', 'airplane_mode_on', enabled ? '1' : '0']);
  adb(['shell', 'am', 'broadcast', '-a', 'android.intent.action.AIRPLANE_MODE', '--ez', 'state', state]);
  const actual = adb(['shell', 'settings', 'get', 'global', 'airplane_mode_on']).toString('utf8').trim();
  if (actual !== (enabled ? '1' : '0')) throw new Error(`Could not set emulator airplane mode to ${state}; observed ${actual}`);
}

async function waitForTarget() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
      const target = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl &&
        (item.url?.includes('appassets.androidplatform.net') || item.title?.includes('Magical Kitchen')));
      if (target) return target;
    } catch { }
    await pause(500);
  }
  throw new Error('Android WebView target did not return after app restart');
}

async function connect() {
  const target = await waitForTarget();
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
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`DevTools timeout: ${method}`)); }, 20_000);
      pending.set(id, { resolve, reject, timer });
    });
    ws.send(JSON.stringify({ id, method, params }));
    return response;
  };
  await command('Runtime.enable');
  const evaluate = async expression => {
    const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'WebView evaluation failed');
    return response.result?.value;
  };
  return { ws, evaluate };
}

async function waitForMap(evaluate) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const ready = await evaluate(`(()=>{const h=document.querySelector('.v31-world-header h1');const r=h?.getBoundingClientRect();return !!h&&!!r&&r.width>0&&r.height>0&&getComputedStyle(h).visibility!=='hidden'})()`);
    if (ready) return;
    await pause(300);
  }
  throw new Error('World map route did not render after restart');
}

let connection;
let airplaneModeSet = false;
try {
  connection = await connect();
  const before = await connection.evaluate(`(()=>({activeId:v3ProfileState?.activeId||'',hasStamp:state.worldStamps?.includes('IND')===true,completed:state.done?.includes(51)===true}))()`);
  if (!before.activeId || !before.hasStamp || !before.completed) {
    throw new Error(`Expected the earned India passport stamp and completed canonical recipe before restart: ${JSON.stringify(before)}`);
  }
  const saved = await connection.evaluate(`window.AariaNative?.saveProfileSnapshot(v3ProfileState.activeId,JSON.stringify(state))===true`);
  if (!saved) throw new Error('Native profile store did not confirm the passport snapshot save');

  connection.ws.close();
  setAirplaneMode(true);
  airplaneModeSet = true;
  adb(['shell', 'am', 'force-stop', appId]);
  adb(['shell', 'am', 'start', '-W', '-n', activity]);

  let pid = '';
  let socket = '';
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      pid = adb(['shell', 'pidof', appId]).toString('utf8').trim().split(/\s+/)[0] || '';
      if (pid) {
        socket = adb(['shell', 'cat', '/proc/net/unix']).toString('utf8')
          .match(new RegExp(`webview_devtools_remote_${pid}`))?.[0] || '';
      }
      if (socket) break;
    } catch { }
    await pause(500);
  }
  if (!pid || !socket) throw new Error('Could not find the restarted app-owned WebView debugging socket');
  try { adb(['forward', '--remove', 'tcp:9222']); } catch { }
  adb(['forward', 'tcp:9222', `localabstract:${socket}`]);
  connection = await connect();

  const profileReady = await connection.evaluate(`(()=>({activeId:v3ProfileState?.activeId||'',hasStamp:state.worldStamps?.includes('IND')===true,completed:state.done?.includes(51)===true,language:state.language||''}))()`);
  if (!profileReady.hasStamp || !profileReady.completed) {
    throw new Error(`Passport progress did not survive app process death while offline: ${JSON.stringify(profileReady)}`);
  }
  await connection.evaluate(`document.querySelector('#nav .tab[data-nav="world"]')?.click()`);
  await waitForMap(connection.evaluate);
  const mapState = await connection.evaluate(`(()=>({heading:document.querySelector('.v31-world-header h1')?.innerText||'',count:document.querySelector('.v31-passport-count strong')?.innerText||'',stamp:document.querySelector('.v31-passport .v31-stamp')?.innerText||'',airplane:document.querySelector('.v31-world-map')?.getBoundingClientRect().width>0}))()`);
  if (!mapState.heading || !mapState.count.includes('1 stamp collected') || !mapState.stamp.includes('India') || !mapState.airplane) {
    throw new Error(`Offline map navigation did not show the earned passport stamp after restart: ${JSON.stringify(mapState)}`);
  }

  mkdirSync('artifacts/v32-android-screenshots', { recursive: true });
  mkdirSync('artifacts/v32-diagnostics', { recursive: true });
  const png = adb(['exec-out', 'screencap', '-p']);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (png.length < 10_000 || width >= height) throw new Error(`Expected a nonempty phone portrait screenshot; got ${png.length} bytes at ${width}x${height}`);
  writeFileSync('artifacts/v32-android-screenshots/v33-passport-after-restart-offline.png', png);
  writeFileSync('artifacts/v32-diagnostics/v33-passport-persistence.json', `${JSON.stringify({
    status: 'PASS', appId, before, after: profileReady, mapState, processIdAfterRestart: pid,
    airplaneMode: 'enabled', screenshot: 'v33-passport-after-restart-offline.png', screenshotDimensions: `${width}x${height}`,
    screenshotSha256: createHash('sha256').update(png).digest('hex')
  }, null, 2)}\n`);

  await connection.evaluate(`(()=>{state.worldStamps=[];save();return true})()`);
  const reset = await connection.evaluate(`state.worldStamps.length===0`);
  if (!reset) throw new Error('Passport stamp reset failed after persistence verification');
  console.log(`Offline Android process-restart persistence PASS: ${mapState.stamp}; screenshot SHA-256 ${createHash('sha256').update(png).digest('hex')}`);
} finally {
  if (connection?.ws?.readyState === WebSocket.OPEN) connection.ws.close();
  if (airplaneModeSet) setAirplaneMode(false);
}
