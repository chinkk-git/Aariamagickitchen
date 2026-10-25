import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const output = path.resolve('artifacts/v34-visual-review');
const host = 'http://10.0.2.2:8765/Aaria_V3_4_Visual.html';
const device = process.env.V34_CAPTURE_DEVICE || 'phone-portrait';
const isTablet = device === 'tablet-landscape';
fs.mkdirSync(output, { recursive: true });
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 }).trim();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function capture(name) {
  const png = execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 20 * 1024 * 1024 });
  if (png.length < 8 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`Android capture ${name} is not a valid PNG (${png.length} bytes).`);
  fs.writeFileSync(path.join(output, name), png);
}
function accessibilityTree() {
  adb('shell', 'uiautomator', 'dump', '/sdcard/v34-window.xml');
  return adb('shell', 'cat', '/sdcard/v34-window.xml');
}
function findNode(xml, text) {
  for (const tag of xml.match(/<node\b[^>]*>/g) || []) {
    const value = [tag.match(/\btext="([^"]*)"/)?.[1], tag.match(/\bcontent-desc="([^"]*)"/)?.[1]]
      .filter(Boolean).map(item => item.replaceAll('&amp;', '&').replaceAll('&apos;', "'")).join(' ');
    const bounds = tag.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (value.includes(text) && bounds) return bounds.slice(1).map(Number);
  }
  return null;
}
function findClassNode(xml, className) {
  for (const tag of xml.match(/<node\b[^>]*>/g) || []) {
    if (!tag.includes(`class="${className}"`)) continue;
    const bounds = tag.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (bounds) return bounds.slice(1).map(Number);
  }
  return null;
}
async function dismissChromeWelcome() {
  for (let attempt = 0; attempt < 8; attempt++) {
    await pause(900);
    let xml = '';
    try { xml = accessibilityTree(); } catch { continue; }
    if (/Use without an account|Accept &amp; continue|Accept and continue|No thanks|Turn on sync/i.test(xml)) {
      const actionText = ['Use without an account', 'Accept & continue', 'Accept and continue', 'No thanks', 'Turn on sync'];
      const found = actionText.map(label => [label, findNode(xml, label)]).find(([, bounds]) => bounds);
      if (found) {
        const [, [left, top, right, bottom]] = found;
        adb('shell', 'input', 'tap', String(Math.round((left + right) / 2)), String(Math.round((top + bottom) / 2)));
      } else {
        const [width, height] = adb('shell', 'wm', 'size').match(/(\d+)x(\d+)/).slice(1).map(Number);
        adb('shell', 'input', 'tap', String(Math.round(width / 2)), String(Math.round(height * .83)));
      }
      continue;
    }
    if (!/Welcome to Chrome|Welcome to Chromium/i.test(xml)) return;
  }
  const last = accessibilityTree();
  if (/Welcome to Chrome|Use without an account|Accept &amp; continue|Turn on sync/i.test(last)) {
    throw new Error('Chrome first-run welcome is still visible; refusing to upload onboarding screenshots as app evidence.');
  }
}
function isAariaWelcome(xml) {
  return /Preparing something magical|Aaria’s Magical Kitchen welcome|Welcome to my Magical Kitchen/i.test(xml);
}
async function skipAariaWelcome(xml) {
  if (!isAariaWelcome(xml)) return xml;
  const skip = findNode(xml, 'Skip welcome and enter the selected Home style') || findNode(xml, 'Skip');
  if (!skip) throw new Error('Aaria welcome is visible, but its accessible Skip control was not found.');
  const [left, top, right, bottom] = skip;
  adb('shell', 'input', 'tap', String(Math.round((left + right) / 2)), String(Math.round((top + bottom) / 2)));
  await pause(2200);
  return accessibilityTree();
}
async function finishFirstRunProfile(xml) {
  if (!/Choose your chef|Welcome to My Magical Kitchen|Escolha seu chef|Bem-vinda à sua cozinha/i.test(xml)) return xml;
  const name = findClassNode(xml, 'android.widget.EditText');
  if (!name) throw new Error('First-run profile setup is visible, but its name field is missing.');
  adb('shell', 'input', 'tap', String(Math.round((name[0] + name[2]) / 2)), String(Math.round((name[1] + name[3]) / 2)));
  adb('shell', 'input', 'text', 'Visual%20Preview');
  adb('shell', 'input', 'keyevent', '4');
  await pause(300);
  xml = accessibilityTree();
  const chef = findNode(xml, 'Chef A') || findNode(xml, 'CHEF_A');
  if (!chef) throw new Error('First-run profile setup is visible, but the approved Chef A choice is missing.');
  adb('shell', 'input', 'tap', String(Math.round((chef[0] + chef[2]) / 2)), String(Math.round((chef[1] + chef[3]) / 2)));
  await pause(400);
  xml = accessibilityTree();
  const next = findNode(xml, 'Continue to kitchen') || findNode(xml, 'Entrar na cozinha');
  if (!next) throw new Error('First-run profile setup is visible, but its continue control is missing.');
  adb('shell', 'input', 'tap', String(Math.round((next[0] + next[2]) / 2)), String(Math.round((next[1] + next[3]) / 2)));
  await pause(1400);
  xml = accessibilityTree();
  if (/Choose your chef|Welcome to My Magical Kitchen|Escolha seu chef|Bem-vinda à sua cozinha/i.test(xml)) {
    throw new Error('First-run profile setup did not close after selecting the test profile.');
  }
  return xml;
}
async function waitForAariaWelcome() {
  for (let attempt = 0; attempt < 30; attempt++) {
    let xml = '';
    try { xml = accessibilityTree(); } catch { await pause(1000); continue; }
    if (isAariaWelcome(xml)) return xml;
    if (/Welcome to Chrome|Use without an account|Accept &amp; continue/i.test(xml)) await dismissChromeWelcome();
    await pause(1000);
  }
  throw new Error('Cold launch did not expose the accessible Aaria welcome screen within 30 seconds.');
}
async function openPreview(query, expectedName) {
  const url = `${host}${query}`;
  const isClassicCapture = /visual=classic/.test(query);
  const isSettingsCapture = /visual=settings/.test(query);
  const isRecipeDestination = /visual=country-recipe|visual=country-back/.test(query);
  const expectedState = xml => {
    const hasV34Activities = /Cook with Family/i.test(xml) && /Cook with Friends/i.test(xml) && /World Recipes/i.test(xml);
    const hasRecipeDestination = /Recipe|Instructions|Ingredients|Receita|Ingredientes/i.test(xml);
    const hasSettings = /My Home Style/i.test(xml) && /Classic Kitchen/i.test(xml) && /Magical Adventure/i.test(xml);
    const appVisible = /Aaria|Kitchen|Cozinha|Spin My Week|New Recipes|Receitas|Italy|India|China/i.test(xml);
    return isSettingsCapture ? hasSettings : appVisible && (isClassicCapture || (isRecipeDestination ? hasRecipeDestination : hasV34Activities));
  };
  let xml = '';
  for (let launch = 0; launch < 2; launch++) {
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url);
    await pause(5500);
    for (let attempt = 0; attempt < 8; attempt++) {
      xml = accessibilityTree();
      if (/Welcome to Chrome|Use without an account|Accept &amp; continue/i.test(xml)) {
        await dismissChromeWelcome();
        adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url);
        await pause(4500);
        continue;
      }
      if (isAariaWelcome(xml)) {
        xml = await skipAariaWelcome(xml);
        xml = await finishFirstRunProfile(xml);
        if (expectedState(xml)) return;
      }
      xml = await finishFirstRunProfile(xml);
      if (expectedState(xml)) return;
      await pause(900);
    }
    if (launch === 0) await pause(1200);
  }
  const tail = xml.slice(0, 1400);
  const expected = isClassicCapture ? 'Classic' : isSettingsCapture ? 'Home Style Settings' : isRecipeDestination ? 'recipe destination' : 'V3.4 Magical';
  throw new Error(`Android Chrome did not render the expected ${expected} page for ${expectedName}; refusing to save a stale or blank screenshot. UI tree: ${tail}`);
}

