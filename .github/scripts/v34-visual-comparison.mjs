import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('artifacts/v34-visual-review');
const files = [
  ['01-classic-home-portrait.png', 'Classic Kitchen · Android portrait'],
  ['03-activity-spin-my-week.png', 'Carousel · Spin My Week'],
  ['04-activity-cook-family.png', 'Carousel · Cook with Family'],
  ['05-activity-cook-friends.png', 'Carousel · Cook with Friends'],
  ['06-activity-world-recipes.png', 'Carousel · World Recipes'],
  ['07-surprise-treasure-chest.png', 'Surprise Me chest · original workflow entry'],
  ['08-new-recipes.png', 'New Recipes rail'],
  ['09-what-i-made.png', 'What I Made! rail'],
  ['10-recipes-around-world.png', 'Recipes Around the World rail'],
  ['11-country-recipe-list.png', 'Country recipe popup'],
  ['12-country-recipe-open.png', 'Selected country recipe'],
  ['13-country-android-back-return.png', 'Android Back · returned Home'],
  ['14-tablet-landscape-classic-home.png', 'Classic Kitchen · tablet landscape'],
  ['15-tablet-landscape-magical-home.png', 'Magical Adventure · tablet landscape'],
  ['16-tablet-landscape-world-carousel.png', 'World Recipes carousel · tablet landscape'],
  ['17-tablet-landscape-country-list.png', 'Country recipe list · tablet landscape'],
  ['18-home-style-settings.png', 'My Home Style · functional Settings']
];
for (const [file] of files) assert.ok(fs.existsSync(path.join(root, file)), `Required Android screenshot is missing: ${file}`);
assert.ok(fs.existsSync(path.join(root, '02-magical-home-portrait.png')), 'Required Magical Adventure portrait screenshot is missing.');
assert.ok(fs.existsSync(path.join(root, 'design/v3.4/magical-adventure-home-approved.png')), 'The approved visual reference is missing from the artifact.');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V3.4 approved reference and Android visual review</title><style>body{margin:0;background:#f8edf8;color:#421362;font:700 16px system-ui}header{padding:18px 24px;background:#fff}h1{margin:0;font-size:24px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:18px;align-items:start}.pair figure{margin:0;padding:12px;border-radius:18px;background:white;box-shadow:0 4px 14px #48264a20}.pair img{display:block;width:100%;height:auto;border-radius:10px}.pair figcaption,.shots figcaption{padding:10px 2px 0}.shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:0 18px 24px}.shots figure{margin:0;padding:10px;border-radius:16px;background:#fff}.shots img{display:block;width:100%;height:auto;border-radius:9px}@media(max-width:700px){.pair,.shots{grid-template-columns:1fr}}</style><header><h1>V3.4 Magical Adventure · visual comparison</h1><p>Approved reference alongside genuine Android captures of both Home styles, the complete activity carousel, treasure chest, lower sections and country navigation. Portrait and tablet landscape included. No APK was built.</p></header><section class="pair"><figure><img src="design/v3.4/magical-adventure-home-approved.png"><figcaption>Owner-approved reference PNG</figcaption></figure><figure><img src="02-magical-home-portrait.png"><figcaption>Magical Adventure · Android portrait</figcaption></figure></section><section class="shots">${files.map(([file,label])=>`<figure><img src="${file}"><figcaption>${label}</figcaption></figure>`).join('')}</section>`;
fs.writeFileSync(path.join(root, 'visual-comparison.html'), html);
