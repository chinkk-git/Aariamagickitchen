import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const adb=args=>execFileSync('timeout',['--kill-after=10s','60s','adb',...args],{timeout:70_000,maxBuffer:16*1024*1024});
mkdirSync('artifacts/v32-android-screenshots/international-wave-1',{recursive:true});
mkdirSync('artifacts/v32-diagnostics',{recursive:true});
let target;
for(let i=0;i<60&&!target;i++){
  try{const pages=await(await fetch('http://127.0.0.1:9222/json')).json();target=pages.find(p=>p.type==='page'&&p.url?.includes('/artwork-review/international-wave-1/index.html'))}catch{}
  if(!target)await pause(500);
}
assert.ok(target,'Android WebView did not open the pinned international review route');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let sequence=0;const pending=new Map();
ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(!msg.id||!pending.has(msg.id))return;const p=pending.get(msg.id);pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result)});
function command(method,params={}){const id=++sequence;const promise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('DevTools command timed out: '+method))},20000);pending.set(id,{resolve,reject,timer})});ws.send(JSON.stringify({id,method,params}));return promise}
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||'WebView evaluation failed');return result.result?.value}
await command('Runtime.enable');await command('Page.enable');
const initial=await evaluate(`(async()=>{const recipes=packageData;const paths=[...new Set(recipes.flatMap(r=>r.artworkAssetPaths))];const assets=await Promise.all(paths.map(async path=>{const response=await fetch('/international-wave-1/'+path);const bytes=new Uint8Array(await response.arrayBuffer());return {path,ok:response.ok,png:bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,size:bytes.length}}));return {title:document.title,template:document.querySelector('.v32-r12-main')?.dataset.v32Template,hasIngredients:!!document.querySelector('.v32-r12-ingredients'),hasGuidedSteps:!!document.querySelector('.v32-r12-cook'),source:recipes.map(r=>r.locales['en-GB'].international.sourceCommit),ids:recipes.map(r=>r.id),assets,external:performance.getEntriesByType('resource').map(x=>x.name).filter(x=>!x.startsWith(location.origin)),csp:document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content}})()`);
assert.equal(initial.title,'Wave 1 Recipe Template Review');assert.deepEqual(initial.ids,[96,99]);assert.ok(initial.source.every(x=>x==='451ab0bf8a3ab1867cf004a113d3d8e6896ccf60'));
assert.equal(initial.template,'recipe-step-v1');assert.ok(initial.hasIngredients&&initial.hasGuidedSteps,'Wave 1 must use the approved Ingredients and Guided Steps template structure');
assert.equal(initial.assets.length,42);assert.ok(initial.assets.every(x=>x.ok&&x.png&&x.size>1000),'All 42 package artwork images must load from local appassets');assert.deepEqual(initial.external,[],'Offline route must not request external resources');assert.match(initial.csp,/connect-src 'self'/);
const screenshots=[];
function capture(name,landscape){const bytes=adb(['exec-out','screencap','-p']);assert.ok(bytes.length>10000,name+' screenshot is unexpectedly small');assert.equal(bytes.toString('ascii',1,4),'PNG');const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);assert.equal(width>height,landscape,name+' screenshot orientation mismatch');const path='artifacts/v32-android-screenshots/international-wave-1/'+name+'.png';writeFileSync(path,bytes);const digest=createHash('sha256').update(readFileSync(path)).digest('hex');screenshots.push({path,width,height,bytes:bytes.length,sha256:digest});}
async function captureStep(recipeIndex,id,locale,index,landscape,tag){
  const step=await evaluate(`(()=>{const source=packageData[${recipeIndex}].locales[${JSON.stringify(locale)}].steps[${index}],card=document.querySelector('#app .ref-step-card.active'),image=card?.querySelector('.v32-r12-step-visual img'),safety=card?.querySelector('.v32-r12-safety')?.innerText||'',imageSrc=image?.getAttribute('src')||'';return {index:Number(card?.dataset.stepIndex||0),title:card?.querySelector('.ref-step-title strong')?.textContent?.trim()||'',expectedTitle:source.title,instruction:card?.querySelector('[data-original-source="recipe-step"]')?.textContent?.trim()||'',expectedInstruction:source.instruction,image:imageSrc,normalizedImage:imageSrc.replace(/^\\/international-wave-1\\//,''),expectedImage:source.image?.path||source.image,imageLoaded:!!image?.complete&&image.naturalWidth>0,safety,expectedSafety:source.safety,expectedAdultAssist:source.adultAssist}})()`);
  assert.equal(step.index,index+1,`Recipe #${id} step ${index+1} did not render`);
  assert.equal(step.title,step.expectedTitle,`Recipe #${id} step ${index+1} title does not match ${locale}`);
  assert.equal(step.instruction,step.expectedInstruction,`Recipe #${id} step ${index+1} instruction does not match ${locale}`);
  assert.equal(step.normalizedImage,step.expectedImage,`Recipe #${id} step ${index+1} uses the wrong illustrated asset`);
  assert.ok(step.imageLoaded,`Recipe #${id} step ${index+1} illustration did not load`);
  assert.ok(step.safety.includes(step.expectedSafety)&&step.safety.includes(step.expectedAdultAssist),`Recipe #${id} step ${index+1} safety/adult role copy is incomplete`);
  await pause(150);capture(tag+'-step-'+String(index+1).padStart(2,'0'),landscape);
}
const orientationTrace=[];
async function setOrientation(landscape){
  const target=landscape?'landscape':'portrait';
  const viewport=()=>evaluate('({width:innerWidth,height:innerHeight})');
  adb(['shell','settings','put','system','accelerometer_rotation','0']);
  const attempts=[];
  for(const rotation of [0,1,2,3]){
    const before=await viewport();
    adb(['shell','settings','put','system','user_rotation',String(rotation)]);
    const configured=adb(['shell','settings','get','system','user_rotation']).toString('utf8').trim();
    let after=before;
    for(let i=0;i<24;i++){
      await pause(250);
      after=await viewport();
      if((after.width>after.height)===landscape){
        await pause(100);
        const settled=await viewport();
        await pause(100);
        after=await viewport();
        if((settled.width>settled.height)===landscape&&settled.width===after.width&&settled.height===after.height){
          const record={target,rotation,configured,before,after,matched:true};
          attempts.push(record);orientationTrace.push(...attempts);return after;
        }
      }
    }
    attempts.push({target,rotation,configured,before,after,matched:false});
  }
  orientationTrace.push(...attempts);
  throw new Error('Android failed to reach '+target+' WebView orientation: '+JSON.stringify({target,attempts}));
}
async function waitImages(){for(let i=0;i<30;i++){const loaded=await evaluate(`[...document.querySelectorAll('#app img')].every(x=>x.complete&&x.naturalWidth>0)`);if(loaded)return;await pause(200)}throw new Error('Recipe template images failed to load')}
const matrix=[];
for(const landscape of [false,true]){
  await setOrientation(landscape);
  for(const [recipeIndex,id] of [[0,96],[1,99]])for(const locale of ['en-GB','pt-BR']){
    const state=await evaluate(`(()=>{document.querySelector('#locale').value=${JSON.stringify(locale)};document.querySelector('#locale').dispatchEvent(new Event('change'));document.querySelector(${JSON.stringify(id===96?'#r96':'#r99')}).click();window.scrollTo(0,0);const r=packageData[${recipeIndex}].locales[${JSON.stringify(locale)}];return {id:r.id,title:r.title,ingredientCount:r.ingredients.length,equipmentCount:r.equipmentItems.length,stepCount:r.steps.length,adultHelp:r.adultHelp,crossContact:r.crossContact}})()`);
    assert.equal(state.id,id);assert.ok(state.title&&state.ingredientCount>0&&state.equipmentCount>0&&state.stepCount>0);assert.ok(state.adultHelp&&state.crossContact,'Safety and cross-contact disclosures must be rendered');
    await waitImages();await pause(350);const tag=(landscape?'landscape':'portrait')+'-'+id+'-'+locale;
    const detail=await evaluate(`(()=>({title:document.querySelector('#app .v32-r12-title-block h1')?.textContent,ingredients:document.querySelectorAll('#app .v32-r12-ingredients .ref-ingredient').length,safety:document.querySelector('#app .v32-r12-recipe-safety')?.innerText||'',crossContact:packageData[${recipeIndex}].locales[${JSON.stringify(locale)}].crossContact,adultHelp:packageData[${recipeIndex}].locales[${JSON.stringify(locale)}].adultHelp}))()`);
    assert.equal(detail.title,state.title);assert.equal(detail.ingredients,state.ingredientCount);assert.ok(detail.safety.includes(detail.crossContact)&&detail.safety.includes(detail.adultHelp),'Recipe cross-contact and adult-help disclosures must match the locale package');capture(tag+'-ingredients',landscape);
    await captureStep(recipeIndex,id,locale,0,landscape,tag);
    for(let index=1;index<state.stepCount;index++){await evaluate("document.querySelector('#next').click()");const step=await evaluate(`Number(document.querySelector('#app .ref-step-card.active')?.dataset.stepIndex||0)`);assert.equal(step,index+1,`Recipe #${id} Guided Step ${index+1} navigation failed`);await waitImages();await captureStep(recipeIndex,id,locale,index,landscape,tag)}
    const final=await evaluate(`(()=>({step:Number(document.querySelector('#app .ref-step-card.active')?.dataset.stepIndex||0),count:packageData[${recipeIndex}].locales[${JSON.stringify(locale)}].steps.length,safety:document.querySelector('#app .v32-r12-safety')?.innerText}))()`);
    assert.equal(final.step,final.count);assert.ok(final.safety);await evaluate("document.querySelector('#next').click()");assert.match(await evaluate("document.querySelector('#app .v32-r12-completion')?.innerText||''"),/RECIPE COMPLETE|RECEITA CONCLUÍDA/i);await pause(250);capture(tag+'-completion',landscape);
    matrix.push({recipeId:id,locale,orientation:landscape?'landscape':'portrait',ingredients:state.ingredientCount,equipment:state.equipmentCount,steps:state.stepCount,status:'PASS'});
  }
}
const report={route:target.url,sourceCommit:'451ab0bf8a3ab1867cf004a113d3d8e6896ccf60',recipeIds:[96,99],matrix,verifiedArtworkFiles:initial.assets.length,offline:true,orientationTrace,screenshots,independentGates:{A08:'PENDING',A09:'PENDING',nutrition:'PENDING',artworkRights:'PENDING',security:'PENDING',release:'NOT_AUTHORIZED'}};
writeFileSync('artifacts/v32-diagnostics/international-wave-1-android-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));ws.close();
