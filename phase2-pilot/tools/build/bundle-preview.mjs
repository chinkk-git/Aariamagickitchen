import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(new URL('../..',import.meta.url).pathname);
const read=path=>readFile(resolve(root,path),'utf8');
const dataUri=async path=>`data:${path.toLowerCase().endsWith('.png')?'image/png':'image/jpeg'};base64,${(await readFile(resolve(root,path))).toString('base64')}`;
const [template,tokens,base,styles,router,validator,art,app,catalog]=await Promise.all([
 read('apps/aaria-kitchen/index.html'),read('packages/theme/tokens.css'),read('packages/ui/base.css'),read('apps/aaria-kitchen/styles.css'),
 read('packages/navigation/hash-router.js'),read('domains/cooking/recipe-schema/validate.js'),read('domains/cooking/recipe-renderer/food-art.js'),read('apps/aaria-kitchen/app.js'),read('domains/cooking/recipes/catalog.json')
]);
const assets={
  '../../packages/assets/brand/brand-lockup.png':await dataUri('packages/assets/brand/brand-lockup.png'),
  '../../packages/assets/characters/aaria.jpg':await dataUri('packages/assets/characters/aaria.jpg'),
  '../../packages/assets/characters/mommy.jpg':await dataUri('packages/assets/characters/mommy.jpg'),
  '../../packages/assets/characters/daddy.jpg':await dataUri('packages/assets/characters/daddy.jpg'),
  '../../packages/assets/characters/sophia.jpg':await dataUri('packages/assets/characters/sophia.jpg'),
  '../../packages/assets/characters/liam.jpg':await dataUri('packages/assets/characters/liam.jpg'),
  '../../packages/assets/characters/emma.jpg':await dataUri('packages/assets/characters/emma.jpg'),
  '../../packages/assets/characters/friends.jpg':await dataUri('packages/assets/characters/friends.jpg'),
  '../../packages/assets/recipe-art/rainbow-yogurt-parfait-hero.jpg':await dataUri('packages/assets/recipe-art/rainbow-yogurt-parfait-hero.jpg'),
  '../../packages/assets/recipe-art/mini-pizza-toast-hero.jpg':await dataUri('packages/assets/recipe-art/mini-pizza-toast-hero.jpg'),
  "url('../../packages/assets/backgrounds/kitchen-day.jpg')":`url("${await dataUri('packages/assets/backgrounds/kitchen-day.jpg')}")`
};
// Secondary screens use the supplied artwork pack too. Inline every image so
// offline file:// previews and the Android WebView retain the complete set.
const referenceImages=(await readdir(resolve(root,'packages/assets/reference-pack'))).filter(name=>name.endsWith('.jpg'));
const referenceImageData=Object.fromEntries(await Promise.all(referenceImages.map(async name=>[
  name.replace(/\.jpg$/,''),await dataUri(`packages/assets/reference-pack/${name}`)
])));
let appWithReferenceImages=app.replace(
  "const refAsset=(name)=>`../../packages/assets/reference-pack/${name}.jpg`;",
  `const referenceImageData=${JSON.stringify(referenceImageData)};const refAsset=(name)=>referenceImageData[name]||'';`
);
if(appWithReferenceImages===app)throw new Error('Could not inline the supplied reference-pack lookup.');
let js=[router,validator,art,
`async function loadCookingCatalog(){const data=${catalog};if(!Array.isArray(data.recipes)||data.recipes.length!==2)throw new Error('Pilot catalog must contain exactly two recipes.');const errors=data.recipes.flatMap(r=>validateRecipe(r).map(e=>r.id+': '+e));if(errors.length)throw new Error(errors.join('; '));return data}`,
appWithReferenceImages.replace(/^import .*;\s*$/gm,'')].join('\n');
for(const [from,to] of Object.entries(assets))js=js.replaceAll(from,to);
let css=[base,tokens,styles].join('\n');for(const [from,to] of Object.entries(assets))css=css.replaceAll(from,to);
let body=template.match(/<body>([\s\S]*?)<\/body>/i)?.[1];if(!body)throw new Error('Could not extract pilot app shell.');
for(const [from,to] of Object.entries(assets))body=body.replaceAll(from,to);
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#fff8ee"><meta name="description" content="Aaria's Magical Kitchen — a private, creative cooking pilot for ages 8–10."><title>Aaria's Magical Kitchen — Phase 2 Pilot</title><style>${css}</style></head><body>${body}<script type="module">${js.replaceAll('</script','<\\/script')}</script></body></html>`;
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/Aaria_Phase2_Pilot_Web_Preview.html'),html);
const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if(!inline)throw new Error('Bundled JavaScript was not emitted.');
await writeFile(resolve(root,'dist/bundle-check.mjs'),inline);
console.log(`Built standalone preview: ${Buffer.byteLength(html)} bytes`);
