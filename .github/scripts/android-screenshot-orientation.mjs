import assert from 'node:assert/strict';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function pngDimensions(png) {
  assert.ok(Buffer.isBuffer(png) && png.length >= 24, 'Android screenshot is too small to contain a PNG header');
  assert.equal(png.toString('ascii', 1, 4), 'PNG', 'Android screenshot must be a PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

export async function captureDistinctPng({
  label,
  capturePng,
  previousPng,
  assertExpectedUi,
  wait = pause,
  attempts = 20,
  retryDelayMs = 1000
}) {
  let dimensions;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (assertExpectedUi) await assertExpectedUi();
    const png = await capturePng();
    dimensions = pngDimensions(png);
    if (!previousPng || !png.equals(previousPng)) return { png, ...dimensions };
    if (attempt + 1 < attempts) await wait(retryDelayMs);
  }
  throw new Error(`${label} screenshot is byte-identical to Home after ${attempts} fresh captures; navigation state was not visibly captured`);
}

export async function captureOrientedPng({
  expectedOrientation,
  readRotation,
  rotate,
  capturePng,
  wait = pause,
  stableReads = 3,
  rotationAttempts = 30,
  captureAttempts = 5
}) {
  assert.ok(expectedOrientation === 'portrait' || expectedOrientation === 'landscape',
    `Unsupported screenshot orientation: ${expectedOrientation}`);
  const isExpectedRotation = rotation => ((rotation % 2 === 1) === (expectedOrientation === 'landscape'));

  let rotation = await readRotation();
  if (!isExpectedRotation(rotation)) {
    await rotate();
  }

  let stable = 0;
  let lastRotation = null;
  for (let attempt = 0; attempt < rotationAttempts; attempt++) {
    rotation = await readRotation();
    stable = isExpectedRotation(rotation) && rotation === lastRotation ? stable + 1 : isExpectedRotation(rotation) ? 1 : 0;
    lastRotation = rotation;
    if (stable >= stableReads) break;
    await wait(250);
  }
  assert.ok(stable >= stableReads,
    `Android display did not settle in ${expectedOrientation}; last rotation=${lastRotation}`);

  let dimensions;
  for (let attempt = 0; attempt < captureAttempts; attempt++) {
    const png = await capturePng();
    dimensions = pngDimensions(png);
    const matches = expectedOrientation === 'portrait'
      ? dimensions.width < dimensions.height
      : dimensions.width > dimensions.height;
    if (matches) return { png, ...dimensions, rotation: lastRotation, orientation: expectedOrientation };
    if (attempt + 1 < captureAttempts) await wait(250);
  }

  assert.fail(`Expected ${expectedOrientation} review screenshot, got ${dimensions.width}x${dimensions.height} at rotation ${lastRotation}`);
}
