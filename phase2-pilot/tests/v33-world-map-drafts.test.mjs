import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadInternationalRecipeHandoff } from '../../tools/v3/international-recipe-adapter.mjs';

const root = new URL('../../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const commit = '0123456789abcdef0123456789abcdef01234567';
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(24)]);

async function fixture(status = 'READY_FOR_INTEGRATION') {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'w02-int-'));
  const bundle = path.join(directory, 'content/international/countries/italy/096-pasta');
  await mkdir(path.join(bundle, 'artwork/steps'), { recursive: true });
  const assets = ['artwork/finished-dish.png','artwork/ingredients/tomato.png','artwork/equipment/pan.png','artwork/steps/step-01.png'];
  for (const file of assets) { const target=path.join(bundle,file); await mkdir(path.dirname(target),{recursive:true}); await writeFile(target,png); }
  const record = {id:96,country:'italy',title:{'en-GB':'Tomato Basil Pasta','pt-BR':'Massa de tomate e manjericão'},ingredients:[{id:'tomato'}],equipment:[{id:'pan'}],steps:[{order:1,instruction:{'en-GB':'Stir the sauce.','pt-BR':'Mexa o molho.'}}],allergens:[],adult_assistance:{'en-GB':'Adult handles hot pan.','pt-BR':'Adulto manuseia a panela quente.'},nutrition:{per_serving:{kcal:100},sources:['https://fdc.nal.usda.gov/']}};
  await writeFile(path.join(bundle,'recipe.json'),JSON.stringify(record));
  await writeFile(path.join(bundle,'recipe.md'),'review bundle fixture');
  const independent_reviews={a08:'PENDING',a09:'PENDING',nutrition:'APPROVED',culture:'APPROVED',duplicate:'APPROVED',security:'PENDING',artwork_rights:'APPROVED'};
  const recipe={id:96,country:'italy',status,recipe_json:'content/international/countries/italy/096-pasta/recipe.json',recipe_md:'content/international/countries/italy/096-pasta/recipe.md',artwork_ready:true,independent_reviews,artwork_assets:assets.map(file=>({path:`content/international/countries/italy/096-pasta/${file}`,sha256:createHash('sha256').update(png).digest('hex')}))};
  const manifest={schema_version:'1.0',integration_status:'READY_FOR_INTEGRATION',source_commit:commit,canonical_existing_recipe_count:95,india_mapping_status:'VALIDATED',production_artwork_approved:true,recipes:[recipe]};
  await writeFile(path.join(directory,'content/international/manifest.json'),JSON.stringify(manifest));
  return {directory,manifest,recipe};
}

test('the five-country registry stays review-only and the fixed map exposes India only', async () => {
  const validator = spawnSync(process.execPath, ['tools/v3/validate-v33-world-map-drafts.mjs'], { cwd: new URL('../../', import.meta.url), encoding: 'utf8' });
  assert.equal(validator.status,0,validator.stderr||validator.stdout);
  assert.match(validator.stdout,/five-country draft registry: valid/);
  const runtime=await read('tools/v3/runtime.js');
  const page=runtime.slice(runtime.lastIndexOf('v31WorldPage=function v33FixedWorldMapPage(){'),runtime.indexOf('const v3OriginalCreateWeek'));
  assert.match(page,/data-v31-country="IND"/);
  assert.ok(page.includes('V31_APPROVED_INDIA_RECIPE_IDS.map(id=>find(id))'));
  assert.doesNotMatch(page,/V31_WORLD_DESTINATIONS|V31_WORLD_ADVENTURE|data-v31-zoom|data-v31-pan-toggle|v31MapSvg/);
  assert.match(page,/w02-country-recipes/);
  assert.match(page,/w02-passport-button/);
});

test('fixed map keeps the owner-approved image bytes, aspect ratio and direct route controls', async () => {
  const [transform,runtime,css,smoke,mapCrop]=await Promise.all([
    read('tools/v3/transform-production.mjs'),read('tools/v3/runtime.js'),read('tools/v3/home-world-visual.css'),
    read('.github/scripts/v33-world-map-sample-smoke.mjs'),readFile(new URL('docs/design/approved-v31-world-map-crop.webp',root))
  ]);
  assert.match(transform,/worldMap: readReferenceImage\('docs\/design\/approved-v31-world-map-crop\.webp'\)/);
  assert.match(runtime,/mapArt\.src=V31_HOME_WORLD_ART\.worldMap/);
  assert.match(css,/\.w02-map-art \.v31-map-art-image\{[^}]*object-fit:contain/);
  assert.match(css,/\.w02-map-viewport\{[^}]*flex:1 1 auto/);
  assert.match(css,/\.w02-map-caption\{[^}]*position:absolute/,'map guidance stays over the viewport so its full Android-rendered area is available to the map');
  assert.match(smoke,/vr\.width\*vr\.height\/\(sr\.width\*sr\.height\)/);
  assert.match(smoke,/world-map-phone-portrait/);
  assert.match(smoke,/world-map-phone-landscape/);
  assert.match(smoke,/country-preview-phone-portrait/);
  assert.match(smoke,/food-passport-offline-restart-persistence/);
  assert.equal(createHash('sha256').update(mapCrop).digest('hex'),'5296a636c86f2d0f8a12c60406fa366723cb442c292cc2d3bd6b3f1b90afa353');
});

