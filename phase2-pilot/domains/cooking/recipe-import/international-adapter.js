import {createHash} from 'node:crypto';

const LOCALES = ['en-GB', 'pt-BR'];
const NUTRIENTS = ['kcal','proteinG','carbohydrateG','totalFatG','saturatedFatG','fiberG','sugarG','sodiumMg'];
const HASH = /^[a-f0-9]{64}$/i;
const COMMIT = /^[a-f0-9]{40}$/i;

const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.trim().length > 0;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function localized(value, path) {
  if (!isObject(value)) fail(path, 'must provide EN-GB and PT-BR text');
  for (const locale of LOCALES) if (!isText(value[locale])) fail(`${path}.${locale}`, 'is required');
  return { 'en-GB': value['en-GB'].trim(), 'pt-BR': value['pt-BR'].trim() };
}

function assetPath(ref, path) {
  if (!isObject(ref) || !isText(ref.path) || !HASH.test(ref.sha256 || '')) fail(path, 'requires a relative path and SHA-256');
  if (!isObject(ref.provenance) || !isText(ref.provenance.source) || !isText(ref.provenance.license) || !isText(ref.provenance.rightsStatus)) {
    fail(path, 'must retain source, license, and rights review state');
  }
  const normalized = ref.path.replaceAll('\\', '/');
  if (normalized.startsWith('/') || normalized.split('/').includes('..') || !normalized.startsWith('content/international/')) {
    fail(`${path}.path`, 'must stay within content/international/');
  }
  return {...ref, path: normalized, sha256: ref.sha256.toLowerCase()};
}

function verifyFile(files, ref, path) {
  const bytes = files?.[ref.path];
  if (bytes == null) fail(path, `offline asset is missing: ${ref.path}`);
  const actual = sha256(bytes);
  if (actual !== ref.sha256) fail(path, `SHA-256 mismatch for ${ref.path}: expected ${ref.sha256}, got ${actual}`);
}

function validateRecipe(recipe, files) {
  if (!isObject(recipe)) fail('recipe', 'must be an object');
  if (!Number.isSafeInteger(recipe.id) || recipe.id <= 95) fail('recipe.id', 'must be a new integer ID above the 95 canonical recipes');
  for (const field of ['country','category','ageRange','culturalContext','estimatedHandsOnMinutes','durationStatus','servings']) if (recipe[field] == null || recipe[field] === '') fail(`recipe.${field}`, 'is required');
  if (!Number.isFinite(recipe.servings) || recipe.servings < 1) fail('recipe.servings', 'must be positive');
  if (!Number.isFinite(recipe.estimatedHandsOnMinutes) || recipe.estimatedHandsOnMinutes < 0) fail('recipe.estimatedHandsOnMinutes', 'must be a non-negative estimate');
  const title = localized(recipe.title, 'recipe.title');
  const description = localized(recipe.description, 'recipe.description');
  const adultHelp = localized(recipe.adultHelp, 'recipe.adultHelp');
  const crossContact = localized(recipe.crossContact, 'recipe.crossContact');
  if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length) fail('recipe.ingredients', 'must not be empty');
  if (!Array.isArray(recipe.equipment) || !recipe.equipment.length) fail('recipe.equipment', 'must not be empty');
  if (!Array.isArray(recipe.steps) || !recipe.steps.length) fail('recipe.steps', 'must not be empty');

  const ingredientIds = new Set();
  const ingredients = recipe.ingredients.map((item, index) => {
    const path = `recipe.ingredients[${index}]`;
    if (!isText(item.id) || ingredientIds.has(item.id)) fail(`${path}.id`, 'must be unique and non-empty');
    ingredientIds.add(item.id);
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !isText(item.unit)) fail(path, 'requires a positive exact quantity and unit');
    const image = assetPath(item.image, `${path}.image`);
    verifyFile(files, image, `${path}.image`);
    return {...item, name: localized(item.name, `${path}.name`), allergens: Array.isArray(item.allergens) ? [...item.allergens] : [], image};
  });

  const equipmentIds = new Set();
  const equipment = recipe.equipment.map((item, index) => {
    const path = `recipe.equipment[${index}]`;
    if (!isObject(item) || !isText(item.id) || equipmentIds.has(item.id)) fail(`${path}.id`, 'must be unique and non-empty');
    equipmentIds.add(item.id);
    if (!['child','adult','shared'].includes(item.role)) fail(`${path}.role`, 'must be child, adult, or shared');
    const image = assetPath(item.image, `${path}.image`);
    verifyFile(files, image, `${path}.image`);
    return {...item, name: localized(item.name, `${path}.name`), image};
  });

  const finishedDish = assetPath(recipe.artwork?.finishedDish, 'recipe.artwork.finishedDish');
  verifyFile(files, finishedDish, 'recipe.artwork.finishedDish');
  const stepIds = new Set();
  const steps = recipe.steps.map((step, index) => {
    const path = `recipe.steps[${index}]`;
    if (!isObject(step) || !isText(step.id) || stepIds.has(step.id)) fail(`${path}.id`, 'must be unique and non-empty');
    stepIds.add(step.id);
    if (step.order !== index + 1) fail(`${path}.order`, 'must be sequential starting at 1');
    if (!Array.isArray(step.ingredientIds) || step.ingredientIds.some(id => !ingredientIds.has(id))) fail(`${path}.ingredientIds`, 'must reference known ingredients');
    if (!Array.isArray(step.equipmentIds) || step.equipmentIds.some(id => !equipmentIds.has(id))) fail(`${path}.equipmentIds`, 'must reference known equipment');
    const image = assetPath(step.image, `${path}.image`);
    verifyFile(files, image, `${path}.image`);
    return {
      ...step,
      title: localized(step.title, `${path}.title`),
      instruction: localized(step.instruction, `${path}.instruction`),
      safety: localized(step.safety, `${path}.safety`),
      adultAssist: localized(step.adultAssist, `${path}.adultAssist`),
      image
    };
  });

  if (!Array.isArray(recipe.allergens)) fail('recipe.allergens', 'must be an array, including when empty');
  if (!isObject(recipe.nutrition?.perServing)) fail('recipe.nutrition.perServing', 'is required');
  for (const nutrient of NUTRIENTS) {
    const value = recipe.nutrition.perServing[nutrient];
    if (value !== null && (!Number.isFinite(value) || value < 0)) fail(`recipe.nutrition.perServing.${nutrient}`, 'must be a non-negative number or null when unverified');
  }
  if (!isText(recipe.nutrition.verificationStatus) || !isText(recipe.nutrition.dataSource) || !isText(recipe.nutrition.calculationMethod)) {
    fail('recipe.nutrition', 'must state verification status, source, and calculation method');
  }
  if (NUTRIENTS.some(key => recipe.nutrition.perServing[key] === null) && /verified/i.test(recipe.nutrition.verificationStatus)) {
    fail('recipe.nutrition.verificationStatus', 'cannot claim VERIFIED while nutrient values are null');
  }

  return {
    ...recipe,
    title,
    description,
    adultHelp,
    crossContact,
    ingredients,
    equipment,
    allergens: [...recipe.allergens],
    artwork: {...recipe.artwork, finishedDish},
    steps
  };
}

