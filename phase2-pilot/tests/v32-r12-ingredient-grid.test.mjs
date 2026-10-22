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
  let depth = 0;
  let quote = false;
  let escaped = false;
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

test('owner-approved recipe 12 keeps six canonical bilingual ingredient strings and fits a 320px three-column grid', async () => {
  const html = await read('index.html');
  const css = await read('tools/v3/home-world-visual.css');
  const recipes = jsonDeclaration(html, 'const RECIPES=', '[');
  const translations = jsonDeclaration(html, 'const PT_RECIPES=', '{');
  const english = recipes.find(recipe => recipe.id === 12)?.ingredients;
  const portuguese = translations['12']?.ingredients;
  assert.equal(english?.length, 6);
  assert.equal(portuguese?.length, 6);
  assert.deepEqual(portuguese, [
    '½ xícara de milho',
    '1 ovo',
    '3 colheres de sopa de farinha de trigo integral',
    '2 colheres de sopa de queijo ralado',
    '2 colheres de sopa de leite',
    '1 colher de chá de azeite para a frigideira'
  ], 'PT-BR ingredient data remains canonical and intact');

  const correction = css.slice(css.lastIndexOf('/* Owner-requested #12 Ingredients correction.'));
  assert.ok(correction.includes('.v32-r12-ingredient-list{grid-template-columns:repeat(3,minmax(0,1fr))'),
    'phone portrait keeps three ingredient columns');
  assert.match(correction, /@media\(max-width:360px\)\{[^}]*\.v32-r12-ingredient-list\{gap:/,
    'the 320px phone rule tightens gaps without collapsing the three columns');
  assert.doesNotMatch(correction, /@media\(max-width:360px\)\{[^}]*grid-template-columns:1fr/,
    'narrow phone layout cannot revert to a one-column ingredient list');
  assert.match(correction, /\.v32-r12-ingredient-art\{grid-column:1;grid-row:1\/3/);
  assert.match(correction, /\.v32-r12-ingredient-name\{grid-column:2;grid-row:2/);
  assert.match(correction, /\.v32-r12-ingredients \.ref-ingredient input\{position:static;grid-column:2;grid-row:1/,
    'checkbox has its own row and cannot overlay the text or icon');
  assert.match(correction, /overflow-wrap:normal;word-break:normal;hyphens:none/,
    'long Portuguese words wrap at spaces and remain unbroken');
  assert.doesNotMatch(correction, /overflow-wrap:anywhere|word-break:break-all|max-height:/,
    'long labels are not split into letters or clipped by a fixed height');

  const outerWidth = 320 - 16 - 20 - 10;
  const cardWidth = outerWidth / 3;
  const textWidth = cardWidth - 8 - 22 - 4;
  assert.ok(textWidth >= 50, `320px phone should keep at least 50px for ingredient copy, got ${textWidth}`);
  const longestWord = Math.max(...portuguese.flatMap(item => item.split(/\s+/).map(word => word.length)));
  assert.ok(longestWord <= 10, 'longest PT-BR ingredient token fits the narrow-screen text track at the declared 10px minimum font');

  assert.match(correction, /@media\(min-width:760px\) and \(orientation:landscape\)\{\.v32-r12-ingredient-list\{grid-template-columns:repeat\(6,minmax\(0,1fr\)/,
    'wide tablet landscape uses the available width while retaining all six cards');
});
