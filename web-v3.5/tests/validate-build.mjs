import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const web = path.join(root, 'web-v3.5');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fail = message => { throw new Error(message); };
const read = file => fs.readFileSync(file, 'utf8');
function arrayEnd(text, start) {
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') { if (--depth === 0) return i + 1; }
  }
  return -1;
}

const catalog = JSON.parse(read(path.join(web, 'data/recipes.json')));
const dataScript = read(path.join(web, 'js/recipe-data.js'));
const appScript = read(path.join(web, 'js/app.js'));
const runtime = read(path.join(web, 'js/v34-runtime.js'));
const html = read(path.join(web, 'index.html'));
const originalHtml = read(path.join(root, 'index.html'));
const recipeAt = originalHtml.indexOf('const RECIPES=');
const sourceStart = originalHtml.indexOf('[', recipeAt);
const sourceEnd = arrayEnd(originalHtml, sourceStart);
if (recipeAt < 0 || sourceEnd < 0) fail('Could not read the canonical production recipe array');
const sourceRecipes = JSON.parse(originalHtml.slice(sourceStart, sourceEnd));
const dataAt = dataScript.indexOf('[');
const dataEnd = arrayEnd(dataScript, dataAt);
if (dataAt < 0 || dataEnd < 0) fail('Recipe data module is malformed');
const bundledBase = JSON.parse(dataScript.slice(dataAt, dataEnd));
if (sourceRecipes.length !== 95 || bundledBase.length !== 95) fail('The unchanged production catalog must contain 95 recipes');
if (JSON.stringify(sourceRecipes) !== JSON.stringify(bundledBase)) fail('Original 95 recipe records changed during extraction');
if (catalog.length !== 97 || new Set(catalog.map(recipe => recipe.id)).size !== 97) fail('Web catalog must contain 97 unique records');
const ids = catalog.map(recipe => recipe.id);
if (ids.filter(id => id >= 1 && id <= 95).length !== 95 || !ids.includes(96) || !ids.includes(99)) fail('Expected the exact 95 + #096/#099 baseline');
for (const [id, country] of [[96, 'italy'], [99, 'china']]) {
  const recipe = catalog.find(item => item.id === id);
  if (recipe.country !== country || !recipe.localeTranslations?.['pt-BR']?.steps?.length) fail(`Recipe #${id} is missing its canonical country or Portuguese steps`);
  const recipeFile = id === 96 ? '096-tomato-basil-pasta' : '099-vegetable-fried-rice';
  const base = path.join(web, 'international-wave-1', country, recipeFile, 'artwork');
  for (const relative of ['finished-dish.png', ...Array.from({ length: 5 }, (_, i) => `steps/step-${String(i + 1).padStart(2, '0')}.png`)]) {
    if (!fs.existsSync(path.join(base, relative))) fail(`Missing #${id} artwork ${relative}`);
  }
}
for (const token of ['localStorage', 'aariaPrivateKitchenV4', 'capture="environment"', 'navigator.share', 'hashchange', 'popstate']) {
  if (!appScript.includes(token)) fail(`Existing browser feature/source marker missing: ${token}`);
}
for (const token of ['home', 'world', 'settings', 'welcome']) {
  if (!runtime.toLowerCase().includes(token)) fail(`V3.4 runtime marker missing: ${token}`);
}
if (!html.includes('./js/browser-adapters.js') || !read(path.join(web, 'js/browser-adapters.js')).includes("register('./sw.js', { scope: './' })")) fail('Package-local service worker registration missing');
if (sha(path.join(root, 'index.html')) !== '74d9c0f8b0f8c8ec9115e58ff77f6cdc1607f73df45bfbb3d2d50039d86431fe') fail('Protected production index changed');
const head = execFileSync('git', ['rev-parse', 'main'], { cwd: root, encoding: 'utf8' }).trim();
if (head !== 'd38cefee4ab129eabc53f2a755a0eaf4487addcd') fail('Protected main branch reference changed');
const report = {
  result: 'PASS (focused static validation)',
  checkedAt: '2026-10-28',
  mainHead: head,
  productionIndexSha256: sha(path.join(root, 'index.html')),
  originalRecordsUnchanged: 95,
  webCatalogRecords: 97,
  addedBaselineRecords: [{ id: 96, country: 'italy' }, { id: 99, country: 'china' }],
  sourceMarkers: ['localStorage v4 key', 'camera capture/file input', 'photo share API', 'hashchange/popstate handlers'],
  packageLocalServiceWorkerScope: './',
  notVerified: ['visual browser interaction/screenshots; no browser executable available and cloud browser cannot reach local preview', 'independent accessibility/security/A08/A09/nutrition/artwork-rights approvals']
};
fs.writeFileSync(path.join(web, 'reports/validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
