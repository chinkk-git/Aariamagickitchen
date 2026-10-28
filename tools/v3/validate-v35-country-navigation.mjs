#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWorldAdventureHost,normalizeWorldDishSource,V35_COUNTRY_RECIPE_IDS} from './world-adventure-host.mjs';

const root=resolve(new URL('../..',import.meta.url).pathname);
const read=p=>readFileSync(resolve(root,p),'utf8');
const sha=p=>createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex');
const idsByCountry={IND:[51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74],ITA:[96,97,98],CHN:[99,100,101],JPN:[102,103,104],MEX:[105,106,107],VNM:[108,109,110,111,112,113,114,115,116],BRA:[],USA:[],FRA:[],ESP:[],THA:[],GBR:[],MAR:[]};
const counts=Object.fromEntries(Object.entries(idsByCountry).map(([code,ids])=>[code,ids.length]));
const names={IND:['India','Índia','🇮🇳'],ITA:['Italy','Itália','🇮🇹'],CHN:['China','China','🇨🇳'],JPN:['Japan','Japão','🇯🇵'],MEX:['Mexico','México','🇲🇽'],VNM:['Vietnam','Vietnã','🇻🇳'],BRA:['Brazil','Brasil','🇧🇷'],USA:['United States','Estados Unidos','🇺🇸'],FRA:['France','França','🇫🇷'],ESP:['Spain','Espanha','🇪🇸'],THA:['Thailand','Tailândia','🇹🇭'],GBR:['United Kingdom','Reino Unido','🇬🇧'],MAR:['Morocco','Marrocos','🇲🇦']};
assert.deepEqual(V35_COUNTRY_RECIPE_IDS,idsByCountry,'runtime map must match the V3.5 country assignments');
const allMapped=Object.values(idsByCountry).flat();
assert.equal(new Set(allMapped).size,allMapped.length,'country map cannot duplicate recipe IDs');
assert.deepEqual(allMapped.filter(id=>id>=96).sort((a,b)=>a-b),Array.from({length:21},(_,i)=>96+i),'existing + expansion recipes #096–116 must all map once');
assert.equal(normalizeWorldDishSource('international-wave-1/content/international/countries/china/099-vegetable-fried-rice/artwork/finished-dish.png'),'international-wave-1/content/international/countries/china/099-vegetable-fried-rice/artwork/finished-dish.png','China country thumbnail must retain its packaged image path');
assert.equal(normalizeWorldDishSource('international-wave-1/content/international/countries/vietnam/116-air-fryer-banana-coconut-bites/artwork/finished-dish.png'),'international-wave-1/content/international/countries/vietnam/116-air-fryer-banana-coconut-bites/artwork/finished-dish.png','Vietnam country thumbnail must retain its packaged image path');
assert.equal(normalizeWorldDishSource(`android-inline-art/${'a'.repeat(64)}.webp`),`android-inline-art/${'a'.repeat(64)}.webp`,'externalized Android recipe thumbnail must remain visible');
assert.equal(normalizeWorldDishSource('data:image/webp;base64,AAAA'),'data:image/webp;base64,AAAA','inline Web recipe thumbnail must remain supported');
assert.equal(normalizeWorldDishSource('https://example.invalid/dish.png'),'','remote artwork must not be loaded into country lists');
assert.equal(normalizeWorldDishSource('international-wave-1/../../secret.png'),'','path traversal must not be accepted as artwork');
const source=read('index.html'),base=JSON.parse(source.match(/const RECIPES=(\[.*?\]);/s)?.[1]||'null');
assert.equal(base.length,95,'the original app catalogue baseline must remain 95 recipes');
assert.equal(new Set(base.map(r=>Number(r.id))).size,95,'the original recipe IDs must remain unique');
assert.deepEqual([...base.map(r=>Number(r.id))].sort((a,b)=>a-b),Array.from({length:95},(_,i)=>i+1),'original IDs #001–095 must remain unchanged and complete');
const pkg=JSON.parse(read('phase2-pilot/apps/aaria-android/app/src/debug/assets/artwork-review/international-wave-1/recipes.json'));
assert.equal(pkg.recipes.length,21,'review build must include all 21 international recipes (#096–116)');
assert.equal(new Set([...base.map(r=>Number(r.id)),...pkg.recipes.map(r=>Number(r.id))]).size,116,'the final app must expose 116 unique recipes');
assert.deepEqual([...base.map(r=>Number(r.id)),...pkg.recipes.map(r=>Number(r.id))].sort((a,b)=>a-b),Array.from({length:116},(_,i)=>i+1),'the production recipe set must contain exactly IDs #001–116');
const slugByCode={IND:'india',ITA:'italy',CHN:'china',JPN:'japan',MEX:'mexico',VNM:'vietnam'};
const countryById=Object.fromEntries(Object.entries(idsByCountry).flatMap(([code,ids])=>ids.map(id=>[id,slugByCode[code]])));
for(const recipe of pkg.recipes)assert.equal(recipe.country,countryById[Number(recipe.id)],`#${recipe.id} primary country must match the approved registry`);
const manifest=JSON.parse(read('content/international/country-navigation-manifest.json'));
assert.equal(manifest.status,'V3.5_REVIEW_BUILD_ONLY');
for(const [code,expectedIds] of Object.entries(idsByCountry)){
  const country=manifest.countries.find(x=>x.countryCode===code);
  assert.ok(country,`${code} mapping and artwork manifest entry required`);
  assert.deepEqual(country.recipeIds,expectedIds,`${code} recipe IDs must match the canonical map`);
  assert.equal(country.recipeIds.length,counts[code],`${code} count mismatch`);
  assert.deepEqual([country.name['en-GB'],country.name['pt-BR'],country.flag],names[code],`${code} country names/flag mismatch`);
  if(expectedIds.length===0){
    assert.equal(country.destinationTreatment,'NO_APPROVED_RECIPES','empty destinations must keep the approved empty-destination treatment');
    assert.equal(country.artwork,null,'do not invent separate artwork for an empty destination');
    continue;
  }
  assert.equal(country.artwork.rightsStatus,'PENDING_INDEPENDENT_RIGHTS_REVIEW');
  assert.equal(country.artwork.reviewStatus,'PENDING_VISUAL_AND_COUNTRY_ACCURACY_REVIEW');
  assert.equal(sha(country.artwork.path),country.artwork.sha256,`${code} landmark artwork hash mismatch`);
}
const records=[...base.map(r=>({id:r.id,title:r.title,description:r.description})),...pkg.recipes.map(r=>({id:Number(r.id),title:r.locales['en-GB'].title,description:r.locales['en-GB'].description}))];
const opened=[];
const host=createWorldAdventureHost({canonicalRecipes:records,locale:'en-GB',countryRecipeIds:V35_COUNTRY_RECIPE_IDS,
  getLocalizedRecipe:r=>({title:r.title,description:r.description}),onOpenRecipe:id=>{opened.push(id);return true},onBack:()=>true,onOpenPassport:()=>true});
