import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { clickByDatasetExpression, clickSelectorExpression, findByDatasetExpression, navigationSummaryExpression } from '../../tools/v3/android-webview-smoke-expressions.mjs';
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
  assert.match(runtime, /v3BaseRender\(\);[\s\S]*?classList\.remove\('v31-world-screen'\)/,
    'leaving World clears its route-only screen class instead of leaving Home in stale World DOM state');
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

test('Android smoke WebView selectors generate executable, safely quoted route and control expressions', async () => {
  const [phone, tablet] = await Promise.all([
    read('.github/scripts/v32-android-smoke.sh'),
    read('.github/scripts/v32-android-tablet-smoke.sh')
  ]);
  for (const [label, script] of [['phone', phone], ['tablet', tablet]]) {
    const nodeBody = script.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\nNODE\n/);
    assert.ok(nodeBody, `${label} harness must contain its Node/WebView runner`);
    const syntax = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: nodeBody[1], encoding: 'utf8' });
    assert.equal(syntax.status, 0, `${label} generated runner parses: ${syntax.stderr}`);
    assert.match(script, /android-webview-smoke-expressions\.mjs/, `${label} harness imports shared builders`);
    assert.match(script, /navigationSummaryExpression}[^\n]*android-webview-smoke-expressions\.mjs/, `${label} harness imports the navigation builder it invokes`);
    assert.match(script, /evaluate\(navigationSummaryExpression\(\)\)/, `${label} harness uses the tested icon-safe navigation summary`);
    assert.doesNotMatch(script, /\[(?:data-[\w-]+|aria-[\w-]+)=\d+\]/,
      `${label} harness must not use unquoted numeric CSS attribute values`);
    assert.doesNotMatch(script, /querySelector\([^\n]*\[data-open=12\]/,
      `${label} harness must not recreate the run 85 selector defect`);
  }
  assert.match(phone, /clickByDatasetExpression\('#screen \[data-open\]',\s*'open',\s*id\)/,
    'phone recipe opening must compare dataset values instead of interpolating CSS');
  assert.match(tablet, /clickByDatasetExpression\('#screen \[data-open\]',\s*'open',\s*id\)/,
    'tablet recipe opening must compare dataset values instead of interpolating CSS');
  assert.match(phone, /Home before phone recipe '\+id/,
    'phone recipe captures reset through the visible Home navigation after prior route checks');
  assert.match(phone, /Recipes before phone recipe '\+id/,
    'phone recipe captures enter the catalogue through its visible Home action');
  assert.match(phone, /homeState\.view!=='home'[\s\S]*catalogueState\.view!=='library'[\s\S]*opened\.view!=='recipe'/,
    'phone capture fails closed unless Home, the full catalogue, and the selected recipe route are confirmed');
  for (const selector of ['.ref-ingredient-grid input', '#screen [data-open]', '.v32-review-featured-card', '.ref-next', '.ref-next.finish-step', '#nav .tab[data-nav="library"]']) {
    assert.ok(phone.includes(selector) || tablet.includes(selector), `both device flows include ${selector}`);
  }

  let clicked = [];
  const inputZero = { dataset: { check: '0' }, click() { clicked.push('ingredient:0'); } };
  const recipe12 = { dataset: { open: '12' }, click() { clicked.push('recipe:12'); } };
  const recipe99 = { dataset: { open: '99' }, click() { clicked.push('recipe:99'); } };
  const featured12 = { dataset: { v32ReviewFeaturedId: '12' }, click() { clicked.push('featured:12'); } };
  const next = { click() { clicked.push('step:next'); } };
  const finish = { click() { clicked.push('step:finish'); } };
  const library = { click() { clicked.push('nav:library'); } };
  const navTabs = [
    ['home','⌂','Home'], ['library','♧','Recipes'], ['world','🌍','World Adventure'],
    ['groceries','🧺','Magic Pantry'], ['week','▦','Planner'], ['creations','☆','My Creations']
  ].map(([id,icon,label]) => ({ dataset:{nav:id}, innerText:`${icon}\n${label}`, lastChild:{textContent:label} }));
  const selectors = new Map([
    ['.ref-ingredient-grid input', [inputZero]],
    ['#screen [data-open]', [recipe12, recipe99]],
    ['#screen .recipe-card[data-open]', [recipe12, recipe99]],
    ['.v32-review-featured-card', [featured12]],
  ]);
  const direct = new Map([
    ['.ref-next', next],
    ['.ref-next.finish-step', finish],
    ['#nav .tab[data-nav="library"]', library],
  ]);
  const mockDocument = {
    querySelectorAll(selector) {
      if (selector === '#nav .tab') return navTabs;
      assert.ok(selectors.has(selector), `unexpected generated querySelectorAll selector: ${selector}`);
      return selectors.get(selector);
    },
    querySelector(selector) {
      assert.ok(direct.has(selector), `unexpected generated querySelector selector: ${selector}`);
      return direct.get(selector);
    }
  };
  const execute = expression => new Function('document', `"use strict"; return (${expression});`)(mockDocument);
  const evaluateClick = (selector, key, value) => execute(clickByDatasetExpression(selector, key, value));

  const generated = clickByDatasetExpression('.ref-ingredient-grid input', 'check', 0);
  assert.equal(await Promise.resolve(execute(generated)), true);
  assert.deepEqual(clicked, ['ingredient:0'], 'full generated expression clicks ingredient data-check="0"');
  assert.match(generated, /dataset\["check"\]==="0"/);
  assert.equal(execute(findByDatasetExpression('#screen [data-open]', 'open', 12)), recipe12,
    'full generated lookup expression finds canonical recipe #12');
  assert.equal(evaluateClick('#screen [data-open]', 'open', 12), true,
    'full generated recipe-card expression opens #12');
  assert.equal(evaluateClick('#screen .recipe-card[data-open]', 'open', 99), true,
    'tablet route expression opens the selected card');
  assert.equal(evaluateClick('.v32-review-featured-card', 'v32ReviewFeaturedId', 12), true,
    'Featured Recipes opens its current batch card');
  for (const selector of ['.ref-next', '.ref-next.finish-step', '#nav .tab[data-nav="library"]']) {
    assert.equal(execute(clickSelectorExpression(selector)), true, `full generated expression clicks ${selector}`);
  }
  assert.deepEqual(clicked, ['ingredient:0', 'recipe:12', 'recipe:99', 'featured:12', 'step:next', 'step:finish', 'nav:library']);
  assert.equal(evaluateClick('#screen [data-open]', 'open', 404), false,
    'missing recipe lookup returns false without a click');
  const nav = execute(navigationSummaryExpression());
  assert.deepEqual(nav.map(item => item.id), ['home','library','world','groceries','week','creations'],
    'icon-bearing DOM nodes retain all six navigation identities in order');
  assert.deepEqual(nav.map(item => item.label), ['Home','Recipes','World Adventure','Magic Pantry','Planner','My Creations'],
    'normalization extracts visible labels without decorative icons or line breaks');
  assert.equal(navTabs[0].innerText, '⌂\nHome', 'regression input includes the icon-plus-label DOM shape from Android');
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

