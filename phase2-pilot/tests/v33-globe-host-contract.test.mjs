import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWorldAdventureHost, WORLD_ADVENTURE_INDIA_RECIPE_IDS } from '../../tools/v3/world-adventure-host.mjs';

const makeRecipes = () => Array.from({ length: 95 }, (_, index) => ({
  id: index + 1,
  title: { 'en-GB': `Recipe ${index + 1}`, 'pt-BR': `Receita ${index + 1}` },
  description: { 'en-GB': 'A canonical recipe', 'pt-BR': 'Uma receita canônica' }
}));

function setup(overrides = {}) {
  const calls = [];
  const host = createWorldAdventureHost({
    canonicalRecipes: makeRecipes(),
    locale: 'en-GB',
    passportSnapshot: { worldStamps: ['IND', 'ITA', 'IND'] },
    onOpenRecipe: id => calls.push(['recipe', id]),
    onBack: scope => calls.push(['back', scope]),
    onOpenPassport: () => calls.push(['passport']),
    ...overrides
  });
  return { host, calls };
}

test('host contract exposes exactly the existing 18 canonical India IDs', () => {
  const { host } = setup();
  assert.deepEqual(WORLD_ADVENTURE_INDIA_RECIPE_IDS, [51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74]);
  const runtime = readFile(new URL('../../tools/v3/runtime.js', import.meta.url), 'utf8');
  return runtime.then(source => {
    const ids = source.match(/V31_APPROVED_INDIA_RECIPE_IDS=\[([^\]]+)\]/)?.[1].split(',').map(Number);
    assert.deepEqual(WORLD_ADVENTURE_INDIA_RECIPE_IDS, ids, 'host IDs must match the app completion/mapping allowlist');
  }).then(() => {
  const india = host.getCountry('IND');
  assert.equal(india.available, true);
  assert.equal(india.reviewOnly, false);
  assert.deepEqual(india.recipes.map(recipe => recipe.id), WORLD_ADVENTURE_INDIA_RECIPE_IDS);
  assert.equal(india.recipes[0].title, 'Recipe 51');
  assert.equal(india.recipes[0].canonical, true);
  });
});

test('draft destinations remain unavailable and cannot route to a recipe or earn a stamp', () => {
  const { host, calls } = setup();
  for (const code of ['ITA', 'CHN', 'JPN', 'MEX', 'VNM']) {
    const result = host.getCountry(code);
    assert.equal(result.available, false);
    assert.equal(result.reviewOnly, true);
    assert.deepEqual(result.recipes, []);
  }
  assert.equal(host.openRecipe(96), false);
  assert.equal(host.openRecipe(12), false);
  assert.deepEqual(host.getPassportSnapshot().stamps, ['IND']);
  assert.deepEqual(calls, []);
});

test('host delegates recipe, Back and Passport navigation without owning screens', () => {
  const { host, calls } = setup();
  assert.equal(host.openRecipe(51), true);
  host.back('country');
  host.back('screen');
  host.openPassport();
  assert.deepEqual(calls, [['recipe', 51], ['back', 'country'], ['back', 'screen'], ['passport']]);
  assert.throws(() => host.back('recipe'), /Unknown Back scope/);
});

test('Portuguese locale passes localized country and recipe labels through the same data boundary', () => {
  const { host } = setup({ locale: 'pt-BR' });
  assert.equal(host.getCountry('IND').label, 'Índia');
  assert.equal(host.getCountry('IND').recipes[0].title, 'Receita 51');
  assert.equal(host.locale, 'pt-BR');
  assert.throws(() => setup({ locale: 'fr-FR' }), /locale/);
});

test('missing any India mapping fails closed instead of exposing a partial destination', () => {
  const recipes = makeRecipes().filter(recipe => recipe.id !== 65);
  const { host } = setup({ canonicalRecipes: recipes });
  assert.equal(host.getCountry('IND').available, false);
  assert.deepEqual(host.getCountry('IND').recipes, []);
  assert.equal(host.openRecipe(51), false);
});

test('host rejects catalogue count or ID mutations instead of masking canonical drift', () => {
  assert.throws(() => setup({ canonicalRecipes: makeRecipes().slice(1) }), /95-recipe/);
  const duplicate = makeRecipes();
  duplicate[94] = { ...duplicate[94], id: 94 };
  assert.throws(() => setup({ canonicalRecipes: duplicate }), /unique IDs/);
});

test('integration boundary documents module lifecycle, orientation and Android Back ownership', async () => {
  const doc = await readFile(new URL('../../docs/control-tower/W02_W03_MAGICAL_GLOBE_ANDROID_HANDOFF.md', import.meta.url), 'utf8');
  for (const contract of ['mount(root, hostContext, restoredState)', 'dispose()', 'orientation', 'Android Back', 'bottom navigation', 'read-only', 'REVIEW_READY']) {
    assert.ok(doc.includes(contract), `handoff must document ${contract}`);
  }
  assert.match(doc, /W03 owns the globe renderer,[\s\S]*?Surprise Me behaviour,[\s\S]*?recipe-card presentation/);
  assert.match(doc, /W02 owns the Android\/WebView screen host,[\s\S]*?canonical recipe lookup\/navigation,[\s\S]*?Food Passport/);
});
