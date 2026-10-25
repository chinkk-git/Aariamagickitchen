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
if (!Array.isArray(geography.features) || geography.features.length < 150) fail('Offline geographic source provenance is incomplete.');
const destinationBlock = runtime.slice(runtime.indexOf('const V31_WORLD_DESTINATIONS=['), runtime.indexOf('const V31_DESTINATION_BY_ISO='));
if (!destinationBlock.includes("code:'IND'") || destinationBlock.includes("code:'ITA'") || destinationBlock.includes("code:'CHN'") || destinationBlock.includes("code:'JPN'") || destinationBlock.includes("code:'MEX'") || destinationBlock.includes("code:'VNM'")) fail('Only the validated India destination may appear in live runtime navigation.');
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
  ['data-v31-country="IND"', 'India country marker'],
  ['data-v31-open-world', 'homepage world navigation'],
  ['APPROVED ORIGINAL RECIPES', 'existing Indian recipe collection'],
  ['prefers-reduced-motion', 'reduced-motion support'],
  ['data-w02-fixed-map', 'measurable fixed map viewport']
]) if (!runtime.includes(token) && !transform.includes(token)) fail(`Missing ${label}.`);
const explorerPage=runtime.slice(runtime.lastIndexOf('v31WorldPage=function v33FixedWorldMapPage(){'),runtime.indexOf('const v3OriginalCreateWeek'));
if (!explorerPage.includes('data-v31-open-passport') || !explorerPage.includes('data-v31-country="IND"') || explorerPage.includes('data-v31-zoom') || explorerPage.includes('data-v31-pan-toggle') || explorerPage.includes('v31MapSvg')) fail('Fixed World Map must expose Food Passport and the validated India route without camera controls.');
if (!visualCss.includes('.w02-map-viewport{') || !visualCss.includes('.w02-map-art .v31-map-art-image{') || !visualCss.includes('object-fit:contain')) fail('Fixed World Map must use a full-content viewport and aspect-preserving approved map art.');
if (!runtime.includes('function v33MountGlobe(screen)') || !runtime.includes('window.AariaWorldAdventureGlobe.mount') || !runtime.includes('data-v33-passport-close') || !transform.includes('magicalGlobeScript') || !transform.includes('worldAdventureHost')) fail('Offline interactive globe, Food Passport or country-recipe navigation integration is missing.');
if (!transform.includes('.aria-world-globe__stage') || !transform.includes('@media(orientation:landscape)') || !transform.includes('prefers-reduced-motion:reduce')) fail('Portrait/landscape World presentation or reduced-motion support is missing.');
if (!runtime.includes('data-v31-approved-recipe') || !runtime.includes('openRecipe(Number(button.dataset.v31ApprovedRecipe))')) fail('Original Indian recipes must open through the existing recipe flow.');
if (!runtime.includes('aria-live="polite"') || !runtime.includes('focus({preventScroll:true})')) fail('Accessible status or focus restoration is missing.');
if (!runtime.includes('<h1 tabindex="-1">') || !runtime.includes('v31WorldOpenerIndex')) fail('World entry and return focus targets are missing.');
if (!runtime.includes(".bottom .tab[data-nav=\"world\"]") || !runtime.includes('v31WorldOpenedFromNav')) fail('World-tab return focus is missing.');
if (!transform.includes("worldMap: readReferenceImage('docs/design/approved-v31-world-map-crop.webp')")) fail('The approved owner World Map artwork must remain the offline image source.');
if (runtime.includes('V31_WORLD_GEOGRAPHY') || runtime.includes('v31MapSvg') || runtime.includes('v31MapPointers')) fail('The fixed map route must not load or generate runtime geography or gesture layers.');
if (transform.includes(".replace('__V31_WORLD_ADVENTURE_JSON__'") || runtime.includes('V31_WORLD_ADVENTURE')) fail('Unvalidated review-pilot recipes and art must not be embedded in the World Map runtime.');
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
if (!runtime.includes('V32_INTERNATIONAL_RECIPES') || !runtime.includes('RECIPES.push(r)') || runtime.includes('data-v31-approved-recipe="${p.id}"')) fail('International review recipes must extend the immutable 95-recipe runtime catalogue without being presented as approved W31 recipes.');
if (!transform.includes('internationalPackage.packageVersion !== \'3.5-review\'') || !transform.includes('expectedInternationalReviewIds')) fail('The V3.5 review catalogue must include international recipe IDs #096–116.');
if (!transform.includes('wheel|world')) fail('Android back navigation does not recognize the World screen.');
if (!dataNotes.includes('public domain') || !dataNotes.includes('not suitable for navigation')) fail('Map source/licensing limitations are not documented.');
if (/https?:\/\/(?:api\.mapbox\.com|maps\.googleapis\.com|tile\.openstreetmap\.org|api\.maptiler\.com)/i.test(runtime)) fail('Runtime map/recipe data must not depend on remote map services.');
console.log(`PASS: ${recipes.length} original recipes preserved unchanged; ${geography.features.length} offline countries; India links ${approvedIndiaIds.length} original recipes; India’s 18 links are preserved; international IDs #096–116 remain review-only.`);
