import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWorldAdventureHost, WORLD_ADVENTURE_INDIA_RECIPE_IDS } from '../../tools/v3/world-adventure-host.mjs';

const makeRecipes = (count = 95) => Array.from({ length: count }, (_, index) => ({
  id: index + 1,
  title: `Recipe ${index + 1}`,
  description: 'A catalogue recipe',
  ingredients: ['an ingredient'],
  steps: ['a step']
}));
const validatedRecipe = (id, countryCode) => ({
  id, title: `Recipe ${id}`, description: 'A translated recipe', ingredients: ['ingredient'], steps: ['step'], active: true,
  worldAdventure: { countryCode, validationStatus: 'W01_VALIDATED', bilingualStatus: 'APPROVED', artworkStatus: 'APPROVED', safetyStatus: 'APPROVED', navigationStatus: 'ACTIVE' }
});
function setup(canonicalRecipes = makeRecipes(), overrides = {}) {
  const calls = [];
  const host = createWorldAdventureHost({
    canonicalRecipes, locale: 'en-GB', passportSnapshot: { worldStamps: ['IND', 'ITA', 'IND'] },
    onOpenRecipe: id => calls.push(['recipe', id]), onBack: scope => calls.push(['back', scope]),
    onOpenPassport: () => calls.push(['passport']), ...overrides
  });
  return { host, calls };
}
const allCountryRecipes = host => ['IND','ITA','CHN','JPN','MEX','VNM'].flatMap(code => host.getCountry(code).recipes);

test('host preserves all 18 India links from the original catalogue', async () => {
  const { host } = setup();
  assert.deepEqual(WORLD_ADVENTURE_INDIA_RECIPE_IDS, [51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74]);
  const runtime = await readFile(new URL('../../tools/v3/runtime.js', import.meta.url), 'utf8');
  const ids = runtime.match(/V31_APPROVED_INDIA_RECIPE_IDS=\[([^\]]+)\]/)?.[1].split(',').map(Number);
  assert.deepEqual(WORLD_ADVENTURE_INDIA_RECIPE_IDS, ids);
  const india = host.getCountry('IND');
  assert.equal(india.available, true);
  assert.equal(india.reviewOnly, false);
  assert.deepEqual(india.recipes.map(recipe => recipe.id), WORLD_ADVENTURE_INDIA_RECIPE_IDS);
  assert.equal(india.recipes[0].canonical, true);
});

test('95-recipe catalogue exposes India only and fails closed for unvalidated countries', () => {
  const { host, calls } = setup();
  for (const code of ['ITA', 'CHN', 'JPN', 'MEX', 'VNM']) {
    assert.equal(host.getCountry(code).available, false);
    assert.equal(host.getCountry(code).reviewOnly, true);
    assert.deepEqual(host.getCountry(code).recipes, []);
  }
  assert.equal(host.openRecipe(96), false);
  assert.equal(host.openRecipe(12), false);
  const linked = allCountryRecipes(host).map(recipe => recipe.id);
  assert.equal(linked.length, 18, '95-item stage must expose exactly the 18 canonical India links');
  assert.equal(new Set(linked).size, 18, '95-item stage must not duplicate globe destinations');
  assert.deepEqual(linked, WORLD_ADVENTURE_INDIA_RECIPE_IDS, 'the other 77 originals must stay out of globe country lists');
  assert.deepEqual(host.getPassportSnapshot().stamps, ['IND']);
  assert.deepEqual(calls, []);
});

test('97-entry catalogue discovers only W01-validated Italy and China links', () => {
  const recipes = [...makeRecipes(), validatedRecipe(96, 'ITA'), validatedRecipe(99, 'CHN')];
  const { host, calls } = setup(recipes);
  assert.deepEqual(host.getCountry('ITA').recipes.map(r => r.id), [96]);
  assert.deepEqual(host.getCountry('CHN').recipes.map(r => r.id), [99]);
  assert.equal(host.getCountry('JPN').available, false);
  const linked = allCountryRecipes(host).map(recipe => recipe.id);
  assert.equal(linked.length, 20, '97-item stage must contain 18 India and 2 validated international links');
  assert.equal(new Set(linked).size, 20, '97-item stage must not duplicate globe destinations');
  assert.deepEqual(linked.filter(id => id > 95).sort((a,b) => a-b), [96,99]);
  assert.deepEqual(linked.filter(id => id <= 95), WORLD_ADVENTURE_INDIA_RECIPE_IDS);
  assert.equal(host.openRecipe(96), true);
  assert.equal(host.openRecipe(99), true);
  assert.deepEqual(calls, [['recipe', 96], ['recipe', 99]]);
});

