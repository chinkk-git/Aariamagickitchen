import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createWorldAdventureHost, WORLD_ADVENTURE_INDIA_RECIPE_IDS } from '../../tools/v3/world-adventure-host.mjs';

const makeRecipes = (count = 95) => Array.from({ length: count }, (_, index) => ({
  id: index + 1,
  title: `Recipe ${index + 1}`,
  description: 'A catalogue recipe',
  ingredients: ['an ingredient'],
  steps: ['a step']
}));
const validatedRecipe = (id, countryCode) => ({
  id, title: `Recipe ${id}`, description: 'A translated recipe', ingredients: ['ingredient'], steps: ['step'], active: true,
  worldAdventure: { countryCode, validationStatus: 'W01_VALIDATED', bilingualStatus: 'APPROVED', artworkStatus: 'APPROVED', safetyStatus: 'APPROVED', navigationStatus: 'ACTIVE' }
});
function setup(canonicalRecipes = makeRecipes(), overrides = {}) {
  const calls = [];
  const host = createWorldAdventureHost({
    canonicalRecipes, locale: 'en-GB', passportSnapshot: { worldStamps: ['IND', 'ITA', 'IND'] },
    onOpenRecipe: id => calls.push(['recipe', id]), onBack: scope => calls.push(['back', scope]),
    onOpenPassport: () => calls.push(['passport']), ...overrides
  });
  return { host, calls };
}
const allCountryRecipes = host => ['IND','ITA','CHN','JPN','MEX','VNM'].flatMap(code => host.getCountry(code).recipes);

test('host preserves all 18 India links from the original catalogue', async () => {
  const { host } = setup();
  assert.deepEqual(WORLD_ADVENTURE_INDIA_RECIPE_IDS, [51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74]);
  const runtime = await readFile(new URL('../../tools/v3/runtime.js', import.meta.url), 'utf8');
  const ids = runtime.match(/V31_APPROVED_INDIA_RECIPE_IDS=\[([^\]]+)\]/)?.[1].split(',').map(Number);
  assert.deepEqual(WORLD_ADVENTURE_INDIA_RECIPE_IDS, ids);
  const india = host.getCountry('IND');
  assert.equal(india.available, true);
  assert.equal(india.reviewOnly, false);
  assert.deepEqual(india.recipes.map(recipe => recipe.id), WORLD_ADVENTURE_INDIA_RECIPE_IDS);
  assert.equal(india.recipes[0].canonical, true);
});

test('95-recipe catalogue exposes India only and fails closed for unvalidated countries', () => {
  const { host, calls } = setup();
  for (const code of ['ITA', 'CHN', 'JPN', 'MEX', 'VNM']) {
    assert.equal(host.getCountry(code).available, false);
    assert.equal(host.getCountry(code).reviewOnly, true);
    assert.deepEqual(host.getCountry(code).recipes, []);
  }
  assert.equal(host.openRecipe(96), false);
  assert.equal(host.openRecipe(12), false);
  const linked = allCountryRecipes(host).map(recipe => recipe.id);
  assert.equal(linked.length, 18, '95-item stage must expose exactly the 18 canonical India links');
  assert.equal(new Set(linked).size, 18, '95-item stage must not duplicate globe destinations');
  assert.deepEqual(linked, WORLD_ADVENTURE_INDIA_RECIPE_IDS, 'the other 77 originals must stay out of globe country lists');
  assert.deepEqual(host.getPassportSnapshot().stamps, ['IND']);
  assert.deepEqual(calls, []);
});

test('97-entry catalogue discovers only W01-validated Italy and China links', () => {
  const recipes = [...makeRecipes(), validatedRecipe(96, 'ITA'), validatedRecipe(99, 'CHN')];
  const { host, calls } = setup(recipes);
  assert.deepEqual(host.getCountry('ITA').recipes.map(r => r.id), [96]);
  assert.deepEqual(host.getCountry('CHN').recipes.map(r => r.id), [99]);
  assert.equal(host.getCountry('JPN').available, false);
  const linked = allCountryRecipes(host).map(recipe => recipe.id);
  assert.equal(linked.length, 20, '97-item stage must contain 18 India and 2 validated international links');
  assert.equal(new Set(linked).size, 20, '97-item stage must not duplicate globe destinations');
  assert.deepEqual(linked.filter(id => id > 95).sort((a,b) => a-b), [96,99]);
  assert.deepEqual(linked.filter(id => id <= 95), WORLD_ADVENTURE_INDIA_RECIPE_IDS);
  assert.equal(host.openRecipe(96), true);
  assert.equal(host.openRecipe(99), true);
  assert.deepEqual(calls, [['recipe', 96], ['recipe', 99]]);
});

