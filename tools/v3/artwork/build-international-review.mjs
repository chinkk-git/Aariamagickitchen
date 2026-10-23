#!/usr/bin/env node
// Builds the pinned Wave 1 package into an isolated Android debug review route.
// This never writes to the production recipe renderer or canonical catalogue.
import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = resolve(new URL('../../..', import.meta.url).pathname);
const lockPath = join(root, 'phase2-pilot/domains/cooking/recipe-import/wave1-source-lock.json');
const sourceLock = JSON.parse(readFileSync(lockPath, 'utf8'));
const sourceFiles = Object.fromEntries(sourceLock.package_files.map(item => [item.path, readFileSync(join(root, item.path))]));
sourceFiles[sourceLock.source_manifest_path] = readFileSync(join(root, sourceLock.source_manifest_path));
sourceFiles[sourceLock.source_style_guide_path] = readFileSync(join(root, sourceLock.source_style_guide_path));
const {preparePinnedW03WaveOne} = await import(pathToFileURL(join(root, 'phase2-pilot/domains/cooking/recipe-import/international-adapter.js')));
const prepared = preparePinnedW03WaveOne({sourceLock, files: sourceFiles});
const route = join(root, 'phase2-pilot/apps/aaria-android/app/src/debug/assets/artwork-review/international-wave-1');
mkdirSync(route, {recursive: true});
for (const item of sourceLock.package_files) {
  const destination = join(route, item.path);
  mkdirSync(resolve(destination, '..'), {recursive: true});
  copyFileSync(join(root, item.path), destination);
}
const recipes = prepared.recipes.map(recipe => ({id:recipe.id,country:recipe.country,title:recipe.title,locales:recipe.locales,artworkAssetPaths:recipe.artworkAssetPaths}));
writeFileSync(join(route, 'recipes.json'), JSON.stringify({sourceCommit:prepared.sourceCommit,sourceManifestSha256:prepared.sourceManifestSha256,pairSha256:prepared.pairSha256,recipes}, null, 2)+'\n');
const template = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'">
<title>Wave 1 Recipe Template Review</title><style>
:root{font:16px/1.45 system-ui,sans-serif;color:#26342b;background:#f6f4ed}*{box-sizing:border-box}body{margin:0}.top{background:#254d3b;color:#fff;padding:16px max(16px,calc((100vw - 1100px)/2))}.top h1{font-size:1.35rem;margin:0}.top p{margin:.35rem 0 0;font-size:.85rem}.controls,.page{max-width:1100px;margin:auto;padding:16px}.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.controls button,select,.stepnav button{font:inherit;padding:10px 14px;border:1px solid #8e9c91;border-radius:10px;background:#fff;color:#26342b}.controls button[aria-pressed=true]{background:#d7e8d9;border-color:#254d3b}.card{background:white;border:1px solid #d8ddd5;border-radius:18px;padding:clamp(14px,3vw,28px);box-shadow:0 3px 14px #1d33200d}.hero{display:grid;grid-template-columns:minmax(180px, .8fr) 1.2fr;gap:24px;align-items:center}.hero img{width:100%;max-height:340px;object-fit:contain;border-radius:14px}.tag{color:#526c58;font-weight:700}.columns{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.items{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:10px}.item{border:1px solid #e1e4dd;border-radius:12px;padding:10px}.item img{width:100%;height:92px;object-fit:contain}.item small{display:block;color:#536157}.step{margin-top:18px}.step img{width:min(100%,440px);max-height:320px;object-fit:contain;display:block;margin:12px auto}.notice{background:#fff4d6;border-left:5px solid #bc8120;padding:12px;margin-top:12px}.stepnav{display:flex;justify-content:space-between;gap:12px;margin-top:16px}.stepnav button:disabled{opacity:.45}.pending{font-size:.9rem;color:#705515}.done{background:#e1f0e3}.hidden{display:none!important}@media(max-width:650px){.hero,.columns{grid-template-columns:1fr}.hero img{max-height:240px}.controls{padding-top:12px}}
</style></head><body><header class="top"><h1>International recipes · template review</h1><p>Debug-only, offline evidence route · source ${prepared.sourceCommit.slice(0,12)} · review only · not released</p></header>
<nav class="controls" aria-label="Recipe and language"><button id="r96" aria-pressed="true">Italy · #096</button><button id="r99" aria-pressed="false">China · #099</button><label>Language <select id="locale"><option value="en-GB">English (UK)</option><option value="pt-BR">Português (Brasil)</option></select></label></nav>
<main id="app" class="page" aria-live="polite"></main>
<script>
const packageData=${JSON.stringify(recipes)};let recipeIndex=0,locale='en-GB',stepIndex=0,completed=false;
const app=document.querySelector('#app'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=x=>typeof x==='object'&&x?x[locale]:x;const image=x=>esc(x?.path||x||'');
const ui=()=>locale==='pt-BR'?{ingredients:'Ingredientes',equipment:'Você vai precisar',steps:'Passos guiados',previous:'Etapa anterior',next:'Próxima etapa',complete:'Concluir receita',safety:'Segurança',adult:'Ajuda de adulto'}:{ingredients:'Ingredients',equipment:'You’ll need',steps:'Guided Steps',previous:'Previous step',next:'Next step',complete:'Complete recipe',safety:'Safety',adult:'Adult assistance'};
function render(){const r=packageData[recipeIndex].locales[locale],steps=r.steps||[],step=steps[stepIndex],ingredients=r.ingredients||[],equipment=r.equipmentItems||[];
app.innerHTML='<article class="card"><div class="hero"><img data-role="finished" src="'+image(r.finishedDish)+'" alt="'+esc(t(r.title))+' finished dish"><div><p class="tag">'+esc(r.country)+' · Recipe #'+String(r.id).padStart(3,'0')+'</p><h2>'+esc(t(r.title))+'</h2><p>'+esc(t(r.description))+'</p><p>'+esc(r.servings)+' servings · '+esc(r.estimatedHandsOnMinutes)+' min hands-on</p><p class="pending">Nutritional values are estimates and remain pending independent review.</p><p>Allergens: '+esc((r.allergens||[]).join(', ')||'None listed')+'</p><p>'+esc(t(r.crossContact))+'</p><p>'+esc(t(r.adultHelp))+'</p></div></div><div class="columns"><section><h3>'+ui().ingredients+'</h3><div class="items">'+ingredients.map(i=>'<div class="item"><img src="'+image(i.image)+'" alt=""><strong>'+esc(t(i.name))+'</strong><small>'+esc(i.quantity)+' '+esc(i.unit)+'</small></div>').join('')+'</div></section><section><h3>'+ui().equipment+'</h3><div class="items">'+equipment.map(i=>'<div class="item"><img src="'+image(i.image)+'" alt=""><strong>'+esc(t(i.name))+'</strong><small>'+esc(i.roleDescription||i.role)+'</small></div>').join('')+'</div></section></div><section class="step"><h3>'+ui().steps+' · '+(stepIndex+1)+' of '+steps.length+'</h3><h4>'+esc(t(step.title))+'</h4><p>'+esc(t(step.instruction))+'</p><img data-role="step" src="'+image(step.image)+'" alt="'+esc(t(step.title))+'"><div class="notice"><strong>'+ui().safety+':</strong> '+esc(t(step.safety))+'<br><strong>'+ui().adult+':</strong> '+esc(t(step.adultAssist))+'</div><div class="stepnav"><button id="prev" '+(stepIndex===0?'disabled':'')+'>'+ui().previous+'</button><button id="next">'+(stepIndex===steps.length-1?ui().complete:ui().next)+'</button></div><p id="complete" class="'+(completed?'done':'hidden')+'">'+(locale==='pt-BR'?'Receita concluída':'Recipe complete')+'</p></section></article>';
document.querySelector('#prev').onclick=()=>{stepIndex=Math.max(0,stepIndex-1);render()};document.querySelector('#next').onclick=()=>{if(stepIndex<steps.length-1)stepIndex++;else completed=true;render()};}
document.querySelector('#r96').onclick=()=>select(0);document.querySelector('#r99').onclick=()=>select(1);function select(i){recipeIndex=i;stepIndex=0;completed=false;document.querySelector('#r96').setAttribute('aria-pressed',String(i===0));document.querySelector('#r99').setAttribute('aria-pressed',String(i===1));render()}
document.querySelector('#locale').onchange=e=>{locale=e.target.value;render()};render();
</script></body></html>`;
writeFileSync(join(route, 'index.html'), template);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const images = sourceLock.package_files.filter(item => item.path.endsWith('.png'));
if(images.length!==42||images.some(item=>hash(readFileSync(join(route,item.path)))!==item.sha256)) throw new Error('Debug route did not stage all 42 pinned artwork files byte-for-byte');
console.log(JSON.stringify({route:'artwork-review/international-wave-1/index.html',sourceCommit:prepared.sourceCommit,recipeIds:prepared.recipes.map(x=>x.id),packagePairSha256:prepared.pairSha256,artworkFiles:images.length,offline:true,productionCatalogChanged:false}));