/**
 * Validate a W03 handoff and adapt it to the current recipe-detail/Ingredients/
 * Guided Steps renderer contract. This is intentionally side-effect free: it
 * never mutates the 95-recipe catalog or persists user data.
 */
export function prepareInternationalRecipeImport({manifest, recipes, files, handoff, canonicalIds = []}) {
  if (!isObject(manifest) || !isText(manifest.schema_version) || manifest.schema_version.includes('draft')) {
    fail('manifest.schema_version', 'a versioned, non-draft manifest is required');
  }
  if (manifest.status !== 'READY_FOR_INTEGRATION') fail('manifest.status', 'must be READY_FOR_INTEGRATION');
  const sourceCommit = handoff?.sourceCommit;
  if (!COMMIT.test(sourceCommit || '') || sourceCommit !== manifest.source_commit) fail('handoff.sourceCommit', 'must match the immutable manifest source_commit');
  if (!Array.isArray(manifest.recipes) || !Array.isArray(recipes) || !recipes.length) fail('manifest.recipes', 'must list the recipe pair');
  const canonical = new Set(canonicalIds.map(String));
  const seen = new Set();
  const prepared = recipes.map(raw => {
    const recipe = validateRecipe(raw, files);
    if (canonical.has(String(recipe.id))) fail(`recipe ${recipe.id}`, 'collides with an existing canonical recipe ID');
    if (seen.has(recipe.id)) fail(`recipe ${recipe.id}`, 'ID is duplicated in this handoff');
    seen.add(recipe.id);
    const entry = manifest.recipes.find(item => Number(item.id) === recipe.id);
    if (!entry || entry.status !== 'READY_FOR_INTEGRATION' || entry.artwork_ready !== true || !isText(entry.recipe_json) || !isText(entry.recipe_md) || files[entry.recipe_json] == null || files[entry.recipe_md] == null || entry.recipe_json_sha256 !== sha256(files[entry.recipe_json]) || entry.recipe_md_sha256 !== sha256(files[entry.recipe_md])) {
      fail(`manifest recipe ${recipe.id}`, 'must include complete recipe.md and recipe.json bytes, artwork readiness, and matching SHA-256 values');
    }
    const recipeJson = files[entry.recipe_json];
    if (recipeJson == null || JSON.parse(Buffer.from(recipeJson).toString('utf8')).id !== recipe.id) {
      fail(`manifest recipe ${recipe.id}`, 'recipe_json path must resolve to this recipe');
    }
    return adaptRecipeForRenderer(recipe);
  });
  if (manifest.recipes.filter(item => item.status === 'READY_FOR_INTEGRATION').length !== prepared.length) {
    fail('manifest.recipes', 'handoff must contain exactly the listed ready pair, with no unconsumed ready recipes');
  }
  const manifestPath = handoff.manifestPath;
  if (!isText(manifestPath) || files?.[manifestPath] == null) fail('handoff.manifestPath', 'must resolve to the exact manifest bytes');
  const manifestSha256 = sha256(files[manifestPath]);
  if (!HASH.test(handoff.manifestSha256 || '') || handoff.manifestSha256 !== manifestSha256) fail('handoff.manifestSha256', 'must match the exact manifest bytes');
  if (!Array.isArray(manifest.package_files) || !manifest.package_files.length) fail('manifest.package_files', 'must bind every recipe, markdown and artwork file by path and SHA-256');
  const listed = manifest.package_files.map(item => {
    if (!isText(item.path) || !HASH.test(item.sha256 || '') || files?.[item.path] == null) fail('manifest.package_files', 'each file must exist and include a SHA-256');
    const actual = sha256(files[item.path]);
    if (actual !== item.sha256.toLowerCase()) fail(`manifest.package_files.${item.path}`, 'SHA-256 does not match the immutable handoff bytes');
    return `${item.path.replaceAll('\\','/')}	${actual}`;
  }).sort();
  const pairSha256 = sha256(listed.join('\n'));
  if (!HASH.test(handoff.pairSha256 || '') || handoff.pairSha256 !== pairSha256) fail('handoff.pairSha256', 'must match the complete immutable pair file list');
  return Object.freeze({sourceCommit, manifestSha256, pairSha256, recipes: prepared});
}

