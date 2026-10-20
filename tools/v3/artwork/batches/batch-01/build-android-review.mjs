#!/usr/bin/env node
// Prepares a debug-only Android WebView review route; never copies draft art into main assets.
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(readFileSync(join(here,'manifest.json'),'utf8'));
if(manifest.approval?.runtime!=='NOT INTEGRATED')throw new Error('Draft artwork has been promoted; review route must fail closed.');
const appRoot=resolve(here,'../../../../../phase2-pilot/apps/aaria-android/app');
const reviewRoot=join(appRoot,'src/debug/assets/artwork-review');
const atlasRoot=join(reviewRoot,'batch-01');
mkdirSync(atlasRoot,{recursive:true});
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=manifest.recipes.map(recipe=>{
  const target=`batch-01/recipe-${recipe.id}.svg`;
  copyFileSync(join(here,recipe.outputPath),join(atlasRoot,`recipe-${recipe.id}.svg`));
  const steps=recipe.panels.map(p=>`<li><strong>Panel ${p.panel}:</strong> ${esc(p.sourceStepText)}${p.adultOnlyCue?' <b>Adult only • Só adulto.</b>':''}</li>`).join('');
  return `<section><h2>Recipe ${recipe.id}: ${esc(recipe.title)}</h2><img src="${target}" alt="Draft six-panel illustrated step atlas for ${esc(recipe.title)}. See the panel source steps below." loading="lazy"><details><summary>Source steps and adult-only cues</summary><ol>${steps}</ol></details></section>`;
}).join('\n');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline';"><title>Draft artwork review — Batch 01</title><style>body{margin:0;background:#fff9f2;color:#342344;font:16px/1.45 system-ui,sans-serif}header{position:sticky;top:0;background:#fff9f2ee;border-bottom:2px solid #dfcbe8;padding:16px;z-index:1}h1{font-size:1.35rem;margin:0 0 6px}header p{margin:0}main{padding:12px;max-width:1000px;margin:auto}section{background:white;border:2px solid #e7d8ef;border-radius:18px;padding:12px;margin:14px 0}section h2{font-size:1.05rem}img{display:block;width:100%;height:auto;border-radius:12px}details{margin-top:12px}li{margin:8px 0}b{color:#8f3434}</style></head><body><header><h1>Draft artwork — independent review only</h1><p>Arte provisória — somente para revisão independente. Not approved for cooking instructions or release. Original source wording is shown below each atlas. Rights, A08 and A09 remain pending.</p></header><main>${sections}</main></body></html>`;
writeFileSync(join(reviewRoot,'index.html'),html);
console.log(JSON.stringify({route:'/artwork-review/index.html',recipes:manifest.recipes.length,atlases:manifest.recipes.length,sourceSet:'src/debug/assets only',status:'draft-only'}));
