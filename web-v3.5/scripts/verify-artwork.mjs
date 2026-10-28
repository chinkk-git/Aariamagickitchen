#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist/web-v3.5');
const htmlPath = path.join(dist, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const sourceMap = JSON.parse(fs.readFileSync(path.join(dist, 'reports/artwork-source-map.json'), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function extractJsonConstant(name) {
  const marker = `const ${name}=`;
  const at = html.indexOf(marker);
  assert(at >= 0, `Missing generated ${name} mapping.`);
  let start = at + marker.length;
  while (/\s/.test(html[start] || '')) start++;
  const opening = html[start];
  assert(opening === '{' || opening === '[', `${name} is not a JSON object/array.`);
  const stack = [];
  let inString = false, escaped = false;
  for (let index = start; index < html.length; index++) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{' || char === '[') stack.push(char);
    else if (char === '}' || char === ']') {
      const expected = char === '}' ? '{' : '[';
      assert(stack.pop() === expected, `Malformed ${name} literal.`);
      if (!stack.length) return JSON.parse(html.slice(start, index + 1));
    }
  }
  throw new Error(`Unclosed generated ${name} mapping.`);
}
function imageBytes(relative, expectedSha, label) {
  const file = path.join(dist, relative);
  assert(fs.existsSync(file), `${label}: packaged file missing: ${relative}`);
  const bytes = fs.readFileSync(file);
  if (expectedSha) assert(sha(bytes) === expectedSha, `${label}: SHA-256 mismatch for ${relative}`);
  if (relative.toLowerCase().endsWith('.png')) assert(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${label}: invalid PNG bytes: ${relative}`);
  if (relative.toLowerCase().endsWith('.webp')) assert(bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP', `${label}: invalid WebP bytes: ${relative}`);
  return bytes;
}

const resolverAt = html.indexOf('function resolveWebArtworkSource(source)');
assert(resolverAt >= 0, 'Shared Web artwork resolver is missing.');
const dishResolverAt = html.indexOf('function v33FinishedDishSource(recipe)', resolverAt);
assert(dishResolverAt > resolverAt, 'World dish resolver does not call the shared artwork resolver.');
const resolverCode = html.slice(resolverAt, dishResolverAt);
const resolver = new Function('document', 'location', `${resolverCode}; return resolveWebArtworkSource;`)({ baseURI: 'https://preview.example/index.html' }, new URL('https://preview.example/index.html'));
const probeHash = 'a'.repeat(64);
assert(resolver(`./assets/embedded/${probeHash}.webp`) === `https://preview.example/assets/embedded/${probeHash}.webp`, 'Embedded recipe thumbnail path does not resolve.');
assert(resolver('international-wave-1/content/international/countries/vietnam/111-quick-chicken-pho/artwork/ingredients/rice-noodles.png') === 'https://preview.example/international-wave-1/content/international/countries/vietnam/111-quick-chicken-pho/artwork/ingredients/rice-noodles.png', 'International ingredient image path does not resolve.');
assert(resolver('content/international/countries/vietnam/111-quick-chicken-pho/artwork/ingredients/rice-noodles.png') === 'https://preview.example/international-wave-1/content/international/countries/vietnam/111-quick-chicken-pho/artwork/ingredients/rice-noodles.png', 'Android source asset path is not translated to the Web base.');
assert(resolver(`https://outside.example/assets/embedded/${probeHash}.webp`) === '', 'External artwork URL was not rejected.');
assert(resolver(`../assets/embedded/${probeHash}.webp`) === '', 'Artwork resolver allowed a path outside the Web package.');
assert(resolver('data:image/png;base64,iVBORw0KGgo=') === 'data:image/png;base64,iVBORw0KGgo=', 'Inline image URI was rejected.');
assert(html.includes("safe(resolveWebArtworkSource(V32_INTL_ROOT+x.imagePath)||'')"), 'Ingredient artwork does not use the shared Web resolver.');
assert(html.includes("safe(resolveWebArtworkSource(V32_INTL_ROOT+asset)||'')"), 'Step artwork does not use the shared Web resolver.');
assert(html.includes('.app .ref-ingredient-icon>img{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important}'), 'Ingredient artwork does not have responsive contain sizing.');

const recipeManifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
assert(recipeManifest.recipeCount === 116 && recipeManifest.recipeIds.length === 116 && new Set(recipeManifest.recipeIds).size === 116, 'Web package does not contain 116 unique recipe IDs.');
const indiaIds = sourceMap.indiaRecipeIds.map(Number);
assert(indiaIds.length === 18 && new Set(indiaIds).size === 18, `Expected 18 India mappings, found ${indiaIds.length}.`);
const overrideHashes = Object.values(recipeManifest.indiaDishThumbnailSha256 || {});
assert(overrideHashes.length === 2, 'Expected the two Android-approved India crop mappings.');
const newArt = extractJsonConstant('NEW_RECIPE_ART');
const atlases = extractJsonConstant('BATCH_ATLASES');
const inlineDishes = extractJsonConstant('INLINE_DISH_PHOTOS');
const homeThumbs = extractJsonConstant('HOME_RECIPE_THUMBS');
const overrideById = new Map((recipeManifest.indiaDishThumbnailIds || []).map((id, index) => [Number(id), overrideHashes[index]]));
const indiaMappings = [];
for (const id of indiaIds) {
  const overrideSha = overrideById.get(id);
  const source = overrideSha ? `./assets/embedded/${overrideSha}.webp`
    : newArt[id]?.dish || atlases[id] || inlineDishes[id] || homeThumbs[id];
  assert(typeof source === 'string' && source, `India recipe #${id} has no finished-dish artwork source.`);
  const url = resolver(source);
  assert(url, `India recipe #${id} source was rejected by the Web artwork resolver: ${source.slice(0,120)}`);
  const parsed = new URL(url);
  assert(parsed.origin === 'https://preview.example', `India recipe #${id} resolved outside the preview origin.`);
  const relative = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const bytes = imageBytes(relative, relative.startsWith('assets/embedded/') ? path.basename(relative).split('.')[0] : undefined, `India recipe #${id}`);
  indiaMappings.push({ id, asset: relative, sha256: sha(bytes), source: overrideSha ? 'Android-canonical crop' : newArt[id]?.dish ? 'NEW_RECIPE_ART.dish' : atlases[id] ? 'BATCH_ATLASES' : inlineDishes[id] ? 'INLINE_DISH_PHOTOS' : 'HOME_RECIPE_THUMBS' });
}

let internationalFinishedDishCount = 0;
let ingredientArtworkReferenceCount = 0;
const ingredientArtworkPaths = new Set();
const draftIngredientsWithoutSourceArt = [];
for (const recipe of sourceMap.internationalRecipes) {
  assert(recipe.finishedDish?.path, `International recipe #${recipe.id} has no canonical finished-dish artwork reference.`);
  const dishRelative = `international-wave-1/${recipe.finishedDish.path}`;
  imageBytes(dishRelative, recipe.finishedDish.sha256, `International recipe #${recipe.id} finished dish`);
  const dishResolved = resolver(dishRelative);
  assert(dishResolved, `International recipe #${recipe.id} finished-dish URL failed resolution.`);
  internationalFinishedDishCount++;
  for (const [locale, items] of Object.entries(recipe.ingredients || {})) {
    for (const ingredient of items) {
      if (!ingredient.path) {
        if (String(recipe.publicationStatus).includes('DRAFT')) draftIngredientsWithoutSourceArt.push({ id: recipe.id, locale, name: ingredient.name });
        continue;
      }
      ingredientArtworkReferenceCount++;
      ingredientArtworkPaths.add(ingredient.path);
      const relative = `international-wave-1/${ingredient.path}`;
      imageBytes(relative, ingredient.sha256, `Recipe #${recipe.id} ${locale} ingredient ${ingredient.name}`);
      assert(resolver(relative), `Recipe #${recipe.id} ${locale} ingredient URL failed resolution: ${ingredient.path}`);
    }
  }
}
assert(internationalFinishedDishCount === 21, `Expected 21 international dish artworks, found ${internationalFinishedDishCount}.`);

const recipesAt = html.indexOf('const RECIPES=') + 'const RECIPES='.length;
const recipesStart = html.indexOf('[', recipesAt);
let stack = [], inString = false, escaped = false, recipesEnd = -1;
for (let index = recipesStart; index < html.length; index++) {
  const char = html[index];
  if (inString) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') inString = false; continue; }
  if (char === '"') inString = true;
  else if (char === '[' || char === '{') stack.push(char);
  else if (char === ']' || char === '}') {
    const expected = char === ']' ? '[' : '{';
    assert(stack.pop() === expected, 'Malformed base recipe data.');
    if (!stack.length) { recipesEnd = index + 1; break; }
  }
}
assert(recipesEnd > recipesStart, 'Could not parse source recipe catalogue.');
const originalRecipes = JSON.parse(html.slice(recipesStart, recipesEnd));
assert(originalRecipes.length === 95, `Expected 95 original recipes; found ${originalRecipes.length}.`);
const iconStart = html.indexOf('function batchIngredientPicture(text)');
const iconEndMarker = 'return iconSvg(kind,body);}';
const iconEnd = html.indexOf(iconEndMarker, iconStart);
assert(iconStart >= 0 && iconEnd > iconStart, 'Canonical ingredient SVG renderer was not found.');
const iconFunction = html.slice(iconStart, iconEnd + iconEndMarker.length);
const batchIngredientPicture = new Function('iconSvg', `${iconFunction}; return batchIngredientPicture;`)((label, body) => `<svg aria-label="${label}">${body}</svg>`);
const uniqueIngredients = [...new Set(originalRecipes.flatMap(recipe => recipe.ingredients || []).map(String))];
const genericMarker = '<circle cx="32" cy="28" r="23" fill="#fff0dc"/>';
const unresolvedBaseIngredients = uniqueIngredients.filter(name => batchIngredientPicture(name).includes(genericMarker));
const recipe12 = originalRecipes.find(recipe => recipe.id === 12);
assert(recipe12 && (recipe12.ingredients || []).every(name => !batchIngredientPicture(name).includes(genericMarker)), 'Approved #012 Cheesy Corn Pancakes has an unmapped ingredient icon.');
assert(!unresolvedBaseIngredients.includes('150 g raw courgette, thinly sliced'), 'Courgette alias did not use existing zucchini artwork.');
assert(!unresolvedBaseIngredients.includes('4 small plain dinner rolls (100 g total)'), 'Dinner roll alias did not use existing bun artwork.');

const result = {
  result: 'ARTWORK_PACKAGE_AUDIT_PASSED; BROWSER_VISUAL_ACCEPTANCE_PENDING',
  india: { recipeCount: indiaMappings.length, mappings: indiaMappings },
  international: { finishedDishCount: internationalFinishedDishCount, ingredientArtworkReferences: ingredientArtworkReferenceCount, uniqueIngredientArtworkFiles: ingredientArtworkPaths.size, packagedIngredientArtworkFiles: ingredientArtworkPaths.size, draftIngredientSlotsWithoutSourceArtwork: draftIngredientsWithoutSourceArt.length },
  originalRecipeIngredientIcons: { recipes: originalRecipes.length, uniqueIngredientNames: uniqueIngredients.length, mappedToSpecificExistingArtwork: uniqueIngredients.length - unresolvedBaseIngredients.length, sourceArtGaps: unresolvedBaseIngredients },
  resolverChecks: { embeddedPath: 'PASS', internationalPath: 'PASS', sourcePathTranslation: 'PASS', pathTraversalRejected: 'PASS', externalOriginRejected: 'PASS', inlineDataUri: 'PASS' },
  browserImageDecode: 'NOT RUN: Android Chrome browser-control timed out; HTTP delivery and raster decoding are separate focused checks.'
};
fs.writeFileSync(path.join(dist, 'reports/artwork-validation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  result: result.result,
  indiaThumbnails: result.india.recipeCount,
  internationalDishArt: result.international.finishedDishCount,
  internationalIngredientArtworkReferences: result.international.ingredientArtworkReferences,
  uniqueIngredientArtworkFiles: result.international.uniqueIngredientArtworkFiles,
  originalIngredientSpecificMappings: `${result.originalRecipeIngredientIcons.mappedToSpecificExistingArtwork}/${uniqueIngredients.length}`,
  originalSourceGaps: unresolvedBaseIngredients.length,
  draftIngredientSlotsWithoutSourceArtwork: draftIngredientsWithoutSourceArt.length
}, null, 2));
