import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

test('recipes #5 and #76 keep the canonical shared cooking-scene renderer', async () => {
  const runtime = await readFile(new URL('tools/v3/runtime.js', root), 'utf8');
  assert.doesNotMatch(runtime, /cookingScene\s*=\s*function\s+v32IngredientOnlyCookingScene/);
  assert.doesNotMatch(runtime, /\[\s*5\s*,\s*76\s*\].*v32-template-ingredient-art/s);
  assert.match(runtime, /function v3IngredientPicture\(value\)\{return v3IngredientArt\(value\)\}/);
});

test('approved recipe #12 step reference remains byte-for-byte intact', async () => {
  const image = await readFile(new URL('docs/design/references/1000072960-owner-recipe12-step-reference.png', root));
  assert.equal(
    createHash('sha256').update(image).digest('hex'),
    '33ef32fdb90d697d26f946b44826da6fba899ca3ed830be029fa85a4572e439d'
  );
});
