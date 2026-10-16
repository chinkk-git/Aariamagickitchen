import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {artworkCastBrief, castForArtworkGroup} from './cast-assignment.js';
const root=resolve(new URL('../..',import.meta.url).pathname);
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1]};
const batchSize=Math.max(1,Number(arg('--batch-size','10'))||10);
const batch=arg('--batch','all');
const read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const [catalog,manifest,featureMatrix]=await Promise.all([
  read('domains/cooking/recipes/catalog.json'),
  read('packages/assets/manifest.json'),
  read('tools/recipe-pipeline/feature-matrix.json')
]);
const byId=new Map(manifest.assets.map(a=>[a.id,a]));
const csv=x=>`"${String(x??'').replaceAll('"','""')}"`;
const rows=[['recipe_id','recipe_title','artwork_group','slot','step_number','step_title','asset_id','asset_path','character_names','character_asset_ids','artwork_brief','review_status']];
const batchNumber=batch==='all'?0:Number(batch);
if(batch!=='all'&&(!Number.isInteger(batchNumber)||batchNumber<1))throw new Error('--batch must be a positive integer or all.');
const start=batch==='all'?0:(batchNumber-1)*batchSize;
const selected= batch==='all'?catalog.recipes:catalog.recipes.slice(start,start+batchSize);
for(const recipe of selected){
  const group=recipe.artworkGroup||'aaria';
  const cast=castForArtworkGroup(group);
  const names=cast.map(person=>person.name).join(' + ');
  const characterIds=cast.map(person=>person.assetId).join(' ');
  const ids=recipe.artworkIds||[];
  const hero=ids.find(id=>id.startsWith('dish.'));
  const h=byId.get(hero);
  rows.push([recipe.id,recipe.title,group,'hero','','',hero||'',h?.path||'',names,characterIds,artworkCastBrief(group,`making ${recipe.title}`),h?.reviewStatus||'MISSING']);
  for(const [i,step] of recipe.steps.entries()){
    const assetId=ids.find(id=>id.startsWith('step.')&&id.endsWith(`${step.art.replaceAll('-','.')}.v1`))||ids[i+1]||'';
    const a=byId.get(assetId);
    const brief=step.artworkBrief||artworkCastBrief(group,`${step.title}: ${step.instruction}`);
    rows.push([recipe.id,recipe.title,group,'step',i+1,step.title,assetId,a?.path||'',names,characterIds,brief,a?.reviewStatus||'MISSING']);
  }
}
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/recipe-artwork-plan.csv'),rows.map(row=>row.map(csv).join(',')).join('\n')+'\n');
await writeFile(resolve(root,'dist/recipe-feature-matrix.json'),JSON.stringify({features:featureMatrix.features.length,items:featureMatrix.features},null,2)+'\n');
console.log(`Wrote batch ${batch==='all'?'all':batchNumber} artwork plan for ${selected.length} recipes and ${selected.reduce((n,r)=>n+r.steps.length,0)} steps; feature checklist has ${featureMatrix.features.length} items.`);
