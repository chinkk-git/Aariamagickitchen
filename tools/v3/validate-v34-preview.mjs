import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlPath = process.argv[2];
if (!htmlPath) throw new Error('Usage: node tools/v3/validate-v34-preview.mjs <staged-index.html>');
const html = fs.readFileSync(htmlPath, 'utf8');
function jsonArrayAfter(marker) {
  const markerAt = html.indexOf(marker);
  assert.notEqual(markerAt, -1, `Missing embedded data marker: ${marker}`);
  const start = html.indexOf('[', markerAt + marker.length);
  assert.notEqual(start, -1, `Missing JSON array after ${marker}`);
  let depth = 0, quote = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = false;
      continue;
    }
    if (char === '"') quote = true;
    else if (char === '[') depth++;
    else if (char === ']' && --depth === 0) return JSON.parse(html.slice(start, i + 1));
  }
  throw new Error(`Unclosed JSON array after ${marker}`);
}

const original = jsonArrayAfter('const RECIPES=');
const international = jsonArrayAfter('const V32_INTERNATIONAL_RECIPES=');
assert.equal(original.length, 95, 'The original recipe baseline changed.');
assert.deepEqual(international.map(recipe => Number(recipe.id)).sort((a,b)=>a-b), [96,99], 'Only approved international recipes #096 and #099 may be integrated.');
const ids = new Set([...original.map(recipe => Number(recipe.id)), ...international.map(recipe => Number(recipe.id))]);
assert.equal(ids.size, 97, 'The preview must include exactly 97 unique recipe IDs.');
for (let id = 1; id <= 95; id++) assert.ok(ids.has(id), `Original recipe #${id} is missing.`);
assert.ok(ids.has(96) && ids.has(99), 'Approved international recipes are missing.');
for (let id = 97; id <= 110; id++) if (![96,99].includes(id)) assert.ok(!ids.has(id), `Unapproved international recipe #${id} entered the preview.`);
assert.ok(html.includes('id="v34-dual-home-style"'), 'V3.4 styling was not attached to the APK page.');
assert.ok(html.includes("const STYLE_KEY = 'aaria.v34.homeStyle'"), 'Local home-style persistence was not attached.');
assert.ok(html.includes("aria-world-globe__sphere"), 'Existing approved spinning globe implementation is missing.');
assert.ok(html.includes('data-action="open-wheel"'), 'The Surprise Me chest must route through the original recipe surprise workflow.');
console.log(JSON.stringify({ status: 'PASS', originalRecipes: original.length, internationalRecipes: international.map(item=>Number(item.id)), totalRecipes: ids.size }));
