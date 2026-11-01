import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join, normalize, resolve, sep} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(process.env.GITHUB_WORKSPACE || process.cwd());
const fixtures = join(root, 'tools/v3/qa/fixtures/pwa-previous');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml'
};
const [currentHtml, currentWorker] = await Promise.all([
  readFile(join(root, 'index.html'), 'utf8'), readFile(join(root, 'sw.js'), 'utf8')
]);
const coreMatch = currentWorker.match(/const CORE_FILES = (\[[^\n]+\]);/);
assert.ok(coreMatch, 'service worker declares its offline app-shell cache');
const coreFiles = new Set(JSON.parse(coreMatch[1]));
const shellReferences = [
  ...[...currentHtml.matchAll(/<script\b[^>]*\bsrc="(\.\/[^\"]+)"/g)].map(match => match[1]),
  ...[...currentHtml.matchAll(/<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="(\.\/[^\"]+)"/g)].map(match => match[1])
];
for (const reference of shellReferences) {
  assert.ok(coreFiles.has(reference), `offline app-shell cache includes ${reference}`);
  await stat(join(root, decodeURIComponent(reference.split('?')[0].slice(2))));
}
let release = 'previous';
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const rel = normalize(pathname.startsWith('/') ? pathname.slice(1) : pathname);
    if (rel.startsWith('..') || rel.includes(`${sep}..${sep}`)) throw new Error('path escaped');
    let file = resolve(root, rel || 'index.html');
    if (release === 'previous' && ['index.html', 'browser-adapters.js', 'sw.js'].includes(rel || 'index.html')) {
      file = join(fixtures, rel || 'index.html');
    }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    let body = await readFile(file);
    if (release === 'next' && rel === 'sw.js') {
      body = Buffer.from(body.toString('utf8').replace('85f537591449-r3', '85f537591449-r4'));
    }
    res.writeHead(200, {
      'content-type': mime[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const {port} = server.address();
const base = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({headless: true, timeout: 15000});

async function waitForCache(page, suffix) {
  await page.waitForFunction(async suffix => {
    const name = (await caches.keys()).find(key => key.endsWith(suffix));
    if (!name) return false;
    const response = await (await caches.open(name)).match('./index.html');
    if (!response) return false;
    return (await response.text()).includes('id="aaria-magical-updates"') &&
      navigator.serviceWorker.controller?.state === 'activated';
  }, suffix, {timeout: 20000});
}

async function openPage(context) {
  const page = await context.newPage();
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  await page.goto(base, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  return {context, page, navigationCount: () => navigations};
}

async function startPage() {
  return openPage(await browser.newContext({viewport: {width: 390, height: 844}}));
}

async function seedExistingData(page) {
  await page.evaluate(async () => {
    const kitchen = {
      weeks: {'2026-11-02': {ids: [112, 111, 113], locks: [true, false, false, false, false, false, false]}},
      done: [112], checks: {'2026-11-02': {'112': [true, true]}}, stories: ['saved-story'],
      favorites: [112], grocerySelected: [112], myCreations: [{recipeId: 112, createdAt: 1793577600000}],
      myCreationsV35MigrationComplete: true
    };
    localStorage.setItem('aariaPrivateKitchenV4', JSON.stringify(kitchen));
    localStorage.setItem('aaria.v35.homeExperience', 'magical');
    localStorage.setItem('aaria.v35.wonderlandMuted', 'true');
    localStorage.setItem('aaria.accessibility.textSize.v1', '150');
    localStorage.setItem('aaria.magicalUpdates.read.v1', '["vietnam-pho-recipe-112"]');
    for (const name of ['aaria-web-v3.4-compatibility', 'aaria-user-data-v1']) {
      const cache = await caches.open(name);
      await cache.put('/retained-fixture', new Response(name));
    }
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('aaria-v34-local-creation-photos', 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('photoRecords')) {
          request.result.createObjectStore('photoRecords', {keyPath: 'photoId'});
        }
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('photoRecords', 'readwrite');
        transaction.objectStore('photoRecords').put({
          photoId: 'migration-photo', recipeId: 112,
          blob: new Blob(['saved creation photo'], {type: 'image/png'}), savedAt: 1793577600000
        });
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
}

async function assertDataPreserved(page) {
  const stored = await page.evaluate(async () => {
    const request = indexedDB.open('aaria-v34-local-creation-photos', 2);
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const photos = await new Promise((resolve, reject) => {
      const tx = db.transaction('photoRecords', 'readonly');
      const get = tx.objectStore('photoRecords').getAll();
      get.onsuccess = () => resolve(get.result.map(photo => ({
        photoId: photo.photoId, recipeId: photo.recipeId, savedAt: photo.savedAt,
        type: photo.blob.type, size: photo.blob.size
      })));
      get.onerror = () => reject(get.error);
    });
    db.close();
    return {
      kitchen: JSON.parse(localStorage.getItem('aariaPrivateKitchenV4')),
      settings: [
        localStorage.getItem('aaria.v35.homeExperience'),
        localStorage.getItem('aaria.v35.wonderlandMuted'),
        localStorage.getItem('aaria.accessibility.textSize.v1')
      ],
      readState: localStorage.getItem('aaria.magicalUpdates.read.v1'),
      photos,
      cacheNames: await caches.keys()
    };
  });
  assert.deepEqual(stored.kitchen.favorites, [112], 'Favorites survive the update');
  assert.deepEqual(stored.kitchen.weeks['2026-11-02'].ids, [112, 111, 113], 'Planner survives the update');
  assert.deepEqual(stored.kitchen.done, [112], 'completed recipe state survives the update');
  assert.deepEqual(stored.kitchen.myCreations, [{recipeId: 112, createdAt: 1793577600000}], 'My Creations survive the update');
  assert.deepEqual(stored.settings, ['magical', 'true', '150'], 'user settings survive the update');
  assert.equal(stored.readState, '["vietnam-pho-recipe-112"]', 'Magical Updates read/unread state survives the update');
  assert.deepEqual(stored.photos, [{photoId: 'migration-photo', recipeId: 112, savedAt: 1793577600000, type: 'image/png', size: 20}], 'IndexedDB photo records survive the update');
  assert.ok(stored.cacheNames.includes('aaria-web-v3.4-compatibility'), 'compatibility cache outside the retired app-shell namespace remains');
  assert.ok(stored.cacheNames.includes('aaria-user-data-v1'), 'unrelated user cache remains');
}

async function assertNoReloadLoop(page, navigationCount) {
  const stableAt = navigationCount();
  await page.waitForTimeout(1200);
  assert.equal(navigationCount(), stableAt, 'the page does not repeatedly reload after activation');
}

try {
  // Upgrade a real previous-production fixture with representative existing data.
  release = 'previous';
  const upgrade = await startPage();
  await seedExistingData(upgrade.page);
  assert.ok((await upgrade.page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))?.endsWith('/sw.js'));
  release = 'current';
  await upgrade.page.close();
  const launch = await openPage(upgrade.context); // Reopen the installed app; no refresh action is issued.
  await waitForCache(launch.page, '-r3');
  await launch.page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
  await assertDataPreserved(launch.page);
  await assertNoReloadLoop(launch.page, launch.navigationCount);
  await upgrade.context.close();

  // A deployed update is picked up when the installed app returns to the foreground.
  release = 'current';
  const foreground = await startPage();
  await waitForCache(foreground.page, '-r3');
  await foreground.page.waitForTimeout(5200); // Let the launch check's short throttle elapse.
  const foregroundBefore = foreground.navigationCount();
  const coveringPage = await foreground.context.newPage();
  await coveringPage.goto('about:blank');
  release = 'next';
  await coveringPage.close();
  await foreground.page.bringToFront();
  await foreground.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await waitForCache(foreground.page, '-r4');
  await assertNoReloadLoop(foreground.page, foreground.navigationCount);
  assert.ok(foreground.navigationCount() > foregroundBefore, 'foreground update activates and refreshes the page');
  await foreground.context.close();

  // An offline app shell remains available, then updates promptly after connectivity returns.
  release = 'current';
  const reconnect = await startPage();
  await waitForCache(reconnect.page, '-r3');
  await reconnect.page.waitForTimeout(5200);
  await reconnect.context.setOffline(true);
  await reconnect.page.reload({waitUntil: 'domcontentloaded'});
  await reconnect.page.locator('#screen').waitFor({state: 'visible'});
  assert.equal(await reconnect.page.evaluate(() => navigator.onLine), false, 'test is genuinely offline');
  assert.equal(await reconnect.page.title(), "Aaria's Magical Kitchen", 'the installed PWA shell still opens offline');
  release = 'next';
  await reconnect.context.setOffline(false);
  await waitForCache(reconnect.page, '-r4');
  assert.equal(await reconnect.page.evaluate(() => navigator.onLine), true, 'connectivity is restored');
  await assertNoReloadLoop(reconnect.page, reconnect.navigationCount);
  await reconnect.context.close();

  console.log('PASS: previous-production upgrade on launch; foreground and reconnect updates; bounded reloads; offline app shell; Favorites, Planner, My Creations, Settings, Magical Updates state, IndexedDB photos, and compatibility caches preserved.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
