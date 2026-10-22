import test from 'node:test';
import assert from 'node:assert/strict';
import { captureOrientedPng } from '../../.github/scripts/android-screenshot-orientation.mjs';

function png(width, height) {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

test('Android screenshot capture waits for portrait and landscape framebuffers after rotation switches', async () => {
  let rotation = 1;
  let portraitCaptures = [png(2220, 1080), png(1080, 2220)];
  const portrait = await captureOrientedPng({
    expectedOrientation: 'portrait',
    readRotation: async () => rotation,
    rotate: async () => { rotation = 0; },
    capturePng: async () => portraitCaptures.shift(),
    wait: async () => {}
  });
  assert.deepEqual([portrait.width, portrait.height, portrait.rotation, portrait.orientation],
    [1080, 2220, 0, 'portrait']);

  let landscapeCaptures = [png(1080, 2220), png(2220, 1080)];
  const landscape = await captureOrientedPng({
    expectedOrientation: 'landscape',
    readRotation: async () => rotation,
    rotate: async () => { rotation = 1; },
    capturePng: async () => landscapeCaptures.shift(),
    wait: async () => {}
  });
  assert.deepEqual([landscape.width, landscape.height, landscape.rotation, landscape.orientation],
    [2220, 1080, 1, 'landscape']);
});

test('Android screenshot capture fails closed when pixels never match the settled device orientation', async () => {
  await assert.rejects(captureOrientedPng({
    expectedOrientation: 'portrait',
    readRotation: async () => 0,
    rotate: async () => assert.fail('portrait device must not be rotated'),
    capturePng: async () => png(2220, 1080),
    wait: async () => {},
    captureAttempts: 2
  }), /Expected portrait review screenshot, got 2220x1080 at rotation 0/);
});
