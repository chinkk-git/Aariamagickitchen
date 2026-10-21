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
  const references = await readJson('docs/design/references/V3_2_REFERENCE_ASSET_MANIFEST.json');
  assert.match(registry.status, /^CANONICAL_REFERENCE_CROPS_READY; RIGHTS_AND_A08_A09_HOLD$/);
  assert.equal(registry.approvedReference.sha256, 'cfb1c9073d4a4f3ccabae9675a33f7d5dc097b9f738de60eb2f8b2c86a97ba2a');
  assert.deepEqual(registry.canonicalIdentitiesVisibleInReference.map(x => x.key), ['aaria','mommy','daddy','boy-rohan','boy-arjun','boy-vihaan','girl-isha','girl-meera','girl-sana','girl-diya']);
  const source = await readFile(new URL(registry.approvedReference.path, repo));
  assert.equal(hash(source), registry.approvedReference.sha256);
  const cropManifest = references.assets.find(x => x.role === 'v32-approved-avatar-crops');
  assert.ok(cropManifest, 'approved avatar crop manifest');
  assert.equal(cropManifest.sourceSha256, registry.approvedReference.sha256);
  assert.equal(cropManifest.items.length, 11);
  const crops = new Map(cropManifest.items.map(asset => [asset.path, asset]));
  for (const identity of registry.canonicalIdentitiesVisibleInReference) {
    const crop = crops.get(identity.assetPath);
    assert.ok(crop, identity.key);
    assert.equal(identity.sha256, crop.sha256, identity.key);
    assert.deepEqual(identity.sourceCropBoxPx, crop.cropBoxPx, identity.key);
    assert.ok(identity.allowedContexts.length > 0, identity.key);
    assert.ok(!identity.allowedContexts.includes('individual cooking-step artwork'), identity.key);
    const bytes = await readFile(new URL(identity.assetPath, repo));
    assert.equal(hash(bytes), identity.sha256, identity.key);
  }
  const cookingPose = registry.referenceDerivedPoses.find(pose => pose.key === 'aaria-cooking');
  assert.ok(cookingPose, 'approved Aaria home pose');
  assert.equal(cookingPose.sha256, crops.get(cookingPose.path).sha256);
  assert.equal(hash(await readFile(new URL(cookingPose.path, repo))), cookingPose.sha256);
  const byPath = new Map(manifest.assets.map(asset => [asset.path, asset]));
  for (const candidate of registry.candidateExistingAssets) {
    const source = byPath.get(candidate.path.replace('phase2-pilot/', ''));
    assert.ok(source, candidate.path);
    assert.equal(source.sha256, candidate.sha256);
    assert.match(candidate.status, /^UNVERIFIED/);
  }
  assert.ok(registry.forbiddenContexts.includes('individual cooking-step artwork'));
});

test('Home dog illustration is cropped from the approved Home reference only', async () => {
  const references = await readJson('docs/design/references/V3_2_REFERENCE_ASSET_MANIFEST.json');
  const home = references.assets.find(x => x.role === 'protected-v31-home-and-world-reference');
  const dog = references.assets.find(x => x.role === 'v31-approved-home-dog-crop');
  assert.equal(dog.sourcePath, home.path);
  assert.equal(dog.sourceSha256, home.sha256);
  assert.deepEqual(dog.cropBoxPx, [500, 214, 646, 360]);
  assert.deepEqual(dog.allowedContexts, ['home']);
  assert.match(dog.status, /RIGHTS_AND_A08_A09_HOLD/);
  assert.equal(hash(await readFile(new URL(dog.path, repo))), dog.sha256);
});
