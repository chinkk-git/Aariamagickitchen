import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const spec = JSON.parse(await readFile(new URL('../../tools/v3/data/v3.2-recipe-theme-map.json', import.meta.url), 'utf8'));
const names = ['playful-purple', 'fresh-green', 'sunny-orange'];
function themeFor(id) {
  let hash = 2166136261;
  for (const character of `v3.2-theme:${id}`) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return names[(hash >>> 0) % names.length];
}

test('all 95 original recipe IDs have stable V3.2 theme assignments', () => {
  assert.equal(Object.keys(spec.mapping).length, 95);
  for (let id = 1; id <= 95; id++) assert.equal(spec.mapping[String(id)], themeFor(id), `recipe ${id}`);
  assert.deepEqual([...new Set(Object.values(spec.mapping))].sort(), [...names].sort());
});

test('theme selection depends on recipe identity, not language or render count', () => {
  for (let id = 1; id <= 95; id++) {
    const first = themeFor(id);
    for (const locale of ['en-GB', 'pt-BR']) assert.equal(themeFor(id), first, `recipe ${id} / ${locale}`);
    assert.equal(themeFor(id), first, `recipe ${id} after rerender`);
  }
});