test('recipe 12 ingredient cards use the approved reference renderer with labeled checkboxes', async () => {
  const html = await read('index.html');
  const start = html.indexOf('function batchReferenceRecipe(){');
  const end = html.indexOf('\nfunction recipe(){', start);
  assert.ok(start >= 0 && end > start);
  const renderer = html.slice(start, end);
  assert.match(renderer, /<label class=\"ref-ingredient[^>]*><input type=\"checkbox\"[^>]*><span class=\"ref-ingredient-icon\">\$\{batchIngredientPicture\(v\)\}<\/span><span>\$\{safe\(v\)\}<\/span>/,
    'ingredient picture, readable name and native labeled checkbox share one card');
  assert.match(renderer, /<div class=\"ref-ingredient-grid\">/, 'the approved renderer uses the owner reference ingredient grid');
});

test('phone and tablet Android capture the visible PT-BR ingredient grid and reset recipe progress per orientation', async () => {
  const phone = await read('.github/scripts/v32-android-smoke.sh');
  const tablet = await read('.github/scripts/v32-android-tablet-smoke.sh');
  assert.match(phone, /prepareVisibleRecipeCapture\('\.ref-ingredient-grid','PT-BR #12 Ingredients '\+orientation\)/);
  assert.match(phone, /v32-recipe-12-pt-br-ingredients-'\+orientation\+'\.png/);
  assert.match(phone, /state\.done=\(state\.done\|\|\[\]\)\.filter\(x=>Number\(x\)!==12\);state\.myCreations=/,
    'phone landscape capture clears only disposable recipe 12 completion state');
  assert.match(phone, /step=0;save\(\);return true/,
    'phone landscape capture starts at step one after portrait completion');
  assert.match(tablet, /prepareVisibleRecipeCapture\('\.ref-ingredient-grid','PT-BR #12 Ingredients '\+suffix\)/);
  assert.match(tablet, /recipe-12-pt-br-ingredients-'\+suffix/);
  assert.match(tablet, /state\.language="pt-BR";state\.done=\(state\.done\|\|\[\]\)\.filter\(x=>Number\(x\)!==12\);state\.myCreations=/,
    'each tablet orientation clears only disposable recipe 12 completion state');
  assert.match(tablet, /const ptNav=await evaluate\(navigationSummaryExpression\(\)\)/,
    'tablet PT-BR navigation reads the icon-safe label summary');
  assert.match(tablet, /ptNav\.map\(x=>x\.label\)\.join\('\|'\)!=='Início\|Receitas\|Aventura\|Despensa\|Planejar\|Criações'/,
    'tablet PT-BR navigation validates localized labels without decorative icon text');
  assert.match(tablet, /ptNav\.map\(x=>x\.id\)\.join\('\|'\)!=='home\|library\|world\|groceries\|week\|creations'/,
    'tablet PT-BR navigation retains the exact six-route identity check');
  assert.doesNotMatch(tablet, /nav:\[\.\.\.document\.querySelectorAll\("#nav \.tab"\)\]\.map\(e=>e\.textContent\.trim\(\)\)/,
    'tablet PT-BR route assertion does not mistake decorative icons for visible labels');
  assert.match(tablet, /step=0;save\(\);render\(\)/,
    'each tablet orientation starts the PT-BR pilot at step one');
});
