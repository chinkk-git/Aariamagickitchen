import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const root=resolve(new URL('../..',import.meta.url).pathname);
const manifestPath=resolve(root,'packages/assets/manifest.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const steps={
  'step.parfait.wash.v1':['parfait-wash','Rinse strawberries and blueberries under cool running water'],
  'step.parfait.yogurt.v1':['parfait-yogurt','Spoon plain Greek yogurt into a clear cup'],
  'step.parfait.layers.v1':['parfait-layers','Layer yogurt with strawberries and blueberries'],
  'step.parfait.finish.v1':['parfait-finish','Finish the parfait with granola, berries and optional honey'],
  'step.toast.sauce.v1':['toast-sauce','Spread pizza sauce on whole-wheat bread'],
  'step.toast.toppings.v1':['toast-toppings','Add mozzarella, bell pepper and olive pieces'],
  'step.toast.airfryer.v1':['toast-airfryer','Adult safely places the toast in the air fryer'],
  'step.toast.finish.v1':['toast-finish','Cool the cooked mini pizza toast on a plate']
};

for(const [id,[name,purpose]] of Object.entries(steps)){
  const asset=manifest.assets.find(item=>item.id===id);
  if(!asset)throw new Error(`Missing manifest record: ${id}`);
  const path=`packages/assets/cooking-steps/${name}.jpg`;
  const bytes=await readFile(resolve(root,path));
  asset.path=path;
  asset.purpose=purpose;
  asset.dimensions=name==='toast-toppings'?'600x338':'600x450';
  asset.format='JPEG';
  asset.sha256=createHash('sha256').update(bytes).digest('hex');
  asset.reviewStatus='Generated to match approved visual reference — human artwork review pending';
}

await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`Updated ${Object.keys(steps).length} recipe-step records; existing reference and character records were preserved.`);
