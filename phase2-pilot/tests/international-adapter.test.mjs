import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {adaptRecipeForRenderer, authorizeInternationalRecipeImport, prepareInternationalRecipeImport} from '../domains/cooking/recipe-import/international-adapter.js';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceCommit = 'a'.repeat(40);
const locales = en => ({'en-GB':en,'pt-BR':`PT ${en}`});

function makeFixture() {
  const files = {};
  const addAsset = name => {
    const path = `content/international/fixture/${name}.png`;
    const bytes = Buffer.from(`fixture-only:${name}`);
    files[path] = bytes;
    return {path,sha256:sha(bytes),provenance:{source:'test fixture',license:'fixture only',rightsStatus:'TEST FIXTURE — NOT ARTWORK APPROVAL'}};
  };
  const recipe = (id, name) => ({
    id,
    country: 'fixture-country',
    category: 'fixture-only',
    ageRange: 'fixture-only',
    culturalContext: 'Fixture only; no cultural claim',
    estimatedHandsOnMinutes: 0,
    durationStatus: 'FIXTURE ONLY — NOT A RECIPE TIME',
    title: locales(`Fixture ${name}`),
    description: locales('Not production content'),
    servings: 1,
    ingredients: [{id:`${name}-ingredient`,name:locales('Fixture ingredient'),quantity:1,unit:'g',optional:false,allergens:[],image:addAsset(`${name}-ingredient`)}],
    equipment: [{id:`${name}-bowl`,name:locales('Fixture bowl'),role:'child',image:addAsset(`${name}-bowl`)}],
    allergens: [],
    crossContact: locales('Fixture cross-contact note'),
    adultHelp: locales('Fixture adult-assist note'),
    nutrition: {
      perServing:{kcal:null,proteinG:null,carbohydrateG:null,totalFatG:null,saturatedFatG:null,fiberG:null,sugarG:null,sodiumMg:null},
      dataSource:'Fixture only; not a nutrition source',
      calculationMethod:'Fixture only; no values calculated',
      verificationStatus:'PENDING — fixture only'
    },
    artwork:{finishedDish:addAsset(`${name}-dish`)},
    steps:[{id:`${name}-step-1`,order:1,title:locales('Fixture action'),instruction:locales('Fixture instruction'),safety:locales('Fixture safety cue'),adultAssist:locales('Fixture adult cue'),ingredientIds:[`${name}-ingredient`],equipmentIds:[`${name}-bowl`],image:addAsset(`${name}-step-1`)}],
    publicationStatus:'FIXTURE ONLY'
  });
  const recipes = [recipe(9001,'alpha'),recipe(9002,'beta')];
  const entries = recipes.map((value,index) => {
    const recipePath = `content/international/fixture/${index+1}/recipe.json`;
    const markdownPath = `content/international/fixture/${index+1}/recipe.md`;
    const bytes = Buffer.from(JSON.stringify(value));
    const markdown = Buffer.from('# Test fixture only — not recipe content.');
    files[recipePath] = bytes;
    files[markdownPath] = markdown;
    return {id:value.id,status:'READY_FOR_INTEGRATION',artwork_ready:true,recipe_json:recipePath,recipe_json_sha256:sha(bytes),recipe_md:markdownPath,recipe_md_sha256:sha(markdown)};
  });
  const packageFiles = Object.entries(files).map(([path,bytes]) => ({path,sha256:sha(bytes)}));
  const manifest = {schema_version:'1.0',status:'READY_FOR_INTEGRATION',source_commit:sourceCommit,recipes:entries,package_files:packageFiles};
  const manifestPath = 'content/international/fixture/manifest.json';
  files[manifestPath] = Buffer.from(JSON.stringify(manifest));
  const pairSha256 = sha(packageFiles.map(file=>`${file.path}\t${file.sha256}`).sort().join('\n'));
  const handoff = {sourceCommit,manifestPath,manifestSha256:sha(files[manifestPath]),pairSha256};
  return {manifest,recipes,files,handoff};
}

test('adapter validates an immutable bilingual package and maps fields onto Ingredients and Guided Steps renderer slots', () => {
  const fixture = makeFixture();
  const before = JSON.stringify(fixture);
  const prepared = prepareInternationalRecipeImport({...fixture,canonicalIds:Array.from({length:95},(_,i)=>i+1)});
  assert.equal(prepared.recipes.length,2);
  const english = prepared.recipes[0];
  assert.equal(english.title,'Fixture alpha');
  assert.equal(english.ingredients[0].name,'Fixture ingredient');
  assert.equal(english.equipment[0].name,'Fixture bowl');
  assert.equal(english.steps[0].instruction,'Fixture instruction');
  assert.equal(english.steps[0].art,english.steps[0].image.path);
  assert.equal(english.finishedDish,english.artwork.finishedDish.path);
  assert.equal(english.publicationStatus,'INTERNATIONAL REVIEW ONLY — NOT RELEASED');
  assert.equal(JSON.stringify(fixture),before,'validation and mapping do not mutate package files or source objects');
  const portuguese = adaptRecipeForRenderer(fixture.recipes[0],'pt-BR');
  assert.equal(portuguese.title,'PT Fixture alpha');
  assert.equal(portuguese.steps[0].safety,'PT Fixture safety cue');
});

test('adapter refuses integration until explicit artwork screenshot approval matches the immutable handoff', () => {
  const prepared = prepareInternationalRecipeImport({...makeFixture(),canonicalIds:[]});
  assert.throws(()=>authorizeInternationalRecipeImport(prepared,null),/explicit owner APPROVED/);
  const approval = {status:'APPROVED',sourceCommit,recipeId:9001,firstStepArtworkSha256:prepared.recipes[0].steps[0].image.sha256,screenshotSha256:'c'.repeat(64)};
  const imported = authorizeInternationalRecipeImport(prepared,approval);
  assert.deepEqual(imported.map(recipe=>recipe.integrationStatus),['REVIEW_ONLY','REVIEW_ONLY']);
  assert.equal(imported[0].ownerArtworkApproval.screenshotSha256,approval.screenshotSha256);
  assert.throws(()=>authorizeInternationalRecipeImport(prepared,{...approval,sourceCommit:'d'.repeat(40)}),/immutable W03 commit/);
  assert.throws(()=>authorizeInternationalRecipeImport(prepared,{...approval,firstStepArtworkSha256:'b'.repeat(64)}),/must match the approved recipe first-step asset/);
});

test('adapter fails closed on draft packages, canonical ID collisions and artwork hash mismatches', () => {
  const draft = makeFixture();
  assert.throws(()=>prepareInternationalRecipeImport({...draft,manifest:{...draft.manifest,schema_version:'0.1-draft'}}),/non-draft manifest/);
  const collision = makeFixture();
  assert.throws(()=>prepareInternationalRecipeImport({...collision,canonicalIds:[9001]}),/collides with an existing canonical recipe ID/);
  const damaged = makeFixture();
  damaged.files[damaged.recipes[0].steps[0].image.path] = Buffer.from('changed after manifest');
  assert.throws(()=>prepareInternationalRecipeImport(damaged),/SHA-256 mismatch/);
});
