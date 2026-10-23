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
  assert.match(phone, /textColumnWidth=cr\.width-px\(cardStyle\.paddingLeft\)[\s\S]*?layout\.boxes\.map\(card=>card\.textColumnWidth\)\)<50/,
    'the 320px guard measures available ingredient text column width, not a short label’s intrinsic glyph width');
  assert.doesNotMatch(phone, /layout\.boxes\.map\(card=>card\.name\.clientWidth\)\)<50/,
    'a short localized ingredient label must not be misreported as a narrow text column');
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
  assert.match(tablet, /safety:document\.querySelector\("\.ref-safety details p"\)[\s\S]*?expectedSafety:translateText\(RECIPES\.find\(recipe=>Number\(recipe\.id\)===12\)\?\.safety\|\|"", "pt-BR"\)/,
    'tablet PT-BR step flow compares the rendered recipe-wide safety disclosure to the canonical recipe safety translated by the app');
  assert.doesNotMatch(tablet, /safety:document\.querySelector\("\.ref-safety details p"\)[\s\S]*?expectedSafety:v32PilotRecipePresentation/,
    'tablet PT-BR safety assertion does not compare a recipe-wide panel with an inactive per-step template contract');
  assert.match(tablet, /step=0;save\(\);render\(\)/,
    'each tablet orientation starts the PT-BR pilot at step one');
});

test('international Android review explicitly sets orientation after tablet smoke disables auto-rotate', async () => {
  const review = await read('.github/scripts/w01-international-review-smoke.mjs');
  assert.match(review, /settings','put','system','accelerometer_rotation','0'/,
    'the review harness explicitly disables sensor-driven orientation before switching');
  assert.match(review, /for\(const rotation of \[0,1,2,3\]\)[\s\S]*?settings','put','system','user_rotation',String\(rotation\)/,
    'the review harness selects an Android rotation setting and tries the supported orientations');
  assert.match(review, /screenshot orientation mismatch/,
    'captured phone/tablet evidence still must match the requested portrait or landscape orientation');
  assert.doesNotMatch(review, /adb\(\['emu','rotate'\]\)/,
    'the review route does not rely on emulator sensor rotation after G2 has disabled auto-rotate');
});

test('international Android screenshot capture is bounded above 1 MiB and proves every localized illustrated step', async () => {
  const review = await read('.github/scripts/w01-international-review-smoke.mjs');
  assert.match(review, /execFileSync\('timeout',[\s\S]*?timeout:70_000,maxBuffer:16\*1024\*1024/,
    'ADB screenshot capture has a bounded process deadline and enough buffer for full-resolution PNG bytes');
  assert.match(review, /async function captureStep\([\s\S]*?expectedInstruction:source\.instruction[\s\S]*?expectedImage:source\.image\?\.path\|\|source\.image[\s\S]*?imageLoaded:[\s\S]*?expectedSafety:source\.safety[\s\S]*?expectedAdultAssist:source\.adultAssist/,
    'every visible step is checked against its locale package, correct loaded artwork and safety/adult-role copy');
  assert.match(review, /await captureStep\(recipeIndex,id,locale,0,landscape,tag\)[\s\S]*?await captureStep\(recipeIndex,id,locale,index,landscape,tag\)/,
    'phone and tablet evidence captures every guided step in both locales and orientations');
});

test('production international ingredient rows stay compact, contained and measured on Android', async () => {
  const [runtime, tablet, phone, builder, template, workflow] = await Promise.all([
    read('tools/v3/runtime.js'),
    read('.github/scripts/v32-android-tablet-smoke.sh'),
    read('.github/scripts/v32-android-smoke.sh'),
    read('tools/v3/artwork/build-international-review.mjs'),
    read('tools/v3/artwork/wave1-review.template.html'),
    read('.github/workflows/v32-android.yml')
  ]);
  assert.match(runtime, /\.v32-international-recipe \.ref-ingredient-icon img\{[^}]*width:100%;height:100%;max-width:100%;max-height:100%;[^}]*object-fit:contain/,
    'production checklist thumbnails are clipped to a fixed square and contain the complete approved image');
  assert.match(runtime, /\.v32-international-recipe \.ref-ingredient\{[^}]*grid-template-columns:40px minmax\(0,1fr\) 44px;[^}]*min-height:60px;[^}]*overflow:hidden/,
    'production checklist uses compact rows with independent art, text and touch target columns');
  assert.match(runtime, /\.v32-international-recipe \.ref-ingredient input\[type=checkbox\][^{]*\{[^}]*width:24px;height:24px/,
    'production checkboxes remain visibly sized and actionable');
  assert.match(tablet, /async function assertInternationalIngredientLayout[\s\S]*?imageEscapes[\s\S]*?overlap\([\s\S]*?height>96[\s\S]*?labels<1/,
    'real Android tablet assertions cover image bounds, text overlap, row size, accessible labels and rendered images');
  assert.match(tablet, /international-\x27\+id\+\x27-ingredients-\x27\+orientationName/,
    'tablet G2 captures the production ingredient list for each new recipe and orientation');
  assert.match(phone, /internationalProductionEvidence[\s\S]*?for\(const id of \[96,99\]\)[\s\S]*?row\.card\.height>96[\s\S]*?production-international-\$\{id\}-phone-/,
    'phone G3 captures and bounds-checks both production international ingredient lists');
  assert.match(builder, /debugRouteSharesProductionArtwork:true/);
  assert.match(template, /const image=x=>\x27\/international-wave-1\/\x27/,
    'debug review images resolve to the identical offline production asset path');
  assert.match(workflow, /artwork-review\/international-wave-1\/content[\s\S]*?\)\" -eq 0/,
    'APK package verification rejects duplicated review-only copies of the international artwork');
});

