import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('owner screenshot layout retains canonical #12 cooking content and shared state', async () => {
  const [html, runtime, css] = await Promise.all([
    read('index.html'), read('tools/v3/runtime.js'), read('tools/v3/home-world-visual.css')
  ]);
  const declaration = html.indexOf('const RECIPES=');
  assert.ok(declaration >= 0, 'canonical recipe records remain available in the original catalogue');
  const startArray = declaration + 'const RECIPES='.length;
  let depth = 0, quote = '', escaped = false, endArray = -1;
  for (let i = startArray; i < html.length; i += 1) {
    const char = html[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
    } else if (char === '"') quote = char;
    else if (char === '[' || char === '{') depth += 1;
    else if (char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) { endArray = i + 1; break; }
    }
  }
  assert.ok(endArray > startArray, 'canonical recipe data array is complete');
  const recipe12 = JSON.parse(html.slice(startArray, endArray)).find(recipe => recipe.id === 12);
  assert.deepEqual(recipe12.steps, [
    'Mix corn, egg, flour, cheese and milk into a thick spoonable batter.',
    'Ask an adult to warm a nonstick pan with a little oil over medium-low heat.',
    'An adult adds small spoonfuls and cooks about 2–3 minutes per side.',
    'Check the centers are fully cooked and golden. Cool before eating.'
  ], 'canonical English instructions and their order stay unchanged');

  const start = runtime.indexOf('function v32UniversalRecipeStepTemplate');
  const end = runtime.indexOf('\nconst v32RecipeBeforePilot', start);
  assert.ok(start >= 0 && end > start, 'shared data-driven recipe template remains intact');
  const template = runtime.slice(start, end);
  for (const part of [
    'v32-r12-top', 'v32-r12-quick-actions', 'v32-r12-special', 'v32-r12-dish-photo',
    'v32-r12-character', 'v32-r12-ingredient-list', 'v32-r12-equipment-list',
    'v32-r12-cook', 'v32-r12-progress', 'v32-r12-actions', 'v32-r12-safety',
    'healthPanels(r)', 'cookShareSection(r)'
  ]) assert.ok(template.includes(part), `owner reference section is rendered: ${part}`);

  assert.match(template, /steps=pt\?ptRecord\.steps:r\.steps/,
    'English and Portuguese cooking steps come from canonical localized recipe data');
  assert.match(template, /data-original-source="recipe-step">\$\{h\(steps\[stepIndex\]\)\}/,
    'the active instruction is rendered from the canonical step at the current index');
  assert.match(template, /config\.safety\[locale\]\[stepIndex\]/,
    'step-specific safety remains attached to the current step');
  assert.match(runtime, /safetyTitles:\{en:\['Adult help needed','Adult help needed','Adult help needed','Adult help needed'\],pt:\['Ajuda de um adulto','Ajuda de um adulto','Ajuda de um adulto','Ajuda de um adulto'\]\}/,
    'step-specific warning labels remain localized and child-safe mixing guidance stays separate from adult-only pan work');
  assert.match(runtime, /<details open class="storybook-safety v32-r12-recipe-safety">/,
    'the Kitchen Safety disclosure starts expanded as shown in the owner step reference and remains expandable');
  assert.match(template, /aria-valuenow="\$\{stepIndex\+1\}"/,
    'progress value remains tied to the canonical active step');
  assert.match(template, /data-check="\$\{i\}"/,
    'ingredient checklist keeps its existing persistent checkbox identity');
  assert.match(template, /data-action="prevstep"[\s\S]*data-action="nextstep"/,
    'previous, next and completion controls remain wired to existing cooking actions');
  assert.doesNotMatch(template, /v32-r12-step-visual/,
    'the replacement step panel uses the newer illustrated icon composition, not the superseded compact art row');
  assert.match(template, /NEW_RECIPE_ART\[id\].*HOME_RECIPE_THUMBS\[id\]/,
    'large hero image reuses existing recipe artwork rather than adding an unreviewed asset');
  assert.match(runtime, /id===12\?v32UniversalRecipeStepTemplate/,
    'the screenshot rework remains limited to the current #12 pilot');

  assert.match(template, /return `<article class="v32-r12-main"/,
    'the recipe template is an article inside the app-owned main screen, never a nested main element');
  assert.doesNotMatch(template, /return `<main\b/,
    'nested main markup cannot eject the recipe route outside #screen during Android HTML parsing');
  const renderedTemplate = template.slice(template.indexOf('return `<article'));
  const ordered = [
    'v32-r12-top', 'v32-r12-header', 'v32-r12-dish-photo', 'v32-r12-character',
    'v32-r12-ingredients', 'v32-r12-equipment', '${stepPanel}',
    'v32-r12-recipe-safety', 'healthPanels(r)', 'cookShareSection(r)'
  ].map(name => renderedTemplate.indexOf(name));
  assert.ok(ordered.every((value, index) => value >= 0 && (!index || value > ordered[index - 1])),
    'recipe panels follow the owner screenshot hierarchy');
  assert.match(css, /\.v32-r12-dish-photo img\{display:block;width:100%/,
    'the canonical finished-dish image is presented as a full-width hero');
  assert.match(css, /@media\(min-width:760px\) and \(orientation:landscape\)/,
    'landscape tablet step layout remains responsive');
  assert.match(css, /#nav\.bottom\{display:grid!important;grid-template-columns:repeat\(6/,
    'the persistent six-destination bottom navigation is retained');
});

test('both owner reference attachments are retained byte-for-byte with their recorded checksums', async () => {
  const references = [
    ['docs/design/references/1000072735-owner-recipe-page.png', 'e452103dc8c12a88633190dcc30f3d230bdb120cc3e8bc453d41fc02adc51bcc'],
    ['docs/design/references/1000072737-owner-step-panel.png', '630861cf27c2bcb0a06e57958b86c2f71a5118d844d38c0efda6508ecfde4f07']
  ];
  for (const [path, expected] of references) {
    const bytes = await readFile(new URL(path, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `${path} matches the verified owner attachment`);
  }
});
