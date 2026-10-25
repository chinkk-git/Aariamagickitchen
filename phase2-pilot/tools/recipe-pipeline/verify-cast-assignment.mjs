import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {CAST_GROUP_COUNTS, castForArtworkGroup} from './cast-assignment.js';

const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1]};
const catalog=JSON.parse(await readFile(resolve(arg('--catalog','dist/full-catalog-draft.json')),'utf8'));
const manifest=JSON.parse(await readFile(resolve(arg('--manifest','packages/assets/manifest.json')),'utf8'));
const assetIds=new Set(manifest.assets.map(asset=>asset.id));
const counts={aaria:0,family:0,friends:0};
const failures=[];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
for(const recipe of catalog.recipes||[]){
  const group=recipe.artworkGroup;
  if(!Object.hasOwn(counts,group)){failures.push(`${recipe.id}: unknown artwork group '${group}'.`);continue}
  counts[group]++;
  const expected=castForArtworkGroup(group);
  const names=expected.map(person=>person.name);
  const ids=expected.map(person=>person.assetId);
  if(!same(recipe.mainCharacters,names)||!same(recipe.characterAssetIds,ids))failures.push(`${recipe.id}: recipe cast or approved avatar references do not match '${group}'.`);
  for(const id of ids)if(!assetIds.has(id))failures.push(`${recipe.id}: approved avatar asset '${id}' is absent from the asset manifest.`);
  const heroIds=recipe.artwork?.heroCharacterAssetIds;
  const heroBrief=recipe.artwork?.heroBrief||'';
  if(!same(heroIds,ids))failures.push(`${recipe.id}: hero artwork does not use the recipe's complete cast.`);
  for(const name of names)if(!heroBrief.includes(name))failures.push(`${recipe.id}: hero artwork brief omits ${name}.`);
  if(!/No hats, caps or sunglasses\./.test(heroBrief))failures.push(`${recipe.id}: hero artwork brief must preserve the approved no-hat/no-sunglasses likeness.`);
  for(const [index,step] of (recipe.steps||[]).entries()){
    if(!same(step.characters,names)||!same(step.characterAssetIds,ids))failures.push(`${recipe.id} step ${index+1}: cast or avatar references do not match '${group}'.`);
    const brief=step.artworkBrief||'';
    for(const name of names)if(!brief.includes(name))failures.push(`${recipe.id} step ${index+1}: artwork brief omits ${name}.`);
    if(!/No hats, caps or sunglasses\./.test(brief))failures.push(`${recipe.id} step ${index+1}: artwork brief must preserve the approved no-hat/no-sunglasses likeness.`);
    if(!brief.includes(String(step.instruction||'')))failures.push(`${recipe.id} step ${index+1}: artwork brief is not tied to its cooking action.`);
  }
}
if((catalog.recipes||[]).length!==95)failures.push(`Expected 95 recipes, found ${(catalog.recipes||[]).length}.`);
for(const [group,count] of Object.entries(CAST_GROUP_COUNTS))if(counts[group]!==count)failures.push(`Expected ${count} '${group}' recipes; found ${counts[group]}.`);
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
else console.log(`PASS: every recipe hero and step carries the approved cast and avatar references (${counts.aaria}/${counts.family}/${counts.friends}).`);
