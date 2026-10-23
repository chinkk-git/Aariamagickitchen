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

test('World map has visible accessible zoom, reset, pan and pinch pathways', async () => {
  const [runtime, css] = await Promise.all([
    read('tools/v3/runtime.js'), read('tools/v3/home-world-visual.css')
  ]);
  for (const control of ['data-v31-zoom="out"','data-v31-zoom="in"','data-v31-zoom="reset"','data-v31-pan-toggle']) {
    assert.ok(runtime.includes(control), `rendered World route includes ${control}`);
  }
  assert.match(runtime, /aria-label="\$\{pt\?'Controles do mapa':'Map controls'\}"/);
  assert.match(runtime, /v31MapPointers=new Map\(\);let v31MapPinch=null/);
  assert.match(runtime, /v31PinchMetrics\(v31PointerPair\(\)\)/);
  assert.match(runtime, /v31ClampMapCamera\(\)/);
  assert.match(runtime, /pointercancel/);
  assert.match(css, /\.v31-map-wrap\{[^}]*touch-action:none/);
  assert.match(css, /\.v31-map-art\{[^}]*transform:translate\(var\(--v31-pan-x/);
});

test('V3.3 map art comes from the supplied approved visual reference', async () => {
  const [transform, runtime, css, phone, tablet, approvedReference] = await Promise.all([
    read('tools/v3/transform-production.mjs'), read('tools/v3/runtime.js'), read('tools/v3/home-world-visual.css'),
    read('.github/scripts/v32-android-smoke.sh'), read('.github/scripts/v32-android-tablet-smoke.sh'),
    readFile(new URL('docs/design/references/v3.3/WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED.png', root))
  ]);
  assert.match(transform, /worldMap: readReferenceImage\('docs\/design\/references\/v3\.3\/WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED\.png'\)/);
  assert.match(runtime, /v31-map-reference-art[\s\S]*?V31_HOME_WORLD_ART\.worldMap/);
  assert.match(runtime, /class="v31-map-art-image" alt=""[\s\S]*?mapArt\.src=V31_HOME_WORLD_ART\.worldMap/,
    'the full approved PNG is assigned as an image source instead of a multi-megabyte inline CSS URL');
  assert.match(css, /\.v31-map-reference-art \.v31-map-art-image\{[^}]*width:169%;/);
  assert.match(phone, /approvedArt=expectedArt\.startsWith\('data:image\/png;base64,'\)&&actualArt===expectedArt&&art\.complete&&art\.naturalWidth>0/,
    'phone smoke confirms the approved PNG is fully loaded in the map layer');
  assert.match(tablet, /approvedArt=expectedArt\.startsWith\("data:image\/png;base64,"\)&&actualArt===expectedArt&&art\?\.complete&&art\.naturalWidth>0/,
    'tablet smoke confirms the approved PNG is fully loaded in the map layer');
  assert.equal(createHash('sha256').update(approvedReference).digest('hex'), '1ab670c7a4e36f29a3275b2043c7edb9e85c65491ff82679e51074194dc985dc',
    'the exact approved reference bytes remain unchanged');
  assert.doesNotMatch(transform, /worldMap: readReferenceImage\('docs\/design\/approved-v31-world-map-crop\.webp'\)/,
    'V3.3 runtime no longer substitutes the earlier V3.1 crop for its approved reference');
});

test('pinch camera scales around its moving focal point and stays within map bounds', async () => {
  const runtime = await read('tools/v3/runtime.js');
  const declaration = runtime.match(/function v31CalculatePinchCamera\(start,current,viewport\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(declaration, 'pure pinch camera calculation is present');
  const calculate = new Function(`${declaration}; return v31CalculatePinchCamera;`)();
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
  assert.equal(bounded.zoom, 2.5);
  assert.ok(Math.abs(bounded.x) <= 300 && Math.abs(bounded.y) <= 225);
  const resetLimit = calculate(
    { x: 200, y: 150, distance: 100, zoom: 2, panX: 0, panY: 0 },
    { x: 900, y: 900, distance: 10 }, viewport
  );
  assert.equal(resetLimit.zoom, 1);
  assert.deepEqual([resetLimit.x, resetLimit.y], [0, 0]);
});

test('passport copy reports earned stamps without implying seven reviewed countries', async () => {
  const runtime = await read('tools/v3/runtime.js');
  const page = runtime.slice(runtime.indexOf('v31WorldPage=function v31ApprovedWorldPage()'), runtime.indexOf('const v3OriginalCreateWeek'));
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
