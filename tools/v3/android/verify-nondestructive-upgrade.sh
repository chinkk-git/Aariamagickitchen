#!/usr/bin/env bash
# Explicitly opt-in isolated emulator test only. Never uninstall or clear data.
set -euo pipefail
: "${V3_BASELINE_APK:?Set path to original signed production-package baseline APK}"
: "${UPGRADE_CANDIDATE_APK:?Set path to release-signed unified production-package candidate APK}"
: "${ANDROID_HOME:?Android SDK required}"
AAPT="${ANDROID_HOME}/build-tools/35.0.0/aapt"
SIGNER="${ANDROID_HOME}/build-tools/35.0.0/apksigner"
PACKAGE=com.aaria.magickitchen.pilot
identity() {
  "$AAPT" dump badging "$1" | sed -n "s/^package: name='\\([^']*\\)' versionCode='\\([^']*\\)'.*/\\1 \\2/p" | head -1
}
fingerprint() {
  "$SIGNER" verify --print-certs "$1" | sed -n 's/^V[123] Signer: certificate SHA-256 digest: //p' | head -1
}
read -r base_pkg base_version <<< "$(identity "$V3_BASELINE_APK")"
read -r next_pkg next_version <<< "$(identity "$UPGRADE_CANDIDATE_APK")"
[[ "$base_pkg" == "$PACKAGE" && "$next_pkg" == "$PACKAGE" ]] || { echo 'BLOCKED: package identity mismatch'; exit 1; }
[[ "$next_version" =~ ^[0-9]+$ && "$base_version" =~ ^[0-9]+$ && "$next_version" -gt "$base_version" ]] || { echo 'BLOCKED: versionCode must increase'; exit 1; }
base_cert="$(fingerprint "$V3_BASELINE_APK")"; next_cert="$(fingerprint "$UPGRADE_CANDIDATE_APK")"
[[ -n "$base_cert" && "$base_cert" == "$next_cert" ]] || { echo 'BLOCKED: signing identity mismatch'; exit 1; }
[[ "${ALLOW_ISOLATED_EMULATOR_INSTALL:-}" == "YES" ]] || { echo 'BLOCKED: isolated-emulator opt-in required'; exit 1; }
[[ -n "${SEED_VERIFY_COMMAND:-}" ]] || { echo 'BLOCKED: seeded-data assertion command required'; exit 1; }
[[ -n "${ANDROID_SERIAL:-}" && "${ANDROID_SERIAL}" == emulator-* ]] || { echo 'BLOCKED: ANDROID_SERIAL must identify an emulator'; exit 1; }
adb -s "$ANDROID_SERIAL" wait-for-device
[[ "$(adb -s "$ANDROID_SERIAL" shell getprop ro.kernel.qemu | tr -d '\r')" == "1" ]] || { echo 'BLOCKED: target is not an emulator'; exit 1; }
adb -s "$ANDROID_SERIAL" install "$V3_BASELINE_APK"
# Seed a marker into app-private data through an authorized app-side test hook or instrumentation;
# do not claim data preservation without an observed marker surviving the upgrade.
[[ -n "${SEED_VERIFY_COMMAND:-}" ]] || { echo 'BLOCKED: provide SEED_VERIFY_COMMAND to seed and assert actual app-private user data'; exit 1; }
bash -c "$SEED_VERIFY_COMMAND seed"
adb -s "$ANDROID_SERIAL" install -r "$UPGRADE_CANDIDATE_APK"
bash -c "$SEED_VERIFY_COMMAND verify"
adb -s "$ANDROID_SERIAL" shell pm path "$PACKAGE"
echo 'PASS: same-package, same-signer, higher-version non-destructive emulator upgrade; seeded marker verified'