/** Require the owner-approved first artwork screenshot before producing import records. */
export function authorizeInternationalRecipeImport(prepared, approval) {
  if (!prepared?.sourceCommit || !Array.isArray(prepared.recipes)) fail('prepared', 'must come from prepareInternationalRecipeImport');
  if (!isObject(approval) || approval.status !== 'APPROVED') fail('ownerApproval.status', 'explicit owner APPROVED decision is required');
  if (approval.sourceCommit !== prepared.sourceCommit) fail('ownerApproval.sourceCommit', 'must refer to the prepared immutable W03 commit');
  if (!prepared.recipes.some(recipe => recipe.id === Number(approval.recipeId))) fail('ownerApproval.recipeId', 'must identify a recipe in this prepared pair');
  if (!HASH.test(approval.firstStepArtworkSha256 || '') || !HASH.test(approval.screenshotSha256 || '')) fail('ownerApproval', 'must bind the first step artwork and its template screenshot by SHA-256');
  const approvedRecipe = prepared.recipes.find(recipe => recipe.id === Number(approval.recipeId));
  if (approval.firstStepArtworkSha256.toLowerCase() !== approvedRecipe.steps[0].image.sha256) fail('ownerApproval.firstStepArtworkSha256', 'must match the approved recipe first-step asset');
  return Object.freeze(prepared.recipes.map(recipe => ({
    ...recipe,
    integrationStatus: 'REVIEW_ONLY',
    ownerArtworkApproval: {...approval}
  })));
}

/** Map bilingual package fields onto the existing renderer without discarding source metadata. */
export function adaptRecipeForRenderer(recipe, locale = 'en-GB') {
  if (!LOCALES.includes(locale)) fail('locale', `unsupported locale ${locale}`);
  const pick = value => isObject(value) ? value[locale] : value;
  return {
    ...recipe,
    title: pick(recipe.title),
    description: pick(recipe.description),
    adultHelp: pick(recipe.adultHelp),
    crossContact: pick(recipe.crossContact),
    ingredients: recipe.ingredients.map(item => ({
      ...item,
      name: pick(item.name),
      imageAsset: item.image.path,
      quantity: item.quantity,
      unit: item.unit,
      optional: item.optional === true
    })),
    equipment: recipe.equipment.map(item => ({...item, name: pick(item.name), imageAsset: item.image.path})),
    steps: recipe.steps.map(step => ({
      ...step,
      title: pick(step.title),
      instruction: pick(step.instruction),
      safety: pick(step.safety),
      art: step.image.path
    })),
    finishedDish: recipe.artwork.finishedDish.path,
    artworkIds: [recipe.artwork.finishedDish.path, ...recipe.ingredients.map(x => x.image.path), ...recipe.equipment.map(x => x.image.path), ...recipe.steps.map(x => x.image.path)],
    localization: Object.fromEntries(LOCALES.map(code => [code, {
      title: pickFor(recipe.title, code),
      description: pickFor(recipe.description, code),
      adultHelp: pickFor(recipe.adultHelp, code),
      crossContact: pickFor(recipe.crossContact, code)
    }])),
    publicationStatus: 'INTERNATIONAL REVIEW ONLY — NOT RELEASED'
  };
}

function pickFor(value, locale) { return isObject(value) ? value[locale] : value; }
