import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

function jsonDeclaration(source, declaration, opening) {
  const start = source.indexOf(declaration);
  assert.ok(start >= 0, `${declaration} exists`);
  const valueStart = source.indexOf(opening, start);
  assert.ok(valueStart >= 0, `${declaration} has its JSON value`);
  const closing = opening === '[' ? ']' : '}';
  let depth = 0, quote = false, escaped = false;
  for (let i = valueStart; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = false;
    } else if (char === '"') quote = true;
    else if (char === opening) depth += 1;
    else if (char === closing && --depth === 0) return JSON.parse(source.slice(valueStart, i + 1));
  }
  throw new Error(`${declaration} is not a complete JSON value`);
}

test('recipe 12 keeps its six canonical bilingual ingredients in the approved renderer', async () => {
  const [html, runtime] = await Promise.all([read('index.html'), read('tools/v3/runtime.js')]);
  const recipes = jsonDeclaration(html, 'const RECIPES=', '[');
  const translations = jsonDeclaration(html, 'const PT_RECIPES=', '{');
  const english = recipes.find(recipe => recipe.id === 12)?.ingredients;
  const portuguese = translations['12']?.ingredients;
  assert.equal(english?.length, 6);
  assert.equal(portuguese?.length, 6);
  assert.deepEqual(portuguese, [
    '½ xícara de milho', '1 ovo', '3 colheres de sopa de farinha de trigo integral',
    '2 colheres de sopa de queijo ralado', '2 colheres de sopa de leite',
    '1 colher de chá de azeite para a frigideira'
  ], 'PT-BR ingredient data remains canonical and intact');

  assert.ok(runtime.includes('id===12?batchReferenceRecipe():v32RecipeBeforePilot()'),
    'recipe 12 uses the approved avatar-rich renderer rather than the rejected text-heavy template');
  const rendererStart = html.indexOf('function batchReferenceRecipe(){');
  const rendererEnd = html.indexOf('\nfunction recipe(){', rendererStart);
  const renderer = html.slice(rendererStart, rendererEnd);
  assert.ok(renderer.includes('class="ref-ingredient-grid"'), 'the original renderer uses the approved ingredient grid');
  assert.ok(renderer.includes('${batchIngredientPicture(v)}') && renderer.includes('${safe(v)}'),
    'each approved card uses existing ingredient artwork and the canonical full label');
  assert.ok(html.includes('@media(max-width:720px){.reference-layout{display:block}'),
    'phone portrait switches to a single-column recipe route');
  assert.ok(html.includes('.reference-main{padding:10px 10px 22px}'),
    'phone portrait retains the owner reference margins around ingredient cards');
});