test('110-entry catalogue scales by validated country metadata without an allowlist update', () => {
  const additions = [validatedRecipe(96,'ITA'), validatedRecipe(97,'JPN'), validatedRecipe(98,'MEX'), validatedRecipe(99,'CHN'), validatedRecipe(100,'VNM'),
    ...Array.from({length:10},(_,i)=>validatedRecipe(101+i,['ITA','JPN','MEX','CHN','VNM'][i%5]))];
  const { host } = setup([...makeRecipes(), ...additions]);
  const linked = allCountryRecipes(host).map(recipe => recipe.id);
  assert.equal(linked.length, 33, '110-item stage must contain 18 India and all 15 validated international links');
  assert.equal(new Set(linked).size, 33, '110-item stage must not duplicate globe destinations');
  assert.deepEqual(linked.filter(id => id <= 95), WORLD_ADVENTURE_INDIA_RECIPE_IDS);
  assert.deepEqual(linked.filter(id => id > 95).sort((a,b) => a-b), Array.from({length:15},(_,i)=>96+i));
  assert.equal(Object.values({ITA:'ITA',JPN:'JPN',MEX:'MEX',CHN:'CHN',VNM:'VNM'}).reduce((n,code)=>n+host.getCountry(code).recipes.length,0),15);
  assert.deepEqual(host.getCountry('ITA').recipes.map(r=>r.id), [96,101,106]);
});

test('catalogue identity remains strict while future records with missing approval fail closed', () => {
  assert.throws(() => setup(makeRecipes().slice(1)), /base/);
  const duplicate = [...makeRecipes(), validatedRecipe(96,'ITA')];duplicate[95] = {...duplicate[95],id:95};
  assert.throws(() => setup(duplicate), /unique positive IDs/);
  const records = [...makeRecipes(), validatedRecipe(96,'ITA'), validatedRecipe(97,'USA'), validatedRecipe(98,'JPN')];
  records[96].worldAdventure.countryCode = 'USA';
  records[97].worldAdventure.bilingualStatus = 'PENDING';
  records[97].worldAdventure.safetyStatus = 'PENDING';
  records.push({...validatedRecipe(99,'MEX'),active:false});
  const { host, calls } = setup(records);
  assert.deepEqual(host.getCountry('ITA').recipes.map(r=>r.id),[96]);
  for (const code of ['CHN','JPN','MEX','VNM']) assert.deepEqual(host.getCountry(code).recipes, []);
  assert.equal(host.openRecipe(96),true);
  for (const id of [97,98,99]) assert.equal(host.openRecipe(id), false);
  assert.deepEqual(calls, [['recipe',96]]);
});

test('host delegates recipe, Back and Passport navigation and localizes country names', () => {
  const { host, calls } = setup(makeRecipes(), { locale:'pt-BR', getLocalizedRecipe:(r,locale)=>({title:locale==='pt-BR'?`Receita ${r.id}`:r.title}) });
  assert.equal(host.getCountry('IND').label, 'Índia');
  assert.equal(host.getCountry('IND').recipes[0].title, 'Receita 51');
  assert.equal(host.locale, 'pt-BR');
  assert.throws(() => setup(makeRecipes(), { locale:'fr-FR' }), /locale/);
  assert.equal(host.openRecipe(51), true);
  host.back('country'); host.back('screen'); host.openPassport();
  assert.deepEqual(calls, [['recipe',51],['back','country'],['back','screen'],['passport']]);
  assert.throws(() => host.back('recipe'), /Unknown Back scope/);
});

