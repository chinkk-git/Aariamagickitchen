import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

function extractArray(source, declaration) {
  const declarationIndex = source.indexOf(declaration);
  assert.ok(declarationIndex >= 0, `${declaration} is present`);
  const start = declarationIndex + declaration.length;
  let depth = 0, quote = '', escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
    } else if (char === '"') quote = char;
    else if (char === '[' || char === '{') depth += 1;
    else if (char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, i + 1));
    }
  }
  assert.fail(`${declaration} is a complete JSON array`);
}

test('recipe #12 routes to the approved avatar-rich renderer, never the text-heavy fallback', async () => {
  const [html, runtime] = await Promise.all([read('index.html'), read('tools/v3/runtime.js')]);
  const recipes = extractArray(html, 'const RECIPES=');
  const recipe12 = recipes.find(recipe => recipe.id === 12);
  assert.ok(recipe12, 'canonical recipe #12 remains present');
  assert.deepEqual(recipe12.steps, [
    'Mix corn, egg, flour, cheese and milk into a thick spoonable batter.',
    'Ask an adult to warm a nonstick pan with a little oil over medium-low heat.',
    'An adult adds small spoonfuls and cooks about 2–3 minutes per side.',
    'Check the centers are fully cooked and golden. Cool before eating.'
  ], 'the original four canonical steps are unchanged');
  assert.match(html, /"12":\s*\{"titles"/, '#12 is in the batch route catalogue');
  assert.match(html, /function recipe\(\)\{return BATCH_META\[selected\.id\]\?batchReferenceRecipe\(\):legacyRecipe\(\);\}/,
    'the canonical batch route selects the approved renderer');
  assert.match(runtime, /recipe=function v32Recipe12Only\(\)\{const id=Number\(selected\?\.id\);return id===12\?batchReferenceRecipe\(\):v32RecipeBeforePilot\(\)\};/,
    'the #12 pilot explicitly returns the same approved renderer');
  assert.doesNotMatch(runtime, /id===12\?v32UniversalRecipeStepTemplate/,
    'recipe #12 cannot silently return to the text-heavy universal template');
});

test('approved renderer contains original artwork, recipe steps, equipment, safety and nutrition sections', async () => {
  const html = await read('index.html');
  const start = html.indexOf('function batchReferenceRecipe(){');
  const end = html.indexOf('\nfunction recipe(){', start);
  assert.ok(start >= 0 && end > start, 'approved batch renderer is present');
  const renderer = html.slice(start, end);
  for (const [needle, description] of [
    ['${recipeSidebar()}', 'original Aaria sidebar artwork'],
    ["avatar('ref-greet-avatar')", 'Aaria greeting avatar'],
    ['${batchDishImage(r)}', 'existing finished-dish artwork'],
    ['${batchIngredientPicture(v)}', 'existing ingredient artwork'],
    ['const tools=recipeTools(r,rollingPinIcon,airFryerIcon);', 'illustrated equipment mapping'],
    ['${tools.map(([icon,label,illustrated])=>', 'equipment labels and illustrations'],
    ['${cookingScene(r,i)}', 'large original step illustrations'],
    ['${familyTeamMarkup(r,i)}', 'Mommy and Daddy task art/copy where mapped'],
    ['data-step="${i}"', 'step navigation controls'],
    ['${healthPanels(r)}', 'nutrition and allergen panels'],
    ['<div class="ref-safety">', 'kitchen safety panel']
  ]) assert.ok(renderer.includes(needle), `approved renderer includes ${description}`);
  assert.match(html, /function familyTeamMarkup\(r,i\)[\s\S]*?Mommy helps:[\s\S]*?Daddy helps:/,
    'family guidance keeps the mapped Mommy and Daddy responsibilities');
  assert.match(html, /const avatar=.*?aaria-avatar.*?--avatar-image:var\(--aaria-/,
    'the renderer uses the original Aaria avatar asset set');
});

test('recipe #12 keeps the full-width portrait layout after restoring its renderer', async () => {
  const [html, runtime, css] = await Promise.all([
    read('index.html'), read('tools/v3/runtime.js'), read('tools/v3/home-world-visual.css')
  ]);
  assert.match(runtime, /classList\.toggle\('v32-recipe12-pilot-active',view==='recipe'&&Number\(selected\?\.id\)===12\)/,
    'the width fix is scoped to the active #12 route');
  assert.match(css, /\.app\.v32-recipe12-pilot-active #screen\s*\{[^}]*width:\s*100% !important;[^}]*max-width:\s*none !important;[^}]*min-width:\s*0 !important;/,
    'the app screen cannot retain a narrow max-width or minimum width');
  assert.match(css, /\.app\.v32-recipe12-pilot-active \.reference-layout\s*\{[^}]*width:\s*100% !important;[^}]*max-width:\s*none !important;[^}]*min-width:\s*0 !important;/,
    'the restored renderer layout uses the full portrait viewport');
  assert.match(css, /\.app\.v32-recipe12-pilot-active \.reference-main,[\s\S]*?min-width:\s*0;/,
    'the restored renderer content can shrink without creating a narrow nested column');
  assert.match(html, /@media\(max-width:720px\)\{\.reference-layout\{display:block\}/,
    'phone portrait uses a single-column route layout');
  assert.match(html, /\.reference-main\{padding:10px 10px 22px\}/,
    'portrait content retains practical side margins');
});

test('owner reference attachments remain byte-for-byte unchanged', async () => {
  const references = [
    ['docs/design/references/1000072735-owner-recipe-page.png', 'e452103dc8c12a88633190dcc30f3d230bdb120cc3e8bc453d41fc02adc51bcc'],
    ['docs/design/references/1000072737-owner-step-panel.png', '630861cf27c2bcb0a06e57958b86c2f71a5118d844d38c0efda6508ecfde4f07']
  ];
  for (const [path, expected] of references) {
    const bytes = await readFile(new URL(path, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `${path} matches the verified owner attachment`);
  }
});

test('Android smoke scripts target the approved #12 renderer selectors', async () => {
  const [phone, tablet] = await Promise.all([
    read('.github/scripts/v32-android-smoke.sh'), read('.github/scripts/v32-android-tablet-smoke.sh')
  ]);
  assert.match(phone, /detailTitleSelector=id===12\?'.ref-hero h1':'.ref-hero h1'/,
    'phone smoke waits for the approved recipe title');
  assert.match(phone, /routeTitleSelector=recipeId===12\?'.ref-hero h1':'.ref-hero h1'/,
    '95-route smoke uses the approved recipe title location');
  assert.match(tablet, /titleSelector=id===12\?'.ref-hero h1':'.ref-hero h1'/,
    'tablet smoke waits for the approved recipe title');
  assert.doesNotMatch(phone, /v32-r12-title-block h1/,
    'smoke coverage cannot pass by finding the retired text-heavy template title');
  assert.doesNotMatch(tablet, /v32-r12-title-block h1/,
    'tablet coverage cannot pass by finding the retired text-heavy template title');
});
