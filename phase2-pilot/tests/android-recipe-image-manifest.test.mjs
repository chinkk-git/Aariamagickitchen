import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecipeImageVerificationManifest } from '../../tools/v3/qa/android-evidence-manifest.mjs';

function png(width, height) {
  const value = Buffer.alloc(24);
  value.write('PNG', 1, 'ascii');
  value.writeUInt32BE(width, 16);
  value.writeUInt32BE(height, 20);
  return value;
}

function fixture() {
  const ids = Array.from({ length: 95 }, (_, index) => index + 1);
  const rows = ids.map(recipeId => ({
    recipeId,
    title: `Recipe ${recipeId}`,
    status: 'PASS',
    finishedDish: { loaded: true, association: true },
    steps: [{ stepIndex: 1, stepNumber: 1, association: true, rendered: true, status: 'PASS' }],
    screenshots: ['detail.png', 'step.png'],
    landscapeScreenshots: ['landscape-detail.png', 'landscape-step.png']
  }));
  const json = new Map([
    ['artifacts/v32-diagnostics/recipe-image-verification-phone.json', { device: 'phone', orientation: 'portrait', recipeCount: 95, recipes: rows }],
    ['artifacts/v32-diagnostics/recipe-image-verification-tablet-portrait.json', { device: 'tablet', orientation: 'portrait', recipeCount: 95, recipes: rows.map(row => ({ ...row, screenshots: [{ path: 'tablet-portrait-detail.png' }, { path: 'tablet-portrait-step.png' }] })) }],
    ['artifacts/v32-diagnostics/recipe-image-verification-tablet-landscape.json', { device: 'tablet', orientation: 'landscape', recipeCount: 95, recipes: rows.map(row => ({ ...row, screenshots: [{ path: 'tablet-landscape-detail.png' }, { path: 'tablet-landscape-step.png' }] })) }]
  ]);
  return { json, readJson: async key => JSON.stringify(json.get(key)), readPng: async key => png(key.includes('landscape') ? 2400 : 1080, key.includes('landscape') ? 1080 : 2400) };
}

test('Android visual manifest requires 95 recipes across four real-device layouts and hashes screenshots', async () => {
  const result = await buildRecipeImageVerificationManifest(fixture());
  assert.equal(result.recipeCount, 95);
  assert.equal(result.deviceOrientationRows, 380);
  assert.equal(result.status, 'PASS');
  assert.equal(result.recipes.length, 380);
  assert.match(result.recipes[0].screenshots[0].sha256, /^[a-f0-9]{64}$/);
});

test('Android visual manifest rejects incomplete route coverage and wrong-orientation screenshots', async () => {
  const incomplete = fixture();
  const tablet = JSON.parse(await incomplete.readJson('artifacts/v32-diagnostics/recipe-image-verification-tablet-landscape.json'));
  tablet.recipes.pop();
  incomplete.json.set('artifacts/v32-diagnostics/recipe-image-verification-tablet-landscape.json', tablet);
  await assert.rejects(buildRecipeImageVerificationManifest(incomplete), /expected exactly 95 runtime records/);

  const wrongOrientation = fixture();
  wrongOrientation.readPng = async () => png(1080, 2400);
  await assert.rejects(buildRecipeImageVerificationManifest(wrongOrientation), /has wrong dimensions/);
});
