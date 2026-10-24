import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runtime = await readFile(path.join(root, 'tools/v3/runtime.js'), 'utf8');
const transform = await readFile(path.join(root, 'tools/v3/transform-production.mjs'), 'utf8');
const hostStyles = transform.match(/const w02GlobeHostStyles = String\.raw`([\s\S]*?)`;\nconst v32RecipeThemeMap/)?.[1];

test('approved portrait World design adds localized spin guidance and keeps the W03 globe renderer immutable', async () => {
  assert.ok(hostStyles, 'W02 host presentation styles are embedded');
  assert.match(runtime, /Swipe to spin the globe!/);
  assert.match(runtime, /Deslize para girar o globo!/);
  assert.match(runtime, /class="v33-spin-arrows"/);
  assert.match(runtime, /stage\.addEventListener\('pointerup'/);
  assert.match(runtime, /rotated>=8/);
  assert.match(runtime, /stage\.classList\.add\('has-user-spun'\)/);
  assert.match(runtime, /stage\.addEventListener\('pointercancel'/);
  assert.match(hostStyles, /@media\(orientation:portrait\).*?\.v33-spin-hint/s);
  assert.match(hostStyles, /prefers-reduced-motion:reduce[^}]*v33-spin-hint/s);

  const pinned = new Map([
    ['tools/v3/world-adventure-globe/world-adventure-globe.js', '033a39e94afdbabc4c7215d4b0f24698d9ae36c91c79891fe3b5592f90c5c0bd'],
    ['tools/v3/world-adventure-globe/world-adventure-globe.css', 'd049fa4d9ec38d0f5b62a11bb1d07da4db84646aee2657002962a1ae4e5bf635'],
    ['tools/v3/world-adventure-host.mjs', '2d847b6734eda26e01d30a6711aa8fa252211d23b4db612015c4633f9a110c2a']
  ]);
  for (const [relative, expected] of pinned) {
    const bytes = await readFile(path.join(root, relative));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `${relative} remains byte-for-byte at the W02 handoff source`);
  }
});

test('portrait World styling keeps the approved W02 landscape rules unchanged', () => {
  assert.ok(hostStyles, 'W02 host presentation styles are embedded');
  const landscapeRules = hostStyles.split('\n').filter(line => line.includes('orientation:landscape'));
  const digest = createHash('sha256').update(landscapeRules.join('\n')).digest('hex');
  assert.equal(digest, 'b31df9f4625f08417b5c07e4f0903a246876ed0ad64e17fcf1d1fb610a431742');
  assert.match(hostStyles, /\.app\.v31-world-active \.aria-world-globe__guide\{z-index:4/);
  assert.match(hostStyles, /\.app\.v31-world-active \.aria-world-globe__sphere\{left:61%;width:min\(84cqw,90cqh,520px\)\}/);
});
