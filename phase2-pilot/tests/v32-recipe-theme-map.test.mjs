import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const spec = JSON.parse(await readFile(new URL('../../tools/v3/data/v3.2-recipe-theme-map.json', import.meta.url), 'utf8'));
const names = ['playful-purple', 'fresh-green', 'sunny-orange'];
function themeFor(id) {
  let hash = 2166136261;
  for (const character of `v3.2-theme:${id}`) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return spec.referenceOverrides?.[String(id)] || names[(hash >>> 0) % names.length];
}

test('all 95 original and two approved international recipe IDs have stable V3.2 theme assignments', () => {
  assert.equal(Object.keys(spec.mapping).length, 97);
  assert.deepEqual(Object.keys(spec.mapping).sort((a, b) => Number(a) - Number(b)), [...Array.from({length:95}, (_,i)=>String(i+1)), '96', '99']);
  assert.deepEqual(spec.referenceOverrides, {'5':'sunny-orange','12':'playful-purple'});
  assert.deepEqual(spec.approvedTemplateExemplars, {'5':'sunny-orange','12':'playful-purple','76':'fresh-green'});
  for (let id = 1; id <= 95; id++) {
    assert.ok(names.includes(spec.mapping[String(id)]), `recipe ${id} has a valid theme`);
    assert.equal(spec.mapping[String(id)], themeFor(id), `recipe ${id}`);
  }
  for (const id of [96, 99]) {
    assert.ok(names.includes(spec.mapping[String(id)], `recipe ${id} has a valid theme`));
    assert.equal(spec.mapping[String(id)], themeFor(id), `recipe ${id} uses the stable V3.2 theme algorithm`);
  }
  assert.deepEqual([...new Set(Object.values(spec.mapping))].sort(), [...names].sort());
});

test('theme selection depends on recipe identity, not language or render count', () => {
  for (const id of [...Array.from({length:95}, (_,i)=>i+1), 96, 99]) {
    const first = spec.mapping[String(id)];
    for (const locale of ['en-GB', 'pt-BR']) assert.equal(spec.mapping[String(id)], first, `recipe ${id} / ${locale}`);
    assert.equal(spec.mapping[String(id)], first, `recipe ${id} after rerender`);
  }
});
