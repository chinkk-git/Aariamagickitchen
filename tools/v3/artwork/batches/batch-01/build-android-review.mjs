#!/usr/bin/env node
// Prepares a debug-only Android WebView review route; never copies draft art into main assets.
import { readFileSync, mkdirSync, copyFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here=dirname(fileURLToPath(import.meta.url));
const batchRoot=resolve(here,'..');
const batches=['batch-01','batch-02','batch-03','batch-04','batch-05'].map(name=>({name,root:join(batchRoot,name),manifest:JSON.parse(readFileSync(join(batchRoot,name,'manifest.json'),'utf8'))}));
for(const batch of batches)if(batch.manifest.approval?.runtime!=='NOT INTEGRATED')throw new Error(`${batch.name} draft artwork has been promoted; review route must fail closed.`);
const appRoot=resolve(here,'../../../../../phase2-pilot/apps/aaria-android/app');
const reviewRoot=join(appRoot,'src/debug/assets/artwork-review');
for(const batch of batches)mkdirSync(join(reviewRoot,batch.name),{recursive:true});
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=batches.flatMap(batch=>batch.manifest.recipes.map(recipe=>{
  const target=`${batch.name}/recipe-${recipe.id}.svg`;
  copyFileSync(join(batch.root,recipe.outputPath),join(reviewRoot,target));
  const steps=recipe.panels.map(p=>`<li><strong>Panel ${p.panel}:</strong> ${esc(p.sourceStepText)}${p.adultOnlyCue?' <b>Adult only • Só adulto.</b>':''}</li>`).join('');
  return `<section><h2>Recipe ${recipe.id}: ${esc(recipe.title)}</h2><img src="${target}" alt="Draft six-panel illustrated step atlas for ${esc(recipe.title)}. See the panel source steps below."><details><summary>Source steps and adult-only cues</summary><ol>${steps}</ol></details></section>`;
})).join('\n');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline';"><title>Draft artwork review — Batches 01–05</title><style>body{margin:0;background:#fff9f2;color:#342344;font:16px/1.45 system-ui,sans-serif}header{position:sticky;top:0;background:#fff9f2ee;border-bottom:2px solid #dfcbe8;padding:16px;z-index:1}h1{font-size:1.35rem;margin:0 0 6px}header p{margin:0}main{padding:12px;max-width:1000px;margin:auto}section{background:white;border:2px solid #e7d8ef;border-radius:18px;padding:12px;margin:14px 0}section h2{font-size:1.05rem}img{display:block;width:100%;height:auto;border-radius:12px}details{margin-top:12px}li{margin:8px 0}b{color:#8f3434}</style></head><body><header><h1>Draft artwork — independent review only</h1><p>Arte provisória — somente para revisão independente. Not approved for cooking instructions or release. Original source wording is shown below each atlas. Rights, A08 and A09 remain pending.</p></header><main>${sections}</main></body></html>`;
writeFileSync(join(reviewRoot,'index.html'),html);

const exactRoot=resolve(here,'..','..','exact-batches');
const exactBatchNames=existsSync(exactRoot)?readdirSync(exactRoot).filter(name=>/^B(?:0[1-9]|10)$/.test(name)).sort():[];
const exactRoutes=[];
for(const name of exactBatchNames){
  const root=join(exactRoot,name),manifest=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));
  if(manifest.batch!==name||manifest.recipeIds.length!==5||manifest.recipes.length!==5||manifest.recipes.some(r=>r.panels.length!==6))throw new Error(`${name} does not satisfy the exact five-atlas/six-panel manifest`);
  if(manifest.state?.INTEGRATED!=='DEBUG_REVIEW_ONLY'||manifest.productionRuntime!=='NOT_INTEGRATED')throw new Error(`${name} is not safely isolated from production`);
  const destination=join(reviewRoot,'exact',name),atlasDir=join(destination,'atlases'),previewDir=join(destination,'previews'),characterDir=join(destination,'characters');
  mkdirSync(atlasDir,{recursive:true});mkdirSync(previewDir,{recursive:true});
  mkdirSync(characterDir,{recursive:true});
  for(const character of Object.values(manifest.characters||{})){
    const src=join(root,character.packagePath),bytes=readFileSync(src);
    if(createHash('sha256').update(bytes).digest('hex')!==character.sha256)throw new Error(`${name} character asset hash mismatch: ${character.packagePath}`);
    copyFileSync(src,join(destination,character.packagePath));
  }
  copyFileSync(join(root,'contact-sheet.png'),join(destination,'contact-sheet.png'));
  for(const recipe of manifest.recipes){
    const atlasName=`recipe-${recipe.id}.svg`;
    const atlasPath=recipe.remediationAtlas?.path||recipe.draftAtlas;
    copyFileSync(join(root,atlasPath),join(atlasDir,atlasName));
    for(const panel of recipe.panels){
      const name=panel.previewPng.split('/').at(-1);
      copyFileSync(join(root,panel.previewPng),join(previewDir,name));
    }
  }
  const sections=manifest.recipes.map(recipe=>{
    const src=`atlases/recipe-${recipe.id}.svg`;
    const previews=recipe.panels.map(panel=>{
      const file=panel.previewPng.split('/').at(-1);
      const cue=panel.adultCue==='ADULT ONLY'?'ADULT ONLY • SÓ ADULTO':panel.adultCue==='ADULT HELP'?'ADULT HELP • AJUDA DE ADULTO':'';
      return `<figure><img data-panel-preview="${recipe.id}-${panel.panel}" src="previews/${file}" alt="Step ${panel.panel}, recipe ${recipe.id}: ${esc(panel.instructionEn)} / ${esc(panel.instructionPtBr)}"><figcaption><strong>Recipe ${recipe.id} · Step ${panel.panel}</strong>${cue?`<span class="adult-cue">${cue}</span>`:''}<span lang="en-GB">${esc(panel.instructionEn)}</span><span lang="pt-BR">${esc(panel.instructionPtBr)}</span></figcaption></figure>`;
    }).join('');
    return `<section><h2>Recipe ${recipe.id}: ${esc(recipe.title)}</h2><img data-atlas="${recipe.id}" src="${src}" alt="Draft six-panel atlas for recipe ${recipe.id}"><details><summary>Individual panel previews and source steps</summary><div class="panels">${previews}</div></details></section>`;
  }).join('\n');
  const exactHtml=`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; connect-src 'self'"><title>${name} draft art review</title><style>body{margin:0;background:#fff9f2;color:#342344;font:16px/1.45 system-ui,sans-serif}header{position:sticky;top:0;z-index:1;background:#fff9f2ee;border-bottom:2px solid #dfcbe8;padding:14px}h1{font-size:1.25rem;margin:0}header p{margin:5px 0 0}main{max-width:1100px;margin:auto;padding:12px}section{background:#fff;border:2px solid #e7d8ef;border-radius:18px;padding:12px;margin:14px 0}section h2{font-size:1.05rem}img{display:block;width:100%;height:auto;border-radius:12px}figure{margin:6px;background:#fff;border:1px solid #ddd;border-radius:10px;padding:6px}figcaption{display:grid;gap:4px;font-size:.82rem}.adult-cue{color:#8f3434;font-weight:800}.panels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}@media(min-width:800px){.panels{grid-template-columns:repeat(3,minmax(0,1fr))}}</style></head><body><header><h1>${name} — draft artwork review</h1><p>Independent review only. Not approved for cooking instructions or release. Rights, A08 and A09 remain pending.</p></header><main><section><h2>Contact sheet — ${manifest.recipeIds.join(', ')}</h2><img data-contact-sheet="true" src="contact-sheet.png" alt="Contact sheet showing all 30 draft panels in ${name}"></section>${sections}</main></body></html>`;
  writeFileSync(join(destination,'index.html'),exactHtml);
  exactRoutes.push({batch:name,recipeIds:manifest.recipeIds,atlases:manifest.recipes.length,panels:manifest.recipes.reduce((n,r)=>n+r.panels.length,0),route:`/artwork-review/exact/${name}/index.html`});
}
console.log(JSON.stringify({route:'/artwork-review/index.html',recipes:batches.reduce((n,b)=>n+b.manifest.recipes.length,0),atlases:batches.reduce((n,b)=>n+b.manifest.recipes.length,0),batches:batches.map(b=>b.name),exactRoutes,sourceSet:'src/debug/assets only',status:'draft-only'}));
