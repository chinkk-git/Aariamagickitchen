import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {validateRecipe} from '../../domains/cooking/recipe-schema/validate.js';

const root=resolve(new URL('../..',import.meta.url).pathname);
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1]};
const mode=arg('--mode','pilot');
if(!['pilot','full'].includes(mode))throw new Error('Use --mode pilot or --mode full.');
const read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const [profile,catalog,manifest,featureMatrix,quizBank]=await Promise.all([
  read('tools/recipe-pipeline/release-profile.json'),
  read('domains/cooking/recipes/catalog.json'),
  read('packages/assets/manifest.json'),
  read('tools/recipe-pipeline/feature-matrix.json'),
  read('tools/recipe-pipeline/quiz-bank.json')
]);
const expected=mode==='pilot'?profile.pilotRecipeCount:profile.fullRecipeCount;
const failures=[];
if(!profile.photoPost?.captureOrChooseDishPhoto||!profile.photoPost?.onDeviceComposition||!profile.photoPost?.parentConfirmationBeforeExternalShare||!profile.photoPost?.localSaveAvailable||profile.photoPost?.automaticUpload!==false)failures.push('Photo-post profile must require on-device composition, local save, parent confirmation and no automatic upload.');
for(const target of ['Instagram','Facebook','WhatsApp'])if(!profile.photoPost?.shareTargets?.includes(target))failures.push(`Photo-post profile is missing share target '${target}'.`);
if(!profile.groceryList?.multiRecipeSelection||!profile.groceryList?.aggregateSameIngredient||!profile.groceryList?.sumOnlyCompatibleUnits||!profile.groceryList?.keepOptionalItemsMarked||!profile.groceryList?.shareAsPrefilledWhatsAppMessage||!profile.groceryList?.chooseRecipientInsideWhatsApp||!profile.groceryList?.userConfirmsSendInWhatsApp||profile.groceryList?.parentPhoneNumbersHardCodedOrUploaded!==false)failures.push('Grocery-list profile must aggregate safely and open a prefilled WhatsApp message for recipient selection and user-confirmed sending without hard-coded or uploaded numbers.');
if(!profile.weeklyPlanner?.parentEditable||!profile.weeklyPlanner?.requiresVerifiedNutrition||!profile.weeklyPlanner?.requiresIndependentNutritionReview||!profile.weeklyPlanner?.requiresAllergyReview||!profile.weeklyPlanner?.requiresVarietyChecks||profile.weeklyPlanner?.claimCompleteNutritionalCoverageBeforeReview!==false)failures.push('Weekly planner profile is missing nutrition, allergy, variety or parent-control release gates.');
const ids=new Set();
const titles=new Set();
const assetIds=new Set(manifest.assets.map(a=>a.id));
const groupCounts=Object.fromEntries(profile.allowedArtworkGroups.map(x=>[x,0]));
let stepCount=0,maxWords=0;
let quizQuestionCount=0;
const featureIds=new Set();
for(const feature of featureMatrix.features||[]){
  if(!feature.id||featureIds.has(feature.id))failures.push(`Feature checklist has a missing or duplicate id '${feature.id||''}'.`);
  featureIds.add(feature.id);
  if(!feature.pilotStatus||!feature.scaleCheck)failures.push(`Feature '${feature.id||'unknown'}' needs pilotStatus and scaleCheck.`);
}
if(!featureMatrix.features?.length)failures.push('Feature checklist is empty.');

if(catalog.recipes.length!==expected)failures.push(`${mode} mode expects ${expected} recipes; found ${catalog.recipes.length}.`);
for(const recipe of catalog.recipes){
  if(ids.has(recipe.id))failures.push(`${recipe.id}: duplicate recipe id.`);
  ids.add(recipe.id);
  const normalized=recipe.title?.trim().toLowerCase();
  if(normalized&&titles.has(normalized))failures.push(`${recipe.id}: duplicate recipe title '${recipe.title}'.`);
  if(normalized)titles.add(normalized);
  failures.push(...validateRecipe(recipe).map(e=>`${recipe.id}: ${e}`));
  const questions=quizBank.recipes?.[recipe.id];
  if(!Array.isArray(questions)||questions.length!==profile.quizQuestionCountPerRecipe)failures.push(`${recipe.id}: expected ${profile.quizQuestionCountPerRecipe} quiz questions.`);
  const questionIds=new Set();
  for(const [i,q] of (questions||[]).entries()){
    quizQuestionCount++;
    if(!q.id||questionIds.has(q.id))failures.push(`${recipe.id} quiz ${i+1}: question id is missing or duplicated.`);
    questionIds.add(q.id);
    if(!q.prompt?.trim()||!Array.isArray(q.choices)||q.choices.length<3||q.choices.length>4)failures.push(`${recipe.id} quiz ${i+1}: prompt and 3–4 choices are required.`);
    if(!Number.isInteger(q.answerIndex)||q.answerIndex<0||q.answerIndex>=(q.choices?.length||0))failures.push(`${recipe.id} quiz ${i+1}: answerIndex must point to one choice.`);
    if(!q.explanation?.trim())failures.push(`${recipe.id} quiz ${i+1}: add a short explanation for feedback.`);
  }
  if(!Array.isArray(recipe.artworkIds)||recipe.artworkIds.length<recipe.steps.length+1)failures.push(`${recipe.id}: artworkIds must include a hero and every step.`);
  for(const id of recipe.artworkIds||[])if(!assetIds.has(id))failures.push(`${recipe.id}: artwork asset '${id}' is missing from the manifest.`);
  if(mode==='full'){
    if(!profile.allowedArtworkGroups.includes(recipe.artworkGroup))failures.push(`${recipe.id}: artworkGroup must be one of ${profile.allowedArtworkGroups.join(', ')}.`);
    else groupCounts[recipe.artworkGroup]++;
  }
  for(const [i,step] of recipe.steps.entries()){
    stepCount++;
    const words=(step.instruction||'').trim().split(/\s+/).filter(Boolean).length;
    maxWords=Math.max(maxWords,words);
    if(words>profile.maxInstructionWords)failures.push(`${recipe.id} step ${i+1}: ${words} instruction words exceeds ${profile.maxInstructionWords}.`);
    if(!step.safety)failures.push(`${recipe.id} step ${i+1}: safety note is missing.`);
    if(!step.art)failures.push(`${recipe.id} step ${i+1}: art key is missing.`);
  }
}
if(mode==='full')for(const [group,count] of Object.entries(profile.artworkGroups))if(groupCounts[group]!==count)failures.push(`Artwork group '${group}' must have ${count} recipes; found ${groupCounts[group]}.`);

const unknownQuizRecipes=Object.keys(quizBank.recipes||{}).filter(id=>!catalog.recipes.some(r=>r.id===id));
for(const id of unknownQuizRecipes)failures.push(`Quiz bank contains unknown recipe '${id}'.`);
const report={mode,expectedRecipes:expected,actualRecipes:catalog.recipes.length,steps:stepCount,quizQuestions:quizQuestionCount,maxInstructionWords:maxWords,artworkGroups:mode==='full'?groupCounts:null,features:featureIds.size,failures};
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/recipe-pipeline-audit.json'),JSON.stringify(report,null,2)+'\n');
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${mode} catalog has ${report.actualRecipes} recipes, ${stepCount} steps and ${quizQuestionCount} quiz questions; max instruction length ${maxWords} words.`);
