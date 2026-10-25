import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('artifacts/v34-visual-review');
const files = [
  ['01-classic-home-portrait.png', 'Classic Kitchen · Android portrait'],
  ['03-activity-carousel.png', 'Activity carousel'],
  ['04-surprise-treasure-chest.png', 'Surprise Me chest · original workflow entry'],
  ['05-new-recipes.png', 'New Recipes rail'],
  ['06-what-i-made.png', 'What I Made! rail'],
  ['07-recipes-around-world.png', 'Recipes Around the World rail'],
  ['08-country-recipe-list.png', 'Country recipe popup'],
  ['09-country-recipe-open.png', 'Selected country recipe'],
  ['10-country-android-back-return.png', 'Android Back · returned Home']
];
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V3.4 approved reference and Android visual review</title><style>body{margin:0;background:#f8edf8;color:#421362;font:700 16px system-ui}header{padding:18px 24px;background:#fff}h1{margin:0;font-size:24px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:18px;align-items:start}.pair figure{margin:0;padding:12px;border-radius:18px;background:white;box-shadow:0 4px 14px #48264a20}.pair img{display:block;width:100%;height:auto;border-radius:10px}.pair figcaption,.shots figcaption{padding:10px 2px 0}.shots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:0 18px 24px}.shots figure{margin:0;padding:10px;border-radius:16px;background:#fff}.shots img{display:block;width:100%;height:auto;border-radius:9px}@media(max-width:700px){.pair,.shots{grid-template-columns:1fr}}</style><header><h1>V3.4 Magical Adventure · visual comparison</h1><p>Approved reference alongside genuine Android portrait captures of both Home styles and country navigation. No APK was built.</p></header><section class="pair"><figure><img src="design/v3.4/magical-adventure-home-approved.png"><figcaption>Owner-approved reference PNG</figcaption></figure><figure><img src="02-magical-home-portrait.png"><figcaption>Magical Adventure · Android portrait</figcaption></figure></section><section class="shots">${files.map(([file,label])=>`<figure><img src="${file}"><figcaption>${label}</figcaption></figure>`).join('')}</section>`;
fs.writeFileSync(path.join(root, 'visual-comparison.html'), html);
