import {loadJson} from '../../../packages/content/load-json.js';
import {validateRecipe} from '../recipe-schema/validate.js';
export async function loadCookingCatalog() {
  const catalog=await loadJson('../../domains/cooking/recipes/catalog.json');
  if(!Array.isArray(catalog.recipes)||catalog.recipes.length!==2) throw new Error('Pilot catalog must contain exactly two recipes.');
  const errors=catalog.recipes.flatMap(r=>validateRecipe(r).map(e=>`${r.id}: ${e}`));
  if(errors.length) throw new Error(errors.join('; '));
  return catalog;
}
