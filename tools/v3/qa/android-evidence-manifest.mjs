import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pngDimensions } from '../../../.github/scripts/android-screenshot-orientation.mjs';

const orientations = ['portrait', 'landscape'];
const requiredScreenshots = [];
function requireScreenshot(device, locale, state, orientation, relativePath) {
  requiredScreenshots.push({ device, locale, state, orientation, path: relativePath });
}

for (const orientation of orientations) {
  for (const locale of ['en-GB', 'pt-BR']) {
    const pt = locale === 'pt-BR';
    for (const state of ['detail', 'ingredients', 'step-1', 'step-2', 'step-3', 'step-4', 'completion']) {
      const phoneState = state.startsWith('step-') ? `step-${state.slice(5)}` : state;
      const phonePath = pt
        ? `v32-recipe-12-pt-br-${phoneState}-${orientation}.png`
        : `v32-recipe-12-${phoneState}-${orientation}.png`;
      requireScreenshot('phone', locale, state, orientation, phonePath);

      let tabletPath;
      if (pt) tabletPath = `tablet/recipe-12-pt-br-${phoneState}-${orientation}.png`;
      else if (state === 'detail') tabletPath = `tablet/theme-12-detail-${orientation}.png`;
      else if (state === 'ingredients') tabletPath = pt
        ? `tablet/recipe-12-pt-br-ingredients-${orientation}.png`
        : `tablet/recipe-12-ingredients-${orientation}.png`;
      else if (state.startsWith('step-')) tabletPath = `tablet/recipe-12-${state}-${orientation}.png`;
      else if (state === 'completion') tabletPath = `tablet/recipe-12-completion-${orientation}.png`;
      if (tabletPath) requireScreenshot('tablet', locale, state, orientation, tabletPath);
    }
  }
}

export async function buildScreenshotEvidenceManifest({
  root = process.cwd(),
  required = requiredScreenshots,
  read = relative => readFile(path.join(root, 'artifacts/v32-android-screenshots', relative))
} = {}) {
  const entries = [];
  for (const requirement of required) {
    let png;
    try { png = await read(requirement.path); }
    catch (error) { throw new Error(`Missing required ${requirement.device} ${requirement.locale} recipe #12 ${requirement.state} ${requirement.orientation} screenshot: ${requirement.path} (${error.message})`); }
    const { width, height } = pngDimensions(png);
    const correctOrientation = requirement.orientation === 'portrait' ? width < height : width > height;
    if (!correctOrientation) throw new Error(`Wrong orientation for ${requirement.device} ${requirement.locale} recipe #12 ${requirement.state}: ${requirement.path} is ${width}x${height}, expected ${requirement.orientation}`);
    entries.push({ ...requirement, width, height, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') });
  }
  return { schemaVersion: 1, recipeId: 12, status: 'PASS', expectedScreenshotCount: required.length, screenshots: entries };
}

export async function main() {
  const manifest = await buildScreenshotEvidenceManifest();
  const routePath = path.join(process.cwd(), 'artifacts/v32-diagnostics/recipe-route-coverage.json');
  const { readFile: readText, writeFile } = await import('node:fs/promises');
  const routeCoverage = JSON.parse(await readText(routePath, 'utf8'));
  const expectedIds = Array.from({ length: 95 }, (_, index) => index + 1);
  if (routeCoverage.status !== 'PASS' || routeCoverage.uniqueCount !== 95 || JSON.stringify(routeCoverage.recipeIds) !== JSON.stringify(expectedIds)) {
    throw new Error(`95-route regression manifest incomplete or incorrect: ${routePath}`);
  }
  manifest.routeCoverage = { status: 'PASS', recipeCount: 95, recipeIds: expectedIds };
  await writeFile(path.join(process.cwd(), 'artifacts/v32-diagnostics/android-evidence-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Android screenshot evidence manifest PASS: ${manifest.screenshots.length} required recipe #12 screenshots; 95/95 routes.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
