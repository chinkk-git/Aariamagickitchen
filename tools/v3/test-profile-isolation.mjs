import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const runtime = fs.readFileSync(new URL('./runtime.js', import.meta.url), 'utf8');
assert.ok(runtime.includes("function v3RestoreCreationsRoute(){if(location.hash==='#aria/creations'){view='creations';render()}}") && runtime.includes("window.addEventListener('popstate',v3RestoreCreationsRoute)"), 'My Creations must be recognized by Android hash navigation and restored on Back');
// Regression guard: the profile-aware render wrapper must call the prior renderer,
// not its own named function (which previously overflowed the stack on profile setup).
assert.ok(runtime.includes('const v3RenderBeforeProfileControls=render;') && /render=function\(\)\{const creationsView=view==='creations';if\(creationsView\)view='home';v3SyncRecipeArt\(\);v3RenderBeforeProfileControls\(\);if\(creationsView\)/.test(runtime), 'profile wrapper must preserve profile art syncing while safely routing My Creations through the pre-profile renderer');
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
const failedNativeStore = new Map();
let nativeSaveAttempts = 0;
const nativeFallbackContext = vm.createContext({
  window: { AariaNative: { saveProfileSnapshot: () => { nativeSaveAttempts++; return false; } } },
  localStorage: { getItem: key => failedNativeStore.get(key) ?? null, setItem: (key, value) => failedNativeStore.set(key, value) },
  v3ProfileState: { activeId: 'local-recovery', profiles: [{ id: 'local-recovery', name: 'Recovered', snapshot: {} }] },
  state: { done: [8] },
  v3ParseProfileState: raw => { try { const value = JSON.parse(raw || '{}'); return Array.isArray(value.profiles) ? value : { profiles: [] }; } catch { return { profiles: [] }; } }
});
vm.runInContext(runtime.slice(persistStart, persistEnd), nativeFallbackContext);
vm.runInContext('v3PersistProfileState()', nativeFallbackContext);
assert.equal(nativeSaveAttempts, 1);
const nativeFallbackProfiles = JSON.parse(failedNativeStore.get('myMagicalKitchenProfilesV1'));
assert.deepEqual(nativeFallbackProfiles.profiles[0].snapshot, { done: [8] }, 'failed native saves must still persist recovered profiles locally');
assert.deepEqual(nativeFallbackProfiles.pendingProfileIds, ['local-recovery'], 'failed native saves must be marked for startup reconciliation');

// A successful native initialization can still return an older snapshot after a prior
// native save failed. Recover the marked local snapshot before displaying or overwriting it.
const recoveryStore = new Map([['myMagicalKitchenProfilesV1', JSON.stringify({
  activeId: 'profile-recovery',
  pendingProfileIds: ['profile-recovery'],
  profiles: [{ id: 'profile-recovery', name: 'Aaria', chefId: 'CHEF_A', snapshot: { done: [8], favorites: ['recipe-new'] } }]
})]]);
let reconciliationSaveAttempts = 0;
const recoveryContext = vm.createContext({
  window: { AariaNative: { saveProfileSnapshot: () => { reconciliationSaveAttempts++; return false; } } },
  localStorage: { getItem: key => recoveryStore.get(key) ?? null, setItem: (key, value) => recoveryStore.set(key, value) },
  v3ProfileState: { profiles: [], activeId: null, profile: null },
  v3ProfileInitComplete: false,
  v3ProfileSaveWrapped: false,
  state: { done: [], favorites: [], avatarAssignments: {} },
  save: () => {}
});
const parseStart = runtime.indexOf('function v3ParseProfileState(raw){');
const parseEnd = runtime.indexOf('\nfunction v3PersistProfileState', parseStart);
const emptyStart = runtime.indexOf('function v3EmptyProfileValue');
const emptyEnd = runtime.indexOf('\nfunction v3ProfileStateFor', emptyStart);
const stateStart = runtime.indexOf('function v3ProfileStateFor');
const stateEnd = runtime.indexOf('\nfunction v3SetActiveProfile', stateStart);
const activeStart = runtime.indexOf('function v3SetActiveProfile(result){');
const activeEnd = runtime.indexOf('\nfunction v3InitProfiles', activeStart);
assert(parseStart >= 0 && parseEnd > parseStart && emptyStart >= 0 && emptyEnd > emptyStart && stateStart >= 0 && stateEnd > stateStart && activeStart >= 0 && activeEnd > activeStart, 'profile recovery helpers must be available');
vm.runInContext(runtime.slice(parseStart, parseEnd) + runtime.slice(emptyStart, emptyEnd) + runtime.slice(stateStart, stateEnd) + runtime.slice(activeStart, activeEnd), recoveryContext);
vm.runInContext("v3SetActiveProfile({profiles:[{id:'profile-recovery',name:'Aaria',chefId:'CHEF_A'}],activeId:'profile-recovery',snapshot:{done:[1],favorites:['recipe-old']}})", recoveryContext);
assert.deepEqual(JSON.parse(JSON.stringify(recoveryContext.state.done)), [8], 'startup must restore the dirty local progress snapshot over stale native data');
assert.deepEqual(JSON.parse(JSON.stringify(recoveryContext.state.favorites)), ['recipe-new'], 'startup must restore dirty favourites over stale native data');
assert.equal(reconciliationSaveAttempts, 1, 'startup must retry saving the recovered snapshot to native storage');
assert.deepEqual(JSON.parse(recoveryStore.get('myMagicalKitchenProfilesV1')).pendingProfileIds, ['profile-recovery'], 'failed reconciliation must remain pending for another startup');

recoveryContext.window.AariaNative.saveProfileSnapshot = () => { reconciliationSaveAttempts++; return true; };
vm.runInContext("v3SetActiveProfile({profiles:[{id:'profile-recovery',name:'Aaria',chefId:'CHEF_A'}],activeId:'profile-recovery',snapshot:{done:[1],favorites:['recipe-old']}})", recoveryContext);
assert.deepEqual(JSON.parse(JSON.stringify(recoveryContext.state.done)), [8]);
assert.deepEqual(JSON.parse(recoveryStore.get('myMagicalKitchenProfilesV1')).pendingProfileIds, [], 'successful reconciliation must clear the recovery marker');
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
const parserEnd = runtime.indexOf('\nfunction v3PersistProfileState', parserStart);
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
const nativeFailure = vm.runInContext(`v3ParseProfileState('{\"error\":\"IllegalArgumentException\"}')`, parserContext);
assert.equal(nativeFailure.error, 'IllegalArgumentException', 'native migration errors must reach v3InitProfiles so its local recovery path is used');
parserContext.incoming = recovered;
const objectRecovery = vm.runInContext('v3ParseProfileState(incoming)', parserContext);
assert.deepEqual(JSON.parse(JSON.stringify(objectRecovery)), JSON.parse(JSON.stringify(recovered)));

console.log('Profile persistence and snapshot isolation checks passed.');

console.log('Profile snapshot reset isolation checks passed.');


const tourStart = runtime.indexOf('function v3WhatsNewCopy(index,pt){');
const tourEnd = runtime.indexOf('\nlet v3WhatsNewOpener', tourStart);
assert(tourStart >= 0 && tourEnd > tourStart, 'V3 tour copy helper must exist');
const tourContext = vm.createContext({});
tourContext.RECIPES = Array.from({ length: 95 }, (_, index) => ({ id: index + 1 }));
vm.runInContext(runtime.slice(tourStart, tourEnd), tourContext);
const englishTour = vm.runInContext('[0,1,2].map(index=>v3WhatsNewCopy(index,false))', tourContext);
const portugueseTour = vm.runInContext('[0,1,2].map(index=>v3WhatsNewCopy(index,true))', tourContext);
assert.equal(englishTour.length, 3);
assert.match(englishTour[0].body, /95 recipes/);
assert.match(englishTour[0].body, /adult.*allergies/);
assert.match(englishTour[1].body, /adult to review/);
assert.match(englishTour[2].body, /profile.*Favourites.*progress/);
assert.match(portugueseTour[0].body, /95 receitas/);
assert.match(portugueseTour[0].body, /adulto.*alergias/);
assert.equal(vm.runInContext('v3WhatsNewCopy(-1,false)', tourContext), null);
assert.equal(vm.runInContext('v3WhatsNewCopy(3,true)', tourContext), null);
assert.ok(runtime.includes('data-v3-tour-open') && runtime.includes('data-v3-tour-close') && runtime.includes('data-v3-tour-step'), 'tour must expose launch, skip/finish and step controls');
assert.ok(runtime.includes('Replay the V3 kitchen tour'), 'tour must be replayable from Settings');
console.log('V3 kitchen tour is translated, bounded, skippable, replayable and keeps adult review guidance.');
