#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..'));
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function parseJsonAfter(marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('Missing source marker: ' + marker);
  const offset = start + marker.length;
  const first = source.slice(offset).search(/[\[{]/);
  if (first < 0) throw new Error('Missing JSON value after: ' + marker);
  const begin = offset + first, opener = source[begin], closer = opener === '[' ? ']' : '}';
  let depth = 0, quoted = false, escaped = false;
  for (let i = begin; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === opener) depth++;
    else if (c === closer && --depth === 0) return JSON.parse(source.slice(begin, i + 1));
  }
  throw new Error('Unterminated JSON value after: ' + marker);
}
const recipes = parseJsonAfter('const RECIPES=');
const drafts = {};
const roleCopy = {};
for (const name of ['pt-BR-recipes-66-80-review.json', 'pt-BR-recipes-81-95-review.json']) {
  const file = JSON.parse(fs.readFileSync(path.join(root, 'tools/v3/data', name), 'utf8'));
  if (file.status !== 'W01_DRAFT_PENDING_INDEPENDENT_REVIEW' || file.locale !== 'pt-BR') throw new Error(name + ' lost its review-pending declaration');
  Object.assign(drafts, file.recipes);
  if (file.familyRoleCopy) roleCopy.family = file.familyRoleCopy;
  if (file.friendsRoleCopy) roleCopy.friends = file.friendsRoleCopy;
}
if (typeof roleCopy.family !== 'string' || typeof roleCopy.friends !== 'string') throw new Error('Family/Friends PT-BR role text is missing');
const wanted = Array.from({length:30}, (_,i)=>String(i+66));
const actual = Object.keys(drafts).sort((a,b)=>Number(a)-Number(b));
if (actual.join(',') !== wanted.join(',')) throw new Error('Expected exactly translation drafts for IDs 66–95; got ' + actual.join(','));
function quantities(text) { return (String(text).match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>Number(x.replace(',','.'))); }
let checkedSteps = 0, checkedIngredients = 0;
for (const id of wanted) {
  const src = recipes.find(r=>r.id===Number(id)), draft = drafts[id];
  if (!src || !draft.title || !draft.safety) throw new Error('Recipe '+id+' is missing canonical source/title/safety translation');
  for (const field of ['ingredients','steps']) {
    if (!Array.isArray(src[field]) || !Array.isArray(draft[field]) || src[field].length !== draft[field].length) throw new Error('Recipe '+id+' '+field+' count differs from the source');
    if (field === 'steps') checkedSteps += src[field].length; else checkedIngredients += src[field].length;
  }
  for (let i=0;i<src.ingredients.length;i++) {
    if (quantities(src.ingredients[i]).join(',') !== quantities(draft.ingredients[i]).join(',')) throw new Error('Recipe '+id+' ingredient '+(i+1)+' quantity changed: '+src.ingredients[i]+' -> '+draft.ingredients[i]);
  }
  for (let i=0;i<src.steps.length;i++) {
    if (/\badult\b/i.test(src.steps[i]) && !/adult[oa]/i.test(draft.steps[i])) throw new Error('Recipe '+id+' step '+(i+1)+' omitted an adult-assistance cue');
  }
  if (/\badult\b/i.test(src.safety) && !/adult[oa]/i.test(draft.safety)) throw new Error('Recipe '+id+' safety copy omitted adult assistance');
  for (const field of ['title','safety',...(src.extras ? ['extras'] : []),...(src.description ? ['description'] : [])]) {
    if (Array.isArray(src[field])) {
      if (draft[field] && draft[field].length !== src[field].length) throw new Error('Recipe '+id+' '+field+' count differs from the source');
    } else if (src[field] && !draft[field]) throw new Error('Recipe '+id+' is missing PT-BR '+field);
  }
}
if (recipes.length !== 95 || new Set(recipes.map(r=>r.id)).size !== 95 || recipes.some((r,i)=>r.id!==i+1)) throw new Error('Canonical catalog must remain exactly IDs 1–95');
console.log(JSON.stringify({status:'PASS_DRAFT_CONTRACTS',canonicalRecipes:recipes.length,translatedDraftIds:actual.length,ingredients:checkedIngredients,steps:checkedSteps,quantities:'preserved',adultCues:'preserved',groupRoleCopy:Object.keys(roleCopy),acceptance:'BLOCKED_PENDING_A08_A09_AND_NATIVE_REVIEW'},null,2));
