import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('V3.2 keeps Classic navigation, feature entrypoints and data schemas', async () => {
  const [contract, html, runtime, transform, signedContent] = await Promise.all([
    read('tools/v3/data/v3.2-feature-contract.json').then(JSON.parse),
    read('index.html'), read('tools/v3/runtime.js'), read('tools/v3/transform-production.mjs'),
    read('phase2-pilot/apps/aaria-android/app/src/main/java/com/aaria/magickitchen/pilot/SignedContentPack.kt')
  ]);
  assert.equal(contract.catalog.count, 95);
  assert.deepEqual(contract.navigation, ['home','week','library','recipe','stories','groceries','family','friends','rewards','settings','wheel','world']);
  assert.match(html, /const RECIPES=/);
  assert.match(html, /const PT_RECIPES=/);
  assert.match(html, /const NUTRITION_PLANS=/);
  for (const phrase of ['Spin My Week','World Food Adventures','Magic Pantry','WhatsApp','nutrition','allergen','favorite','recent','Mommy','Friends']) {
    assert.ok((html+runtime).toLowerCase().includes(phrase.toLowerCase()), `feature entrypoint: ${phrase}`);
  }
  assert.match(html, /capture=["']environment["']/);
  assert.match(html, /orientation\s*:\s*landscape/i);
  assert.match(html, /orientation\s*:\s*portrait/i);
  assert.match(transform, /Content-Security-Policy/);
  assert.match(signedContent, /Untrusted publisher key/);
  assert.match(signedContent, /Manifest signature is invalid/);
});

test('recipe 12 WebView checklist helper generates and executes a valid checkbox click', async () => {
  const smoke = await read('.github/scripts/v32-android-smoke.sh');
  const helper = smoke.match(/async function clickRecipeIngredient\(index\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(helper, 'the Android smoke helper must be present');
  assert.equal((smoke.match(/clickRecipeIngredient\(0\)/g) || []).length, 2,
    'both recipe 12 checklist interactions must use the tested lookup');
  assert.doesNotMatch(smoke, /input\[data-check=[^\]]*\]/,
    'the WebView smoke must not construct numeric data-check CSS selectors');

  let clicked = -1;
  let generatedExpression = '';
  const inputs = ['1', '0'].map(value => ({
    dataset: { check: value },
    click() { clicked = Number(value); }
  }));
  const mockDocument = {
    querySelectorAll(selector) {
      assert.equal(selector, '.v32-r12-ingredient-list input');
      return inputs;
    }
  };
  const webViewEvaluate = async expression => {
    generatedExpression = expression;
    return new Function('document', `"use strict"; return (${expression});`)(mockDocument);
  };
  const clickRecipeIngredient = new Function('evaluate',
    `return async function clickRecipeIngredient(index) {${helper[1]}\n}`)(webViewEvaluate);

  assert.equal(await clickRecipeIngredient(0), true);
  assert.equal(clicked, 0, 'the generated WebView expression must click checkbox data-check="0"');
  assert.equal(generatedExpression,
    '(()=>{const input=[...document.querySelectorAll(".v32-r12-ingredient-list input")].find(node=>node.dataset.check==="0");if(!input)return false;input.click();return true})()');
  assert.equal(await clickRecipeIngredient(7), false, 'missing checkbox lookup must fail safely');
});

test('current-batch Featured Recipes omits absent descriptions instead of rendering undefined', async () => {
  const runtime = await read('tools/v3/runtime.js');
  const match = runtime.match(/function v32ReviewFeaturedDescription\(recipe,pt\)\s*\{[\s\S]*?\n\}/);
  assert.ok(match, 'the current-batch card must use the shared optional-description helper');
  const description = new Function('PT_RECIPES', `${match[0]}; return v32ReviewFeaturedDescription;`)({
    12: { title: 'Panquecas de milho com queijo' }
  });
  const recipe12 = { id: 12, title: 'Cheesy Corn Pancakes' };
  assert.equal(description(recipe12, false), '');
  assert.equal(description(recipe12, true), '');
  assert.equal(description({ ...recipe12, description: 'Canonical English copy' }, false), 'Canonical English copy');
  assert.equal(description({ ...recipe12, description: 'Canonical English copy' }, true), 'Canonical English copy');
  const localizedDescription = new Function('PT_RECIPES', `${match[0]}; return v32ReviewFeaturedDescription;`)({
    12: { description: 'Texto canônico em português' }
  });
  assert.equal(localizedDescription(recipe12, true), 'Texto canônico em português');
  assert.match(runtime, /\$\{description\?`<small>\$\{safe\(description\)\}<\/small>`:''\}/,
    'the optional description element must be omitted when canonical copy is absent');
});
