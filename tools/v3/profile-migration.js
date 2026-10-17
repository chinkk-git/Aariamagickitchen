const SOURCE_KEY = 'aariaPrivateKitchenV4';
const PROFILE_KEY = 'aariaProfilesV1';
const PROFILE_ID = 'legacy-aaria';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Copy the live V4 record into a verified, single-profile shadow envelope.
 * V4 stays the app's source of truth until profile switching is implemented.
 * This function never clears or removes legacy keys.
 */
export function migrateLegacyProfile(storage) {
  if (!storage || typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function') {
    return {status: 'storage_unavailable'};
  }

  let sourceRaw;
  let envelopeRaw;
  try {
    sourceRaw = storage.getItem(SOURCE_KEY);
    if (sourceRaw === null) return {status: 'no_legacy_state'};
    envelopeRaw = storage.getItem(PROFILE_KEY);
  } catch {
    return {status: 'storage_unavailable'};
  }

  let sourceState;
  try {
    sourceState = JSON.parse(sourceRaw);
  } catch {
    return {status: 'malformed_legacy_json'};
  }
  if (!isRecord(sourceState)) return {status: 'ambiguous_legacy_state'};

  let envelope;
  if (envelopeRaw !== null) {
    try {
      envelope = JSON.parse(envelopeRaw);
    } catch {
      return {status: 'malformed_profile_envelope'};
    }
    const profile = isRecord(envelope) && Array.isArray(envelope.profiles)
      ? envelope.profiles.find(item => item?.id === PROFILE_ID)
      : null;
    if (!isRecord(envelope) ||
        envelope.schemaVersion !== 1 ||
        envelope.storageModel !== 'legacy-shadow' ||
        !profile ||
        envelope.profiles.length !== 1) {
      return {status: 'profile_envelope_conflict'};
    }

    if (sameJson(profile.state, sourceState)) {
      return {status: 'snapshot_verified', changed: false};
    }

    // Refresh only our single-profile shadow. Preserve unrelated envelope metadata.
    const refreshed = {
      ...envelope,
      profiles: envelope.profiles.map(item => item.id === PROFILE_ID
        ? {...item, state: sourceState}
        : item),
      migration: {
        sourceKey: SOURCE_KEY,
        status: 'snapshot_verified',
        schemaVersion: 1
      }
    };
    return writeAndVerify(storage, refreshed);
  }

  const nextEnvelope = {
    schemaVersion: 1,
    storageModel: 'legacy-shadow',
    activeProfileId: PROFILE_ID,
    profiles: [{
      id: PROFILE_ID,
      displayName: null,
      avatarChoice: null,
      state: sourceState
    }],
    migration: {
      sourceKey: SOURCE_KEY,
      status: 'snapshot_verified',
      schemaVersion: 1
    }
  };
  return writeAndVerify(storage, nextEnvelope);
}

function writeAndVerify(storage, envelope) {
  let serialized;
  try {
    serialized = JSON.stringify(envelope);
    storage.setItem(PROFILE_KEY, serialized);
  } catch {
    return {status: 'write_failed'};
  }

  try {
    const verifiedRaw = storage.getItem(PROFILE_KEY);
    if (verifiedRaw === null || !sameJson(JSON.parse(verifiedRaw), envelope)) {
      return {status: 'verification_failed'};
    }
  } catch {
    return {status: 'verification_failed'};
  }
  return {status: 'snapshot_verified', changed: true};
}