test('phone and tablet smoke measure Android geometry and preserve G1/G2/G3 coverage', async () => {
  const [phone,phoneLaunch,tablet,workflow,regression]=await Promise.all([
    read('.github/scripts/v33-world-map-sample-smoke.mjs'),read('.github/scripts/v33-world-map-sample-smoke.sh'),read('.github/scripts/v32-android-tablet-smoke.sh'),
    read('.github/workflows/v32-android.yml'),read('.github/scripts/v32-android-smoke.sh')
  ]);
  for (const script of [phone,tablet,regression]) {
    assert.match(script,/occupancy/);
    assert.match(script,/717\/389/);
    assert.match(script,/data-v31-country/);
    assert.match(script,/w02-country-recipes/);
    assert.doesNotMatch(script,/two-finger-pinch|Natural pinch zoom|Natural one-finger drag/);
  }
  assert.match(phone,/Input\.dispatchTouchEvent/,'sample taps the country marker through Android WebView input');
  assert.match(phone,/const mapShot=screenshot\('world-map-phone-portrait'\)/);
  assert.match(phone,/countryShot\.sha256===mapShot\.sha256/,'Android country preview evidence must contain the rendered card overlay, not a stale map frame');
  assert.match(await read('tools/v3/runtime.js'),/e\.state\?\.v31Panel==='country'&&location\.hash==='#aria\/world'[\s\S]*?view='world';v31MapPanel='country'/,'Android Back from recipe restores the India card panel state');
  assert.match(phone,/cmd','connectivity','airplane-mode','enable/);
  assert.match(phone,/food-passport-offline-restart-persistence/);
  assert.match(phoneLaunch,/for pid in \$pids/,'sample checks every current app process instead of forwarding to the first pid');
  assert.match(phoneLaunch,/127\.0\.0\.1:9224\/json/,'sample verifies a live app-owned DevTools page before connecting');
  assert.match(phoneLaunch,/pm clear \"\$APP_ID\"/,'sample clears the fresh app profile before launching the app');
  assert.match(phoneLaunch,/ANDROID_DEVTOOLS_TARGET=/,'sample passes the verified WebView target directly to the smoke process');
  assert.match(phoneLaunch,/devtools-sockets\.txt/,'sample records process/socket diagnostics if DevTools stays unavailable');
  assert.match(phone,/ANDROID_DEVTOOLS_TARGET/,'smoke consumes the verified target instead of racing DevTools discovery');
  assert.match(phone,/targets=\$\{JSON\.stringify\(lastTargets\)\}/,'smoke reports observed target descriptors on fallback failure');
  const connectionStartup=phone.slice(phone.indexOf('try {'),phone.indexOf("const home = await waitFor"));
  assert.doesNotMatch(connectionStartup,/pm','clear/,'WebView connection must not clear app data after launch');
  assert.doesNotMatch(connectionStartup,/monkey/,'WebView connection must not relaunch the app after forwarding its target');
  assert.match(tablet,/world-map-tablet-"\+orientationName/);
  assert.match(regression,/for\s*\(let recipeId\s*=\s*1;\s*recipeId\s*<=\s*95;\s*recipeId\+\+\)/,'G3 still routes all 95 canonical recipes');
  assert.match(regression,/catalogueCount !== 95/);
  assert.match(workflow,/G1 FAST PREFLIGHT[\s\S]*?W02 SAMPLE[\s\S]*?G2 TARGETED DEVICE SMOKE[\s\S]*?G3 FULL REGRESSION/);
});

test('international adapter rejects W03 drafts and accepts only a pinned complete offline handoff', async t => {
  const draft=await fixture('DRAFT_CONTENT_NOT_YET_AUTHORED');
  t.after(()=>rm(draft.directory,{recursive:true,force:true}));
  await assert.rejects(loadInternationalRecipeHandoff({root:draft.directory,expectedCommit:commit}),/not READY_FOR_INTEGRATION/);

  const ready=await fixture();
  t.after(()=>rm(ready.directory,{recursive:true,force:true}));
  const result=await loadInternationalRecipeHandoff({root:ready.directory,expectedCommit:commit,canonicalIds:Array.from({length:95},(_,i)=>i+1)});
  assert.equal(result.canonicalBaseRecipeCount,95);
  assert.deepEqual(result.countries,['italy']);
  assert.equal(result.recipes[0].id,96);
  assert.equal(result.recipes[0].reviewStates.a08,'PENDING');
  assert.ok(result.recipes[0].artworkAssets[0].dataUri.startsWith('data:image/png;base64,'));
  await assert.rejects(loadInternationalRecipeHandoff({root:ready.directory,expectedCommit:'f'.repeat(40),canonicalIds:[]}),/does not match/);
  await writeFile(path.join(ready.directory,ready.recipe.artwork_assets[0].path),Buffer.from('tampered'));
  await assert.rejects(loadInternationalRecipeHandoff({root:ready.directory,expectedCommit:commit}),/hash mismatch/);
});

test('passport awards remain tied to completed canonical India recipes and native profile persistence', async () => {
  const [runtime,profileStore,profileRestartTest,restartSmoke]=await Promise.all([
    read('tools/v3/runtime.js'),
    read('phase2-pilot/apps/aaria-android/app/src/main/java/com/aaria/magickitchen/pilot/ProfileStore.kt'),
    read('phase2-pilot/apps/aaria-android/app/src/test/java/com/aaria/magickitchen/pilot/ProfileStoreDatabaseTest.kt'),
    read('.github/scripts/v33-passport-persistence-smoke.mjs')
  ]);
  assert.match(runtime,/!state\.done\.includes\(selected\.id\)\|\|!V31_APPROVED_INDIA_RECIPE_IDS\.includes\(selected\.id\)/);
  assert.match(runtime,/state\.worldStamps\.push\('IND'\);save\(\)/);
  assert.match(profileStore,/class ProfileStore\(context: Context\) : SQLiteOpenHelper/);
  assert.match(profileRestartTest,/completedWorldPassportStampSurvivesStoreRecreation/);
  assert.match(restartSmoke,/shell', 'am', 'force-stop'/);
  assert.match(restartSmoke,/v33-passport-after-restart-offline\.png/);
});