test('module handoff, Android host and production transform are wired and preserve screen ownership', async () => {
  const [doc,runtime,transform,moduleJs,moduleCss,smoke,artwork,decor,tabletSmoke] = await Promise.all([
    readFile(new URL('../../docs/control-tower/W02_W03_MAGICAL_GLOBE_ANDROID_HANDOFF.md', import.meta.url),'utf8'),
    readFile(new URL('../../tools/v3/runtime.js', import.meta.url),'utf8'),
    readFile(new URL('../../tools/v3/transform-production.mjs', import.meta.url),'utf8'),
    readFile(new URL('../../tools/v3/world-adventure-globe/world-adventure-globe.js', import.meta.url),'utf8'),
    readFile(new URL('../../tools/v3/world-adventure-globe/world-adventure-globe.css', import.meta.url),'utf8'),
    readFile(new URL('../../.github/scripts/v33-world-map-sample-smoke.mjs', import.meta.url),'utf8'),
    readFile(new URL('../../tools/v3/artwork/world-adventure/aaria-pointing-approved.png', import.meta.url)),
    readFile(new URL('../../tools/v3/artwork/world-adventure/magic-sparkle-trail.png', import.meta.url)),
    readFile(new URL('../../.github/scripts/v32-android-tablet-smoke.sh', import.meta.url),'utf8')
  ]);
  assert.equal(artwork.subarray(0,8).toString('hex'),'89504e470d0a1a0a','approved pointing Aaria remains a transparent PNG source asset');
  assert.equal(decor.subarray(0,8).toString('hex'),'89504e470d0a1a0a','sparkle trail remains a transparent PNG source asset');
  assert.equal(createHash('sha256').update(artwork).digest('hex'),'6f4efb16e9c790cdae64957089639ccfd41c66b932e7e7d8147477bac60f4afb','pointing Aaria bytes match W03 immutable handoff');
  assert.equal(createHash('sha256').update(decor).digest('hex'),'46f3c19aad266913a42af9eeab5df4ec5c9c6074ac54a1f902f41243bf0d9f51','sparkle art bytes match W03 immutable handoff');
  assert.match(runtime,/AariaWorldAdventureGlobe\.mount/);
  assert.match(runtime,/createWorldAdventureHost\(\{canonicalRecipes:RECIPES/);
  assert.match(runtime,/host=screen\.querySelector\('#v33-world-globe-host'\),moduleController=window\.AariaWorldAdventureGlobe\.mount\(host,\{\.\.\.v33WorldHost,avatarSrc:V33_WORLD_ARTWORK\.pointingAaria\},v33GlobeState\|\|\{rotation:-78\}\)/,'the original interactive module receives the approved transparent pointing Aaria without replacing globe geometry');
  assert.match(runtime,/V33_WORLD_ARTWORK\.sparkleTrail/,'the separate approved-style sparkle asset is embedded for offline use');
  assert.match(runtime,/getState:\(\)=>moduleController\.serialize\(\)/);
  assert.match(runtime,/function v33KeepFlagsInsideSphere\(host\)/,'W02 keeps the W03 API unchanged while filtering clipped country targets in the host');
  assert.match(runtime,/corners\.some\(\(\[x,y\]\)=>\(x-cx\)\*\(x-cx\)\+\(y-cy\)\*\(y-cy\)>r2\)\)flag\.remove\(\)/,'the host removes any flag whose full hit target exceeds the globe circle');
  assert.match(runtime,/destroy:\(\)=>\{clearInterval\(idleMotion\);magic\.remove\(\);flagFit\.dispose\(\);moduleController\.dispose\(\)\}/);
  assert.match(runtime,/moduleController\.restore\(\{\.\.\.current,rotation:current\.rotation\+elapsed\*\.002\}\);flagFit\.fit\(\)/,'moving country targets are synchronously refitted to the visible sphere after every W03 projection update');
  assert.match(runtime,/v33-globe-magic-decor/,'the host adds accessible-hidden, decorative sparkle elements around the accepted globe');
  assert.match(runtime,/v33-globe-magic-particle/,'the magical scene includes decorative drifting particles around the globe');
  assert.match(runtime,/setInterval\(\(\)=>\{[\s\S]*?prefers-reduced-motion: reduce[\s\S]*?moduleController\.restore/,'idle globe rotation uses the W03 restore API, pauses for reduced motion and preserves country geometry');
  assert.match(runtime,/aria-world-globe__header/);
  assert.match(transform,/magicalGlobeScript/);
  assert.match(transform,/magicalGlobeStyles/);
  assert.ok(/aria-world-globe__atlas,\.app\.v31-world-active \.aria-world-globe__flags\{transform:scale\(1\.14\)/.test(transform),'the host enlarges Natural Earth land and flags together without pushing touch targets outside the stage');
  assert.ok(!/aria-globe-map-copy path\{transform:scale/.test(transform),'Natural Earth land and flags keep the same orthographic projection without local path distortion');
  assert.ok(/landPathCount\s*<\s*30[\s\S]*?landBoundsCoverage\s*<\s*\.48/.test(smoke) && /flagsInStage/.test(smoke) && /flagCentersInSphere/.test(smoke) && /marker\.insideSphere/.test(smoke),'the real-device smoke checks substantial land coverage and flag targets inside both sphere and stage');
  assert.ok(/width:54px;height:54px/.test(moduleCss) && /Math\.max\(0\.8, Math\.min\(1, p\.depth\)\)/.test(moduleJs),'phone hit targets retain at least 48 CSS px after depth and shared projection scaling');
  assert.match(transform,/v33-orbit-turn/);
  assert.match(transform,/v33-sparkle-twinkle/);
  assert.match(transform,/v33-star-twinkle/,'individual stars twinkle asynchronously in animation-enabled mode');
  assert.match(transform,/v33-particle-drift/,'small magical particles drift around the globe in animation-enabled mode');
  assert.match(transform,/aspect-ratio:1;border:3px dashed/,'the orbit remains a mathematically circular ring');
  assert.doesNotMatch(transform,/scaleY\(/,'the host must not squash the orbit into an ellipse');
  assert.match(transform,/grid-template-columns:minmax\(0,1fr\) minmax\(245px,32%\)/,'landscape uses a full-width map and country panel');
  assert.match(transform,/position:fixed;z-index:2;inset:env\(safe-area-inset-top\) 0 calc\(76px/,'the globe screen fills the Android viewport above persistent navigation');
  assert.match(transform,/prefers-reduced-motion:reduce\).*stage::before/);
  assert.match(transform,/v33-globe-magic-star,\.app\.v31-world-active \.v33-globe-magic-particle\{animation:none\}/,'stars and decorative particles become static when reduced motion is requested');
  assert.match(transform,/aria-world-globe__guide\{z-index:1;display:block!important/,'the large approved pointing Aaria is integrated beside and behind the interactive globe');
  assert.match(transform,/v33-globe-sparkle-trail\{position:absolute;z-index:1/,'sparkle art stays behind the sphere so it cannot obscure country flags');
  assert.match(transform,/max-width:900px\) and \(orientation:landscape\)/,'phone landscape receives its own width-filling layout');
  const workflow=await readFile(new URL('../../.github/workflows/v33-w02-review.yml',import.meta.url),'utf8');
  assert.match(workflow,/publish_apk:[\s\S]*?default: false/,'real screenshots are captured before review APK publication is enabled');
  assert.match(workflow,/if: success\(\) && \(inputs\.publish_apk == true \|\| github\.event_name == 'push'\)/,'a passing exact-head push publishes its installable review APK after device smoke');
  assert.match(workflow,/disable-animations: false/,'the Android review emulator permits real CSS animation evidence');
  assert.match(smoke,/Emulation\.setEmulatedMedia/,'Android smoke explicitly tests animation-enabled and reduced-motion modes');
  assert.match(smoke,/mode:'animation-enabled'/);
  assert.match(smoke,/particles\.length!==6[\s\S]*?v33-particle-drift/,'genuine Android motion evidence checks all six drifting particles');
  assert.match(smoke,/reducedPortraitStart\.particles\.some\(name=>name!=='none'\)/,'Android reduced-motion screenshots verify static particles');
  assert.match(smoke,/aria-label="Índia"[\s\S]*?PT-BR globe and visible India flag/,'the PT-BR Android check rotates its localized marker into view before checking it');
  assert.match(smoke,/tap\(session,'\.aria-world-globe__flag\[aria-label="Índia"\]'[\s\S]*?PT-BR India marker selection/,'the PT-BR Android check selects the localized India marker through real Android touch input');
  assert.match(smoke,/session=await setOrientation\(session,false\);\s*await setMotionPreference\(session,'reduce'\)[\s\S]*?state\.language='pt-BR'/,'the PT-BR marker check freezes globe rotation after Android recreates the portrait WebView');
  assert.match(smoke,/pointingAariaArtwork:avatar\?\.src===V33_WORLD_ARTWORK\.pointingAaria/,'real Android evidence verifies the exact approved pointing PNG is rendered');
  assert.match(smoke,/requirePointingHand && \(!map\.pointingHand\.visible \|\| map\.pointingHand\.overlapArea < 1 \|\| !map\.pointingHand\.flagsAbove \|\| !map\.pointingHand\.flagsInStage\)/,'portrait Android evidence requires the pointing hand in front while flags stay above it');
  assert.match(smoke,/full-screen India recipe list and X close/);
  assert.match(smoke,/portrait-x-closes-country-list-preserving-globe-state/);
  assert.match(smoke,/android-back-closes-country-list-preserving-globe-state/);
  assert.match(smoke,/approved-landscape-layout-and-layering-non-regression/);
  assert.match(smoke,/cardMinHeight<88/,'portrait recipe cards keep comfortable readable touch targets');
  assert.match(moduleJs,/state\.selected && isPortrait\(\) && state\.portraitOverlayOpen/,'Android Back closes the portrait overlay before clearing the selection');
  assert.match(transform,/aria-world-globe__panel\.is-portrait-overlay\{position:fixed!important/,'the portrait list fills the screen in its own overlay');
  assert.match(transform,/aria-world-globe__flags\{position:absolute;z-index:6/,'country flags stay above the portrait pointing-hand layer');
  assert.match(tabletSmoke,/guideVisible:[\s\S]*?sparkleVisible:[\s\S]*?globe\.guideVisible[\s\S]*?globe\.sparkleVisible/,'tablet Android portrait and landscape evidence requires visible Aaria and sparkle artwork');
  assert.match(smoke,/Reduced-motion .*remain static/);
  assert.match(smoke,/android-back-restores-country-cards'[\s\S]*?setMotionPreference\(session,'reduce'\)[\s\S]*?stableScreenshot\(session,'world-map-back-phone-portrait'/,'stable Android Back screenshots freeze the continuously rotating globe before framebuffer settling');
  assert.match(smoke,/async function stableScreenshot[\s\S]*?querySelector\('\.aria-world-globe__stage'\)[\s\S]*?setMotionPreference\(session,'reduce'\)/,'every still screenshot with an open globe freezes motion before checking framebuffer stability');
  assert.match(smoke,/state\.language='en-GB';render\(\)[\s\S]*?adb\(\['shell','input','keyevent','4'\]\)[\s\S]*?localeBackDismiss[\s\S]*?setMotionPreference\(session,'reduce'\)[\s\S]*?stableScreenshot\(session,'world-map-before-empty-passport-phone-portrait'/,'Passport setup dismisses the locale-restored overlay with Android Back, preserves globe state, then freezes motion before capture');
  assert.match(smoke,/localeBackDismiss\.rotationDelta=rotationDistance\(dismissRotation,localeBackDismiss\.rotation\)/,'locale-restored Android Back records rotation drift while idle-spin continues');
  assert.match(smoke,/localeBackDismiss\.rotationDelta>5/,'locale-restored Android Back still rejects rotation jumps beyond bounded natural-spin drift');
  assert.match(workflow,/OWNER_APPROVED=NO[\s\S]*?REVIEW_READY=NO[\s\S]*?RELEASE_READY=NO/);
  assert.match(moduleJs,/handleBack:/);
  assert.match(moduleJs,/Surprise/);
  assert.match(moduleJs,/0\.3\.0-natural-earth-orthographic/);
  for (const contract of ["India's 18 existing recipe descriptors",'Android Back','bottom navigation','read-only','portrait','landscape','Food Passport','dc1bd7d45f643a939936fb8c95ac6c424b3f012d','Natural Earth']) assert.ok(doc.includes(contract));
});
