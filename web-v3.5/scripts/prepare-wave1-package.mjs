import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.resolve(process.env.AARIA_BUILD_ROOT || projectRoot);
const ids = [96, 99];
const recipes = ids.map(id => {
  const country = id === 96 ? 'italy' : 'china';
  const slug = id === 96 ? '096-tomato-basil-pasta' : '099-vegetable-fried-rice';
  const sourcePath = `content/international/countries/${country}/${slug}`;
  const source = JSON.parse(fs.readFileSync(path.join(root, sourcePath, 'recipe.json'), 'utf8'));
  const en = source.renderer;
  const pt = en['pt-BR'];
  const art = relative => path.posix.join(sourcePath, relative);
  const locales = {};
  for (const [locale, content] of [['en-GB', en], ['pt-BR', pt]]) {
    locales[locale] = {
      title: content.title,
      description: source.description[locale],
      method: en.method,
      estimatedHandsOnMinutes: source.active_minutes,
      servings: source.servings,
      adultHelp: source.adult_assistance[locale],
      allergens: source.allergens,
      crossContact: source.allergen_notes[locale],
      nutrition: source.nutrition.per_serving,
      ingredients: source.ingredientItems.map(item => ({
        name: item.name[locale], quantity: String(item.quantity), unit: item.unit
      })),
      equipment: source.equipmentItems.map(item => item.name[locale]),
      steps: source.steps.map((step, index) => ({
        title: step.title[locale],
        instruction: step.instruction[locale],
        safety: step.safety[locale],
        adultAssist: step.adultAssist[locale],
        image: { path: art(`artwork/steps/step-${String(index + 1).padStart(2, '0')}.png`) }
      })),
      finishedDish: art('artwork/finished-dish.png')
    };
  }
  return { id, country, locales };
});
const packageValue = { sourceCommit: '451ab0bf8a3ab1867cf004a113d3d8e6896ccf60', recipes };
const debugDir = path.join(root, 'phase2-pilot/apps/aaria-android/app/src/debug/assets/artwork-review/international-wave-1');
fs.mkdirSync(debugDir, { recursive: true });
fs.writeFileSync(path.join(debugDir, 'recipes.json'), JSON.stringify(packageValue, null, 2) + '\n');

const webRoot = path.join(root, 'web-v3.5/international-wave-1');
for (const recipe of recipes) {
  const sourceDir = path.join(root, 'content/international/countries', recipe.country, recipe.id === 96 ? '096-tomato-basil-pasta' : '099-vegetable-fried-rice');
  const destDir = path.join(webRoot, recipe.country, path.basename(sourceDir));
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(path.join(sourceDir, 'artwork'), path.join(destDir, 'artwork'), { recursive: true });
}
console.log(JSON.stringify({ ids, sourceCommit: packageValue.sourceCommit, webAssets: path.relative(root, webRoot) }));
