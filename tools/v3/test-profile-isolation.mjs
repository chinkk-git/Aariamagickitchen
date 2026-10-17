import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const runtime = fs.readFileSync(new URL('./runtime.js', import.meta.url), 'utf8');
// Regression guard: the profile-aware render wrapper must call the prior renderer,
// not its own named function (which previously overflowed the stack on profile setup).
assert.ok(runtime.includes('const v3RenderBeforeProfileControls=render;\\nrender=function(){v3RenderBeforeProfileControls();'), 'profile wrapper must invoke the pre-profile renderer');
assert.ok(!runtime.includes('const v3RenderWithProfiles=render;\\nrender=function v3RenderWithProfiles(){v3RenderWithProfiles();'), 'profile wrapper must not call itself recursively');

const start = runtime.indexOf('function v3EmptyProfileValue');
const end = runtime.indexOf('\nfunction v3SetActiveProfile', start);
assert(start >= 0 && end > start, 'profile reset helper must be present before profile application');
const helperSource = runtime.slice(start, end);
const context = vm.createContext({});
vm.runInContext(helperSource, context);

const prior = {
  weeks: { week1: { day1: true } },
  done: [3],
  favorites: ['recipe-old'],
  language: 'pt-BR',
  parentContacts: { mommy: '5511999999999', daddy: '' },
  unknownLegacyField: { privateValue: 'do-not-carry' },
  customFlag: true,
  customCount: 7
};
const incoming = {
  favorites: ['recipe-new'],
  unknownLegacyField: { currentProfileValue: 'preserved' },
  newerFeature: { enabled: true }
};
context.template = prior;
context.snapshot = incoming;
const result = vm.runInContext('v3ProfileStateFor(template, snapshot)', context);

assert.deepEqual(JSON.parse(JSON.stringify(result.weeks)), { week1: { day1: false } });
assert.deepEqual(JSON.parse(JSON.stringify(result.done)), []);
assert.deepEqual(JSON.parse(JSON.stringify(result.favorites)), ['recipe-new']);
assert.equal(result.language, 'pt-BR');
assert.deepEqual(JSON.parse(JSON.stringify(result.parentContacts)), { mommy: '', daddy: '' });
assert.deepEqual(JSON.parse(JSON.stringify(result.unknownLegacyField)), { currentProfileValue: 'preserved' });
assert.equal(result.customFlag, false);
assert.equal(result.customCount, 0);
assert.deepEqual(JSON.parse(JSON.stringify(result.newerFeature)), { enabled: true });
console.log('Profile snapshot reset isolation checks passed.');
