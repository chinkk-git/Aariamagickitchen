#!/usr/bin/env node
// W01 read-only artwork readiness gate: does not promote unapproved assets.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import assert from 'node:assert/strict';
const here=dirname(fileURLToPath(import.meta.url));
const csv=readFileSync(join(here,'remaining-artwork-completion-matrix.csv'),'utf8').trim().split(/\r?\n/);
const columns=csv.shift().split(',');
const rows=csv.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[columns[i],v])));
const ledger=JSON.parse(readFileSync(join(here,'panel-change-ledger.json'),'utf8'));
const manifest=JSON.parse(readFileSync(join(here,'pilot-manifest.json'),'utf8'));
const batchRoot=join(here,'..','batches','batch-01');
const batch=JSON.parse(readFileSync(join(batchRoot,'manifest.json'),'utf8'));
const batchSource=JSON.parse(readFileSync(join(batchRoot,'source-manifest.json'),'utf8'));
const batch02Root=join(here,'..','batches','batch-02');
const batch02=JSON.parse(readFileSync(join(batch02Root,'manifest.json'),'utf8'));
const batch02Source=JSON.parse(readFileSync(join(batch02Root,'source-manifest.json'),'utf8'));
const batch03Root=join(here,'..','batches','batch-03');
const batch03=JSON.parse(readFileSync(join(batch03Root,'manifest.json'),'utf8'));
const batch03Source=JSON.parse(readFileSync(join(batch03Root,'source-manifest.json'),'utf8'));
const batch04Root=join(here,'..','batches','batch-04');
const batch04=JSON.parse(readFileSync(join(batch04Root,'manifest.json'),'utf8'));
const batch04Source=JSON.parse(readFileSync(join(batch04Root,'source-manifest.json'),'utf8'));
const batch05Root=join(here,'..','batches','batch-05');
const batch05=JSON.parse(readFileSync(join(batch05Root,'manifest.json'),'utf8'));
const batch05Source=JSON.parse(readFileSync(join(batch05Root,'source-manifest.json'),'utf8'));
assert.equal(batchSource.sourceArchiveSha256,'30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab');
assert.equal(batchSource.rightsStatus,'UNRESOLVED; source authorship/rights not established by archive or file checksums.');
assert.deepEqual(batchSource.recipes.map(r=>r.id),Array.from({length:10},(_,i)=>i+11));
assert.equal(batch.status,'draft-only; excluded from production runtime; independent review required');
assert.equal(batch.approval.A08,'PENDING independent review');
assert.equal(batch.approval.A09,'PENDING independent review');
assert.equal(batch.approval.artworkRights,'UNRESOLVED; source authorship/rights not established by checksums');
assert.equal(batch.approval.runtime,'NOT INTEGRATED');
assert.equal(batch.androidDebugReview.route,'/artwork-review/index.html');
assert.equal(batch.androidDebugReview.sourceSet,'src/debug/assets only');
assert.equal(batch.androidDebugReview.purpose,'Offline reviewer preview only; not the production cooking route.');
assert.deepEqual(batch.recipes.map(r=>r.id),Array.from({length:10},(_,i)=>i+11));
assert.equal(batch.recipes.reduce((n,r)=>n+r.panels.length,0),60);
assert.equal(batch02Source.sourceArchiveSha256,batchSource.sourceArchiveSha256);
assert.equal(batch02Source.rightsStatus,'UNRESOLVED; provenance/hash do not establish a license or owner');
const batch02Ids=[21,22,23,24,25,26,28,29,30,31];
assert.deepEqual(batch02Source.recipes.map(r=>r.id),batch02Ids);
assert.equal(batch02.status,'draft-only; excluded from production runtime; independent review required');
assert.equal(batch02.approval.A08,'PENDING independent review');
assert.equal(batch02.approval.A09,'PENDING independent review');
assert.equal(batch02.approval.artworkRights,'UNRESOLVED; source authorship/rights not established by checksums');
assert.equal(batch02.approval.runtime,'NOT INTEGRATED');
assert.deepEqual(batch02.recipes.map(r=>r.id),batch02Ids);
assert.equal(batch02.recipes.reduce((n,r)=>n+r.panels.length,0),60);
const batch03Ids=[32,33,34,35,36,37,38,41,42,43];
assert.equal(batch03Source.sourceArchiveSha256,batchSource.sourceArchiveSha256);
assert.equal(batch03Source.rightsStatus,'UNRESOLVED; provenance/hash do not establish a license or owner');
assert.deepEqual(batch03Source.recipes.map(r=>r.id),batch03Ids);
assert.equal(batch03.status,'draft-only; excluded from production runtime; independent review required');
assert.equal(batch03.approval.A08,'PENDING independent review');
assert.equal(batch03.approval.A09,'PENDING independent review');
assert.equal(batch03.approval.artworkRights,'UNRESOLVED; source authorship/rights not established by checksums');
assert.equal(batch03.approval.runtime,'NOT INTEGRATED');
assert.deepEqual(batch03.recipes.map(r=>r.id),batch03Ids);
assert.equal(batch03.recipes.reduce((n,r)=>n+r.panels.length,0),60);
const batch04Ids=[44,45,46,47,48,49,50,52,53,54];
const batch05Ids=[55,56,57,58,59,60,61,62,64,65];
for(const [sourceIndex,manifest,ids] of [[batch04Source,batch04,batch04Ids],[batch05Source,batch05,batch05Ids]]){
 assert.equal(sourceIndex.sourceArchiveSha256,batchSource.sourceArchiveSha256);
 assert.equal(sourceIndex.rightsStatus,'UNRESOLVED; provenance/hash do not establish a license or owner');
 assert.deepEqual(sourceIndex.recipes.map(r=>r.id),ids);
 assert.equal(manifest.status,'draft-only; excluded from production runtime; independent review required');
 assert.equal(manifest.approval.A08,'PENDING independent review');
 assert.equal(manifest.approval.A09,'PENDING independent review');
 assert.equal(manifest.approval.artworkRights,'UNRESOLVED; source authorship/rights not established by checksums');
 assert.equal(manifest.approval.runtime,'NOT INTEGRATED');
 assert.deepEqual(manifest.recipes.map(r=>r.id),ids);
 assert.equal(manifest.recipes.reduce((n,r)=>n+r.panels.length,0),60);
}
const {createHash}=await import('node:crypto');
for(const [name,root,manifest,sourceIndex] of [['01',batchRoot,batch,batchSource],['02',batch02Root,batch02,batch02Source],['03',batch03Root,batch03,batch03Source],['04',batch04Root,batch04,batch04Source],['05',batch05Root,batch05,batch05Source]]){
 for(const recipe of manifest.recipes){
  const svg=readFileSync(join(root,recipe.outputPath),'utf8');
  const source=sourceIndex.recipes.find(r=>r.id===recipe.id);
  const sourceSvg=readFileSync(join(root,'source',source.sourceFile),'utf8');
  assert.equal(createHash('sha256').update(sourceSvg).digest('hex'),source.sourceSha256,'Batch source mismatch for recipe '+recipe.id);
  assert.equal(source.sourceSha256,recipe.sourceSha256,'Source/output mapping mismatch for recipe '+recipe.id);
  assert.equal(createHash('sha256').update(svg).digest('hex'),recipe.outputSha256,'Batch '+name+' provenance mismatch for recipe '+recipe.id);
  assert.equal((svg.match(/class="w01-adult-only-cue"/g)||[]).length,recipe.panels.filter(p=>p.adultOnlyCue).length,'Adult-only cue count mismatch for recipe '+recipe.id);
  const panelGroups=(svg.match(new RegExp(`role="group" aria-labelledby="w01-b${name}-r`,'g'))||[]).length;
  if(panelGroups===6)assert.equal(panelGroups,6,'Accessible panel grouping missing for recipe '+recipe.id);
  else{assert.equal(panelGroups,0,'Partial accessible panel grouping for recipe '+recipe.id);for(let n=1;n<=6;n++)assert.ok(svg.includes(`Panel ${n}:`),'Root description missing source panel '+n+' for recipe '+recipe.id);}
  assert.ok(svg.includes('draft-only-not-approved'));
  assert.ok(!/<script\b|(?:href|xlink:href)\s*=\s*['"]https?:\/\//i.test(svg),'Executable or remote content in batch '+name+' draft '+recipe.id);
 }
}
assert.equal(manifest.status,'draft-only-not-approved-not-integrated');
assert.match(manifest.archiveSha256,/^[a-f0-9]{64}$/);
for(const [id,entry] of Object.entries(manifest.recipes)){
 assert.equal(Number(id),entry.recipeId);
 const svg=readFileSync(join(here,entry.revisedFile),'utf8');
 const {createHash}=await import('node:crypto');
 assert.equal(createHash('sha256').update(svg).digest('hex'),entry.revisedSha256,'Provenance mismatch for recipe '+id);
 for(let n=1;n<=6;n++)assert.ok(svg.includes('recipe-'+id+'-panel-'+n),'Missing accessible panel '+n+' in recipe '+id);
 assert.ok(!/<script\b|(?:href|xlink:href)\s*=\s*['\"]https?:\/\//i.test(svg),'Executable script or remote asset reference in draft SVG '+id);
}

assert.equal(rows.length,55,'55 source atlases (11–65) required');
assert.deepEqual(rows.map(r=>Number(r.recipe_id)),Array.from({length:55},(_,i)=>i+11));
const pilotIds=[27,39,40,51,63];
for(const id of pilotIds){
 const row=rows.find(r=>Number(r.recipe_id)===id);
 assert.equal(Number(row.drafted_panels),6,'Pilot requires six draft panels: '+id);
 assert.equal(ledger.filter(e=>Number(e.recipeId)===id).length,6,'Ledger requires six entries: '+id);
 for(const entry of ledger.filter(e=>Number(e.recipeId)===id)){
  assert.match(entry.beforeSvgSha256,/^[a-f0-9]{64}$/);
  assert.match(entry.afterSvgSha256,/^[a-f0-9]{64}$/);
  assert.equal(entry.W07_A08,'PENDING');
  assert.equal(entry.W08_A09,'PENDING');
 }
}
assert.equal(ledger.length,30,'Only 30 draft pilot panel decisions exist');
const drafted=rows.reduce((sum,row)=>sum+Number(row.drafted_panels),0);
const formal=rows.filter(row=>row.formal_A08_approval==='APPROVED'&&row.formal_A09_approval==='APPROVED');
const integrated=rows.filter(row=>row.runtime_integration==='INTEGRATED');
const incomplete=rows.filter(row=>Number(row.drafted_panels)<6);
const summary={originalRecipes:95,sourceAtlases:rows.length,sourcePanels:330,draftPilotRecipes:pilotIds,draftBatch01Recipes:batch.recipes.map(r=>r.id),draftBatch02Recipes:batch02.recipes.map(r=>r.id),draftBatch03Recipes:batch03.recipes.map(r=>r.id),draftBatch04Recipes:batch04.recipes.map(r=>r.id),draftBatch05Recipes:batch05.recipes.map(r=>r.id),draftPanels:drafted,notDraftedPanels:330-drafted,formalApprovedAtlases:formal.length,runtimeIntegratedAtlases:integrated.length,notFullyDraftedAtlases:incomplete.length,independentApprovalRequired:true};
console.log(JSON.stringify(summary,null,2));
if(formal.length!==integrated.length || integrated.some(row=>!formal.includes(row)))throw Error('Unapproved artwork integrated into runtime');