test('110-entry catalogue scales by validated country metadata without an allowlist update', () => {
  const additions = [validatedRecipe(96,'ITA'), validatedRecipe(97,'JPN'), validatedRecipe(98,'MEX'), validatedRecipe(99,'CHN'), validatedRecipe(100,'VNM'),
    ...Array.from({length:10},(_,i)=>validatedRecipe(101+i,['ITA','JPN','MEX','CHN','VNM'][i%5]))];
  const { host } = setup([...makeRecipes(), ...additions]);
  const linked = allCountryRecipes(host).map(recipe => recipe.id);
  assert.equal(linked.length, 33, '110-item stage must contain 18 India and all 15 validated international links');
  assert.equal(new Set(linked).size, 33, '110-item stage must not duplicate globe destinations');
  assert.deepEqual(linked.filter(id => id <= 95), WORLD_ADVENTURE_INDIA_RECIPE_IDS);
  assert.deepEqual(linked.filter(id => id > 95).sort((a,b) => a-b), Array.from({length:15},(_,i)=>96+i));
  assert.equal(Object.values({ITA:'ITA',JPN:'JPN',MEX:'MEX',CHN:'CHN',VNM:'VNM'}).reduce((n,code)=>n+host.getCountry(code).recipes.length,0),15);
  assert.deepEqual(host.getCountry('ITA').recipes.map(r=>r.id), [96,101,106]);
});

test('catalogue identity remains strict while future records with missing approval fail closed', () => {
  assert.throws(() => setup(makeRecipes().slice(1)), /base/);
  const duplicate = [...makeRecipes(), validatedRecipe(96,'ITA')];duplicate[95] = {...duplicate[95],id:95};
  assert.throws(() => setup(duplicate), /unique positive IDs/);
  const records = [...makeRecipes(), validatedRecipe(96,'ITA'), validatedRecipe(97,'USA'), validatedRecipe(98,'JPN')];
  records[96].worldAdventure.countryCode = 'USA';
  records[97].worldAdventure.bilingualStatus = 'PENDING';
  records[97].worldAdventure.safetyStatus = 'PENDING';
  records.push({...validatedRecipe(99,'MEX'),active:false});
  const { host, calls } = setup(records);
  assert.deepEqual(host.getCountry('ITA').recipes.map(r=>r.id),[96]);
  for (const code of ['CHN','JPN','MEX','VNM']) assert.deepEqual(host.getCountry(code).recipes, []);
  assert.equal(host.openRecipe(96),true);
  for (const id of [97,98,99]) assert.equal(host.openRecipe(id), false);
  assert.deepEqual(calls, [['recipe',96]]);
});

test('host delegates recipe, Back and Passport navigation and localizes country names', () => {
  const { host, calls } = setup(makeRecipes(), { locale:'pt-BR', getLocalizedRecipe:(r,locale)=>({title:locale==='pt-BR'?`Receita ${r.id}`:r.title}) });
  assert.equal(host.getCountry('IND').label, 'Índia');
  assert.equal(host.getCountry('IND').recipes[0].title, 'Receita 51');
  assert.equal(host.locale, 'pt-BR');
  assert.throws(() => setup(makeRecipes(), { locale:'fr-FR' }), /locale/);
  assert.equal(host.openRecipe(51), true);
  host.back('country'); host.back('screen'); host.openPassport();
  assert.deepEqual(calls, [['recipe',51],['back','country'],['back','screen'],['passport']]);
  assert.throws(() => host.back('recipe'), /Unknown Back scope/);
});

test('module handoff, Android host and production transform are wired and preserve screen ownership', async () => {
  const [doc,runtime,transform,moduleJs] = await Promise.all([
    readFile(new URL('../../docs/control-tower/W02_W03_MAGICAL_GLOBE_ANDROID_HANDOFF.md', import.meta.url),'utf8'),
    readFile(new URL('../../tools/v3/runtime.js', import.meta.url),'utf8'),
    readFile(new URL('../../tools/v3/transform-production.mjs', import.meta.url),'utf8'),
    readFile(new URL('../../tools/v3/world-adventure-globe/world-adventure-globe.js', import.meta.url),'utf8')
  ]);
  assert.match(runtime,/AariaWorldAdventureGlobe\.mount/);
  assert.match(runtime,/createWorldAdventureHost\(\{canonicalRecipes:RECIPES/);
  assert.match(runtime,/\.mount\(screen\.querySelector\('#v33-world-globe-host'\),\{\.\.\.v33WorldHost,avatarSrc:V31_HOME_WORLD_ART\.aaria\},v33GlobeState\|\|undefined\)/);
  assert.match(runtime,/avatarSrc:V31_HOME_WORLD_ART\.aaria/);
  assert.match(runtime,/getState:\(\)=>moduleController\.serialize\(\)/);
  assert.match(runtime,/destroy:\(\)=>moduleController\.dispose\(\)/);
  assert.match(runtime,/aria-world-globe__header/);
  assert.match(transform,/magicalGlobeScript/);
  assert.match(transform,/magicalGlobeStyles/);
  assert.match(moduleJs,/handleBack:/);
  assert.match(moduleJs,/Surprise/);
  for (const contract of ["India's 18 existing recipe descriptors",'Android Back','bottom navigation','read-only','portrait','landscape','Food Passport','294db5cea846355b7813f2de63eba9cd1f358d35']) assert.ok(doc.includes(contract));
});
