import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';
import {artworkCastBrief, castForArtworkGroup} from './cast-assignment.js';

const arg=(name,fallback)=>{
  const i=process.argv.indexOf(name);
  return i<0?fallback:process.argv[i+1];
};
const input=resolve(arg('--input','../index.html'));
const output=resolve(arg('--output','dist/full-catalog-draft.json'));
const quizOutput=resolve(arg('--quiz-output','dist/full-quiz-bank-draft.json'));
const html=await readFile(input,'utf8');

function extractRecipes(source){
  const marker='const RECIPES=';
  const markerAt=source.indexOf(marker);
  if(markerAt<0)throw new Error(`Could not find '${marker}' in ${input}`);
  let start=markerAt+marker.length;
  while(/\s/.test(source[start]||''))start++;
  const stack=[];
  let inString=false,escaped=false;
  for(let i=start;i<source.length;i++){
    const c=source[i];
    if(inString){
      if(escaped)escaped=false;
      else if(c==='\\')escaped=true;
      else if(c==='"')inString=false;
      continue;
    }
    if(c==='"')inString=true;
    else if(c==='['||c==='{')stack.push(c);
    else if(c===']'||c==='}'){
      const opener=stack.pop();
      if((opener==='['&&c!==']')||(opener==='{'&&c!=='}'))throw new Error(`Unbalanced recipe data at character ${i}.`);
      if(!stack.length)return JSON.parse(source.slice(start,i+1));
    }
  }
  throw new Error('Recipe data array is incomplete.');
}
const sourceRecipes=extractRecipes(html);
const slug=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const wordCount=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const num=(s)=>{const v=Number(String(s).replace(',','.'));return Number.isFinite(v)?v:null};
function amountAndName(text){
  const raw=String(text||'').trim();
  const m=raw.match(/^([\d]+(?:[.,]\d+)?(?:\s*\/\s*[\d]+)?(?:\s*[–-]\s*[\d]+(?:[.,]\d+)?)?)\s*(g|kg|mg|ml|l|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|slice|slices|piece|pieces|clove|cloves|egg|eggs|pinch|pinches|can|cans|packet|packets|bun|buns|roll|rolls)?\s+(.+)$/i);
  if(!m)return {quantity:null,quantityText:'',unit:'',name:raw};
  const quantityText=m[1].trim();
  const exact=/^\d+(?:[.,]\d+)?$/.test(quantityText)?num(quantityText):null;
  const unit=m[2]||'item';
  return {quantity:exact,quantityText,unit,name:m[3].trim()};
}
function minutes(text,fallback){
  const s=String(text||'');
  const m=s.match(/(?:about\s*)?(\d+)(?:\s*[–-]\s*(\d+))?\s*(?:min|minutes)\b/i);
  if(!m)return fallback;
  return m[2]?Math.round((Number(m[1])+Number(m[2]))/2):Number(m[1]);
}
function servings(text,explicit){
  if(Number.isFinite(Number(explicit))&&Number(explicit)>0)return Number(explicit);
  const m=String(text||'').match(/(\d+)/);
  return m?Math.max(1,Number(m[1])):1;
}
const groups={aaria:0,family:0,friends:0};
const ids=new Set();
const recipes=sourceRecipes.map((source,index)=>{
  const group=source.category==='Cooking with Mommy & Daddy'?'family':source.category==='Cooking with Friends'?'friends':'aaria';
  groups[group]++;
  const cast=castForArtworkGroup(group);
  const id=slug(source.id&&/^\d+$/.test(String(source.id))?`${String(source.id).padStart(2,'0')}-${source.title}`:source.id||source.title);
  if(ids.has(id))throw new Error(`Duplicate migrated recipe id '${id}'.`);
  ids.add(id);
  const legacyIngredients=(source.ingredients||[]).map(amountAndName);
  const ingredients=legacyIngredients.map((i,n)=>({
    id:slug(i.name)||`ingredient-${n+1}`,
    name:i.name,
    quantity:i.quantity,
    quantityText:i.quantityText,
    unit:i.unit,
    allergens:[],
    optional:/\boptional\b|if you like|if desired/i.test(i.name),
    reviewStatus:'PENDING — ingredient/allergen review required',
    sourceText:source.ingredients[n]
  }));
  const steps=(source.steps||[]).map((instruction,i)=>({
    title:String(instruction).split(/[.!?]/)[0].trim().split(/\s+/).slice(0,6).join(' '),
    instruction:String(instruction).trim(),
    safety:String(source.safety||'Adult safety review required before release.'),
    adultOnly:/adult handles|adult should|ask an adult|with an adult|grown-up/i.test(String(instruction)+' '+String(source.safety||'')),
    art:`pending.${id}.step-${i+1}`,
    characters:cast.map(person=>person.name),
    characterAssetIds:cast.map(person=>person.assetId),
    artworkBrief:artworkCastBrief(group, String(instruction).trim()),
    wordCount:wordCount(instruction),
    reviewStatus:'PENDING — simplify wording and verify safety'
  }));
  const art=source.artwork||{};
  const artworkIds=[art.hero||source.heroImage||`pending.${id}.hero`,...steps.map(x=>x.art)];
  const heroArtworkBrief=artworkCastBrief(group,`making ${String(source.title)}`);
  const nutrition={perServing:{servingSize:String(source.yieldText||'1 serving'),kcal:null,proteinG:null,carbohydrateG:null,totalFatG:null,saturatedFatG:null,fiberG:null,sugarG:null,sodiumMg:null},dataSource:'Not mapped',calculationMethod:'Not calculated; source mapping and independent review required.',verificationStatus:'PENDING — do not use for nutrition-based recommendations',reviewDate:null};
  const explicitAllergens=Array.isArray(source.allergens)?source.allergens:[];
  const safety=String(source.safety||'Adult review required before cooking.');
  const description=String(source.description||source.fact||'');
  return {
    id,title:String(source.title),category:String(source.category||'Recipes'),artworkGroup:group,mainCharacters:cast.map(person=>person.name),characterAssetIds:cast.map(person=>person.assetId),
    ageRange:'8–10',difficulty:source.difficulty||'Review pending',description,method:String(source.method||''),
    estimatedHandsOnMinutes:minutes(source.time,Number(source.prepMinutes)||10),
    durationStatus:'Imported estimate; timing and usability review pending.',servings:servings(source.yieldText,source.servings),yieldText:String(source.yieldText||''),
    ingredients,equipment:Array.isArray(source.equipment)?source.equipment:[],allergens:explicitAllergens.length?explicitAllergens:['Package-label review required; allergen list pending'],
    crossContact:String(source.crossContact||'Review package labels and prevent cross-contact with an adult.'),adultHelp:safety,
    steps,nutrition,artworkIds,artwork:{hero:art.hero||source.heroImage||null,storyboard:art.storyboard||source.storyboardImage||null,heroBrief:heroArtworkBrief,heroCharacterAssetIds:cast.map(person=>person.assetId),stepAssets:steps.map(x=>x.art)},
    artworkStatus:(art.hero||source.heroImage)?'ARTWORK REFERENCE PRESENT — FILE AND APPROVAL CHECK REQUIRED':'MISSING — create recipe-specific hero and step artwork',
    review:{nutrition:'PENDING',allergy:explicitAllergens.length?'PENDING':'PENDING — source allergen data absent',foodSafety:'PENDING',childExperience:'PENDING',artwork:'PENDING'},
    publicationStatus:'MIGRATION DRAFT — NOT FOR RELEASE',sourceLegacy:{id:source.id,category:source.category,ingredients:source.ingredients||[],steps:source.steps||[],extras:source.extras||[],fact:source.fact||'',safety:source.safety||'',time:source.time||'',yieldText:source.yieldText||'',nutritionStatus:source.nutritionStatus||null}
  };
});
if(recipes.length!==95)throw new Error(`Expected 95 recipes, found ${recipes.length}.`);
if(groups.aaria!==65||groups.family!==15||groups.friends!==15)throw new Error(`Unexpected character counts: ${JSON.stringify(groups)}`);
function distractors(pool,correct,count,offset){
  const values=[...new Set(pool.map(x=>String(x||'').trim()).filter(x=>x&&x!==correct))];
  if(values.length<count)throw new Error(`Not enough distinct quiz distractors for '${correct}'.`);
  return Array.from({length:count},(_,i)=>values[(offset+i*17)%values.length]);
}
const ingredientPool=recipes.flatMap(r=>r.ingredients.map(i=>i.name));
const firstStepPool=recipes.map(r=>r.steps[0]?.title).filter(Boolean);
const methodPool=recipes.map(r=>r.method).filter(Boolean);
const quizBank={version:'1.0.0-draft',questionsPerRecipe:3,reviewStatus:'DRAFT QUESTIONS — HUMAN CONTENT REVIEW REQUIRED',recipes:Object.fromEntries(recipes.map((r,index)=>{
  const ingredient=r.ingredients[0]?.name||'';
  const firstStep=r.steps[0]?.title||'';
  const method=r.method||'';
  const question=(id,prompt,answer,pool,explanation)=>{
    const choices=[answer,...distractors(pool,answer,3,index*11)].sort((a,b)=>a.localeCompare(b));
    return {id:`${r.id}-${id}`,prompt,choices,answerIndex:choices.indexOf(answer),explanation,reviewStatus:'DRAFT — verify recipe relevance, wording and answer.'};
  };
  return [r.id,[
    question('ingredient','Which ingredient is listed for this recipe?',ingredient,ingredientPool,`${ingredient} is listed in ${r.title}.`),
    question('first-step','Which action starts this recipe?',firstStep,firstStepPool,`Start with this step: ${r.steps[0]?.instruction||firstStep}`),
    question('method','Which cooking method does this recipe use?',method,methodPool,`${r.method||'This method'} is the source-listed method for ${r.title}.`)
  ]];
}))};
const draft={catalogVersion:'0.2.0-migration-draft',status:'MIGRATION_DRAFT_NOT_FOR_RELEASE',source:{sha256:createHash('sha256').update(html).digest('hex'),recipeCount:sourceRecipes.length},artworkGroups:groups,recipes};
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(draft,null,2)+'\n');
await writeFile(quizOutput,JSON.stringify(quizBank,null,2)+'\n');
console.log(`Created draft catalog with ${recipes.length} recipes (${groups.aaria}/${groups.family}/${groups.friends}), ${recipes.reduce((n,r)=>n+r.steps.length,0)} steps and ${recipes.length*3} quiz drafts. Review and artwork remain blocked.`);
