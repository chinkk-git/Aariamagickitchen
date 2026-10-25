#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import { validateCspPolicy } from './csp-policy.mjs';

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

const csp = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?\s*>/i)?.[1];
validateCspPolicy(csp);
const layer = html.match(/<script id="aaria-v3-layer">([\s\S]*?)<\/script>/)?.[1];
if (!layer) throw new Error('The V3 feature layer is missing.');
new vm.Script(layer, { filename: 'aaria-v3-layer.js' });
const artMatch = layer.match(/const V3_ART=(\{[\s\S]*?\});/);
if (!artMatch) throw new Error('V3 recipe artwork registry is missing.');
const v3Art = JSON.parse(artMatch[1]);
for (const id of ['1', '2', '3', '4']) {
  const art = v3Art[id];
  for (const chef of ['CHEF_A', 'CHEF_B']) {
    if (!art?.variants?.[chef]?.atlas?.startsWith('data:image/webp;base64,') ||
        !art?.variants?.[chef]?.hero?.startsWith('data:image/webp;base64,')) {
      throw new Error(`Recipe ${id} is missing artwork for ${chef}.`);
    }
  }
  const expectedAspect = id === '3' ? 420 / 700 : id === '4' ? 480 / 640 : 543 / 724;
  if (Math.abs(art.aspect - expectedAspect) > 0.002 || art.status !== 'pending-review') {
    throw new Error(`Recipe ${id} artwork bundle is incomplete or has unexpected review status.`);
  }
}
if (!layer.includes("v3ProfileState.profile?.chefId==='CHEF_B'?'CHEF_B':'CHEF_A'") ||
    !layer.includes('v3SyncRecipeArt();v3RenderBeforeProfileControls();') ||
    !layer.includes('?[0,1,2,3]:') || !layer.includes('?[0,1,2,3,4]:')) {
  throw new Error('Profile-selected chef artwork or four-step scene mapping is missing.');
}
const syncStart = layer.indexOf('function v3SyncRecipeArt(){');
const syncEnd = layer.indexOf('\nconst v3RenderBeforeProfileControls', syncStart);
if (syncStart < 0 || syncEnd <= syncStart) throw new Error('Profile artwork sync helper is missing.');
const syncContext = vm.createContext({
  v3ProfileState: { profile: { chefId: 'CHEF_B' } },
  V3_ART: { '1': { variants: {
    CHEF_A: { atlas: 'atlas-a', hero: 'hero-a' },
    CHEF_B: { atlas: 'atlas-b', hero: 'hero-b' }
  }, aspect: 543 / 724, status: 'pending-review' } },
  NEW_RECIPE_ART: { '1': {} }
});
vm.runInContext(layer.slice(syncStart, syncEnd), syncContext);
vm.runInContext('v3SyncRecipeArt()', syncContext);
if (syncContext.NEW_RECIPE_ART['1'].atlas !== 'atlas-b' ||
    syncContext.NEW_RECIPE_ART['1'].hero !== 'hero-b') {
  throw new Error('Chef B profile did not select the matching recipe artwork.');
}
syncContext.v3ProfileState.profile.chefId = 'CHEF_A';
vm.runInContext('v3SyncRecipeArt()', syncContext);
if (syncContext.NEW_RECIPE_ART['1'].atlas !== 'atlas-a' ||
    syncContext.NEW_RECIPE_ART['1'].hero !== 'hero-a') {
  throw new Error('Chef A profile did not select the matching recipe artwork.');
}
for (const marker of [
  'V3_INGREDIENT_ATLAS', 'ingredientPicture=function', 'function v3IngredientFallback',
  'v3-ingredient-art', 'v3-hidden-camera-input', 'v3-quiz-card',
  'v3CreateWeek', 'v3ShowGroceryRecipients', 'take-dish-photo',
  'AariaNative.sharePost', 'Cozinha mágica da Aaria'
]) {
  if (!html.includes(marker)) throw new Error(`V3 feature check failed: ${marker}`);
}
if (!html.includes('function batchIngredientPicture(text)')) {
  throw new Error('The production ingredient-specific SVG renderer was replaced.');
}
if (!html.includes('background-size:400% 120.7%') ||
    !html.includes('.v3-action-art .friends-art{background-position:100% center}')) {
  throw new Error('The four home adventure illustrations are not configured as visible sprite crops.');
}
const homeArtRule = html.match(/\.home-action \.action-illustration,\.home-drawer-link \.drawer-illustration,\.v3-action \.action-illustration\{([^}]+)\}/)?.[1];
if (!homeArtRule?.includes('background-image:url("data:image/')) {
  throw new Error('V3 home adventure cards have no assigned artwork image.');
}
if (layer.includes('batchIngredientPicture=function') &&
    (!layer.includes('function v32ScopedInternationalIngredientPicture(text)') ||
     !layer.includes('V32_INTL_BY_ID?.has(Number(selected?.id))?v32InternationalIngredientPicture(text):v32BaseBatchIngredientPictureForOriginalRecipes(text)'))) {
  throw new Error('V3 must preserve original ingredient-specific art and scope international pictograms to the international review recipes.');
}
for (const id of [1, 2, 3, 4, 78, 89, 93, 94]) {
  if (!html.includes(`NEW_RECIPE_ART[${id}]`) && !layer.includes(`"${id}"`)) {
    throw new Error(`Recipe ${id} artwork was not added to the V3 layer.`);
  }
}
console.log(`V3 validated: ${recipes.length} recipes, ${ids.size} IDs, runtime syntax valid, ingredient atlas and feature layer present.`);

