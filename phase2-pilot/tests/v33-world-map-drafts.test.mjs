import test from 'node:test';
import assert from 'node:assert/strict';
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
