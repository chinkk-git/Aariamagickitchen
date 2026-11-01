import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';

const arg=(name,fallback)=>{
  const i=process.argv.indexOf(name);
  return i<0?fallback:process.argv[i+1];
};
const input=resolve(arg('--input','../index.html'));
const output=resolve(arg('--output','dist/legacy-source-audit.json'));
const quizPath=arg('--quiz-bank','tools/recipe-pipeline/quiz-bank.json');
const html=await readFile(input,'utf8');
const sourceHash=createHash('sha256').update(html).digest('hex');

function extractJsonArray(source,marker){
  const markerAt=source.indexOf(marker);
  if(markerAt<0)throw new Error(`Could not find '${marker}' in ${input}`);
  let start=markerAt+marker.length;
  while(/\s/.test(source[start]||''))start++;
  if(source[start]!=='[')throw new Error(`'${marker}' is not followed by a JSON array.`);
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
      if((opener==='['&&c!==']')||(opener==='{'&&c!=='}'))throw new Error(`Unbalanced JSON at character ${i}.`);
      if(stack.length===0)return JSON.parse(source.slice(start,i+1));
    }
  }
  throw new Error(`Unclosed JSON array after '${marker}'.`);
}

const recipes=extractJsonArray(html,'const RECIPES=');
let quizBank={recipes:{}};
try{quizBank=JSON.parse(await readFile(resolve(quizPath),'utf8'));}catch{}
const groupFor=recipe=>recipe.category==='Cooking with Mommy & Daddy'?'family':recipe.category==='Cooking with Friends'?'friends':'aaria';
const groups={aaria:[],family:[],friends:[]};
const missingArtwork=[];
const missingQuiz=[];
const missingNutrition=[];
const missingPerRecipeSafety=[];
let stepCount=0;
let maxStepWords=0;
for(const recipe of recipes){
  const group=groupFor(recipe);
  groups[group].push(recipe.id);
  const artwork=recipe.artwork||recipe.heroImage||recipe.storyboardImage;
  if(!artwork)missingArtwork.push({id:recipe.id,title:recipe.title,artworkGroup:group,steps:recipe.steps?.length||0});
  const questions=quizBank.recipes?.[recipe.id];
  if(!Array.isArray(questions)||questions.length!==3)missingQuiz.push({id:recipe.id,title:recipe.title,found:Array.isArray(questions)?questions.length:0});
  if(!recipe.nutritionStatus||!String(recipe.nutritionStatus).startsWith('VERIFIED'))missingNutrition.push({id:recipe.id,title:recipe.title,status:recipe.nutritionStatus||'not supplied'});
  if(!recipe.safety)missingPerRecipeSafety.push({id:recipe.id,title:recipe.title});
  for(const step of recipe.steps||[]){
    stepCount++;
    const words=String(step).trim().split(/\s+/).filter(Boolean).length;
    maxStepWords=Math.max(maxStepWords,words);
  }
}
const report={
  schemaVersion:'1.0.0',
  source:{path:input,sha256:sourceHash},
  recipeCount:recipes.length,
  artworkGroupCounts:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),
  stepCount,
  maxStepWords,
  artworkMetadataCoverage:{present:recipes.length-missingArtwork.length,missing:missingArtwork.length,missingRecipes:missingArtwork},
  quizCoverage:{complete:recipes.length-missingQuiz.length,missing:missingQuiz.length,missingRecipes:missingQuiz},
  verifiedNutritionCoverage:{verified:recipes.length-missingNutrition.length,unverified:missingNutrition.length,recipes:missingNutrition},
  recipeSafetySourceCoverage:{present:recipes.length-missingPerRecipeSafety.length,missing:missingPerRecipeSafety.length},
  releaseReady:false,
  releaseBlockers:[
    'The visual pilot catalog still needs the complete 95-recipe migration and reviewed concise steps.',
    'Artwork assets and mappings must be completed and reviewed for all 95 recipes.',
    'Three recipe-specific quiz questions must be reviewed for every recipe.',
    'Nutrition values require source mapping, verification and independent review before nutrition-based planning.'
  ]
};
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
if(recipes.length!==95)throw new Error(`Expected 95 source recipes; found ${recipes.length}.`);
const counts=report.artworkGroupCounts;
if(counts.aaria!==65||counts.family!==15||counts.friends!==15)throw new Error(`Unexpected artwork assignment counts: ${JSON.stringify(counts)}`);
console.log(`Audited ${recipes.length} recipes (${counts.aaria}/${counts.family}/${counts.friends}); ${missingArtwork.length} lack artwork metadata, ${missingQuiz.length} lack three quiz questions, and ${missingNutrition.length} lack verified nutrition.`);
