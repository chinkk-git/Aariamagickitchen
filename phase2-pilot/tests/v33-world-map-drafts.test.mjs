import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('V3.3 country concepts remain five localized drafts outside the 95-recipe runtime', async () => {
  const validator = spawnSync(process.execPath, ['tools/v3/validate-v33-world-map-drafts.mjs'], {
    cwd: new URL('../../', import.meta.url), encoding: 'utf8'
  });
  assert.equal(validator.status, 0, validator.stderr || validator.stdout);
  assert.match(validator.stdout, /five-country draft registry: valid/);
});

test('Adventure Explorer uses natural drag/pinch, bounded globe reset and large country markers', async () => {
  const [runtime, css] = await Promise.all([
    read('tools/v3/runtime.js'), read('tools/v3/home-world-visual.css')
  ]);
  const page=runtime.slice(runtime.lastIndexOf('v31WorldPage=function v33AdventureExplorerPage()'),runtime.indexOf('const v3OriginalCreateWeek'));
  assert.match(page,/data-v31-zoom="reset"/,'one floating globe button resets the orientation-aware view');
  assert.doesNotMatch(page,/data-v31-zoom="(?:in|out)"|data-v31-pan-toggle/,'separate zoom and pan-mode controls are removed');
  assert.match(runtime,/data-v31-pin="\$\{safe\(c\.code\)\}"[\s\S]*?role="button" tabindex="0"/);
  assert.match(runtime, /v31MapPointers=new Map\(\);let v31MapPinch=null/);
  assert.match(runtime, /v31PinchMetrics\(v31PointerPair\(\)\)/);
  assert.match(runtime, /v31ClampMapCamera\(\)/);
  assert.match(runtime, /pointercancel/);
  assert.match(runtime,/Math\.max\(1,Math\.min\(3,start\.zoom\*current\.distance\/start\.distance\)\)/,'pinch zoom is smoothly bounded between 1× and 3×');
  assert.match(css,/\.v31-map-world-space\{[^}]*transform:translate\(-50%,-50%\) translate\(var\(--v31-pan-x/);
  assert.match(css,/\.v31-world-illustrated\.v33-adventure-explorer \.v31-map-wrap\{[^}]*touch-action:none/);
  assert.match(css,/\.v31-map-pin\{[^}]*pointer-events:all/);
});

test('V3.3 runtime keeps the approved map crop and uses the concept board as direction only', async () => {
  const [transform, runtime, css, phone, tablet, approvedReference, approvedMapCrop] = await Promise.all([
    read('tools/v3/transform-production.mjs'), read('tools/v3/runtime.js'), read('tools/v3/home-world-visual.css'),
    read('.github/scripts/v32-android-smoke.sh'), read('.github/scripts/v32-android-tablet-smoke.sh'),
    readFile(new URL('docs/design/references/v3.3/WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED.png', root)),
    readFile(new URL('docs/design/approved-v31-world-map-crop.webp', root))
  ]);
  assert.match(transform, /worldMap: readReferenceImage\('docs\/design\/approved-v31-world-map-crop\.webp'\)/);
  assert.doesNotMatch(transform, /worldMap: readReferenceImage\('docs\/design\/references\/v3\.3\/WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED\.png'\)/,
    'the concept board is not substituted for the runtime illustration');
  assert.match(runtime, /class="v31-map-art-image" alt=""[\s\S]*?mapArt\.src=V31_HOME_WORLD_ART\.worldMap/,
    'the existing approved map crop is assigned as an image source');
  assert.match(css, /\.v31-map-world-space \.v31-map-art-image\{[^}]*width:100%;height:100%;[^}]*object-fit:contain/,
    'the unchanged World Map crop keeps its full aspect-ratio-preserving bounds');
  assert.match(runtime, /const V33_MAP_ASPECT=717\/389[\s\S]*?const V33_MAP_HEIGHT=1000\/V33_MAP_ASPECT/);
  assert.match(phone, /approvedArt=expected\.startsWith\('data:image\/webp;base64,'\)&&art\?\.src===expected&&art\.complete&&art\.naturalWidth>0/,
    'phone smoke confirms the approved WebP map crop is fully loaded');
  assert.match(tablet, /approvedArt=expectedArt\.startsWith\("data:image\/webp;base64,"\)&&image\?\.src===expectedArt&&image\.complete&&image\.naturalWidth>0/,
    'tablet smoke confirms the approved WebP map crop is fully loaded');
  assert.equal(createHash('sha256').update(approvedReference).digest('hex'), '1ab670c7a4e36f29a3275b2043c7edb9e85c65491ff82679e51074194dc985dc',
    'the exact owner-approved concept-board bytes remain unchanged as design provenance');
  assert.equal(createHash('sha256').update(approvedMapCrop).digest('hex'), '5296a636c86f2d0f8a12c60406fa366723cb442c292cc2d3bd6b3f1b90afa353',
    'the pre-existing approved World Map crop bytes remain unchanged for runtime use');
});

test('phone World Map screenshot capture accepts the approved map crop', async () => {
  const smoke = await read('.github/scripts/v33-world-map-sample-smoke.mjs');
  assert.match(smoke, /execFileSync\('adb',[\s\S]*?maxBuffer:\s*64\s*\*\s*1024\s*\*\s*1024/,
    'the Android screenshot pipe has enough capacity for the approved illustrated map');
});

test('Adventure Explorer acceptance harness measures real Android geometry and captures all required views', async () => {
  const [phone, tablet, phoneRegression, workflow] = await Promise.all([
    read('.github/scripts/v33-world-map-sample-smoke.mjs'),
    read('.github/scripts/v32-android-tablet-smoke.sh'),
    read('.github/scripts/v32-android-smoke.sh'),
    read('.github/workflows/v32-android.yml')
  ]);
  assert.match(phone, /wrapRect\.width\*wrapRect\.height\/\(screenRect\.width\*screenRect\.height\)/,
    'phone occupancy comes from Android-rendered screen and map bounds');
  assert.match(phone, /g\.occupancy\s*<\s*0\.85\s*\|\|\s*g\.occupancy\s*>\s*0\.95/);
  assert.match(phone, /Input\.dispatchTouchEvent'[\s\S]*?two-finger-pinch|Input\.dispatchTouchEvent/,
    'the phone sample exercises a real WebView pinch through Android DevTools input');
  assert.match(phone, /homeWorldTarget[\s\S]*?Input\.dispatchTouchEvent[\s\S]*?World Map with approved art/,
    'Home-to-World navigation uses actual Android touch input and waits for the map route');
  assert.match(phone, /input','touchscreen','swipe/,'one-finger pan is driven through Android input');
  for (const shot of ['world-map-phone-portrait','world-map-phone-landscape','zoomed-continent-phone-portrait',
    'country-preview-phone-portrait','recipe-navigation-phone-portrait','food-passport-phone-portrait']) {
    assert.ok(phone.includes(shot), `phone evidence captures ${shot}`);
  }
  assert.match(phone, /android-back-restores-map-position/);
  assert.match(phone, /hit\?\.getBBox\(\)[\s\S]*?pin\.getScreenCTM\(\)[\s\S]*?geographicAnchorError/,
    'marker hit bounds and geographic anchors are measured in the rendered SVG screen transform');
  assert.match(phone, /markerGeometry\.some\(m=>m\.hitWidth<44\|\|m\.hitHeight<44\|\|m\.geographicAnchorError>2\)/,
    'country markers keep accessible hit areas and geographic alignment through real zoom and pan');
  assert.match(phone, /g\.overlapPairs\?\.length/);
  assert.match(phone, /Input\.dispatchTouchEvent',\{type:'touchStart'[\s\S]*?android-touch-country-marker/,
    'country selection is proven with a rendered marker touch, not a synthetic DOM click');
  assert.match(phone, /worldScreenshot\.sha256\s*===\s*homeScreenshot\.sha256/,
    'Android screenshot pixels must change from Home after the map route loads');
  assert.match(tablet, /map\.overlapPairs\.length/,
    'tablet markers are checked for overlapping touch targets in both orientations');
  assert.match(phone, /food-passport-offline-restart-persistence/);
  assert.match(phone, /cmd','connectivity','airplane-mode','enable/);
  assert.match(phone, /cmd','connectivity','airplane-mode'\]\)\.toString\('utf8'\)\.trim\(\)\.toLowerCase\(\)/);
  assert.doesNotMatch(phone, /AIRPLANE_MODE/,
    'the API 35 offline smoke uses the supported connectivity shell command instead of a protected broadcast');
  assert.match(phone, /passport-back-restores-map-position/);
  assert.match(phone, /PT-BR-country-preview/);
  assert.match(tablet, /map\.occupancy<0\.85\|\|map\.occupancy>0\.95/);
  assert.match(tablet, /world-map-tablet-"\+orientationName/);
  assert.match(phoneRegression, /Natural pinch zoom[\s\S]*?Natural one-finger drag/);
  assert.match(phoneRegression, /worldVisual\.occupancy<0\.85[\s\S]*?worldVisual\.occupancy>0\.95/);
  assert.match(phoneRegression, /countryPreview\.recipeCount!==18/);
  assert.match(phoneRegression, /for\s*\(let recipeId\s*=\s*1;\s*recipeId\s*<=\s*95;\s*recipeId\+\+\)/,
    'G3 retains the full canonical 95-recipe route loop');
  assert.match(workflow, /G2 TARGETED DEVICE SMOKE[\s\S]*?G3 FULL REGRESSION/);
  assert.match(workflow, /G3 FULL REGRESSION[\s\S]*?v32-android-smoke\.sh/);
});

test('PT-BR tablet navigation compares labels without decorative tab icons', async () => {
  const tablet = await read('.github/scripts/v32-android-tablet-smoke.sh');
  assert.match(tablet, /nav:\[\.\.\.document\.querySelectorAll\("#nav \.tab"\)\]\.map\(e=>e\.lastChild\?\.textContent\?\.trim\(\)\|\|""\)/,
    'the bilingual navigation assertion reads the label text node separately from the icon element');
  assert.match(tablet, /expectedSafety:translateText\(RECIPES\.find\(r=>Number\(r\.id\)===12\)\.safety,"pt-BR"\)/,
    'PT-BR step smoke compares the recipe-wide safety panel with localized canonical recipe safety');
});

test('pinch camera scales around its focal point and stays within orientation-aware map bounds', async () => {
  const runtime = await read('tools/v3/runtime.js');
  const declaration = runtime.match(/function v31CalculatePinchCamera\(start,current,viewport\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(declaration, 'pure pinch camera calculation is present');
  const calculate = new Function(`let v31MapBaseWidth=1400,v31MapBaseHeight=800;${declaration}; return v31CalculatePinchCamera;`)();
  const viewport = { left: 0, top: 0, width: 400, height: 300 };
  const zoomIn = calculate(
    { x: 200, y: 200, distance: 100, zoom: 1, panX: 0, panY: 0 },
    { x: 220, y: 210, distance: 200 }, viewport
  );
  assert.deepEqual(zoomIn, { zoom: 2, x: 20, y: -40 });
  const bounded = calculate(
    { x: 200, y: 150, distance: 100, zoom: 2, panX: 0, panY: 0 },
    { x: 900, y: 900, distance: 1000 }, viewport
  );
  assert.equal(bounded.zoom, 3);
  assert.ok(Math.abs(bounded.x) <= 1900 && Math.abs(bounded.y) <= 1050);
  const resetLimit = calculate(
    { x: 200, y: 150, distance: 100, zoom: 2, panX: 0, panY: 0 },
    { x: 900, y: 900, distance: 10 }, viewport
  );
  assert.equal(resetLimit.zoom, 1);
  assert.ok(Math.abs(resetLimit.x) <= 500 && Math.abs(resetLimit.y) <= 250);
});

test('passport copy reports earned stamps without implying seven reviewed countries', async () => {
  const runtime = await read('tools/v3/runtime.js');
  const page = runtime.slice(runtime.lastIndexOf('v31WorldPage=function v33AdventureExplorerPage()'), runtime.indexOf('const v3OriginalCreateWeek'));
  assert.match(page, /const stampCountLabel=pt\?/);
  assert.match(page, /\$\{stampCountLabel\}/);
  assert.doesNotMatch(page, /\$\{stamps\.length\}\/7/);
  assert.match(runtime, /V31_APPROVED_INDIA_RECIPE_IDS\.includes\(selected\.id\)/,
    'passport stamp completion remains constrained to the existing canonical recipe allowlist');
});

test('only completed canonical India recipes award a persistable passport stamp', async () => {
  const [runtime, profileStore, profileRestartTest, restartSmoke, phoneSmoke] = await Promise.all([
    read('tools/v3/runtime.js'),
    read('phase2-pilot/apps/aaria-android/app/src/main/java/com/aaria/magickitchen/pilot/ProfileStore.kt'),
    read('phase2-pilot/apps/aaria-android/app/src/test/java/com/aaria/magickitchen/pilot/ProfileStoreDatabaseTest.kt'),
    read('.github/scripts/v33-passport-persistence-smoke.mjs'),
    read('.github/scripts/v32-android-smoke.sh')
  ]);
  assert.match(runtime, /!state\.done\.includes\(selected\.id\)\|\|!V31_APPROVED_INDIA_RECIPE_IDS\.includes\(selected\.id\)/,
    'incomplete recipes and non-allowlisted draft recipes cannot award a stamp');
  assert.match(runtime, /state\.worldStamps\.push\('IND'\);save\(\)/,
    'a newly earned stamp is saved with the active profile snapshot');
  assert.match(runtime, /v3PersistProfileState\(\)[\s\S]*?nativeSave\(activeId,JSON\.stringify\(state\)\)/,
    'Android saves the complete world progress state through the native profile bridge');
  assert.match(profileStore, /class ProfileStore\(context: Context\) : SQLiteOpenHelper/,
    'native snapshots are stored in app-private SQLite');
  assert.match(profileStore, /put\("snapshot", snapshot\.toString\(\)\)/,
    'profile snapshots are written as a complete state payload');
  assert.match(profileRestartTest, /completedWorldPassportStampSurvivesStoreRecreation/,
    'native database test reopens SQLite and checks the completed world stamp');
  assert.match(restartSmoke, /settings', 'put', 'global', 'airplane_mode_on'/,
    'Android smoke enables airplane mode before reopening the app');
  assert.match(restartSmoke, /shell', 'am', 'force-stop'/,
    'Android smoke kills and restarts the app process');
  assert.match(restartSmoke, /v33-passport-after-restart-offline\.png/,
    'Android smoke captures phone evidence after offline restart');
  assert.match(phoneSmoke, /node \.github\/scripts\/v33-passport-persistence-smoke\.mjs/,
    'passport persistence smoke is part of exact-head phone Android CI');
});