for(const [code,expectedIds] of Object.entries(idsByCountry)){
  const country=host.getCountry(code);
  if(expectedIds.length===0){assert.equal(country.available,false,`${code} without approved recipes must not open a populated route`);assert.deepEqual(country.recipes,[]);continue;}
  assert.equal(country.available,true,`${code} flag must select an accessible list`);
  assert.equal(country.label,names[code][0]);assert.equal(country.flag,names[code][2]);
  assert.deepEqual(country.recipes.map(r=>r.id),expectedIds,`${code} recipe list mismatch`);
  assert.equal(country.reviewOnly,code!=='IND','only unapproved international lists are review-only');
}
for(let id=96;id<=116;id++)assert.equal(host.openRecipe(id),true,`#${id} must route to the recipe screen`);
assert.deepEqual(opened,Array.from({length:21},(_,i)=>96+i));
const runtime=read('tools/v3/runtime.js'),globe=read('tools/v3/world-adventure-globe/world-adventure-globe.js');
for(const token of ['IND','ITA','CHN','JPN','MEX','VNM'])assert.ok(runtime.includes(`code:'${token}'`),`Home country card ${token} missing`);
assert.ok(runtime.includes('countries.map((c,i)=>')&&runtime.includes('data-v31-card-country="${c.code}"'),'Home carousel cards must be clickable country routes');
assert.ok(runtime.includes('v35WorldEntryIntent={reset:true,country:v31SelectedCountry}'),'Home cards must open the selected country list');
assert.ok(runtime.includes('v35WorldEntryIntent={reset:true}'),'new World entries must reset to the unselected globe');
assert.ok(runtime.includes('RECIPES.push(r);'),'international records must join the canonical recipe collection used by All Recipes');
assert.ok(runtime.includes('data-open="${r.id}"'),'All Recipes cards must route through the canonical recipe ID');
assert.ok(globe.includes('routeEnabled: country.available === true && recipe.canonical === true'),'country recipes must route to the approved template');
assert.ok(globe.includes('closeCountryPanel()'),'Android Back/X country panel close support must remain wired');
console.log('PASS: shared 13-country mapping, populated Home routes, 21 international routes #096–116, 116 unique IDs, artwork paths/hashes, empty destinations without invented artwork, and review-only artwork gates.');
