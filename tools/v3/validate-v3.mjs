#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const file = process.argv[2] || 'dist/Aaria_Magical_Kitchen_V3.html';
const html = fs.readFileSync(file, 'utf8');
const match = html.match(/(?:const|let)\s+RECIPES\s*=\s*/);
if (!match) throw new Error('Could not locate the recipe catalog.');
const start = match.index + match[0].length;
let depth = 0, quote = '', escaped = false, end = -1;
for (let i = start; i < html.length; i++) {
  const c = html[i];
  if (quote) {
    if (escaped) escaped = false;
    else if (c === '\\') escaped = true;
    else if (c === quote) quote = '';
    continue;
  }
  if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
  if (c === '[') depth++;
  else if (c === ']' && --depth === 0) { end = i + 1; break; }
}
if (end < 0) throw new Error('Could not parse the recipe catalog.');
const recipes = vm.runInNewContext(`(${html.slice(start, end)})`);
const ids = new Set(recipes.map(recipe => Number(recipe.id)));
if (recipes.length !== 95 || ids.size !== 95) throw new Error(`Expected 95 recipes with unique IDs, got ${recipes.length}/${ids.size}.`);

const layer = html.match(/<script id="aaria-v3-layer">([\s\S]*?)<\/script>/)?.[1];
if (!layer) throw new Error('The V3 feature layer is missing.');
new vm.Script(layer, { filename: 'aaria-v3-layer.js' });
for (const marker of [
  'V3_INGREDIENT_ATLAS', 'v3-ingredient-art', 'v3-quiz-card',
  'v3CreateWeek', 'v3ShowGroceryRecipients', 'take-dish-photo',
  'AariaNative.sharePost', 'Cozinha mágica da Aaria'
]) {
  if (!html.includes(marker)) throw new Error(`V3 feature check failed: ${marker}`);
}
for (const id of [78, 89, 93, 94]) {
  if (!html.includes(`NEW_RECIPE_ART[${id}]`) && !layer.includes(`"${id}"`)) {
    throw new Error(`Recipe ${id} artwork was not added to the V3 layer.`);
  }
}
console.log(`V3 validated: ${recipes.length} recipes, ${ids.size} IDs, runtime syntax valid, ingredient atlas and feature layer present.`);
