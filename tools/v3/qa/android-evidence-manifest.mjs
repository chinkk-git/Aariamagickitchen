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

export async function buildRecipeImageVerificationManifest({
  root = process.cwd(),
  readJson = relative => readFile(path.join(root, relative), 'utf8'),
  readPng = relative => readFile(path.join(root, relative))
} = {}) {
  const phone = JSON.parse(await readJson('artifacts/v32-diagnostics/recipe-image-verification-phone.json'));
  const tabletPortrait = JSON.parse(await readJson('artifacts/v32-diagnostics/recipe-image-verification-tablet-portrait.json'));
  const tabletLandscape = JSON.parse(await readJson('artifacts/v32-diagnostics/recipe-image-verification-tablet-landscape.json'));
  const expectedIds = [...Array.from({ length: 95 }, (_, index) => index + 1), 96, 99];
  const tabletSampleIds = [12, 96, 99];
  const sources = [
    { device: 'phone', orientation: 'portrait', source: phone, expectedIds, screenshotPaths: row => row.screenshots.map(name => `artifacts/v32-android-screenshots/${name}`) },
    { device: 'phone', orientation: 'landscape', source: phone, expectedIds, screenshotPaths: row => row.landscapeScreenshots || [] },
    { device: 'tablet', orientation: 'portrait', source: tabletPortrait, expectedIds: tabletSampleIds, screenshotPaths: row => row.screenshots.map(item => item.path) },
    { device: 'tablet', orientation: 'landscape', source: tabletLandscape, expectedIds: tabletSampleIds, screenshotPaths: row => row.screenshots.map(item => item.path) }
  ];
  const deviceRows = [];
  for (const item of sources) {
    if (item.source.recipeCount !== item.expectedIds.length || item.source.device !== item.device || (item.device === 'tablet' && item.source.orientation !== item.orientation) || item.source.recipes?.length !== item.expectedIds.length || JSON.stringify(item.source.recipes?.map(row => row.recipeId)) !== JSON.stringify(item.expectedIds)) {
      const expected = item.device === 'phone' ? 'all 97 integrated recipes' : 'representative recipes #12, #096 and #099';
      throw new Error(`Incomplete ${item.device} ${item.orientation} recipe image audit; expected ${expected}.`);
    }
    for (const recipeId of item.expectedIds) {
      const recipe = item.source.recipes.find(row => row.recipeId === recipeId);
      if (!recipe) throw new Error(`Missing ${item.device} ${item.orientation} image-verification row for recipe ${recipeId}.`);
      if (recipe.steps?.length !== recipe.finishedDish?.stepCount && recipe.finishedDish?.stepCount !== undefined) {
        throw new Error(`Recipe ${recipeId} ${item.device} ${item.orientation} step evidence count does not match rendered detail.`);
      }
      const screenshotEvidence = [];
      for (const relativePath of item.screenshotPaths(recipe)) {
        if (typeof relativePath !== 'string' || !relativePath.endsWith('.png')) throw new Error(`Invalid ${item.device} screenshot reference for recipe ${recipeId}.`);
        const png = await readPng(relativePath);
        const { width, height } = pngDimensions(png);
        const correct = item.orientation === 'portrait' ? width < height : width > height;
        if (!correct) throw new Error(`Recipe ${recipeId} ${item.device} ${item.orientation} screenshot has wrong dimensions: ${relativePath} (${width}x${height}).`);
        screenshotEvidence.push({ path: relativePath, width, height, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') });
      }
      const requiredShotCount = item.device === 'phone' && item.orientation === 'portrait' ? recipe.steps?.length + 1 : 2;
      if (screenshotEvidence.length < requiredShotCount) throw new Error(`Recipe ${recipeId} ${item.device} ${item.orientation} lacks screenshot evidence; expected at least ${requiredShotCount}, got ${screenshotEvidence.length}.`);
      const expectedStepCount = recipe.steps?.length || 0;
      const verifiedStepCount = recipe.steps?.filter(step => step.stepIndex > 0 && step.stepNumber === step.stepIndex && step.association && step.rendered && step.status === 'PASS').length || 0;
      const status = recipe.status === 'PASS' && verifiedStepCount === expectedStepCount && recipe.finishedDish?.loaded && recipe.finishedDish?.association ? 'PASS' : recipe.status === 'FAIL' || recipe.steps?.some(step => step.status === 'FAIL') ? 'FAIL' : 'NOT TESTED';
      deviceRows.push({ recipeId, title: recipe.title, device: item.device, orientation: item.orientation, status, finishedDish: recipe.finishedDish, expectedStepCount, verifiedStepCount, steps: recipe.steps, screenshots: screenshotEvidence });
    }
  }
  const status = deviceRows.every(row => row.status === 'PASS') ? 'PASS' : deviceRows.some(row => row.status === 'FAIL') ? 'FAIL' : 'NOT TESTED';
  return { schemaVersion: 1, status, recipeCount: 97, deviceOrientationRows: 4, recipeOrientationRows: deviceRows.length, tabletSampleRecipeIds: [12, 96, 99], recipes: deviceRows };
}

export async function main() {
  const manifest = await buildScreenshotEvidenceManifest();
  const routePath = path.join(process.cwd(), 'artifacts/v32-diagnostics/recipe-route-coverage.json');
  const { readFile: readText, writeFile } = await import('node:fs/promises');
  const routeCoverage = JSON.parse(await readText(routePath, 'utf8'));
  const expectedIds = [...Array.from({ length: 95 }, (_, index) => index + 1), 96, 99];
  if (routeCoverage.status !== 'PASS' || routeCoverage.uniqueCount !== 97 || JSON.stringify(routeCoverage.recipeIds) !== JSON.stringify(expectedIds)) {
    throw new Error(`97-route regression manifest incomplete or incorrect (expected only IDs 1–95, 96 and 99): ${routePath}`);
  }
  manifest.routeCoverage = { status: 'PASS', recipeCount: 97, recipeIds: expectedIds };
  const imageVerification = await buildRecipeImageVerificationManifest();
  manifest.recipeImageVerification = { status: imageVerification.status, recipeCount: imageVerification.recipeCount, deviceOrientationRows: imageVerification.deviceOrientationRows };
  await writeFile(path.join(process.cwd(), 'artifacts/v32-diagnostics/android-evidence-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(process.cwd(), 'artifacts/v32-diagnostics/recipe-image-verification-manifest.json'), `${JSON.stringify(imageVerification, null, 2)}\n`);
  await writeFile(path.join(process.cwd(), 'artifacts/v32-diagnostics/recipe-image-verification-matrix.csv'), `recipe_id,title,device,orientation,status,step_count,verified_steps,screenshot_paths\n${imageVerification.recipes.map(row => [row.recipeId, JSON.stringify(row.title), row.device, row.orientation, row.status, row.expectedStepCount, row.verifiedStepCount, JSON.stringify(row.screenshots.map(item => item.path).join(';'))].join(',')).join('\n')}\n`);
  console.log(`Android screenshot evidence manifest PASS: ${manifest.screenshots.length} required recipe #12 screenshots; 97/97 routes.`);
  if (imageVerification.status !== 'PASS') throw new Error(`97-recipe Android visual verification gate is ${imageVerification.status}; see artifacts/v32-diagnostics/recipe-image-verification-matrix.csv.`);
  console.log('97/97 phone image verification and tablet sample #12/#096/#099 in portrait and landscape PASS.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
