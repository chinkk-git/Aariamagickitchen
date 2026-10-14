import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(new URL('../..',import.meta.url).pathname);
const read=path=>readFile(resolve(root,path),'utf8');
const dataUri=async path=>`data:image/jpeg;base64,${(await readFile(resolve(root,path))).toString('base64')}`;
const [template,tokens,base,styles,router,validator,art,app,catalog]=await Promise.all([
 read('apps/aaria-kitchen/index.html'),read('packages/theme/tokens.css'),read('packages/ui/base.css'),read('apps/aaria-kitchen/styles.css'),
 read('packages/navigation/hash-router.js'),read('domains/cooking/recipe-schema/validate.js'),read('domains/cooking/recipe-renderer/food-art.js'),read('apps/aaria-kitchen/app.js'),read('domains/cooking/recipes/catalog.json')
]);
const assets={
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
let css=[base,tokens,styles].join('\n');for(const [from,to] of Object.entries(assets))css=css.replaceAll(fro