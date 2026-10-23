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

test('the draft registry stays separate and Android mounts the W03 globe with dynamic catalogue data', async () => {
  const validator = spawnSync(process.execPath, ['tools/v3/validate-v33-world-map-drafts.mjs'], { cwd: new URL('../../', import.meta.url), encoding: 'utf8' });
  assert.equal(validator.status,0,validator.stderr||validator.stdout);
  assert.match(validator.stdout,/five-country draft registry: valid/);
  const [runtime,globe]=await Promise.all([read('tools/v3/runtime.js'),read('tools/v3/world-adventure-globe/world-adventure-globe.js')]);
  assert.match(runtime,/AariaWorldAdventureGlobe\.mount/);
  assert.match(runtime,/canonicalRecipes:RECIPES/);
  assert.match(runtime,/\.mount\(screen\.querySelector\('#v33-world-globe-host'\),\{\.\.\.v33WorldHost,avatarSrc:V31_HOME_WORLD_ART\.aaria\},v33GlobeState\|\|\{rotation:-78\}\)/,'first entry centres the India flag on the front of the globe');
  assert.match(runtime,/getState:\(\)=>moduleController\.serialize\(\)/);
  assert.match(runtime,/destroy:\(\)=>moduleController\.dispose\(\)/);
  assert.match(globe,/0\.3\.0-natural-earth-orthographic/);
  assert.match(runtime,/v33GlobeController\?\.handleBack/);
});

test('W03 Natural Earth module and projection remain intact; rejected portrait is withheld pending approved pointing art', async () => {
  const [transform,runtime,globeJs,globeCss,smoke,avatar,landArchive,provenance]=await Promise.all([
    read('tools/v3/transform-production.mjs'),read('tools/v3/runtime.js'),read('tools/v3/world-adventure-globe/world-adventure-globe.js'),read('tools/v3/world-adventure-globe/world-adventure-globe.css'),
    read('.github/scripts/v33-world-map-sample-smoke.mjs'),readFile(new URL('tools/v3/world-adventure-globe/aaria-portrait.webp',root)),
    readFile(new URL('tools/v3/world-adventure-globe/data/ne_110m_land.zip',root)),read('tools/v3/world-adventure-globe/MAP-PROVENANCE.md')
  ]);
  assert.match(transform,/magicalGlobeScript/);
  assert.match(transform,/magicalGlobeStyles/);
  assert.match(runtime,/avatarSrc:V31_HOME_WORLD_ART\.aaria/);
  assert.match(runtime,/moduleController\.serialize\(\)/);
  assert.match(runtime,/moduleController\.dispose\(\)/);
  assert.match(globeJs,/function mount\(root, hostContext, restoredState\)/);
  assert.match(globeJs,/var LAND_POLYGONS =/);
  assert.match(globeJs,/aria-globe-map-land/);
  assert.match(globeJs,/0\.3\.0-natural-earth-orthographic/);
  assert.match(globeJs,/destinationsFromHost\(context\)/);
  assert.match(globeJs,/Surprise Me/);
  assert.match(globeJs,/onOpenRecipe/);
  assert.match(globeCss,/@media \(orientation:landscape\)/);
  assert.equal(createHash('sha256').update(avatar).digest('hex'),'0268a8739595178a6e6ed0eb130a4bfc96c65d559130c3fea686239bd664a8d9');
  assert.equal(createHash('sha256').update(landArchive).digest('hex'),'1926c621afd6ac67c3f36639bb1236134a48d82226dc675d3e3df53d02d2a3de');
  assert.match(provenance,/Natural Earth 1:110m Physical Vectors/);
  assert.match(provenance,/public domain/);
  assert.match(smoke,/world-map-phone-portrait/);
  assert.match(smoke,/world-map-phone-landscape/);
  assert.match(smoke,/country-preview-phone-portrait/);
  assert.match(smoke,/surprise-me-waits-for-explicit-flag-selection/);
  assert.match(smoke,/android-touch-selects-suggested-flag/);
  assert.match(smoke,/food-passport-offline-restart-persistence/);
  assert.match(smoke,/pointingAariaArtwork:'BLOCKED_MISSING_APPROVED_EXPORT'/);
  assert.match(smoke,/avatar\.visible/);
});

