import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const COMMIT = /^[0-9a-f]{40}$/i;
const COUNTRY = /^[a-z][a-z0-9-]*$/;
const SHA256 = /^[0-9a-f]{64}$/i;

function assert(condition, message) {
  if (!condition) throw new Error(`International recipe handoff rejected: ${message}`);
}

function safePath(value, label) {
  assert(typeof value === 'string' && value.length > 0, `${label} path is missing`);
  assert(!value.includes('\\') && !value.startsWith('/') && !/^[a-z]+:/i.test(value), `${label} must be a repository-relative offline path`);
  const resolved = path.posix.normalize(value);
  assert(resolved !== '..' && !resolved.startsWith('../') && resolved === value, `${label} path escapes or is not normalized`);
  assert(resolved.startsWith('content/international/'), `${label} must be under content/international/`);
  return resolved;
}

async function readRepoFile(root, relative, label) {
  const relativePath = safePath(relative, label);
  const file = path.resolve(root, ...relativePath.split('/'));
  const rootPath = path.resolve(root) + path.sep;
  assert(file.startsWith(rootPath), `${label} resolves outside the handoff root`);
  try { return await readFile(file); }
  catch (error) { throw new Error(`International recipe handoff rejected: ${label} is unavailable (${relativePath})`, { cause: error }); }
}

function assertRecipeRecord(record, entry) {
  assert(record && typeof record === 'object' && !Array.isArray(record), `recipe ${entry.id} JSON is not an object`);
  assert(Number(record.id) === entry.id, `recipe ${entry.id} JSON ID does not match the manifest`);
  assert(String(record.country || '').toLowerCase() === entry.country, `recipe ${entry.id} country does not match the manifest`);
  assert(record.title && typeof record.title['en-GB'] === 'string' && record.title['en-GB'].trim(), `recipe ${entry.id} is missing its EN-GB title`);
  assert(record.title && typeof record.title['pt-BR'] === 'string' && record.title['pt-BR'].trim(), `recipe ${entry.id} is missing its PT-BR title`);
  for (const field of ['ingredients', 'equipment', 'steps']) assert(Array.isArray(record[field]) && record[field].length > 0, `recipe ${entry.id} is missing ${field}`);
  for (let index = 0; index < record.steps.length; index++) {
    const step = record.steps[index];
    assert(Number(step.order) === index + 1, `recipe ${entry.id} steps are not ordered from one`);
    assert(typeof step.instruction?.['en-GB'] === 'string' && step.instruction['en-GB'].trim(), `recipe ${entry.id} step ${index + 1} is missing EN-GB`);
    assert(typeof step.instruction?.['pt-BR'] === 'string' && step.instruction['pt-BR'].trim(), `recipe ${entry.id} step ${index + 1} is missing PT-BR`);
  }
  assert(Array.isArray(record.allergens), `recipe ${entry.id} must explicitly declare allergens, including an empty list`);
  assert(record.adult_assistance && typeof record.adult_assistance['en-GB'] === 'string' && record.adult_assistance['en-GB'].trim(), `recipe ${entry.id} must include EN-GB adult-assistance guidance`);
  assert(typeof record.adult_assistance['pt-BR'] === 'string' && record.adult_assistance['pt-BR'].trim(), `recipe ${entry.id} must include PT-BR adult-assistance guidance`);
  assert(record.nutrition && record.nutrition.per_serving && typeof record.nutrition.per_serving === 'object' && Array.isArray(record.nutrition.sources) && record.nutrition.sources.length > 0, `recipe ${entry.id} must include sourced per-serving nutrition or explicitly sourced unknowns`);
  return record;
}

/**
 * Read one immutable W03 snapshot and package each approved local asset as a
 * data URI. No network lookup, canonical catalogue mutation, or draft fallback
 * is permitted. A08/A09 and other review states are returned independently;
 * this adapter does not mark them passed.
 */
