import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {validateRecipe,nutritionIsVerified,matchRecipes} from '../domains/cooking/recipe-schema/validate.js';
import {foodArt,stepArt} from '../domains/cooking/recipe-renderer/food-art.js';
import {parseHash} from '../packages/navigation/hash-router.js';

const catalog=JSON.parse(await readFile(new URL('../domains/cooking/recipes/catalog.json',import.meta.url),'utf8'));
const routes=new Set(['home','recipes','detail','cook','done','creations','crew','settings','matcher','artwork']);

test('R0 catalog contains exactly the two approved pilot recipes',()=>{
  assert.deepEqual(catalog.recipes.map(r=>r.id),['rainbow-yogurt-parfait','mini-pizza-toast']);
});
test('both records have complete structural fields and explicit safety metadata',()=>{
  for(const r of catalog.recipes){assert.deepEqual(validateRecipe(r),[]);assert.ok(r.steps.every(s=>s.safety&&s.art));assert.ok(r.allergens.length);assert.ok(r.adultHelp);assert.equal(r.durationStatus.startsWith('ESTIMATE'),true)}
});
test('unreviewed nutrition stays visibly blocked and never reports fabricated values',()=>{
  for(const r of catalog.recipes){assert.equal(nutritionIsVerified(r),false);assert.equal(r.nutrition.verificationStatus.startsWith('BLOCKED'),true);for(const v of Object.values(r.nutrition.perServing))if(typeof v==='number')assert.fail('unverified nutrition value must not be presented as a result')}
});
test('ingredient matcher returns only complete catalog matches',()=>{
  const ids=catalog.recipes[0].ingredients.filter(i=>!i.optional).map(i=>i.id);
  assert.deepEqual(matchRecipes(catalog,ids).map(r=>r.id),['rainbow-yogurt-parfait']);
  assert.deepEqual(matchRecipes(catalog,[]),[]);
  assert.deepEqual(matchRecipes(catalog,['bread','pizza-sauce','mozzarella','bell-pepper','olive']).map(r=>r.id),['mini-pizza-toast']);
});
test('ingredient selection changes the finished-dish illustration',()=>{
  assert.notEqual(foodArt('rainbow-yogurt-parfait',['yogurt']).includes('circle cx="190"'),foodArt('rainbow-yogurt-parfait',['yogurt','strawberries']).includes('circle cx="190"'));
  assert.notEqual(foodArt('mini-pizza-toast',['bread','pizza-sauce']).includes('circle cx="178"'),foodArt('mini-pizza-toast',['bread','pizza-sauce','bell-pepper']).includes('circle cx="178"'));
});
test('each recipe step has a distinct, recipe-matched artwork image',async()=>{
  const root=resolve(new URL('..',import.meta.url).pathname);
  for(const r of catalog.recipes){
    const arts=r.steps.map((_,i)=>stepArt(r.id,i,r.ingredients.map(x=>x.id)));
    assert.equal(arts.length,4);
    assert.ok(arts.every(x=>x.includes('<img')&&x.includes('alt=')));
    const names=arts.map(x=>x.match(/cooking-steps\/([a-z-]+)\.jpg/)?.[1]);
    assert.ok(names.every(Boolean),`${r.id} has a step with no mapped image`);
    assert.equal(new Set(names).size,4,`${r.id} reuses a step image`);
    for(const name of names)await readFile(resolve(root,`packages/assets/cooking-steps/${name}.jpg`));
  }
});
test('shared route parser rejects unknown route names',()=>{
  assert.deepEqual(parseHash('#/cook/mini-pizza-toast',routes),{name:'cook',id:'mini-pizza-toast'});
  assert.deepEqual(parseHash('#/external/123',routes),{name:'home',id:''});
});
test('shared core packages stay independent of the cooking domain',async()=>{
  const files=['packages/ui/base.css','packages/navigation/hash-router.js','packages/content/load-json.js','packages/theme/tokens.css'];
  for(const path of files){const text=await readFile(new URL(`../${path}`,import.meta.url),'utf8');assert.equal(text.includes('domains/cooking'),false,path)}
});
test('standalone preview embeds every supplied reference-pack image',async()=>{
  const root=resolve(new URL('..',import.meta.url).pathname);
  execFileSync(process.execPath,[resolve(root,'tools/build/bundle-preview.mjs')],{stdio:'pipe'});
  const html=await readFile(resolve(root,'dist/Aaria_Phase2_Pilot_Web_Preview.html'),'utf8');
  const manifest=JSON.parse(await readFile(resolve(root,'packages/assets/manifest.json'),'utf8'));
  const referenceAssets=manifest.assets.filter(a=>a.path.startsWith('packages/assets/reference-pack/'));
  for(const asset of referenceAssets){
    const source=await readFile(resolve(root,asset.path));
    const mime=asset.path.toLowerCase().endsWith('.webp')?'image/webp':'image/jpeg';
    const dataUri=`data:${mime};base64,${source.toString('base64')}`;
    assert.ok(html.includes(dataUri),`standalone preview is missing ${asset.id}`);
  }
  for(const asset of manifest.assets.filter(a=>a.id.startsWith('dish.'))){
    const source=await readFile(resolve(root,asset.path));
    const dataUri=`data:image/jpeg;base64,${source.toString('base64')}`;
    assert.ok(html.includes(dataUri),`standalone preview is missing finished-dish photo ${asset.id}`);
  }
  for(const asset of manifest.assets.filter(a=>a.id.startsWith('step.'))){
    const source=await readFile(resolve(root,asset.path));
    const dataUri=`data:image/jpeg;base64,${source.toString('base64')}`;
    assert.ok(html.includes(dataUri),`standalone preview is missing cooking-step artwork ${asset.id}`);
  }
  assert.ok(!html.includes('../../packages/assets/reference-pack/'),'preview still contains unresolved reference-pack paths');
  assert.ok(!html.includes('../../packages/assets/recipe-art/'),'preview still contains unresolved recipe-art paths');
});



test('recipe feature rollout profile preserves quiz, photo, grocery and nutrition gates',async()=>{
  const profile=JSON.parse(await readFile(new URL('../tools/recipe-pipeline/release-profile.json',import.meta.url),'utf8'));
  const bank=JSON.parse(await readFile(new URL('../tools/recipe-pipeline/quiz-bank.json',import.meta.url),'utf8'));
  assert.equal(profile.quizQuestionCountPerRecipe,3);
  for(const [id,questions] of Object.entries(bank.recipes)){assert.equal(questions.length,3,id);for(const q of questions){assert.ok(q.choices[q.answerIndex]);assert.ok(q.explanation)}}
  assert.equal(profile.photoPost.parentConfirmationBeforeExternalShare,true);
  assert.equal(profile.photoPost.automaticUpload,false);
  assert.equal(profile.groceryList.shareAsPrefilledWhatsAppMessage,true);
  assert.equal(profile.groceryList.userConfirmsSendInWhatsApp,true);
  assert.equal(profile.groceryList.parentPhoneNumbersHardCodedOrUploaded,false);
  assert.equal(profile.weeklyPlanner.requiresVerifiedNutrition,true);
  assert.equal(profile.weeklyPlanner.requiresIndependentNutritionReview,true);
  assert.equal(profile.weeklyPlanner.claimCompleteNutritionalCoverageBeforeReview,false);
});
