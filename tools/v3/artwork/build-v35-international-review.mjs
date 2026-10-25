#!/usr/bin/env node
// Adds the V3.5 international review recipes to the existing, offline review
// package. The records stay review-only; this script does not approve any gate.
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=resolve(new URL('../../..',import.meta.url).pathname);
const recipeRoot=join(root,'content/international/countries');
const reviewRoot=join(root,'phase2-pilot/apps/aaria-android/app/src/debug/assets/artwork-review/international-wave-1');
const appRoot=join(root,'phase2-pilot/apps/aaria-android/app/src/main/assets/international-wave-1');
const hash=b=>createHash('sha256').update(b).digest('hex');

const packagePath=join(reviewRoot,'recipes.json');
const ids=Array.from({length:21},(_,i)=>96+i);
const records=[];
const copyAsset=(relative,expected)=>{
  const src=join(root,relative),bytes=readFileSync(src),actual=hash(bytes);
  if(expected&&actual!==expected)throw new Error(`Artwork SHA-256 mismatch: ${relative}`);
  const debug=join(reviewRoot,relative),app=join(appRoot,relative);
  mkdirSync(dirname(debug),{recursive:true}); mkdirSync(dirname(app),{recursive:true});
  copyFileSync(src,debug); copyFileSync(src,app);
  return {path:relative,sha256:actual};
};
const localized=(recipe,key,locale)=>recipe[key]?.[locale] ?? recipe[key] ?? '';
const roleText=(role,locale)=>{
  if(typeof role==='object')return role[locale]||'';
  const en=String(role||'').toLowerCase();
  const child=locale==='pt-BR';
  if(en==='adult')return child?'Somente adulto':'Adult only';
  if(en==='shared')return child?'Com um adulto':'With adult supervision';
  if(en==='child')return 'Aaria';
  if(en==='shared when cool')return child?'Quando esfriar':'When cool';
  return String(role||'');
};
const parseIngredient=s=>{
  const m=String(s).trim().match(/^([\d.,/]+)\s*(kg|g|mg|L|l|mL|ml|cm|mm|°C|tsp|tbsp|cup|cups|pinch|clove|leaves?|piece|small|medium|large|sheets?)?\s*(.*)$/i);
  return m?{quantity:m[1],unit:(m[2]||'').replace(/^l$/,'L').replace(/^ml$/i,'mL'),name:m[3]||s}:{quantity:'',unit:'',name:String(s)};
};
const parseDraftAllergens=value=>{
  const text=String(value||'').toLowerCase();
  return [...new Set([
    /fish|peix/.test(text)?'fish':null,
    /soy|soja/.test(text)?'soy':null,
    /wheat|gluten|trigo/.test(text)?'wheat/gluten':null,
    /sesame|gergelim/.test(text)?'sesame':null,
    /peanut|amendoim/.test(text)?'peanut':null,
    /milk|dairy|leite/.test(text)?'milk':null,
    /egg|ovo/.test(text)?'egg':null,
    /coconut|coco/.test(text)?'coconut':null,
    /oat|aveia/.test(text)?'oats; possible gluten cross-contact':null
  ].filter(Boolean))];
};
const nutritionForRenderer=value=>{
  const n=value||{},p=n.perServing||n.per_serving||null;
  if(!p)return {status:n.status||'PENDING_SOURCE_AND_CALCULATION',perServing:null,method:n.method||'',basis:n.basis||'',calculationMethod:n.calculationMethod||'',sources:n.sources||[]};
  return {status:n.status||'ESTIMATE_REVIEW_PENDING',perServing:{kcal:p.kcal??p.energyKcal,proteinG:p.proteinG,carbohydrateG:p.carbohydrateG,totalFatG:p.totalFatG??p.fatG,fiberG:p.fiberG??p.fibreG,saturatedFatG:p.saturatedFatG,sugarG:p.sugarG,sodiumMg:p.sodiumMg},method:n.method||'',basis:n.basis||'',calculationMethod:n.calculationMethod||n.method||'',sources:n.sources||[]};
};
const safetyByStep=(draft,step,locale)=>{
  const local=step.safety?.[locale]||step.safety||'';
  const assist=step.adultAssist?.[locale]||step.adult_assist?.[locale]||'';
  if(local)return local;
  if(assist)return assist;
  return draft.safety?.[locale]||'';
};
const draftPathForId=new Map(ids.slice(-6).map(id=>{
  const dirs={111:'111-quick-chicken-pho',112:'112-tofu-and-vegetable-pho',113:'113-simple-beef-pho',114:'114-air-fryer-crispy-tofu-rice-bowl',115:'115-lemongrass-chicken-rice-bowl',116:'116-air-fryer-banana-coconut-bites'};
  return [id,`vietnam/${dirs[id]}`];
}));
const readDraft=(id,rel)=>JSON.parse(readFileSync(join(recipeRoot,rel,'recipe-draft.json'),'utf8'));
function materializeUploadedDraftArtwork(id,rel,draft){
  const slug=rel.split('/').at(-1).replace(/^\d+-/,''),archive=join(recipeRoot,'vietnam/artwork-drafts',`Aaria_V35_Artwork_${id}-${slug}.zip`);
  for(const asset of [draft.artwork.finished_dish,...draft.steps.map(step=>step.image)]){
    const target=join(root,asset.path);
    if(existsSync(target))continue;
    const bytes=execFileSync('unzip',['-p',archive,asset.path],{maxBuffer:12*1024*1024});
    if(!bytes.length)throw new Error(`Uploaded artwork archive is missing ${asset.path}`);
    mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);
    if(hash(bytes)!==asset.sha256)throw new Error(`Uploaded draft artwork hash mismatch: ${asset.path}`);
  }
}

