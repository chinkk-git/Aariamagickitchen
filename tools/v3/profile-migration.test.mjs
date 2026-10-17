import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateLegacyProfile} from './profile-migration.js';

const SOURCE = 'aariaPrivateKitchenV4';
const TARGET = 'aariaProfilesV1';
const CONTACTS = 'aariaWhatsappRecipientsV1';

class MemoryStorage {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
    this.writes = [];
    this.failWriteKey = null;
    this.corruptReadKey = null;
  }
  getItem(key) {
    if (key === this.corruptReadKey) return '{corrupt readback';
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    if (key === this.failWriteKey) throw new Error('quota');
    this.writes.push(key);
    this.values.set(key, String(value));
  }
  removeItem() { throw new Error('removeItem must never be used'); }
  clear() { throw new Error('clear must never be used'); }
}

function fixture() {
  return {
    weeks: {'2026-10-12': {ids: [12, 44], locks: [false, true]}},
    done: [12],
    checks: {'12': [0, 2]},
    stories: {},
    favorites: [44],
    grocerySelected: [12, 44],
    language: 'en-GB',
    avatarAssignments: {'12': 1},
    nutritionOverrides: {'12': {serving: 1}},
    reducedMotion: true,
    futureUnknownField: {nested: ['kept', 7]}
  };
}

function seed(extra = {}) {
  const state = fixture();
  return new MemoryStorage({
    [SOURCE]: JSON.stringify(state),
    [CONTACTS]: JSON.stringify({mom: '5511999999999', dad: ''}),
    'aariaPortableImported:sample-1': '1',
    ...extra
  });
}

test('copies every legacy and unknown field without altering its source or adult contacts', () => {
  const storage = seed();
  const original = storage.getItem(SOURCE);
  const contacts = storage.getItem(CONTACTS);
  const imported = storage.getItem('aariaPortableImported:sample-1');

  assert.deepEqual(migrateLegacyProfile(storage), {status: 'snapshot_verified', changed: true});
  const envelope = JSON.parse(storage.getItem(TARGET));
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.storageModel, 'legacy-shadow');
  assert.equal(envelope.activeProfileId, 'legacy-aaria');
  assert.equal(envelope.profiles.length, 1);
  assert.equal(envelope.profiles[0].displayName, null);
  assert.deepEqual(envelope.profiles[0].state, fixture());
  assert.equal(storage.getItem(SOURCE), original);
  assert.equal(storage.getItem(CONTACTS), contacts);
  assert.equal(storage.getItem('aariaPortableImported:sample-1'), imported);
  assert.ok(storage.writes.every(key => key === TARGET));
});

test('is idempotent when the verified snapshot already matches', () => {
  const storage = seed();
  migrateLegacyProfile(storage);
  storage.writes.length = 0;

  assert.deepEqual(migrateLegacyProfile(storage), {status: 'snapshot_verified', changed: false});
  assert.deepEqual(storage.writes, []);
});

test('refreshes only the single legacy shadow after V4 progress changes', () => {
  const storage = seed();
  migrateLegacyProfile(storage);
  const changed = {...fixture(), done: [12, 44]};
  storage.setItem(SOURCE, JSON.stringify(changed));

  assert.deepEqual(migrateLegacyProfile(storage), {status: 'snapshot_verified', changed: true});
  const envelope = JSON.parse(storage.getItem(TARGET));
  assert.deepEqual(envelope.profiles[0].state, changed);
  assert.equal(storage.getItem(SOURCE), JSON.stringify(changed));
});

test('does not overwrite malformed or ambiguous legacy data', () => {
  const malformed = new MemoryStorage({[SOURCE]: '{bad'});
  assert.equal(migrateLegacyProfile(malformed).status, 'malformed_legacy_json');
  assert.equal(malformed.getItem(TARGET), null);
  assert.deepEqual(malformed.writes, []);

  const scalar = new MemoryStorage({[SOURCE]: '[]'});
  assert.equal(migrateLegacyProfile(scalar).status, 'ambiguous_legacy_state');
  assert.equal(scalar.getItem(TARGET), null);
});

test('retains the source and allows a later retry after quota/write failure', () => {
  const storage = seed();
  const original = storage.getItem(SOURCE);
  storage.failWriteKey = TARGET;

  assert.equal(migrateLegacyProfile(storage).status, 'write_failed');
  assert.equal(storage.getItem(SOURCE), original);
  assert.equal(storage.getItem(TARGET), null);
  assert.ok(!storage.writes.includes(SOURCE));

  storage.failWriteKey = null;
  assert.equal(migrateLegacyProfile(storage).status, 'snapshot_verified');
  assert.deepEqual(JSON.parse(storage.getItem(TARGET)).profiles[0].state, fixture());
});

test('does not mark a snapshot verified when readback cannot be parsed', () => {
  const storage = seed();
  storage.corruptReadKey = TARGET;
  assert.equal(migrateLegacyProfile(storage).status, 'verification_failed');
  assert.equal(storage.getItem(SOURCE), JSON.stringify(fixture()));
});

test('does not overwrite a future multi-profile envelope', () => {
  const future = {
    schemaVersion: 2,
    storageModel: 'multi-profile',
    profiles: [{id: 'child-1', state: {done: [9]}}]
  };
  const storage = seed({[TARGET]: JSON.stringify(future)});
  const original = storage.getItem(TARGET);

  assert.equal(migrateLegacyProfile(storage).status, 'profile_envelope_conflict');
  assert.equal(storage.getItem(TARGET), original);
  assert.deepEqual(storage.writes, []);
});

test('leaves profile data absent when no V4 source exists', () => {
  const storage = new MemoryStorage();
  assert.equal(migrateLegacyProfile(storage).status, 'no_legacy_state');
  assert.equal(storage.getItem(TARGET), null);
  assert.deepEqual(storage.writes, []);
});