if (isTablet) {
  adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0');
  adb('shell', 'settings', 'put', 'system', 'user_rotation', '1');
} else {
  adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0');
  adb('shell', 'settings', 'put', 'system', 'user_rotation', '0');
}
adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `${host}?visual=${isTablet ? 'classic' : 'classic'}`);
await pause(4000);
await dismissChromeWelcome();
const launchTree = await waitForAariaWelcome();
capture(`${isTablet ? '00-tablet-landscape' : '00-phone-portrait'}-welcome-before-home.png`);

const captures = isTablet ? [
  ['14-tablet-landscape-classic-home.png', '?visual=classic', 6500],
  ['15-tablet-landscape-magical-home.png', '', 6500],
  ['16-tablet-landscape-world-carousel.png', '?visual=carousel&activity=3', 5500],
  ['17-tablet-landscape-country-list.png', '?visual=country', 5500]
] : [
  ['01-classic-home-portrait.png', '?visual=classic', 6500],
  ['02-magical-home-portrait.png', '', 6500],
  ['03-activity-spin-my-week.png', '?visual=carousel&activity=0', 5000],
  ['04-activity-cook-family.png', '?visual=carousel&activity=1', 5000],
  ['05-activity-cook-friends.png', '?visual=carousel&activity=2', 5000],
  ['06-activity-world-recipes.png', '?visual=carousel&activity=3', 5000],
  ['07-surprise-treasure-chest.png', '?visual=surprise', 5000],
  ['08-new-recipes.png', '?visual=new', 4800],
  ['09-what-i-made.png', '?visual=made', 4800],
  ['10-recipes-around-world.png', '?visual=world', 4800],
  ['11-country-recipe-list.png', '?visual=country', 5000],
  ['12-country-recipe-open.png', '?visual=country-recipe', 6200],
  ['13-country-android-back-return.png', '?visual=country-back', 6200, 'back'],
  ['18-home-style-settings.png', '?visual=settings', 5200]
];

for (const [name, query, wait, after] of captures) {
  console.log(`Opening Android ${device} screenshot page: ${name}`);
  await openPreview(query, name);
  await pause(wait);
  if (after === 'back') {
    adb('shell', 'input', 'keyevent', '4');
    await pause(1800);
    const returned = accessibilityTree();
    if (!/Cook with Family/i.test(returned) || !/Cook with Friends/i.test(returned)) throw new Error('Android Back did not return from the country recipe to the V3.4 Home.');
  }
  capture(name);
  console.log(`Verified and captured Android screenshot: ${name}`);
}

const screen = adb('shell', 'wm', 'size').split('\n').at(-1).trim();
const density = adb('shell', 'wm', 'density').split('\n').at(-1).trim();
fs.appendFileSync(path.join(output, 'capture-metadata.txt'), `\ndevice=${device}\ndisplay=${screen}\n${density}\n`);
console.log(`Captured ${captures.length} verified Android screenshots on ${device} at ${screen}.`);
