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
const qa=extract('NEW_RECIPE_QA_STATUS','{');
const notes=extract('NEW_NUTRITION_SOURCE_NOTES','{');
const plans=Object.assign(extract('NUTRITION_PLANS','{'),extractAssigns('NUTRITION_PLANS'));
const d1=JSON.parse(fs.readFileSync(path.join(root,'tools/v3/data/pt-BR-recipes-66-80-review.json'),'utf8'));
const d2=JSON.parse(fs.readFileSync(path.join(root,'tools/v3/data/pt-BR-recipes-81-95-review.json'),'utf8'));
const drafts={...d1.recipes,...d2.recipes};
const themes=JSON.parse(fs.readFileSync(path.join(root,'tools/v3/data/v3.2-recipe-theme-map.json'),'utf8'));
const missing=new Set([1,4,5,6,7,8,9,10,16,26,33,51,57]);
const blobSha=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(html)+'\0'),Buffer.from(html)])).digest('hex');
if(recipes.length!==95||new Set(recipes.map(r=>Number(r.id))).size!==95)throw new Error('Canonical recipe contract is not 95 unique IDs');
if(Object.keys(themes.mapping||themes).length!==95)throw new Error('Expected exactly 95 theme assignments');
const rows=recipes.map(r=>{
 const id=String(r.id), translated=pt[id]||drafts[id]||null;
 const theme=themes.mapping?.[id]??themes[id]??themes.recipes?.[id]??null;
 if(!theme)throw new Error('Missing deterministic theme for '+id);
 const artRecord=art[id]||null, nutritionPlan=plans[id]||null;
 return {
  recipeId:Number(id),runtimeId:Number(id),canonicalTitleEN:r.title,canonicalTitlePTBR:translated?.title||null,
  translationStatus:translated?(pt[id]?'EXISTING_SOURCE_TRANSLATION':'W01_DRAFT_PENDING_NATIVE_A08_A09_REVIEW'):'MISSING',
  category:r.category,method:r.method,time:r.time,yieldText:r.yieldText,servings:r.servings??null,
  ingredients:{en:[...(r.ingredients||[])],ptBR:[...(translated?.ingredients||[])]},
  steps:{en:[...(r.steps||[])],ptBR:[...(translated?.steps||[])]},
  stepCountEN:(r.steps||[]).length,stepCountPTBR:(translated?.steps||[]).length,
  safety:{en:r.safety||null,ptBR:translated?.safety||null,adultAssistanceCuePresentEN:/adult|grown-up|parent/i.test(r.safety||''),review:'A08_A09_INDEPENDENT_REVIEW_REQUIRED'},
  familyFriendsRoleCopy:{family:d1.familyRoleCopy||null,friends:d2.friendsRoleCopy||null,review:'NATIVE_AND_A09_REVIEW_REQUIRED'},
  nutrition:{planPresent:!!nutritionPlan,planPath: nutritionPlan?'index.html:NUTRITION_PLANS['+id+']':null,sourceNote:notes[id]||null,perPortionValues:'NOT independently verified in this matrix; do not infer from plan presence',status:'REVIEW_REQUIRED_NO_FABRICATION'},
  allergens:{status:'NOT_INDEPENDENTLY_AUDITED',source:r.safety||null,crossContactReview:'REQUIRED'},
  theme:{name:typeof theme==='string'?theme:(theme.theme||theme.name||JSON.stringify(theme)),source:'tools/v3/data/v3.2-recipe-theme-map.json'},
  artwork:{finishedDishStatus:missing.has(Number(id))?'MISSING_OR_REVIEW_ONLY':'NOT_INDIVIDUALLY_AUDITED',registryPresent:!!artRecord,sourcePath:artRecord?'index.html:NEW_RECIPE_ART['+id+']':'tools/v3/artwork and canonical recipe image fields',sourceFiles:artRecord?.sourceFiles||[],rights:'UNVERIFIED',stepArt:'NOT_INDIVIDUALLY_AUDITED',runtimeScreenshot:'NOT_CAPTURED_PER_RECIPE'},
  routeEvidence:{priorRun:39632118408,priorTestedCodeSha:'857b3e002b25135a702d05cdf00471a20fcdada8',result:'ROUTE_PASSED_AT_PRIOR_CODE_SHA_ONLY',currentHeadRun:Number(process.env.V32_RUN_ID||0)||null,currentHeadStatus:process.env.V32_RUN_STATUS||'PENDING',screenshotEvidence:'not recipe-specific'},
  independentGates:{A08:'HOLD_PENDING_INDEPENDENT_REVIEW',A09:'HOLD_PENDING_INDEPENDENT_REVIEW',artworkRights:'HOLD_PENDING_INDEPENDENT_REVIEW'},
  acceptance:'BLOCKED',nextAction:'Complete content/nutrition/allergen/media/provenance review, capture required visual evidence, then obtain independent gates.'
 };
});
const out={schemaVersion:'v3.2-95-recipe-acceptance-matrix/1',canonicalSource:{path:'index.html',gitBlobSha:blobSha,recipeCount:recipes.length,ids:'1-95'},translationSources:['index.html:PT_RECIPES','tools/v3/data/pt-BR-recipes-66-80-review.json','tools/v3/data/pt-BR-recipes-81-95-review.json'],themeMapPath:'tools/v3/data/v3.2-recipe-theme-map.json',runBinding:{runId:Number(process.env.V32_RUN_ID||0)||null,codeSha:process.env.V32_CODE_SHA||null,status:process.env.V32_RUN_STATUS||'PENDING'},acceptanceNote:'Routing, source presence and automated draft contracts are evidence inputs, not recipe acceptance. Every row remains BLOCKED until individual content, safety, nutrition, artwork, rights and visual evidence plus independent reviews are recorded.',rows};
console.log(JSON.stringify(out,null,2));
