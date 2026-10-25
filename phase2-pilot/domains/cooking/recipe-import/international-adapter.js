import {createHash} from 'node:crypto';

const LOCALES = ['en-GB', 'pt-BR'];
const NUTRIENTS = ['kcal','proteinG','carbohydrateG','totalFatG','saturatedFatG','fiberG','sugarG','sodiumMg'];
const HASH = /^[a-f0-9]{64}$/i;
const COMMIT = /^[a-f0-9]{40}$/i;
const W03_WAVE1_SOURCE_COMMIT = '451ab0bf8a3ab1867cf004a113d3d8e6896ccf60';

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
    equipment: recipe.equipment.map(item => pick(item.name)),
    equipmentItems: recipe.equipment.map(item => ({...item, name: pick(item.name), imageAsset: item.image.path})),
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

/**
 * Verify W03's published Wave 1 package at the owner-pinned immutable commit
 * and map its v1 content schema into review-only Ingredients/Guided Steps
 * records. The manifest/ledger on newer W03 heads are not treated as proof for
 * bytes from this older pinned commit; the W01 source lock binds these bytes.
 */
export function preparePinnedW03WaveOne({sourceLock, files, canonicalIds = []}) {
  if (!isObject(sourceLock) || sourceLock.source_commit !== W03_WAVE1_SOURCE_COMMIT) {
    fail('sourceLock.source_commit', `must pin owner-selected W03 commit ${W03_WAVE1_SOURCE_COMMIT}`);
  }
  const manifestBytes = files?.[sourceLock.source_manifest_path];
  if (manifestBytes == null || sha256(manifestBytes) !== sourceLock.source_manifest_sha256) {
    fail('sourceLock.source_manifest_sha256', 'pinned W03 source manifest is missing or has changed');
  }
  const manifest = JSON.parse(Buffer.from(manifestBytes).toString('utf8'));
  const styleBytes = files?.[sourceLock.source_style_guide_path];
  if (styleBytes == null || sha256(styleBytes) !== sourceLock.source_style_guide_sha256) {
    fail('sourceLock.source_style_guide_sha256', 'approved artwork style guide is missing or has changed');
  }
  if (!Array.isArray(sourceLock.package_files) || sourceLock.package_files.length !== 46) {
    fail('sourceLock.package_files', 'must bind the two recipe documents and all 42 artwork files');
  }
  const seenPaths = new Set();
  const packageEntries = sourceLock.package_files.map(entry => {
    if (!isObject(entry) || !isText(entry.path) || !HASH.test(entry.sha256 || '') || seenPaths.has(entry.path)) {
      fail('sourceLock.package_files', 'each entry needs a unique path and SHA-256');
    }
    if (!entry.path.startsWith('content/international/countries/') || entry.path.split('/').includes('..')) {
      fail(`sourceLock.package_files.${entry.path}`, 'must stay under the pinned recipe package');
    }
    seenPaths.add(entry.path);
    const bytes = files[entry.path];
    if (bytes == null || sha256(bytes) !== entry.sha256.toLowerCase()) {
      fail(`sourceLock.package_files.${entry.path}`, 'pinned package file is missing or SHA-256 differs');
    }
    return `${entry.path.replaceAll('\\', '/')}\t${entry.sha256.toLowerCase()}`;
  }).sort();
  const pairSha256 = sha256(packageEntries.join('\n'));
  if (pairSha256 !== sourceLock.pair_sha256) fail('sourceLock.pair_sha256', 'does not match the pinned package files');

  const ready = (manifest.recipes || []).filter(item => item.status === 'READY_FOR_INTEGRATION');
  const expectedIds = [96, 99];
  if (JSON.stringify(ready.map(item => Number(item.proposed_id)).sort((a,b)=>a-b)) !== JSON.stringify(expectedIds)) {
    fail('source manifest recipes', 'pinned package must contain exactly ready recipes #096 and #099');
  }
  if (manifest.canonical_existing_recipe_count !== 95) fail('source manifest canonical_existing_recipe_count', 'must preserve the 95-recipe baseline');
  if (manifest.production_artwork_approved !== true) fail('source manifest production_artwork_approved', 'must retain the owner-approved visual checkpoint');

  const canonical = new Set(canonicalIds.map(Number));
  const recipes = expectedIds.map(id => {
    const entry = ready.find(item => Number(item.proposed_id) === id);
    const jsonPath = entry.recipe_json.startsWith('content/international/') ? entry.recipe_json : `content/international/${entry.recipe_json}`;
    const mdPath = entry.recipe_md.startsWith('content/international/') ? entry.recipe_md : `content/international/${entry.recipe_md}`;
    if (!seenPaths.has(jsonPath) || !seenPaths.has(mdPath)) fail(`recipe ${id}`, 'recipe JSON and Markdown must be in the immutable package lock');
    const recipeBytes = files[jsonPath];
    const recipe = JSON.parse(Buffer.from(recipeBytes).toString('utf8'));
    const c = recipe.content;
    if (recipe.id !== id || !isObject(c) || c.id !== id || c.status !== 'READY_FOR_INTEGRATION') fail(`recipe ${id}`, 'content record is incomplete or ID does not match');
    if (canonical.has(id)) fail(`recipe ${id}`, 'collides with an existing canonical recipe ID');
    if (recipe.renderer?.id !== id || entry.canonical_id_verified !== true) fail(`recipe ${id}`, 'renderer and canonical ID verification must match the package ID');
    for (const value of [c.title,c.description,c.culturalContext,recipe.adult_assistance,recipe.allergen_notes?.crossContact]) localized(value, `recipe ${id} localized fields`);
    if (!Array.isArray(c.ingredients) || !c.ingredients.length || !Array.isArray(c.equipment) || !c.equipment.length || !Array.isArray(c.steps) || !c.steps.length) fail(`recipe ${id}`, 'ingredients, equipment and guided steps are required');
    if (!Array.isArray(recipe.allergens) || !isObject(recipe.nutrition?.per_serving) || !Array.isArray(recipe.nutrition?.sources) || !recipe.nutrition.sources.length) fail(`recipe ${id}`, 'allergens and sourced nutrition fields are required');
    if (!/PENDING|ESTIMATE/i.test(recipe.nutrition.status || '')) fail(`recipe ${id}.nutrition.status`, 'nutrition must remain explicitly pending independent review');
    const reviews = recipe.reviews || {};
    for (const gate of ['A08ChildProtection','A09ChildExperience','nutrition','translation','cultural','artworkRights','security']) {
      if (!isText(reviews[gate]) || /^(PASS|APPROVED|VERIFIED)$/i.test(reviews[gate])) fail(`recipe ${id}.reviews.${gate}`, 'independent review must remain explicitly pending');
    }

    const assetRefs = recipe.artwork_assets;
    if (!Array.isArray(assetRefs) || !assetRefs.length) fail(`recipe ${id}.artwork_assets`, 'must enumerate every offline artwork asset');
    const assetIds = new Set();
    const assetMap = new Map();
    for (const ref of assetRefs) {
      if (!isObject(ref) || !isText(ref.path) || !HASH.test(ref.sha256 || '') || !isText(ref.provenance) || !isText(ref.license) || !isText(ref.rights_status)) fail(`recipe ${id}.artwork_assets`, 'asset provenance, license, rights state and hash are required');
      if (!ref.path.startsWith('content/international/countries/') || ref.path.split('/').includes('..') || !seenPaths.has(ref.path)) fail(`recipe ${id}.artwork_assets.${ref.path}`, 'asset must be included in the pinned package');
      const bytes = files[ref.path];
      if (sha256(bytes) !== ref.sha256.toLowerCase()) fail(`recipe ${id}.artwork_assets.${ref.path}`, 'asset SHA-256 mismatch');
      if (Buffer.from(bytes).subarray(0,8).toString('hex') !== '89504e470d0a1a0a') fail(`recipe ${id}.artwork_assets.${ref.path}`, 'asset is not a PNG image');
      assetIds.add(ref.path); assetMap.set(ref.path, ref);
    }
    const expectedImages = [recipe.artwork?.finished_dish, ...(recipe.artwork?.ingredient_images || []), ...(recipe.artwork?.equipment_images || []), ...(recipe.artwork?.step_images || [])];
    for (const ref of expectedImages) if (!ref || !assetIds.has(ref.path)) fail(`recipe ${id}.artwork`, 'finished dish, ingredient, equipment and step images must all be included');
    const ingredientIds = new Set(c.ingredients.map(x=>x.id));
    const equipmentIds = new Set(c.equipment.map(x=>x.id));
    const ingredients = c.ingredients.map((item,index) => {
      localized(item.name, `recipe ${id}.ingredients[${index}].name`);
      if (!isText(item.id) || !Number.isFinite(item.quantity) || item.quantity <= 0 || !isText(item.unit)) fail(`recipe ${id}.ingredients[${index}]`, 'requires a stable ID and exact amount');
      return {...item, image: item.artwork, imageAsset:item.artwork.path};
    });
    const equipment = c.equipment.map((item,index) => {
      localized(item.name, `recipe ${id}.equipment[${index}].name`);
      const roleText=String(item.role||'').trim().toLowerCase();
      const role=roleText.startsWith('adult')?'adult':roleText.startsWith('child')?'child':roleText.startsWith('shared')?'shared':null;
      if (!isText(item.id) || !role) fail(`recipe ${id}.equipment[${index}]`, 'requires an ID and an explicit child/adult/shared role');
      return {...item, role, roleDescription:item.role, image: item.artwork, imageAsset:item.artwork.path};
    });
    const steps = c.steps.map((step,index) => {
      for (const field of ['title','instruction','adultAssist','safety']) localized(step[field], `recipe ${id}.steps[${index}].${field}`);
      if (step.ingredientIds.some(ref=>!ingredientIds.has(ref)) || step.equipmentIds.some(ref=>!equipmentIds.has(ref))) fail(`recipe ${id}.steps[${index}]`, 'contains an unknown ingredient or equipment reference');
      return {...step, order:index+1, image:step.artwork, art:step.artwork.path};
    });
    const per = recipe.nutrition.per_serving;
    const nutrition = {
      perServing:{kcal:per.energyKcal,proteinG:per.proteinG,carbohydrateG:per.carbohydrateG,totalFatG:per.fatG,saturatedFatG:per.saturatedFatG,fiberG:per.fibreG,sugarG:null,sodiumMg:per.sodiumMg},
      servingSize:`1 of ${c.servings} servings`,
      verificationStatus:recipe.nutrition.status,
      dataSource:recipe.nutrition.sources.map(s=>`${s.source}${s.fdcId?` FDC ${s.fdcId}`:''}`).join('; '),
      calculationMethod:`${recipe.nutrition.method} ${recipe.nutrition.basis}`.trim(),
      reviewDate:null
    };
    for (const [key,value] of Object.entries(nutrition.perServing)) if (value !== null && (!Number.isFinite(value) || value < 0)) fail(`recipe ${id}.nutrition.${key}`, 'must be non-negative or null when not calculated');
    const finishedDish=recipe.artwork.finished_dish;
    const localizedRecord=locale=>({
      ...recipe.renderer,
      id,
      country:c.country,
      category:c.category,
      title:c.title[locale],
      description:c.description[locale],
      servings:c.servings,
      estimatedHandsOnMinutes:c.activeMinutes,
      durationStatus:'ESTIMATED — NOT INDEPENDENTLY VERIFIED',
      ingredients:ingredients.map(item=>({...item,name:item.name[locale],quantity:item.quantity,unit:item.unit,optional:item.optional===true})),
      equipment:equipment.map(item=>item.name[locale]),
      equipmentItems:equipment.map(item=>({...item,name:item.name[locale]})),
      allergens:[...recipe.allergens],
      adultHelp:recipe.adult_assistance[locale],
      crossContact:recipe.allergen_notes.crossContact[locale],
      nutrition,
      steps:steps.map(step=>({...step,title:step.title[locale],instruction:step.instruction[locale],safety:step.safety[locale],adultAssist:step.adultAssist[locale]})),
      finishedDish:finishedDish.path,
      artwork:{finishedDish},
      artworkIds:[...assetIds],
      international:{sourceCommit:W03_WAVE1_SOURCE_COMMIT,locale,reviews:{...reviews},nutritionSources:recipe.nutrition.sources,sourceJson:jsonPath,sourceMarkdown:mdPath},
      publicationStatus:'INTERNATIONAL REVIEW ONLY — NOT RELEASED'
    });
    return {id,country:c.country,title:{...c.title},sourceJson:jsonPath,sourceMarkdown:mdPath,locales:{'en-GB':localizedRecord('en-GB'),'pt-BR':localizedRecord('pt-BR')},artworkAssetPaths:[...assetIds]};
  });
  if (sourceLock.artwork_file_count !== 42 || recipes.reduce((n,r)=>n+r.artworkAssetPaths.length,0)!==42) fail('sourceLock.artwork_file_count', 'must equal 42 distinct Wave 1 images');
  return Object.freeze({sourceCommit:W03_WAVE1_SOURCE_COMMIT,sourceManifestSha256:sourceLock.source_manifest_sha256,pairSha256,recipes});
}