export async function loadInternationalRecipeHandoff({ root, expectedCommit, canonicalIds = [] }) {
  assert(COMMIT.test(expectedCommit || ''), 'an exact immutable W03 commit SHA is required');
  const bytes = await readRepoFile(root, 'content/international/manifest.json', 'manifest');
  let manifest;
  try { manifest = JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw new Error('International recipe handoff rejected: manifest JSON is invalid', { cause: error }); }
  assert(manifest.schema_version === '1.0', 'manifest schema_version must be 1.0');
  assert(manifest.integration_status === 'READY_FOR_INTEGRATION', 'manifest is not READY_FOR_INTEGRATION');
  assert(manifest.source_commit === expectedCommit, 'manifest source_commit does not match the pinned W03 commit');
  assert(COMMIT.test(manifest.source_commit), 'manifest source_commit is not an immutable commit SHA');
  assert(manifest.canonical_existing_recipe_count === 95, 'the immutable canonical base count must remain 95');
  assert(manifest.india_mapping_status === 'VALIDATED', 'existing India recipe mapping is not validated');
  assert(manifest.production_artwork_approved === true, 'owner artwork approval is not recorded');
  assert(Array.isArray(manifest.recipes) && manifest.recipes.length > 0, 'manifest contains no integration recipes');

  const ids = new Set(canonicalIds.map(Number));
  const seen = new Set();
  const recipes = [];
  for (const entry of manifest.recipes) {
    assert(entry && Number.isSafeInteger(entry.id) && entry.id > 95, 'final recipe ID must be an integer above the canonical 1–95 range');
    assert(!ids.has(entry.id) && !seen.has(entry.id), `recipe ID ${entry.id} collides or is duplicated`);
    seen.add(entry.id);
    assert(COUNTRY.test(entry.country || ''), `recipe ${entry.id} country is invalid`);
    assert(entry.status === 'READY_FOR_INTEGRATION', `recipe ${entry.id} is not READY_FOR_INTEGRATION`);
    assert(entry.artwork_ready === true, `recipe ${entry.id} artwork is incomplete`);
    assert(entry.independent_reviews && typeof entry.independent_reviews === 'object', `recipe ${entry.id} must preserve independent review states`);
    assert(entry.independent_reviews.artwork_rights === 'APPROVED', `recipe ${entry.id} artwork-rights review is not approved`);
    for (const gate of ['a08', 'a09', 'nutrition', 'culture', 'duplicate', 'security']) {
      assert(['PENDING', 'APPROVED', 'CHANGES_REQUIRED'].includes(entry.independent_reviews[gate]), `recipe ${entry.id} must explicitly report ${gate} review state`);
    }

    const recipeJsonPath = safePath(entry.recipe_json, `recipe ${entry.id} JSON`);
    const recipeMdPath = safePath(entry.recipe_md, `recipe ${entry.id} markdown`);
    const recordBytes = await readRepoFile(root, recipeJsonPath, `recipe ${entry.id} JSON`);
    await readRepoFile(root, recipeMdPath, `recipe ${entry.id} markdown`);
    let record;
    try { record = JSON.parse(recordBytes.toString('utf8')); }
    catch (error) { throw new Error(`International recipe handoff rejected: recipe ${entry.id} JSON is invalid`, { cause: error }); }
    assertRecipeRecord(record, entry);

    assert(Array.isArray(entry.artwork_assets) && entry.artwork_assets.length > 0, `recipe ${entry.id} has no separately tracked artwork assets`);
    const artworkAssets = [];
    for (const asset of entry.artwork_assets) {
      const assetPath = safePath(asset.path, `recipe ${entry.id} artwork`);
      assert(SHA256.test(asset.sha256 || ''), `recipe ${entry.id} asset ${assetPath} has no SHA-256`);
      const assetBytes = await readRepoFile(root, assetPath, `recipe ${entry.id} artwork`);
      const digest = createHash('sha256').update(assetBytes).digest('hex');
      assert(digest === asset.sha256.toLowerCase(), `recipe ${entry.id} asset hash mismatch for ${assetPath}`);
      const ext = path.posix.extname(assetPath).toLowerCase();
      const mime = ({ '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' })[ext];
      assert(mime, `recipe ${entry.id} asset ${assetPath} has an unsupported image type`);
      const validImage = ext === '.png'
        ? assetBytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && assetBytes.length > 24
        : ext === '.webp'
          ? assetBytes.length > 16 && assetBytes.subarray(0,4).toString('ascii') === 'RIFF' && assetBytes.subarray(8,12).toString('ascii') === 'WEBP'
          : assetBytes.length > 4 && assetBytes[0] === 0xff && assetBytes[1] === 0xd8 && assetBytes.at(-2) === 0xff && assetBytes.at(-1) === 0xd9;
      assert(validImage, `recipe ${entry.id} asset ${assetPath} is not a valid ${mime} file`);
      artworkAssets.push({ path: assetPath, sha256: digest, mime, dataUri: `data:${mime};base64,${assetBytes.toString('base64')}` });
    }

    recipes.push({
      id: entry.id,
      country: entry.country,
      title: record.title,
      record,
      reviewStates: { ...entry.independent_reviews },
      artworkAssets
    });
  }

  return {
    schemaVersion: 1,
    sourceCommit: manifest.source_commit,
    canonicalBaseRecipeCount: 95,
    canonicalIds: [...ids].sort((a, b) => a - b),
    recipes: recipes.sort((a, b) => a.id - b.id),
    countries: [...new Set(recipes.map(recipe => recipe.country))].sort()
  };
}