test('phone and tablet smoke measure Android geometry and preserve G1/G2/G3 coverage', async () => {
  const [phone,phoneLaunch,tablet,workflow,regression]=await Promise.all([
    read('.github/scripts/v33-world-map-sample-smoke.mjs'),read('.github/scripts/v33-world-map-sample-smoke.sh'),read('.github/scripts/v32-android-tablet-smoke.sh'),
    read('.github/workflows/v32-android.yml'),read('.github/scripts/v32-android-smoke.sh')
  ]);
  assert.match(phone,/orientation/);
  assert.match(phone,/aria-world-globe/);
  assert.match(phone,/aria-world-globe__recipe/);
  for (const script of [tablet,regression]) {
    assert.match(script,/orientation/);
    assert.doesNotMatch(script,/two-finger-pinch|Natural pinch zoom|Natural one-finger drag/);
  }
  assert.match(phone,/Input\.dispatchTouchEvent/,'sample taps a country flag through Android WebView input');
  assert.match(phone,/const mapShot=await stableScreenshot\(session,'world-map-phone-portrait'/,'map screenshot requires a settled Android framebuffer');
  assert.match(phone,/countryShot\.sha256===mapShot\.sha256/,'Android country preview evidence must contain the rendered card overlay, not a stale map frame');
  assert.match(phone,/adb\(\['emu','rotate'\]\)/,'phone orientation smoke must rotate the emulator and verify its actual display rotation');
  assert.match(phone,/connect\(\{refresh:true\}\)/,'phone smoke must reconnect to the app-owned WebView after Android orientation recreates DevTools');
  assert.match(phone,/adb\(\['forward','tcp:9224',`localabstract:\$\{socket\}`\]\)/,'rotation reconnect must forward the current app process DevTools socket');
  assert.match(phone,/attempt<\(refresh\?6:2\)/,'the sample retries a transient WebView handshake after orientation recreates its target');
  assert.match(await read('tools/v3/runtime.js'),/v33GlobeState=v33GlobeController\?\.getState\?\.\(\)\|\|v33GlobeState/,'World state is serialized before opening a canonical recipe so Back can restore the same country');
  assert.match(phone,/cmd','connectivity','airplane-mode','enable/);
  assert.match(phone,/food-passport-offline-restart-persistence/);
  assert.match(phone,/complete-canonical-recipe-through-real-step-controls/,'passport restart evidence must follow canonical recipe completion through rendered step controls');
  assert.doesNotMatch(phone,/state\.done=\[51\]|state\.worldStamps=\['IND'\]/,'passport persistence smoke must not seed earned progress directly');
  assert.match(phone,/await tapAfterAndroidScroll\(session,.*nextstep/,'recipe completion taps must scroll controls into the real Android viewport before touch');
  assert.match(phone,/type:'touchMove'/,'recipe step scrolling must use an Android touch gesture rather than DOM scrolling');
  assert.match(phone,/stableScreenshot\(session,'recipe-navigation-phone-portrait','portrait',countryShot\.sha256\)/,'recipe screenshot must wait for stable Android pixels distinct from the country preview');
  assert.match(phone,/stableScreenshot\(session,'food-passport-phone-portrait','portrait',emptyPassportBase\.sha256\)/,'empty Passport screenshot must show settled pixels distinct from the underlying map');
  assert.match(phone,/stableScreenshot\(session,'food-passport-earned-phone-portrait','portrait',earnedPassportBase\.sha256\)/,'earned Passport screenshot must show settled pixels distinct from the underlying map');
  assert.match(phone,/empty Food Passport dismissal/,'the smoke waits for the real Android close tap to dismiss Passport');
  assert.match(phone,/flags\.includes\('India'\)/,'after resetting to EN-GB the globe tap must use the English flag label');
  assert.match(phone,/Tap the highlighted flag/,'phone smoke follows the current Surprise Me hint copy');
  assert.match(phone,/android-touch-selects-suggested-flag/,'phone smoke explicitly touches the Surprise Me destination');
  assert.match(phone,/selectedCountry\.selected!==surprise\.pending/,'phone verifies the explicit touch selected the pending destination without coupling to host label shape');
  assert.match(phone,/selectedCountry\.name!==selectedCountry\.flagName/,'phone verifies the selected flag label matches the visible country panel');
  assert.match(phone,/android-touch-selects-india-flag-for-canonical-recipe-check/,'phone smoke selects India after Surprise Me when needed');
  assert.match(phone,/Open canonical recipe #51/,'phone recipe navigation is a real Android touch');
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
  assert.match(tablet,/world-map-tablet-/);
  assert.match(tablet,/aria-world-globe__surprise/,'tablet smoke exercises Surprise Me on the mounted W03 globe');
  assert.match(tablet,/Input\.dispatchTouchEvent/,'tablet smoke uses Android touch events for flag and recipe selection');
  assert.match(tablet,/world-country-tablet-/,'tablet captures the selected country panel');
  assert.match(tablet,/world-recipe-51-tablet-/,'tablet captures recipe navigation from the globe');
  assert.match(tablet,/keyevent','4/,'tablet verifies Android Back restores the selected country panel');
  assert.match(tablet,/world-map-geometry-/,'tablet records live globe geometry in portrait and landscape');
  assert.match(regression,/isW02Globe/,'G3 follows the W03 globe when the exact Android package is W02');
  assert.match(regression,/W03 India must expose exactly its 18 canonical recipes/,'G3 retains the 18-link India contract');
  assert.match(regression,/Food Passport after canonical recipe completion/,'G3 validates the current Food Passport after recipe completion');
  assert.match(regression,/sphere\.width<180/,'G3 checks the landscape sphere minimum');
  assert.match(regression,/for\s*\(let recipeId\s*=\s*1;\s*recipeId\s*<=\s*95;\s*recipeId\+\+\)/,'G3 still routes all 95 canonical recipes');
  assert.match(regression,/catalogueCount !== 95/);
  assert.match(workflow,/G1 FAST PREFLIGHT[\s\S]*?W02 SAMPLE[\s\S]*?G2 TARGETED DEVICE SMOKE[\s\S]*?G3 FULL REGRESSION/);
  const transform=await read('tools/v3/transform-production.mjs');
  assert.match(transform,/aria-world-globe__flag\{width:58px;height:58px;/,'Android host CSS keeps the enlarged country hit targets above 48px');
  assert.match(transform,/aria-world-globe__sphere\{position:absolute;left:58%;top:50%;width:min\(84cqw,84cqh,820px\);/,'Android phone landscape globe scales to available width and height');
  assert.match(transform,/aria-world-globe__guide,\.app\.v31-world-active \.aria-world-globe__guide-copy\{display:none!important/,'the rejected non-pointing portrait is not rendered as the approved pointing illustration');
  assert.match(transform,/aria-world-globe__atlas,\.app\.v31-world-active \.aria-world-globe__flags\{transform:scale\(1\.14\)/,'the host enlarges Natural Earth land and geographic flags together');
  assert.match(transform,/width:min\(94cqw,94cqh,900px\);height:auto;aspect-ratio:1/,'the orbit is a viewport-contained circle');
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
  assert.match(runtime,/state\.done\.includes\(selected\.id\)/);
  assert.match(runtime,/v33CountryForCompletedRecipe\(selected\.id\)/);
  assert.match(runtime,/worldStamps\.push\(code\);save\(\)/);
  assert.match(profileStore,/class ProfileStore\(context: Context\) : SQLiteOpenHelper/);
  assert.match(profileRestartTest,/completedWorldPassportStampSurvivesStoreRecreation/);
  assert.match(restartSmoke,/shell', 'am', 'force-stop'/);
  assert.match(restartSmoke,/v33-passport-after-restart-offline\.png/);
});
