#!/usr/bin/env node
/**
 * Fail-closed validation for the B01 evidence snapshot. This does not approve or
 * integrate content; it verifies the pinned canonical source and that all
 * independent gates remain closed.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const evidencePath = path.join(root, 'docs/control-tower/evidence/V3_2_B01_SOURCE_EVIDENCE.json');
const draftsPath = path.join(root, 'docs/control-tower/evidence/V3_2_B01_PT_BR_SAFETY_DRAFTS.json');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const drafts = JSON.parse(fs.readFileSync(draftsPath, 'utf8'));
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const gitBlobSha = bytes => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');

const source = fs.readFileSync(path.join(root, 'index.html'));
assert(evidence.schemaVersion === 'aaria-b01-source-evidence/1.0', 'Unexpected evidence schema');
assert(evidence.baseline?.branch === 'feature/v3.2-magical-cookbook', 'Unexpected source branch');
assert(evidence.baseline?.head === '92fd62d180f5a349d1aad76ad437ce5377d9f903', 'Evidence must remain pinned to approved pilot baseline');
assert(evidence.baseline?.canonicalIndexGitBlobSha === gitBlobSha(source), 'Canonical index Git blob differs from evidence baseline');
assert(evidence.baseline?.canonicalIndexSha256 === sha256(source), 'Canonical index SHA-256 differs from evidence baseline');
assert(evidence.baseline?.recipeCountPreserved === 95, '95-recipe preservation invariant missing');
assert(evidence.baseline?.sourceChangedSinceMapping === false, 'Evidence reports canonical source drift');
assert(evidence.records?.length === 10, 'B01 must contain exactly ten records');
assert(drafts.records?.length === 10, 'Safety draft ledger must contain exactly ten records');
assert(drafts.notice?.includes('not approved') && drafts.notice?.includes('not runtime data'), 'Safety draft warning missing');

for (let index = 0; index < 10; index++) {
  const id = index + 1;
  const record = evidence.records[index];
  const draft = drafts.records[index];
  assert(record.recipeId === id && record.batch === 'B01', `Unexpected recipe ordering or batch at ${id}`);
  assert(draft.recipeId === id, `Safety draft ID mismatch at ${id}`);
  assert(record.sourceRefs?.record === `index.html:RECIPES[${id}]`, `Canonical source reference missing for ${id}`);
  assert(record.sourceRefs?.safetyEN === `index.html:RECIPES[${id}].safety`, `Safety source reference missing for ${id}`);
  assert(record.content?.ingredientsEN?.length > 0 && record.content?.ingredientsEN?.length === record.content?.ingredientsPTBR?.length, `Bilingual ingredient coverage mismatch at ${id}`);
  assert(record.content?.stepsEN?.length > 0 && record.content?.stepsEN?.length === record.content?.stepsPTBR?.length, `Bilingual step coverage mismatch at ${id}`);
  assert(record.safety?.enGB === draft.enGBSource && record.safety?.ptBRDraft === draft.ptBRDraft, `Safety draft/source disagreement at ${id}`);
  assert(record.safety?.draftStatus === 'DRAFT_FOR_INDEPENDENT_A08_A09_REVIEW_NOT_RUNTIME', `Safety draft status changed at ${id}`);
  assert(draft.status === 'DRAFT_FOR_INDEPENDENT_A08_A09_REVIEW_NOT_RUNTIME' && draft.runtimeEligible === false, `Safety draft was promoted at ${id}`);
  assert(record.nutritionEvidence?.planPresent === true, `Existing nutrition source plan not inventoried at ${id}`);
  assert(record.nutritionEvidence?.calculatedNutritionPerServing === null, `Unreviewed nutrition value appeared at ${id}`);
  assert(record.nutritionEvidence?.status === 'SOURCE_INPUTS_ONLY_VALUES_NOT_CALCULATED_OR_REVIEWED', `Nutrition review status changed at ${id}`);
  assert(record.allergenEvidence?.canonicalDeclaration === null && record.allergenEvidence?.structuredPerServing === null, `Unsupported allergen declaration appeared at ${id}`);
  assert(record.allergenEvidence?.status === 'NO_SOURCE_BACKED_ALLERGEN_DECLARATION_IN_CANONICAL_RECORD', `Allergen gate changed at ${id}`);
  assert(record.artwork?.originalAssetPath === null && record.artwork?.rightsApproval === 'UNVERIFIED', `Artwork rights gate changed at ${id}`);
  assert(record.artwork?.sourceAssets?.length > 0, `Source artwork reference missing at ${id}`);
  for (const asset of record.artwork.sourceAssets) {
    assert(/^index\.html:(NEW_RECIPE_ART|INLINE_DISH_PHOTOS|HOME_RECIPE_THUMBS|BATCH_ATLASES|HOME_MISSING_RECIPE_INDEX)\[\d+\]$/.test(asset.sourceRef), `Malformed artwork reference at ${id}`);
    assert(/^[0-9a-f]{64}$/.test(asset.decodedImageSha256 || ''), `Artwork source hash missing at ${id}`);
    assert(asset.rightsStatus === 'UNVERIFIED', `Artwork source hash treated as rights approval at ${id}`);
  }
  assert(record.independentGates?.A08 === 'NOT_APPROVED', `A08 gate changed at ${id}`);
  assert(record.independentGates?.A09 === 'NOT_APPROVED', `A09 gate changed at ${id}`);
  assert(record.independentGates?.artworkRights === 'UNVERIFIED', `Artwork gate changed at ${id}`);
  assert(record.independentGates?.signing === 'NOT_REVIEWED', `Signing gate changed at ${id}`);
  assert(record.independentGates?.release === 'BLOCKED', `Release gate changed at ${id}`);
}
console.log(JSON.stringify({status:'PASS',recipes:10,sourceBlob:gitBlobSha(source),sourceSha256:sha256(source),runtimeIntegration:false,independentApprovals:0,releaseGate:'BLOCKED'}, null, 2));
