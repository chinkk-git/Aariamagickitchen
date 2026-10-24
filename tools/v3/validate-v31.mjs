#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const fail = message => { console.error(`FAIL: ${message}`); process.exit(1); };
const runtime = fs.readFileSync(path.join(here, 'runtime.js'), 'utf8');
const transform = fs.readFileSync(path.join(here, 'transform-production.mjs'), 'utf8');
const visualCss = fs.readFileSync(path.join(here, 'home-world-visual.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const geography = JSON.parse(fs.readFileSync(path.join(here, 'data/ne_110m_admin_0_countries.geojson'), 'utf8'));
const dataNotes = fs.readFileSync(path.join(here, 'data/README.md'), 'utf8');
const pilot = JSON.parse(fs.readFileSync(path.join(here, 'data/world-adventure-pilot.json'), 'utf8'));

function extractRecipes(html) {
  const marker = 'const RECIPES=';
  const start = html.indexOf(marker);
  if (start < 0) fail('The original recipe catalog declaration is missing.');
  let i = start + marker.length;
  while (/\s/.test(html[i] || '')) i++;
  if (html[i] !== '[') fail('The original recipe catalog is not a JSON array.');
  let depth = 0, inString = false, escaped = false;
  for (let j = i; j < html.length; j++) {
    const ch = html[j];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) return JSON.parse(html.slice(i, j + 1));
  }
  fail('The original recipe catalog JSON is incomplete.');
}

const recipes = extractRecipes(source);
if (recipes.length !== 95) fail(`Expected to preserve exactly 95 original recipes; found ${recipes.length}.`);
const ids = recipes.map(recipe => recipe.id);
if (new Set(ids).size !== 95 || ids.some(id => !Number.isInteger(id) || id < 1 || id > 95)) fail('Original recipe IDs must remain unique and within 1–95.');
const themeSpec = JSON.parse(fs.readFileSync(path.join(here, 'data/v3.2-recipe-theme-map.json'), 'utf8'));
const themeKeys = ['playful-purple', 'fresh-green', 'sunny-orange'];
function expectedTheme(id) {
  let hash = 2166136261;
  for (const character of `v3.2-theme:${id}`) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return themeKeys[(hash >>> 0) % themeKeys.length];
}
if (themeSpec.algorithm !== 'FNV-1a(v3.2-theme:<recipe-id>) mod 3 with approved template-reference overrides' || JSON.stringify(themeSpec.themes) !== JSON.stringify(themeKeys)) fail('V3.2 recipe theme algorithm or theme names changed unexpectedly.');
if (JSON.stringify(themeSpec.referenceOverrides) !== JSON.stringify({'5':'sunny-orange','12':'playful-purple'}) || JSON.stringify(themeSpec.approvedTemplateExemplars) !== JSON.stringify({'5':'sunny-orange','12':'playful-purple','76':'fresh-green'})) fail('Approved recipe-template reference overrides changed unexpectedly.');
const themeMapIds = Object.keys(themeSpec.mapping).map(Number).sort((a, b) => a - b);
const expectedThemeIds = [...ids, 96, 99].sort((a, b) => a - b);
if (themeMapIds.length !== 97 || themeMapIds.some((id, index) => id !== expectedThemeIds[index]) ||
    expectedThemeIds.some(id => themeSpec.mapping[String(id)] !== (themeSpec.referenceOverrides[String(id)] || expectedTheme(id)))) {
  fail('Every original recipe ID 1–95 and approved review recipe IDs 096 and 099 must map deterministically to its V3.2 theme.');
}
if (themeKeys.some(theme => !Object.values(themeSpec.mapping).includes(theme))) fail('All three approved V3.2 themes must be represented in the 97-recipe assignment.');

const destinations = [['IND', 'India'], ['ITA', 'Italy'], ['CHN', 'China'], ['JPN', 'Japan'], ['MEX', 'Mexico'], ['VNM', 'Vietnam'], ['GRC', 'Greece']];
if (!Array.isArray(geography.features) || geography.features.length < 150) fail('Offline country boundaries are incomplete.');
for (const [iso, country] of destinations) {
  if (!geography.features.some(feature => feature.properties?.ADMIN === country && (feature.properties?.ISO_A3_EH === iso || feature.properties?.ISO_A3 === iso))) fail(`Offline map is missing ${country}.`);
}
const destinationBlock = runtime.slice(runtime.indexOf('const V31_WORLD_DESTINATIONS=['), runtime.indexOf('const V31_DESTINATION_BY_ISO='));
if (!destinationBlock || (destinationBlock.match(/reviewStatus:'draft'/g) || []).length !== 6 || !destinationBlock.includes("reviewStatus:'approved-reference'") || /reviewStatus:'pilot'/.test(destinationBlock)) fail('India must map existing recipes while all six new-country shelves stay draft until their release gates pass.');
if (!destinationBlock.includes("code:'ITA'") || !destinationBlock.includes('recipeIds:[96]') || !destinationBlock.includes("code:'CHN'") || !destinationBlock.includes('recipeIds:[97,98]')) fail('The Italy and China draft shelves must reference only their matching review-pilot recipe IDs.');
const approvedIndiaIds = [51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74];
const mappedIds = runtime.match(/V31_APPROVED_INDIA_RECIPE_IDS=\[([^\]]+)\]/)?.[1].split(',').map(Number) || [];
if (mappedIds.join(',') !== approvedIndiaIds.join(',')) fail('India must reference the verified original Indian recipe IDs without creating new records.');
for (const id of approvedIndiaIds) if (!ids.includes(id)) fail(`India map references missing original recipe ID ${id}.`);
const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]));
for (let id = 51; id <= 65; id++) if (recipesById.get(id)?.category !== 'Indian') fail(`India map ID ${id} is not categorized as an original Indian recipe.`);
for (const [id, title] of [[69, 'Vegetable Biryani'], [72, 'Paneer Butter Masala'], [74, 'Mini Vegetable Samosas']]) if (recipesById.get(id)?.title !== title) fail(`India map ID ${id} no longer matches the verified recipe title.`);
if (/data-v31-(?:stamp)=|worldPassport/i.test(runtime)) fail('Unreviewed passport rewards must not be available in runtime data or actions.');
if (!runtime.includes('data-v31-approved-recipe') || !runtime.includes('openRecipe(Number(button.dataset.v31ApprovedRecipe))')) fail('Original Indian recipes must open through the existing recipe flow.');
if (/Mango Lassi Magic|Little Pizza Bites|Brazil|Mini Pão de Queijo/i.test(runtime)) fail('Superseded V3.1 recipe candidates must not be presented as approved destinations.');
for (const [token, label] of [
  ['data-v31-country-select', 'accessible country selection list'],
  ['data-v31-country-search', 'destination search'],
  ['data-v31-no-results', 'search empty state'],
  ['data-v31-open-world', 'homepage world navigation'],
  ['New recipes will appear after child-safety, allergen, nutrition, cultural and duplicate reviews.', 'draft recipe lock copy'],
  ['APPROVED ORIGINAL RECIPES', 'existing Indian recipe collection'],
  ['prefers-reduced-motion', 'reduced-motion support'],
  ['.v31-world-map', 'pan and zoom map styling']
]) if (!runtime.includes(token) && !transform.includes(token)) fail(`Missing ${label}.`);
if (!visualCss.includes('.v31-illustrated-map-panel .v31-map-wrap{') || !visualCss.includes('aspect-ratio:1.7') || !visualCss.includes('center/contain')) fail('World Map must preserve the approved source ratio and contain the full reference artwork in every orientation.');
if (!runtime.includes('data-v31-country-select') || !runtime.includes('data-v31-country-search') || !runtime.includes('V31_DESTINATION_BY_ISO') || !runtime.includes('v31-destination')) fail('World Map must retain accessible country selection, search and canonical destination markers while gesture polish is deferred.');
if (!runtime.includes('aria-live="polite"') || !runtime.includes('focus({preventScroll:true})')) fail('Accessible status or focus restoration is missing.');
if (!runtime.includes('aria-pressed="${v31SelectedCountry===code}"') || !runtime.includes('aria-pressed="${x.code===c.code}"')) fail('Selected map and destination states must be announced to assistive technology.');
if (transform.includes('max-height:300px;overflow:auto')) fail('India recipes must remain part of the page scroll instead of a nested clipped list.');
if (!runtime.includes('<h1 tabindex="-1">') || !runtime.includes('v31WorldOpenerIndex')) fail('World entry and return focus targets are missing.');
if (!runtime.includes(".bottom .tab[data-nav=\"world\"]") || !runtime.includes('v31WorldOpenedFromNav')) fail('World-tab return focus is missing.');
if (!transform.includes('grid-template-columns:repeat(5,minmax(0,1fr))') || !transform.includes('.v31-primary-actions button{min-height:44px') || !transform.includes('.v31-world-header h1:focus')) fail('Five-tab navigation, focus styling or 44px primary-action targets are missing.');
if (!visualCss.includes('.v31-illustrated-map-panel .v31-map-wrap{') || !visualCss.includes('aspect-ratio:1.7') || !visualCss.includes('background:var(--v31-world-map-art) center/contain no-repeat')) fail('World Map must use the approved illustrated artwork at its source ratio without crop or stretch.');
if (!runtime.includes('Boundaries are simplified and may be disputed')) fail('The map must explain disputed/simplified borders.');
if (!runtime.includes('Fronteiras simplificadas e possivelmente disputadas')) fail('The Portuguese map must explain disputed/simplified borders.');
if (!transform.includes(".replace('__V31_WORLD_GEOGRAPHY_JSON__', JSON.stringify(worldGeography))") || !runtime.includes('V31_WORLD_GEOGRAPHY=__V31_WORLD_GEOGRAPHY_JSON__')) fail('Offline country data injection is missing.');
if (!transform.includes(".replace('__V31_WORLD_ADVENTURE_JSON__', JSON.stringify(worldAdventure))") || !runtime.includes('V31_WORLD_ADVENTURE=__V31_WORLD_ADVENTURE_JSON__')) fail('Offline adventure recipe data injection is missing.');
if (!transform.includes("['a08', 'a09', 'duplicates', 'artwork', 'productionSchema'].every(key => worldAdventureSource.releaseGates?.[key] === 'approved')") || !transform.includes('recipes: pilotReleaseApproved ? worldAdventureSource.recipes : []')) fail('Review-pilot recipes must stay outside the offline production runtime until all release gates are approved.');
if (!pilot || pilot.status !== 'review-pilot' || pilot.baseRecipeCount !== 95 || !Array.isArray(pilot.recipes) || pilot.recipes.map(x=>x.id).join(',') !== '96,97,98') fail('Pilot data must be separate from the immutable 95-record production catalog and contain only IDs 96–98.');
const pilotTitles=new Set();
for (const recipe of pilot.recipes) {
  if (!recipe.record?.title || !recipe.record?.ingredients?.length || recipe.record.steps?.length !== 6 || recipe.pt?.steps?.length !== 6 || recipe.record.steps.some((step,i)=>!step || !recipe.pt.steps[i])) fail(`Pilot recipe ${recipe.id} must have six bilingual production steps.`);
  if (!recipe.record.allergens?.length || !recipe.record.safety || !recipe.record.nutrition?.perServing || !recipe.nutritionPlan?.entries?.length || !recipe.duplicateAudit?.original95) fail(`Pilot recipe ${recipe.id} is missing a safety, allergen, nutrition or duplicate audit field.`);
  if (pilotTitles.has(recipe.record.title.toLowerCase())) fail('Pilot recipe titles must be unique.');
  pilotTitles.add(recipe.record.title.toLowerCase());
  const expected=recipe.record.id;
  if (![96,97,98].includes(expected) || !['ITA','CHN'].includes(recipe.countryCode)) fail(`Pilot recipe ${expected} has an unsupported ID or country.`);
  if (expected===97 && (!recipe.record.fact?.includes('not a traditional Suzhou recipe') || !recipe.pt?.fact?.includes('não é uma receita tradicional de Suzhou') || !recipe.culturalSources?.some(url=>url.startsWith('https://english.suzhou.gov.cn/')))) fail('China noodle soup needs a sourced Suzhou context and clear adaptation framing in both locales.');
  if (expected===97 && (!recipe.record.ingredients?.some(x=>/cooked unenriched plain egg noodles, cooked without added salt/i.test(x)) || !recipe.pt?.ingredients?.some(x=>/macarrão de ovo simples não enriquecido, cozido sem sal adicionado/i.test(x)) || !recipe.record.nutrition?.source?.includes('unenriched egg noodles, cooked without added salt'))) fail('China noodle soup ingredients in both locales must exactly match the unenriched USDA egg-noodle nutrition assumption.');
  if (expected===97 && (!/prepared ahead.*cool.*1–2 hours.*refrigerate.*keep chilled/i.test(recipe.record.safety) || !/preparado com antecedência.*resfrie.*1 a 2 horas.*refrigere.*mantenha gelado/i.test(recipe.pt?.safety||'') || !recipe.safetySources?.includes('https://www.nhs.uk/baby/weaning-and-feeding/childrens-food-safety-and-hygiene/'))) fail('China noodle soup must explicitly chill cooked-ahead noodles in both locales and cite child food-safety guidance.');
  if (expected===98 && (!recipe.record.fact?.includes('Tofu is part of Chinese food history') || !recipe.pt?.fact?.includes('O tofu faz parte da história alimentar da China') || !recipe.record.fact?.includes('not a traditional Chinese regional recipe') || !recipe.culturalSources?.some(url=>url.includes('smithsonianmag.com/history/ben-franklin-may-be-responsible-bringing-tofu-america')))) fail('Air-fryer tofu needs a source for its China placement and must remain clearly labelled as a modern adaptation, not a traditional regional recipe.');
  if (!recipe.artwork?.atlas || !recipe.artwork?.hero || recipe.artwork.reviewStatus !== 'A09 visual staging passed; runtime and final artwork review pending') fail(`Pilot artwork for ${expected} must remain clearly marked pending independent approval.`);
  for (const filename of [recipe.artwork.atlas,recipe.artwork.hero,recipe.artwork.source]) if(!fs.existsSync(path.join(here,'artwork/world-adventures',filename))) fail(`Missing local offline artwork file ${filename}.`);
  const artworkSource=fs.readFileSync(path.join(here,'artwork/world-adventures',recipe.artwork.source));
  const isPng=artworkSource.subarray(1,4).toString('ascii')==='PNG'&&artworkSource.readUInt32BE(16)===1536&&artworkSource.readUInt32BE(20)===1024;
  const isWebp=artworkSource.subarray(0,4).toString('ascii')==='RIFF'&&artworkSource.subarray(8,12).toString('ascii')==='WEBP'&&artworkSource.subarray(12,16).toString('ascii')==='VP8 '&&(artworkSource.readUInt16LE(26)&0x3fff)===1536&&(artworkSource.readUInt16LE(28)&0x3fff)===1024;
  if ((!isPng&&!isWebp) || crypto.createHash('sha256').update(artworkSource).digest('hex') !== recipe.artwork.sourceSha256) fail(`Pilot artwork source/checksum/dimensions do not match for ${expected}.`);
  const nutrition=recipe.record.nutrition.perServing;
  if(!Number.isFinite(nutrition.kcal)||!Number.isFinite(nutrition.proteinG)||!recipe.record.nutrition?.source?.includes('FoodData Central')) fail(`Pilot recipe ${expected} needs sourced nutrition values.`);
  const nutrientKeys={kcal:'kcal',protein:'proteinG',carbs:'carbohydrateG',fat:'totalFatG',satfat:'saturatedFatG',fiber:'fiberG',sugars:'sugarG',sodium:'sodiumMg'};
  const totals=Object.fromEntries(Object.keys(nutrientKeys).map(key=>[key,0]));
  for(const entry of recipe.nutritionPlan.entries){
    if(entry.water||!entry.key)continue;
    const ref=pilot.nutritionRefs[entry.key.replace(/^v31_/,'')];
    if(!ref)fail(`Pilot recipe ${expected} has an unmapped nutrition ingredient ${entry.key}.`);
    for(const key of Object.keys(totals))totals[key]+=ref.nutrients[key]*(entry.grams[0]+entry.grams[1])/2/100;
  }
  const servings=(recipe.nutritionPlan.yield[0]+recipe.nutritionPlan.yield[1])/2;
  const precisions={kcal:0,protein:1,carbs:1,fat:1,satfat:1,fiber:1,sugars:1,sodium:0};
  for(const [key,field] of Object.entries(nutrientKeys)){
    const expectedValue=Number((totals[key]/servings).toFixed(precisions[key]));
    if(Number(nutrition[field])!==expectedValue)fail(`Pilot recipe ${expected} ${field} (${nutrition[field]}) does not reconcile to ingredients and FDC reference data (${expectedValue}).`);
  }
  const usedFdcIds=new Set(recipe.nutritionPlan.entries.filter(e=>e.key).map(e=>pilot.nutritionRefs[e.key.replace(/^v31_/,'')].fdcId));
  if([...usedFdcIds].some(id=>!recipe.nutritionSourceUrls?.some(url=>url===`https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=DEMO_KEY`)))fail(`Pilot recipe ${expected} is missing its direct USDA FoodData Central API record URL.`);
  if (/pizza/i.test(`${recipe.record.title} ${recipe.record.description}`)) fail('Pizza is not an eligible Italy/China pilot recipe.');
}
if (!runtime.includes('RECIPES.push(r)') || !runtime.includes('BATCH_ATLASES[id]=art.atlas') || !runtime.includes('data-v31-approved-recipe="${p.id}"')) fail('Offline pilot recipes and their scene atlases must enter the existing interactive recipe flow.');
if (!transform.includes('readWorldAdventureAsset') || !transform.includes("artwork/world-adventures")) fail('World pilot artwork must be embedded locally into the offline Android build.');
if (!transform.includes('wheel|world')) fail('Android back navigation does not recognize the World screen.');
if (!dataNotes.includes('public domain') || !dataNotes.includes('not suitable for navigation')) fail('Map source/licensing limitations are not documented.');
if (/https?:\/\/(?:api\.mapbox\.com|maps\.googleapis\.com|tile\.openstreetmap\.org|api\.maptiler\.com)/i.test(runtime)) fail('Runtime map/recipe data must not depend on remote map services.');
console.log(`PASS: ${recipes.length} original recipes preserved unchanged; ${geography.features.length} offline countries; India links ${approvedIndiaIds.length} original recipes; Italy/China have 3 bilingual review candidates held outside runtime; six new-country shelves remain blocked.`);
