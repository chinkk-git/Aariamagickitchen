import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const output = path.resolve('artifacts/v34-visual-review');
const host = 'http://10.0.2.2:8765/Aaria_V3_4_Visual.html';
fs.mkdirSync(output, { recursive: true });
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function capture(name) {
  const png = execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 20 * 1024 * 1024 });
  if (png.length < 40_000) throw new Error(`Android capture ${name} was unexpectedly small (${png.length} bytes).`);
  fs.writeFileSync(path.join(output, name), png);
}

for (const [name, query, wait] of [
  ['01-home-portrait.png', '', 15000],
  ['02-activity-carousel.png', '?visual=carousel', 6000],
  ['03-surprise-treasure-chest.png', '?visual=surprise', 7000],
  ['04-new-recipes.png', '?visual=new', 5500],
  ['05-what-i-made.png', '?visual=made', 5500],
  ['06-recipes-around-world.png', '?visual=world', 5500]
]) {
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `${host}${query}`);
  await pause(wait);
  capture(name);
}
const screen = adb('shell', 'wm', 'size').split('\n').at(-1).trim();
const density = adb('shell', 'wm', 'density').split('\n').at(-1).trim();
fs.writeFileSync(path.join(output, 'capture-metadata.txt'), `source=V3.4 transformed offline home HTML in Android Chrome\nmode=visual review only; no APK built or installed\nreference=docs/design/v3.4/magical-adventure-home-approved.png\norientation=portrait\ndisplay=${screen}\n${density}\nvisuals=home, activity platform, treasure chest, New Recipes, What I Made, Recipes Around the World\n`);
console.log(`Captured six portrait Android screenshots at ${screen}.`);
