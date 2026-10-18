#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const fail = message => { console.error(`FAIL: ${message}`); process.exit(1); };
const runtime = fs.readFileSync(path.join(here, 'runtime.js'), 'utf8');
const transform = fs.readFileSync(path.join(here, 'transform-production.mjs'), 'utf8');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const geography = JSON.parse(fs.readFileSync(path.join(here, 'data/ne_110m_admin_0_countries.geojson'), 'utf8'));
const dataNotes = fs.readFileSync(path.join(here, 'data/README.md'), 'utf8');

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

const destinations = [['IND', 'India'], ['ITA', 'Italy'], ['CHN', 'China'], ['JPN', 'Japan'], ['MEX', 'Mexico'], ['VNM', 'Vietnam'], ['GRC', 'Greece']];
if (!Array.isArray(geography.features) || geography.features.length < 150) fail('Offline country boundaries are incomplete.');
for (const [iso, country] of destinations) {
  if (!geography.features.some(feature => feature.properties?.ADMIN === country && (feature.properties?.ISO_A3_EH === iso || feature.properties?.ISO_A3 === iso))) fail(`Offline map is missing ${country}.`);
}
const destinationBlock = runtime.slice(runtime.indexOf('const V31_WORLD_DESTINATIONS=['), runtime.indexOf('const V31_DESTINATION_BY_ISO='));
if (!destinationBlock || (destinationBlock.match(/reviewStatus:'draft'/g) || []).length !== 6 || !destinationBlock.includes("reviewStatus:'approved-reference'")) fail('The six new-country shelves must remain drafts while India points to existing recipes.');
const approvedIndiaIds = [51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74];
const mappedIds = runtime.match(/V31_APPROVED_INDIA_RECIPE_IDS=\[([^\]]+)\]/)?.[1].split(',').map(Number) || [];
if (mappedIds.join(',') !== approvedIndiaIds.join(',')) fail('India must reference the verified original Indian recipe IDs without creating new records.');
for (const id of approvedIndiaIds) if (!ids.includes(id)) fail(`India map references missing original recipe ID ${id}.`);
const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]));
for (let id = 51; id <= 65; id++) if (recipesById.get(id)?.category !== 'Indian') fail(`India map ID ${id} is not categorized as an original Indian recipe.`);
for (const [id, title] of [[69, 'Vegetable Biryani'], [72, 'Paneer Butter Masala'], [74, 'Mini Vegetable Samosas']]) if (recipesById.get(id)?.title !== title) fail(`India map ID ${id} no longer matches the verified recipe title.`);
if (/data-v31-(?:stamp)=|ingredients(?:En|Pt)|steps(?:En|Pt)|worldPassport/i.test(runtime)) fail('Unreviewed destination recipe steps or passport rewards must not be available in runtime data or actions.');
if (!runtime.includes('data-v31-approved-recipe') || !runtime.includes('openRecipe(Number(button.dataset.v31ApprovedRecipe))')) fail('Original Indian recipes must open through the existing recipe flow.');
if (/Mango Lassi Magic|Little Pizza Bites|Brazil|Mini Pão de Queijo/i.test(runtime)) fail('Superseded V3.1 recipe candidates must not be presented as approved destinations.');
for (const [token, label] of [
  ['data-v31-country-select', 'accessible country selection list'],
  ['data-v31-country-search', 'destination search'],
  ['data-v31-no-results', 'search empty state'],
  ['data-v31-zoom', 'map zoom controls'],
  ['data-v31-open-world', 'homepage world navigation'],
  ['New recipes will appear after child-safety, allergen, nutrition, cultural and duplicate reviews.', 'draft recipe lock copy'],
  ['APPROVED ORIGINAL RECIPES', 'existing Indian recipe collection'],
  ['prefers-reduced-motion', 'reduced-motion support'],
  ['.v31-world-map', 'pan and zoom map styling']
]) if (!runtime.includes(token) && !transform.includes(token)) fail(`Missing ${label}.`);
if (!runtime.includes('pointermove') || !runtime.includes('v31PanX') || !runtime.includes('data-v31-pan-toggle') || !runtime.includes('v31MapPanMode') || !runtime.includes('toggle.disabled=v31MapZoom<=1') || !runtime.includes('if(v31MapZoom<=1)v31MapPanMode=false')) fail('Explicit two-axis map pan mode must be disabled until zoomed in and clear itself at 1×.');
if (runtime.includes('setPointerCapture') || !runtime.includes('Math.max(-maxX') || !runtime.includes('Math.max(-maxY') || !runtime.includes('Math.min(maxX,v31PanX)') || !runtime.includes('Math.min(maxY,v31PanY)')) fail('Map taps must retain their country targets and panning must stay within bounds after drag and zoom.');
if (!runtime.includes('aria-live="polite"') || !runtime.includes('focus({preventScroll:true})')) fail('Accessible status or focus restoration is missing.');
if (!runtime.includes('aria-pressed="${v31SelectedCountry===code}"') || !runtime.includes('aria-pressed="${x.code===c.code}"')) fail('Selected map and destination states must be announced to assistive technology.');
if (transform.includes('max-height:300px;overflow:auto')) fail('India recipes must remain part of the page scroll instead of a nested clipped list.');
if (!runtime.includes('<h1 tabindex="-1">') || !runtime.includes('v31WorldOpenerIndex')) fail('World entry and return focus targets are missing.');
if (!runtime.includes(".bottom .tab[data-nav=\"world\"]") || !runtime.includes('v31WorldOpenedFromNav')) fail('World-tab return focus is missing.');
if (!transform.includes('grid-template-columns:repeat(5,minmax(0,1fr))') || !transform.includes('.v31-primary-actions button{min-height:44px') || !transform.includes('.v31-world-header h1:focus')) fail('Five-tab navigation, focus styling or 44px primary-action targets are missing.');
if (!transform.includes('.v31-world-map{') || !transform.includes('touch-action:pan-y pinch-zoom') || !transform.includes('.v31-map-wrap.is-pan-mode .v31-world-map{touch-action:none}')) fail('Map must preserve page scrolling and pinch by default, with explicit two-axis pan mode.');
if (!runtime.includes('Boundaries are simplified and may be disputed')) fail('The map must explain disputed/simplified borders.');
if (!runtime.includes('Fronteiras simplificadas e possivelmente disputadas')) fail('The Portuguese map must explain disputed/simplified borders.');
if (!transform.includes(".replace('__V31_WORLD_GEOGRAPHY_JSON__', JSON.stringify(worldGeography))") || !runtime.includes('V31_WORLD_GEOGRAPHY=__V31_WORLD_GEOGRAPHY_JSON__')) fail('Offline country data injection is missing.');
if (!transform.includes('wheel|world')) fail('Android back navigation does not recognize the World screen.');
if (!dataNotes.includes('public domain') || !dataNotes.includes('not suitable for navigation')) fail('Map source/licensing limitations are not documented.');
if (/https?:\/\/(?:api\.mapbox\.com|maps\.googleapis\.com|tile\.openstreetmap\.org|api\.maptiler\.com)/i.test(runtime)) fail('Runtime map/recipe data must not depend on remote map services.');
console.log(`PASS: ${recipes.length} original recipes preserved; ${geography.features.length} offline countries; seven destinations mapped; ${approvedIndiaIds.length} original Indian recipes linked; six new-country shelves remain blocked.`);