for(const id of ids){
  const rel=draftPathForId.get(id);
  if(rel){
    const d=readDraft(id,rel), locales={}, artworkAssets=[];
    materializeUploadedDraftArtwork(id,rel,d);
    for(const locale of ['en-GB','pt-BR']){
      const ing=(d.ingredients?.[locale]||[]).map(s=>{const p=parseIngredient(s);return {name:p.name,quantity:p.quantity,unit:p.unit,allergens:parseDraftAllergens(d.allergens_and_cross_contact?.[locale]).filter(a=>new RegExp(a.split(/[;/ ]/)[0],'i').test(p.name)||new RegExp(a.split(/[;/ ]/)[0],'i').test(s)),optional:/optional|opcional/i.test(s)}});
      const steps=d.steps.map(s=>({title:s.title?.[locale]||'',instruction:s.instruction?.[locale]||'',adultAssist:s.adultAssist?.[locale]||d.safety?.[locale]||'',safety:safetyByStep(d,s,locale),image:s.image}));
      const equipment=(d.equipment||[]).map(e=>({name:e[locale],roleDescription:roleText(e.role,locale)}));
      locales[locale]={title:d.title[locale],description:d.description?.[locale]||'',method:d.method?.[locale]||'Guided cooking',estimatedHandsOnMinutes:d.estimatedHandsOnMinutes||30,servings:d.servings,ingredients:ing,equipment:d.equipment.map(e=>e[locale]),equipmentItems:equipment,steps,adultHelp:d.safety?.[locale]||'',allergens:parseDraftAllergens(d.allergens_and_cross_contact?.[locale]),crossContact:d.allergens_and_cross_contact?.[locale]||'',nutrition:{status:'PENDING_SOURCE_AND_CALCULATION',perServing:null},international:{nutritionSources:[]},finishedDish:d.artwork.finished_dish.path};
      for(const s of steps){copyAsset(s.image.path,s.image.sha256);artworkAssets.push({...s.image,role:'STEP_ILLUSTRATION'});}
    }
    copyAsset(d.artwork.finished_dish.path,d.artwork.finished_dish.sha256);
    artworkAssets.push({...d.artwork.finished_dish,role:'FINISHED_DISH'});
    records.push({id,country:'vietnam',locales,publicationStatus:'DRAFT_REVIEW_ONLY',reviewGates:d.review_gates,artworkStatus:'DRAFT_STYLE_ACCURACY_RIGHTS_ACCESSIBILITY_REVIEW_PENDING',artworkAssets,artworkAssetPaths:[d.artwork.finished_dish.path,...d.steps.map(x=>x.image.path)]});
    continue;
  }
  const country=id<=98?'italy':id<=101?'china':id<=104?'japan':id<=107?'mexico':'vietnam';
  const matches=[];
  // Resolve an existing canonical JSON by its numeric id, without assuming slug text.
  for(const c of ['italy','china','japan','mexico','vietnam']){
    const candidateDir=join(recipeRoot,c);
    for(const slug of readdirSync(candidateDir,{withFileTypes:true}))if(slug.isDirectory()){
      const p=join(candidateDir,slug.name,'recipe.json');
      try{const r=JSON.parse(readFileSync(p,'utf8'));if(Number(r.id)===id)matches.push({r,p});}catch{}
    }
  }
  if(matches.length!==1)throw new Error(`Expected one canonical recipe file for #${id}; found ${matches.length}`);
  const r=matches[0].r, locales={};
  for(const locale of ['en-GB','pt-BR']){
    const ing=(r.ingredientItems||[]).map(x=>({name:x.name?.[locale]||'',quantity:x.quantity,unit:x.unit,allergens:x.allergens||[],optional:x.optional===true,imagePath:x.artwork?.path||null,imageSha256:x.artwork?.sha256||null}));
    const equipmentItems=(r.equipmentItems||[]).map(x=>({name:x.name?.[locale]||'',roleDescription:roleText(x.role,locale)}));
    const steps=(r.steps||[]).map(s=>{const art=s.artwork||{};const path=art.path||s.artworkPath;return {title:s.title?.[locale]||'',instruction:s.instruction?.[locale]||'',adultAssist:s.adultAssist?.[locale]||r.adult_assistance?.[locale]||'',safety:s.safety?.[locale]||'',image:{path,sha256:art.sha256,alt_text:art.alt_text||{'en-GB':s.title?.['en-GB']||'Recipe step','pt-BR':s.title?.['pt-BR']||'Etapa da receita'},alt_text_source:art.alt_text?'recipe artwork metadata':'recipe step title; accessibility review pending',provenance:art.provenance,rights_status:art.rights_status}};});
    const fin=r.finished_dish?.image||r.artwork?.finished_dish;
    locales[locale]={title:r.title?.[locale]||'',description:r.description?.[locale]||'',method:r.method,estimatedHandsOnMinutes:r.active_minutes,servings:r.servings,ingredients:ing,equipment:r.equipmentItems.map(x=>x.name?.[locale]||''),equipmentItems,steps,adultHelp:r.adult_assistance?.[locale]||'',allergens:r.allergens||[],crossContact:r.allergen_notes?.crossContact?.[locale]||r.allergen_notes?.cross_contact?.[locale]||'',nutrition:nutritionForRenderer(r.nutrition),international:{nutritionSources:r.nutrition?.sources||[]},finishedDish:fin.path};
    for(const s of steps)copyAsset(s.image.path,s.image.sha256);
    for(const ingredient of ing)if(ingredient.imagePath){const source=r.ingredientItems.find(x=>x.name?.[locale]===ingredient.name)?.artwork;copyAsset(ingredient.imagePath,source?.sha256);}
    copyAsset(fin.path,fin.sha256);
  }
  const artworkAssetPaths=[...new Set(Object.values(locales).flatMap(l=>[l.finishedDish,...l.steps.map(s=>s.image.path),...l.ingredients.map(i=>i.imagePath).filter(Boolean)]))];
  const artworkAssets=(r.artwork_assets||[]).filter(a=>artworkAssetPaths.includes(a.path));
  records.push({id,country,locales,publicationStatus:'REVIEW_ONLY_PENDING_INDEPENDENT_REVIEW',reviewGates:r.reviews||{},artworkStatus:r.artwork?.status||'PENDING_REVIEW',artworkAssets,artworkAssetPaths});
}

records.sort((a,b)=>a.id-b.id);
const allIds=records.map(x=>Number(x.id));
const expected=Array.from({length:21},(_,i)=>96+i);
if(JSON.stringify(allIds)!==JSON.stringify(expected))throw new Error(`Expected full V3.5 review IDs ${expected}; got ${allIds}`);
const pkg={packageVersion:'3.5-review',sourceCommit:process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),recipes:records,reviewOnly:true,gatesRemainPending:true};
for(const target of [packagePath,join(appRoot,'recipes.json')]){
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,JSON.stringify(pkg,null,2)+'\n');
}
console.log(JSON.stringify({packageVersion:pkg.packageVersion,recipeIds:allIds,reviewOnly:true,draftIds:records.filter(x=>x.publicationStatus==='DRAFT_REVIEW_ONLY').map(x=>x.id),artworkFiles:records.reduce((n,x)=>n+x.artworkAssetPaths.length,0)}));
