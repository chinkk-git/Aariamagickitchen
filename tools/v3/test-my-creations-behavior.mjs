import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('./runtime.js',import.meta.url),'utf8'),start=source.indexOf('/* __V3_CREATIONS_MODEL_START__ */'),end=source.indexOf('/* __V3_CREATIONS_MODEL_END__ */');assert.ok(start>=0&&end>start,'model markers exist');const context=vm.createContext({});vm.runInContext(source.slice(start,end),context);const valid=id=>[12,51,116].includes(Number(id));
const legacy=[{recipeId:12,savedAt:'2026-10-28T10:00:00.000Z'},{recipeId:12,legacyPhoto:'preserve-photo-reference'},51,{photoReference:'preserve-unrelated-entry'}],migrated=context.v3NormalizeCreationRecords(legacy,[51,116],false,valid);
assert.deepEqual(Array.from(migrated.records,r=>r.recipeId),[12,51,116]);assert.equal(migrated.records[0].completedAt,'2026-10-28T10:00:00.000Z');assert.equal(migrated.records[0].legacyPhoto,'preserve-photo-reference');assert.equal(migrated.records[2].completedAt,null);assert.equal(migrated.migrated,true);
const again=context.v3NormalizeCreationRecords(migrated.entries,[12,51,116],true,valid);assert.deepEqual(Array.from(again.records,r=>r.recipeId),[12,51,116]);
const repeated=context.v3UpsertCreationRecords(again.entries,12,'2026-10-29T12:00:00.000Z',valid);assert.equal(repeated.filter(r=>Number(r?.recipeId)===12).length,1);assert.equal(repeated.find(r=>r.recipeId===12).completedAt,'2026-10-29T12:00:00.000Z');
const removed=context.v3RemoveCreationRecords(repeated,51,valid);assert.deepEqual(Array.from(removed.filter(r=>Number(r?.recipeId)).map(r=>r.recipeId)),[12,116]);assert.ok(removed.some(r=>r?.photoReference==='preserve-unrelated-entry'));
const cleared=context.v3ClearCreationRecords(removed,valid);assert.deepEqual(Array.from(cleared.filter(r=>Number(r?.recipeId)).map(r=>r.recipeId)),[]);assert.ok(cleared.some(r=>r?.photoReference==='preserve-unrelated-entry'));
const page=source.slice(source.indexOf('function v3CreationsPage(){'),source.indexOf('const v3RenderBeforeProfileControls=render;'));assert.match(page,/homeTile\(r\)/);assert.match(page,/<time class="v3-creation-date"/);assert.match(page,/data-v3-creation-action="remove"/);assert.match(page,/data-v3-creation-action="clear"/);assert.doesNotMatch(page,/sharePostBlobs|sharePostUrls/);
const sharing=source.slice(source.indexOf('const v3OriginalCookSection'),source.indexOf('async function v3ShowGroceryRecipients'));assert.doesNotMatch(sharing,/myCreations/);assert.match(sharing,/sharePostBlobs\[Number\(id\)\]/);assert.match(sharing,/AariaNative\.sharePost\(String\(data\),caption\)/);
assert.match(source,/state\.myCreations=v3RemoveCreationRecords[\s\S]*?save\(\);render\(\)/);assert.match(source,/state\.myCreations=v3UpsertCreationRecords[\s\S]*?save\(\)/);const builder=fs.readFileSync(new URL('../../web-v3.5/scripts/build.mjs',import.meta.url),'utf8');
assert.match(builder,/window\.v3RenderCompletedCreations/,'Web build delegates My Creations to shared completed-dish renderer');
assert.match(builder,/storeCreationPhoto\(id, blob\)/,'build guards the legacy persistence source before removing its calls');
assert.match(builder,/Photo ready to share; it was not added to My Creations/);
assert.match(builder,/adapter\.replace\(photoRailHydration, ''\)/,'Web build does not hydrate old child photos into creation rails');
const shareStart=source.indexOf('function v3CookPostFile(id){'),shareEnd=source.indexOf('\n\nasync function v3ShowGroceryRecipients',shareStart);
assert.ok(shareStart>=0&&shareEnd>shareStart,'Web share implementation is present');
const shareSource=source.slice(shareStart,shareEnd);
assert.match(shareSource,/navigator\.canShare\(\{files:\[file\]\}\)/);
assert.match(shareSource,/navigator\.share\(\{files:\[file\]/);
assert.match(shareSource,/AbortError[\s\S]*Sharing cancelled/);
assert.match(source,/data-action="save-cook-photo"/);
function shareHarness(canShare=true,shareImpl=()=>Promise.resolve()){
 const notices=[],downloads=[],calls=[];
 const link={href:'',download:'',rel:'',click(){downloads.push(this.download)},remove(){}};
 class TestFile{constructor(parts,name,options){this.parts=parts;this.name=name;this.type=options.type}}
 const ctx=vm.createContext({
  sharePostBlobs:{12:{type:'image/png',size:3}},sharePostUrls:{12:'blob:post'},
  find:id=>({id,title:'Cheesy Corn Pancakes'}),state:{language:'en-GB'},window:{},
  navigator:{canShare:()=>canShare,share:payload=>{calls.push(payload);return shareImpl(payload)}},
  File:TestFile,translateText:value=>value,notice:value=>notices.push(value),
  document:{createElement:()=>link,body:{append(){}}},URL:{createObjectURL:()=> 'blob:download',revokeObjectURL(){}},
  setTimeout:callback=>callback(),console:{error(){},warn(){}}
 });
 vm.runInContext('let shareCook=function(){};\n'+shareSource,ctx);
 return{ctx,notices,downloads,calls};
}
const supported=shareHarness(true);
const sharePromise=vm.runInContext('shareCook(12)',supported.ctx);
assert.equal(supported.calls.length,1,'native Web Share is called synchronously from the Share button handler');
assert.equal(supported.calls[0].files[0].name,'aaria-recipe-12.png');
assert.equal(supported.calls[0].files[0].type,'image/png');
await sharePromise;
assert.match(supported.notices.at(-1),/Photo shared/);
const cancelled=shareHarness(true,()=>Promise.reject(Object.assign(new Error('cancel'),{name:'AbortError'})));
await vm.runInContext('shareCook(12)',cancelled.ctx);
assert.match(cancelled.notices.at(-1),/Sharing cancelled/);
assert.equal(cancelled.downloads.length,0,'cancelling share does not report success or download silently');
const unsupported=shareHarness(false);
await vm.runInContext('shareCook(12)',unsupported.ctx);
assert.equal(unsupported.calls.length,0);
assert.equal(unsupported.downloads.length,0,'unsupported share presents an explicit save action');
assert.match(unsupported.notices.at(-1),/Tap “Save Photo to Share”/);
assert.equal(vm.runInContext('v3SaveCookPhoto(12)',unsupported.ctx),true);
assert.deepEqual(unsupported.downloads,['aaria-recipe-12.png']);
assert.match(unsupported.notices.at(-1),/Photo downloaded/);
assert.match(builder,/function v34CreationsPage\(\) \{ return window\.v3RenderCompletedCreations\(\); \}/);
console.log('My Creations and Web photo-sharing focused checks passed.');
