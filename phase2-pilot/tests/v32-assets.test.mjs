import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const repo = new URL('../../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, repo), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('13 missing finished-dish images have exact recipe IDs and draft provenance', async () => {
  const manifest = await readJson('tools/v3/artwork/recipe-dishes-draft/manifest.json');
  const expected = [1, 4, 5, 6, 7, 8, 9, 10, 16, 26, 33, 51, 57];
  assert.deepEqual(manifest.artifacts.map(x => x.recipeId), expected);
  assert.equal(manifest.artifacts.length, 13);
  const source = await readFile(new URL(manifest.sourceSheet, repo));
  assert.equal(hash(source), manifest.sourceSheetSha256);
  for (const asset of manifest.artifacts) {
    const bytes = await readFile(new URL(asset.path, repo));
    assert.equal(hash(bytes), asset.sha256, `recipe ${asset.recipeId}`);
    assert.equal(asset.dimensions, '512x512');
    assert.match(asset.status, /^DRAFT — rights\/A08\/A09 review required$/);
  }
});

test('canonical character identities stay tied to the original asset manifest', async () => {
  const registry = await readJson('tools/v3/data/v3.2-avatar-registry.json');
  const manifest = await readJson('phase2-pilot/packages/assets/manifest.json');
  assert.equal(registry.status, 'HOLD_CANONICAL_EXTRACTION_AND_RIGHTS_REVIEW');
  assert.equal(registry.approvedReference.sha256, 'cfb1c9073d4a4f3ccabae9675a33f7d5dc097b9f738de60eb2f8b2c86a97ba2a');
  assert.deepEqual(registry.canonicalIdentitiesVisibleInReference.map(x => x.key), ['aaria','mommy','daddy','boy-rohan','boy-arjun','boy-vihaan','girl-isha','girl-meera','girl-sana','girl-diya']);
  const byPath = new Map(manifest.assets.map(asset => [asset.path, asset]));
  for (const candidate of registry.candidateExistingAssets) {
    const source = byPath.get(candidate.path.replace('phase2-pilot/', ''));
    assert.ok(source, candidate.path);
    assert.equal(source.sha256, candidate.sha256);
    assert.match(candidate.status, /^UNVERIFIED/);
  }
  assert.ok(registry.forbiddenContexts.includes('individual cooking-step artwork'));
});
