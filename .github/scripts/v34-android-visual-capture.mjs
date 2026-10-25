import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const output = path.resolve('artifacts/v34-visual-review');
const host = 'http://10.0.2.2:8765/Aaria_V3_4_Visual.html';
fs.mkdirSync(output, { recursive: true });
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 }).trim();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function capture(name) {
  const png = execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 20 * 1024 * 1024 });
  if (png.length < 40_000) throw new Error(`Android capture ${name} was unexpectedly small (${png.length} bytes).`);
  fs.writeFileSync(path.join(output, name), png);
}

for (const [name, query, wait, after] of [
  ['01-classic-home-portrait.png', '?visual=classic', 12000],
  ['02-magical-home-portrait.png', '', 9000],
  ['03-activity-carousel.png', '?visual=carousel', 5500],
  ['04-surprise-treasure-chest.png', '?visual=surprise', 5500],
  ['05-new-recipes.png', '?visual=new', 5000],
  ['06-what-i-made.png', '?visual=made', 5000],
  ['07-recipes-around-world.png', '?visual=world', 5000],
  ['08-country-recipe-list.png', '?visual=country', 5000],
  ['09-country-recipe-open.png', '?visual=country-recipe', 6500],
  ['10-country-android-back-return.png', '?visual=country-back', 6500, 'back']
]) {
  console.log(`Opening Android screenshot page: ${name}`);
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `${host}${query}`);
  await pause(wait);
  if (after === 'back') { adb('shell', 'input', 'keyevent', '4'); await pause(1800); }
  capture(name);
  console.log(`Captured Android screenshot: ${name}`);
}
const screen = adb('shell', 'wm', 'size').split('\n').at(-1).trim();
const density = adb('shell', 'wm', 'density').split('\n').at(-1).trim();
fs.writeFileSync(path.join(output, 'capture-metadata.txt'), `source=V3.4 transformed offline home HTML in Android Chrome\nmode=visual review only; no APK built or installed\nreference=docs/design/v3.4/magical-adventure-home-approved.png\norientation=portrait\ndisplay=${screen}\n${density}\nvisuals=Classic Home, Magical Home, activity platform, original Surprise Me entry, New Recipes, What I Made, Recipes Around the World, country popup, recipe navigation, Android Back restoration\n`);
console.log(`Captured ten portrait Android screenshots at ${screen}.`);
