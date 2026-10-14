import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(new URL('../..',import.meta.url).pathname);
const entries=[];
async function add(id,path,purpose,status,dimensions,identity=null){const bytes=await readFile(resolve(root,path));entries.push({id,version:'1.0.0',purpose,path,dimensions,format:path.endsWith('.jpg')?'JPEG':'inline SVG',identity,sha256:createHash('sha256').update(bytes).digest('hex'),reviewStatus:status})}
await add('reference.visual-manifest.v1','packages/assets/visual-reference.jpg','User-supplied authoritative visual guide','APPROVED_REFERENCE','1536x1024');
for(const [name,id,identity] of [['aaria','character.aaria.v1','Aaria'],['mommy','character.mommy.v1','Mommy'],['daddy','character.daddy.v1','Daddy'],['sophia','character.sophia.v1','Sophia'],['liam','character.liam.v1','Liam'],['emma','character.emma.v1','Emma'],['friends','character.friends.v1','Friends / dog']]) await add(id,`packages/assets/characters/${name}.jpg`,`Reference-derived ${identity} portrait crop`,'IDENTITY_FROM_APPROVED_REFERENCE — CROPPED, UNMODIFIED','source crop 140–164x200',identity);
await add('background.kitchen-day.v1','packages/assets/backgrounds/kitchen-day.jpg','Reference-derived warm kitchen image crop','IDENTITY_FROM_APPROVED_REFERENCE — CROPPED, UNMODIFIED','482x125');
await add('icon.kitchen.v1','packages/assets/icons/kitchen.svg','App icon and cooking-kitchen motif','PILOT UI ICON — REVIEW PENDING','64x64');
for(const id of ['dish.parfait.v1','dish.pizza-toast.v1','step.parfait.wash.v1','step.parfait.yogurt.v1','step.parfait.layers.v1','step.parfait.finish.v1','step.toast.sauce.v1','step.toast.toppings.v1','step.toast.airfryer.v1','step.toast.finish.v1']) await add(id,'domains/cooking/recipe-renderer/food-art.js',id.startsWith('dish.')?'Finished dish illustration generated from an inline SVG template':'Recipe step illustration generated from a step-specific inline SVG scene','PILOT VECTOR ART — VISUAL APPROVAL PENDING','480x330 SVG viewBox',null);
await writeFile(resolve(root,'packages/assets/manifest.json'),JSON.stringify({manifestVersion:'1.0.0',sourceReference:'reference.visual-manifest.v1',assets:entries},null,2)+'\n');
console.log(`Wrote artwork manifest with ${entries.length} records.`);
