import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
const root=process.argv[2]||process.cwd();
const sourcePath=path.join(root,'index.html');
const html=fs.readFileSync(sourcePath,'utf8');
function extract(name,open){
  const m=new RegExp('const '+name+'\\s*=\\s*').exec(html);
  if(!m) throw new Error('Missing '+name);
  const start=m.index+m[0].length, close=open==='{'?'}':']';
  let depth=0,quote='',escaped=false;
  for(let i=start;i<html.length;i++){
    const c=html[i];
    if(quote){if(escaped)escaped=false;else if(c==='\\\\')escaped=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='\x60'){quote=c;continue;}
    if(c===open)depth++;
    else if(c===close&&--depth===0)return vm.runInNewContext('('+html.slice(start,i+1)+')');
  }
  throw new Error('Unclosed '+name);
}
function extractAssigns(name){
  const out={}; const re=new RegExp('Object\\.assign\\('+name+',\\s*','g');let m;
  while((m=re.exec(html))){
    const start=m.index+m[0].length;let depth=0,quote='',escaped=false;
    for(let i=start;i<html.length;i++){const c=html[i];if(quote){if(escaped)escaped=false;else if(c==='\\\\')escaped=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='\x60'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0){Object.assign(out,vm.runInNewContext('('+html.slice(start,i+1)+')'));re.lastIndex=i+1;break;}}
  }return out;
}
const recipes=extract('RECIPES','[');
const pt=extract('PT_RECIPES','{');
const art=extract('NEW_RECIPE_ART','{');
const inlineDish=extract('INLINE_DISH_PHOTOS','{');
const homeDish=extract('HOME_RECIPE_THUMBS','{');
const batchAtlas=extract('BATCH_ATLASES','{');
const missingDish=extract('HOME_MISSING_RECIPE_INDEX','{');
const qa=extract('NEW_RECIPE_QA_STATUS','{');
const notes=extract('NEW_NUTRITION_SOURCE_NOTES','{');
const plans=Object.assign(extract('NUTRITION_PLANS','{'),extractAssigns('NUTRITION_PLANS'));
const d1=JSON.parse(fs.readFileSync(path.join(root,'tools/v3/data/pt-BR-recipes-66-80-review.json'),'utf8'));
const d2=JSON.parse(fs.readFileSync(path.join(root,'tools/v3/data/pt-BR-recipes-81-95-review.json'),'utf8'));
const drafts={...d1.recipes,...d2.recipes};
function assertDraftContract(doc,firstId,lastId,label){
 if(doc.status!=='W01_DRAFT_PENDING_INDEPENDENT_REVIEW'||doc.locale!=='pt-BR')throw new Error(label+' must remain a pt-BR independent-review draft');
 const requiredReviews=['A08_child_safety','A09_child_experience','native_PT_BR_translation'];
 if(!requiredReviews.every(item=>doc.independentReviewRequired?.includes(item)))throw new Error(label+' is missing an independent-review gate');
 const ids=Object.keys(doc.recipes||{}).map(Number).sort((a,b)=>a-b);
 const expected=Array.from({length:lastId-firstId+1},(_,i)=>firstId+i);
 if(JSON.stringify(ids)!==JSON.stringify(expected))throw new Error(label+' IDs must be exactly '+firstId+'-'+lastId+'; got '+ids.join(','));
 for(const id of expected){
  const translation=doc.recipes[String(id)],canonical=recipes.find(recipe=>Number(recipe.id)===id);
  if(!canonical)throw new Error(label+' recipe '+id+' is absent from canonical source');
  if(typeof translation.title!=='string'||!translation.title.trim())throw new Error(label+' recipe '+id+' has no translated title');
  for(const field of ['ingredients','steps']){
   const values=translation[field];
   if(!Array.isArray(values)||!values.length||values.length!==canonical[field]?.length||values.some(value=>typeof value!=='string'||!value.trim()))throw new Error(label+' recipe '+id+' has incomplete '+field+' coverage');
  }
  if(typeof translation.safety!=='string'||!translation.safety.trim())throw new Error(label+' recipe '+id+' has no translated safety text');
 }
}
assertDraftContract(d1,66,80,'PT-BR draft 66-80');
assertDraftContract(d2,81,95,'PT-BR draft 81-95');
const themes=JSON.parse(fs.readFileSync(path.join(root,'tools/v3/data/v3.2-recipe-theme-map.json'),'utf8'));
const missing=new Set([1,4,5,6,7,8,9,10,16,26,33,51,57]);
const blobSha=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(html)+'\0'),Buffer.from(html)])).digest('hex');
if(recipes.length!==95||new Set(recipes.map(r=>Number(r.id))).size!==95||recipes.some((recipe,index)=>Number(recipe.id)!==index+1))throw new Error('Canonical recipe contract must contain exactly the ordered IDs 1-95');
if(Object.keys(themes.mapping||themes).length!==95)throw new Error('Expected exactly 95 theme assignments');
const rows=recipes.map(r=>{
 const id=String(r.id), translated=pt[id]||drafts[id]||null;
 const theme=themes.mapping?.[id]??themes[id]??themes.recipes?.[id]??null;
 if(!theme)throw new Error('Missing deterministic theme for '+id);
 const artRecord=art[id]||null, nutritionPlan=plans[id]||null;
 const assetChannels=[inlineDish[id]?'INLINE_DISH_PHOTOS':null,homeDish[id]?'HOME_RECIPE_THUMBS':null,batchAtlas[id]?'BATCH_ATLASES':null,artRecord?'NEW_RECIPE_ART':null,missingDish[id]!==undefined?'HOME_MISSING_RECIPE_INDEX':null].filter(Boolean);
 return {
  recipeId:Number(id),runtimeId:Number(id),canonicalTitleEN:r.title,canonicalTitlePTBR:translated?.title||null,
  translationStatus:translated?(pt[id]?'EXISTING':'DRAFT_REVIEW_PENDING'):'MISSING',
  category:r.category,method:r.method,time:r.time,yieldText:r.yieldText,servings:r.servings??null,
  ingredients:{en:[...(r.ingredients||[])],ptBR:[...(translated?.ingredients||[])]},
  stepReference:'index.html:RECIPES['+id+'].steps; translated record by recipeId',
  stepCountEN:(r.steps||[]).length,stepCountPTBR:(translated?.steps||[]).length,
  safety:{en:r.safety||null,ptBR:translated?.safety||null,adultCueEN:/adult|grown-up|parent/i.test(r.safety||'')},
  familyFriendsRoleCopyRef:'roleCopy',
  nutrition:{plan:!!nutritionPlan,sourceNote:!!notes[id],perPortion:'REVIEW_REQUIRED'},
  allergens:'NOT_AUDITED',
  theme:typeof theme==='string'?theme:(theme.theme||theme.name||JSON.stringify(theme)),
  artwork:{dish:missing.has(Number(id))?'MISSING_OR_REVIEW_ONLY':'UNVERIFIED_RUNTIME_SOURCE',assetChannels,registryStatus:artRecord?.status||null,rights:'UNVERIFIED',stepArt:'NOT_AUDITED',screen:'NOT_CAPTURED'},
  routeEvidence:'PASS_PRIOR_CODE_SHA_ONLY',
  independentGates:'HOLD',acceptance:'BLOCKED'
 };
});
const out={schemaVersion:'v3.2-95-recipe-acceptance-matrix/1',canonicalSource:{path:'index.html',gitBlobSha:blobSha,recipeCount:recipes.length,ids:'1-95'},translationSources:['index.html:PT_RECIPES','tools/v3/data/pt-BR-recipes-66-80-review.json','tools/v3/data/pt-BR-recipes-81-95-review.json'],roleCopy:{familyEN:'Family mode role labels remain in the application source; review required.',familyPTBR:d1.familyRoleCopy||null,friendsEN:'Friends mode role labels remain in the application source; review required.',friendsPTBR:d2.friendsRoleCopy||null,review:'NATIVE_AND_A09_REVIEW_REQUIRED'},themeMapPath:'tools/v3/data/v3.2-recipe-theme-map.json',artworkInventory:{expectedMissingDishIds:[1,4,5,6,7,8,9,10,16,26,33,51,57],sourceChannelCounts:{inlineDish:Object.keys(inlineDish).length,homeThumb:Object.keys(homeDish).length,batchAtlas:Object.keys(batchAtlas).length,newRecipeArt:Object.keys(art).length,missingPlaceholder:Object.keys(missingDish).length},rights:'UNVERIFIED_FOR_ALL_RUNTIME_ASSETS',reviewContactSheet:{path:'docs/control-tower/V3_2_13_MISSING_DISH_REVIEW_CONTACT.jpg',sha256:'09e1374ee5024c1e42596d38efcb977a8f95eaabb87155f45734dd00f94b710b',dimensions:'896x1000',status:'REVIEW_INDEX_ONLY_NOT_APPROVED'}},runBinding:{runId:Number(process.env.V32_RUN_ID||0)||null,codeSha:process.env.V32_CODE_SHA||null,status:process.env.V32_RUN_STATUS||'PENDING'},evidenceLegend:{routeEvidence:'Prior 95/95 route run; does not prove current-head content acceptance or per-recipe screenshots.',independentGates:'A08, A09, rights and visual reviewer decisions remain external.',nextAction:'Complete per-recipe content, nutrition/allergen, artwork/provenance and screenshot review; obtain independent gate decisions.'},acceptanceNote:'Routing, source presence and automated draft contracts are evidence inputs, not recipe acceptance. Every row remains BLOCKED until individual content, safety, nutrition, artwork, rights and visual evidence plus independent reviews are recorded.',rows};
console.log(JSON.stringify(out,null,2));
