import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const runtime = fs.readFileSync(new URL('./runtime.js', import.meta.url), 'utf8');
// Regression guard: the profile-aware render wrapper must call the prior renderer,
// not its own named function (which previously overflowed the stack on profile setup).
assert.ok(runtime.includes('const v3RenderBeforeProfileControls=render;') && /render=function\(\)\{(?:v3SyncRecipeArt\(\);)?v3RenderBeforeProfileControls\(\);/.test(runtime), 'profile wrapper must sync profile art before invoking the pre-profile renderer');
assert.ok(!runtime.includes('function v3RenderWithProfiles(){v3RenderWithProfiles();'), 'profile wrapper must not call itself recursively');

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

// New profiles must reset every field in the live production state schema, not
// only the fields known when V3 was first written. This keeps older app renderers
// from encountering missing nested defaults after a profile is created.
const freshStart = runtime.indexOf('function v3FreshSnapshot(){');
const freshEnd = runtime.indexOf('\nfunction v3ApplyProfileResult', freshStart);
assert(freshStart >= 0 && freshEnd > freshStart, 'fresh profile snapshot builder must exist');
context.state = {
  weeks: { '2026-10-12': { ids: [3, 4], locks: [true, false] } },
  done: [3], checks: { '3': true }, stories: ['saved-story'],
  favorites: [3], grocerySelected: [3], language: 'pt-BR',
  legacyExtension: { step: 3, enabled: true, list: [3] }
};
vm.runInContext(runtime.slice(freshStart, freshEnd), context);
const freshSnapshot = vm.runInContext('v3FreshSnapshot()', context);
assert.deepEqual(JSON.parse(JSON.stringify(freshSnapshot.weeks)), {});
assert.deepEqual(JSON.parse(JSON.stringify(freshSnapshot.done)), []);
assert.deepEqual(JSON.parse(JSON.stringify(freshSnapshot.checks)), {});
assert.deepEqual(JSON.parse(JSON.stringify(freshSnapshot.stories)), []);
assert.deepEqual(JSON.parse(JSON.stringify(freshSnapshot.favorites)), []);
assert.deepEqual(JSON.parse(JSON.stringify(freshSnapshot.grocerySelected)), []);
assert.equal(freshSnapshot.language, 'pt-BR');
assert.deepEqual(JSON.parse(JSON.stringify(freshSnapshot.avatarAssignments)), {});
assert.deepEqual(JSON.parse(JSON.stringify(freshSnapshot.legacyExtension)), { step: 0, enabled: false, list: [] });
assert.deepEqual(JSON.parse(JSON.stringify(result.newerFeature)), { enabled: true });
const persistStart = runtime.indexOf('function v3PersistProfileState(){');
const persistEnd = runtime.indexOf('\nfunction v3EmptyProfileValue', persistStart);
assert(persistStart >= 0 && persistEnd > persistStart, 'profile persistence helper must be present');
const profileStore = new Map();
const persistenceContext = vm.createContext({
  window: {},
  localStorage: { getItem: key => profileStore.get(key) ?? null, setItem: (key, value) => profileStore.set(key, value) },
  v3ProfileState: { activeId: 'profile-new', profiles: [
    { id: 'profile-new', name: 'Aaria', chefId: 'CHEF_A', snapshot: {} },
    { id: 'profile-existing', name: 'Guest', chefId: 'CHEF_B', snapshot: { done: [9] } }
  ] },
  state: { done: [4], favorites: ['recipe-1'] },
  v3ParseProfileState: raw => { try { const value = JSON.parse(raw || '{}'); return Array.isArray(value.profiles) ? value : { profiles: [] }; } catch { return { profiles: [] }; } }
});
vm.runInContext(runtime.slice(persistStart, persistEnd), persistenceContext);
vm.runInContext('v3PersistProfileState()', persistenceContext);
const savedProfiles = JSON.parse(profileStore.get('myMagicalKitchenProfilesV1'));
assert.equal(savedProfiles.activeId, 'profile-new');
assert.deepEqual(savedProfiles.profiles.map(profile => profile.id), ['profile-new', 'profile-existing']);
assert.deepEqual(savedProfiles.profiles[0].snapshot, { done: [4], favorites: ['recipe-1'] });
assert.deepEqual(savedProfiles.profiles[1].snapshot, { done: [9] });
const legacyCalls = [];
const legacyTrigger = { textContent: '' };
const legacyProfile = { id: 'legacy-aaria-v4', name: 'Aaria', chefId: 'LEGACY_AARIA' };
const legacyContext = vm.createContext({
  window: { AariaNative: { chooseProfileChef: (id, chef) => { legacyCalls.push(['choose', id, chef]); return true; } } },
  document: { querySelector: selector => selector === '[data-v3-profile-open]' ? legacyTrigger : null },
  v3ProfileState: { profile: legacyProfile },
  v3PersistProfileState: () => legacyCalls.push(['persist']),
  render: () => legacyCalls.push(['render'])
});
const legacyStart = runtime.indexOf('function v3CreateOrSelectChef(');
const legacyEnd = runtime.indexOf('\ndocument.addEventListener(\'click\'', legacyStart);
assert(legacyStart >= 0 && legacyEnd > legacyStart, 'legacy chef-selection function must be present');
vm.runInContext(runtime.slice(legacyStart, legacyEnd), legacyContext);
vm.runInContext("v3CreateOrSelectChef('Aaria', 'CHEF_A')", legacyContext);
assert.equal(legacyProfile.chefId, 'CHEF_A');
assert.deepEqual(legacyCalls, [['choose', 'legacy-aaria-v4', 'CHEF_A'], ['persist']]);
assert.equal(legacyTrigger.textContent, '👩‍🍳 Aaria ▾');
console.log('Legacy chef selection persists without rerendering the existing kitchen.');

// Corrupt/partial profile records must not crash activation or erase intact snapshots.
const parserStart = runtime.indexOf('function v3ParseProfileState(raw){');
const parserEnd = runtime.indexOf('\\nfunction v3PersistProfileState', parserStart);
assert(parserStart >= 0 && parserEnd > parserStart, 'profile parser must be available for recovery tests');
const parserContext = vm.createContext({});
vm.runInContext(runtime.slice(parserStart, parserEnd), parserContext);
const recovered = vm.runInContext(`v3ParseProfileState(JSON.stringify({
  profiles: [
    null,
    {},
    { id: '  chef-one  ', name: 'Chef One', snapshot: { done: [3], favorites: [7] } },
    { id: 'chef-one', name: 'Duplicate', snapshot: { done: [99] } },
    { id: 'chef-two', name: 'Chef Two', snapshot: [] },
    { id: '', name: 'Missing ID' }
  ],
  activeId: 'deleted-profile'
}))`, parserContext);
assert.deepEqual(JSON.parse(JSON.stringify(recovered.profiles.map(p => p.id))), ['chef-one', 'chef-two']);
assert.equal(recovered.activeId, 'chef-one', 'stale active ID must recover to first valid profile');
assert.deepEqual(JSON.parse(JSON.stringify(recovered.profiles[0].snapshot)), { done: [3], favorites: [7] });
assert.deepEqual(JSON.parse(JSON.stringify(recovered.profiles[1].snapshot)), {});
assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext(`v3ParseProfileState('not-json')`, parserContext))), { profiles: [], activeId: null, snapshot: {} });
assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('v3ParseProfileState(arguments[0])', parserContext, { arguments: [recovered] }))), JSON.parse(JSON.stringify(recovered));

console.log('Profile persistence and snapshot isolation checks passed.');

console.log('Profile snapshot reset isolation checks passed.');

