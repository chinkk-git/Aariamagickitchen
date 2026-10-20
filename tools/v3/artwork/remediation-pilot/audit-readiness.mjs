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
assert.equal(manifest.status,'draft-only-not-approved-not-integrated');
assert.match(manifest.archiveSha256,/^[a-f0-9]{64}$/);
for(const [id,entry] of Object.entries(manifest.recipes)){
 assert.equal(Number(id),entry.recipeId);
 const svg=readFileSync(join(here,entry.revisedFile),'utf8');
 const {createHash}=await import('node:crypto');
 assert.equal(createHash('sha256').update(svg).digest('hex'),entry.revisedSha256,'Provenance mismatch for recipe '+id);
 for(let n=1;n<=6;n++)assert.ok(svg.includes('recipe-'+id+'-panel-'+n),'Missing accessible panel '+n+' in recipe '+id);
 assert.ok(!/<script\\b|https?:\\/\\//i.test(svg),'External script or remote content in draft SVG '+id);
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
const summary={originalRecipes:95,sourceAtlases:rows.length,sourcePanels:330,draftPilotRecipes:pilotIds,draftPanels:drafted,notDraftedPanels:330-drafted,formalApprovedAtlases:formal.length,runtimeIntegratedAtlases:integrated.length,notFullyDraftedAtlases:incomplete.length,independentApprovalRequired:true};
console.log(JSON.stringify(summary,null,2));
if(formal.length!==integrated.length || integrated.some(row=>!formal.includes(row)))throw Error('Unapproved artwork integrated into runtime');
