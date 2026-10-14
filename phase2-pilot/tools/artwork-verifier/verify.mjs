import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(new URL('../..',import.meta.url).pathname);
const manifest=JSON.parse(await readFile(resolve(root,'packages/assets/manifest.json'),'utf8'));
const catalog=JSON.parse(await readFile(resolve(root,'domains/cooking/recipes/catalog.json'),'utf8'));
const errors=[];const ids=new Set();
for(const asset of manifest.assets){
 if(ids.has(asset.id))errors.push(`duplicate asset id ${asset.id}`);ids.add(asset.id);
 try{const bytes=await readFile(resolve(root,asset.path));const hash=createHash('sha256').update(bytes).digest('hex');if(hash!==asset.sha256)errors.push(`checksum mismatch ${asset.id}`)}catch{errors.push(`missing asset source ${asset.path}`)}
}
for(const recipe of catalog.recipes)for(const id of recipe.artworkIds)if(!ids.has(id))errors.push(`${recipe.id} has no mani