test('Android visual regression emulators use stable SwiftShader rendering', async () => {
  const workflow = await read('.github/workflows/v32-android.yml');
  const deviceGates = workflow.match(/emulator-options:[^\n]+/g) || [];
  assert.equal(deviceGates.length, 3, 'G2 tablet, G3 tablet and G3 phone each configure emulator graphics');
  assert.ok(deviceGates.every(options => /-gpu swiftshader(?:\s|$)/.test(options)),
    'all screenshot gates use the supported SwiftShader renderer');
  assert.doesNotMatch(workflow, /-gpu swiftshader_indirect/,
    'the unstable indirect graphics mode that caused G3 WebView renderer loss is not reintroduced');
});

test('phone G3 keeps both complete 95-recipe sweeps enabled within bounded execution limits', async () => {
  const phone = await read('.github/scripts/v32-android-smoke.sh');
  const workflow = await read('.github/workflows/v32-android.yml');
  assert.equal((phone.match(/for\(let recipeId=1;recipeId<=95;recipeId\+\+\)\{/g) || []).length, 2,
    'portrait detail/step capture and landscape detail/step-1 capture each sweep recipes 1–95');
  assert.match(phone, /routeCoverage\.length!==95\|\|new Set\(routeCoverage\)\.size!==95/,
    'phone G3 requires all 95 distinct recipe routes');
  assert.match(phone, /for\(let recipeId=66;recipeId<=95;recipeId\+\+\)\{/,
    'the phone PT-BR sweep remains enabled for all 30 canonical localized recipes');
  assert.match(phone, /timeout --kill-after=10s 2400s node --input-type=module/,
    'the Node sweep has a bounded 40-minute deadline and a diagnostic kill grace period');
  assert.match(workflow, /timeout-minutes: 50\n\s+uses: reactivecircus\/android-emulator-runner@v2\n\s+with:[\s\S]*?emulator-boot-timeout: 300[\s\S]*?script: bash \.github\/scripts\/v32-android-smoke\.sh/,
    'the phone step budget includes emulator boot plus the bounded full sweep');
  assert.match(workflow, /test-and-build:\n\s+runs-on: ubuntu-latest\n\s+timeout-minutes: 120/,
    'the enclosing job can accommodate ordered G1, G2 and both G3 gates');
});

test('97-recipe review catalogue checks keep all 95 original route regressions', async () => {
  const phone = await read('.github/scripts/v32-android-smoke.sh');
  const tablet = await read('.github/scripts/v32-android-tablet-smoke.sh');
  assert.match(phone, /catalogueCount !== 97/,
    'phone G3 expects both integrated recipes in the full production catalogue');
  assert.match(phone, /libraryCards !== 97/,
    'phone G3 requires all 97 searchable recipe cards');
  assert.match(phone, /cards\.length!==97/,
    'original route sweeps execute against the 97-card catalogue');
  assert.match(phone, /returnCount!==97/,
    'route back-navigation restores the full 97-card catalogue');
  assert.equal((phone.match(/for\(let recipeId=1;recipeId<=95;recipeId\+\+\)\{/g) || []).length, 2,
    'both original phone route sweeps remain complete for IDs 1–95');
  assert.match(phone, /routeCoverage\.length!==95\|\|new Set\(routeCoverage\)\.size!==95/,
    'the original 95 distinct route checks remain mandatory');
  assert.match(tablet, /x\.documentWidth>x\.width\+1\|\|x\.grid>x\.width\+1/,
    'tablet G2 compares Android viewport measurements returned by WebView, never Node globals');
  assert.match(tablet, /b\.r\.width>x\.width\+1/,
    'tablet G2 row width uses the same WebView viewport measurement');
});

test('tablet G3 waits for a ready WebView title and preserves emulator logcat on failure', async () => {
  const tablet = await read('.github/scripts/v32-android-tablet-smoke.sh');
  assert.match(tablet, /title\?\.includes\('Magical Kitchen'\)/,
    'tablet G3 must not attach DevTools to the appassets target before its document title is ready');
  assert.match(tablet, /did not become title-ready within 30 seconds/,
    'startup readiness remains bounded and reports the last observed target');
  assert.match(tablet, /ws\.addEventListener\('close',event=>\{const error=new Error\('Tablet WebView DevTools socket closed:/,
    'a lost DevTools socket immediately fails pending protocol commands with the close code');
  assert.match(tablet, /for\(let attempt=1;attempt<=6&&!ws;attempt\+\+\)/,
    'a transient tablet DevTools handshake failure gets at most six bounded connection attempts');
  assert.match(tablet, /DevTools WebSocket open timed out after 5 seconds/,
    'each tablet DevTools handshake attempt has a five-second deadline');
  assert.match(tablet, /failed after 6 bounded attempts:[\s\S]*?target=/,
    'exhausted handshake retries report the last error and WebView target');
  assert.match(tablet, /trap capture_tablet_logcat_on_exit EXIT/);
  assert.match(tablet, /logcat -d -t 4000/,
    'tablet emulator logcat is retained in diagnostics when the smoke fails');
});

test('tablet G3 keeps both complete 95-recipe image sweeps under aligned bounded deadlines', async () => {
  const tablet = await read('.github/scripts/v32-android-tablet-smoke.sh');
  const workflow = await read('.github/workflows/v32-android.yml');
  assert.match(tablet, /for\(let id=1;id<=95;id\+\+\)/,
    'each tablet orientation checks every canonical route and its step image bindings');
  assert.match(tablet, /recipe-image-verification-tablet-\$\{landscape\?'landscape':'portrait'\}/,
    'portrait and landscape receive separate full image evidence reports');
  assert.match(tablet, /steps\.every\(item=>item\.status==='PASS'\)/,
    'every recipe step image assertion remains required for a recipe PASS');
  assert.match(tablet, /timeout --kill-after=10s 2700s node --input-type=module/,
    'the tablet browser harness has a bounded 45-minute deadline');
  assert.match(workflow, /timeout-minutes: 55\n\s+uses: reactivecircus\/android-emulator-runner@v2\n\s+with:[\s\S]*?emulator-boot-timeout: 300[\s\S]*?script: timeout --kill-after=10s 2760s bash \.github\/scripts\/v32-android-tablet-smoke\.sh/,
    'the tablet action includes emulator boot and headroom over its bounded harness');
  assert.match(workflow, /timeout-minutes: 120/,
    'the sequential G1/G2/tablet/phone gates fit within a bounded job deadline');
});
