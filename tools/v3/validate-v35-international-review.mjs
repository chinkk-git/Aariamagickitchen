#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(new URL('../..',import.meta.url).pathname);
const route='phase2-pilot/apps/aaria-android/app/src/debug/assets/artwork-review/international-wave-1';
const assetsRoot=join(root,'phase2-pilot/apps/aaria-android/app/src/main/assets/international-wave-1');
const pkg=JSON.parse(readFileSync(join(root,route,'recipes.json'),'utf8'));
const manifest=JSON.parse(readFileSync(join(root,'content/international/manifest.json'),'utf8'));
const errors=[];
const expected=Array.from({length:21},(_,i)=>96+i);
const fail=m=>errors.push(m);
if(pkg.packageVersion!=='3.5-review'||pkg.reviewOnly!==true||pkg.gatesRemainPending!==true)fail('V3.5 package must remain an explicitly review-only build.');
if(JSON.stringify(pkg.recipes.map(r=>Number(r.id)))!==JSON.stringify(expected))fail('Review package must contain each unique international recipe ID #096–116 in order.');
if(new Set(pkg.recipes.map(r=>Number(r.id))).size!==21)fail('International recipe IDs must be unique.');
for(const item of pkg.recipes){
  const id=Number(item.id),draft=id>=111;
  for(const locale of ['en-GB','pt-BR']){
    const r=item.locales?.[locale];
    if(!r?.title||!r.description||!Array.isArray(r.ingredients)||!r.ingredients.length)fail(`#${id} ${locale}: title, description and ingredients are required.`);
    if(!Array.isArray(r.equipmentItems)||!r.equipmentItems.length)fail(`#${id} ${locale}: equipment names and roles are required.`);
    if(!Array.isArray(r.steps)||r.steps.length<4)fail(`#${id} ${locale}: guided steps are required.`);
    for(const [i,step] of (r.steps||[]).entries()){
      if(!step.title||!step.instruction||!step.adultAssist||!step.safety)fail(`#${id} ${locale} step ${i+1}: instruction, adult help and safety cues are required.`);
      if(!step.image?.path||!step.image?.sha256||!step.image?.alt_text?.[locale])fail(`#${id} ${locale} step ${i+1}: artwork path, hash and localized alt text are required.`);
    }
    if(!Array.isArray(r.allergens)||!r.crossContact)fail(`#${id} ${locale}: allergen and cross-contact notes are required.`);
    if(draft&&r.nutrition?.status!=='PENDING_SOURCE_AND_CALCULATION')fail(`#${id}: new-draft nutrition must remain pending.`);
    if(draft&&r.nutrition?.perServing!==null)fail(`#${id}: unsourced draft nutrition values must not be shown.`);
    if(draft&&(!/adult/i.test(r.adultHelp)||!/raw|cru/i.test(r.adultHelp)||!/hot|boiling|quente|fervente/i.test(r.adultHelp)))fail(`#${id} ${locale}: adult handling of raw food and hot hazards must be explicit.`);
    if((r.steps||[]).some(s=>/\b(?:set|cook|bake|fry|air[- ]fry)\s+(?:a\s+)?timer|\b(?:timer|temporizador)\b/i.test(`${s.title} ${s.instruction}`)))fail(`#${id} ${locale}: cooking timers are prohibited in recipe steps.`);
  }
  if(draft&&item.publicationStatus!=='DRAFT_REVIEW_ONLY')fail(`#${id}: new recipe must be marked DRAFT_REVIEW_ONLY.`);
  if(draft&&Object.values(item.reviewGates||{}).some(v=>v!=='PENDING'))fail(`#${id}: new recipe review gates must remain pending.`);
  if(!Array.isArray(item.artworkAssets)||!item.artworkAssets.length)fail(`#${id}: artwork provenance and rights metadata are required.`);
  for(const asset of item.artworkAssets||[]){
    if(!asset.path||!asset.sha256||!asset.provenance||!asset.rights_status)fail(`#${id}: artwork path, SHA-256, provenance and rights status must be mapped.`);
    const p=join(assetsRoot,asset.path);
    if(!existsSync(p)){fail(`#${id}: missing staged artwork ${asset.path}.`);continue;}
    const actual=createHash('sha256').update(readFileSync(p)).digest('hex');
    if(actual!==asset.sha256)fail(`#${id}: staged artwork hash mismatch for ${asset.path}.`);
  }
  if(!manifest.recipes.some(r=>Number(r.proposed_id)===id))fail(`#${id}: overall manifest entry is missing.`);
}
const expansion=[97,98,...Array.from({length:17},(_,i)=>100+i)];
for(const id of expansion){
  const entry=manifest.recipes.find(r=>Number(r.proposed_id)===id);
  if(!entry||entry.app_status!=='INTEGRATED_IN_V3_5_REVIEW_BUILD')fail(`#${id}: manifest does not record V3.5 app integration.`);
  if(entry.independent_reviews!=='PENDING_SEPARATE_GATES'||!/PENDING/.test(entry.artwork_status||''))fail(`#${id}: existing review/right gates were not preserved as pending.`);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: 21 international recipes are mapped for the offline V3.5 template; all ${expansion.length} expansion records retain review gates; six Vietnamese recipes remain drafts; artwork paths and SHA-256 values verify.`);
