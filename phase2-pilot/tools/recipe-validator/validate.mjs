import {readFile} from 'node:fs/promises';
import {validateRecipe} from '../../domains/cooking/recipe-schema/validate.js';
const catalog=JSON.parse(await readFile(new URL('../../domains/cooking/recipes/catalog.json',import.meta.url),'utf8'));
const failures=catalog.recipes.flatMap(recipe=>validateRecipe(recipe).map(error=>`${recipe.id}: ${error}`));
if(catalog.recipes.length!==2) failures.push(`Expected 2 pilot recipes; found ${catalog.recipes.length}`);
for(const recipe of catalog.recipes){if(recipe.steps.length!==4)failures.push(`${recipe.id}: expected 4 ordered steps`);if(!recipe.publicationStatus.includes('NOT CERTIFIED'))failures.push(`${recipe.id}: missing publicat