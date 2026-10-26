#!/usr/bin/env bash
# Explicitly opt-in isolated emulator test only. Never uninstall or clear data.
set -euo pipefail
: "${V3_BASELINE_APK:?Set path to original signed production-package baseline APK}"
: "${UPGRADE_CANDIDATE_APK:?Set path to release-signed unified production-package candidate APK}"
: "${ANDROID_HOME:?Android SDK required}"
AAPT="${ANDROID_HOME}/build-tools/35.0.0/aapt"
SIGNER="${ANDROID_HOME}/build-tools/35.0.0/apksigner"
PACKAGE=com.aaria.magickitchen.pilot
EXPECTED_SIGNER_SHA256=3aeda9b71ab29c4c21d9fca5155418b5684a2111cec6fc17222b64db03697588
EVIDENCE_DIR="${V34_UPGRADE_EVIDENCE_DIR:-artifacts/v34-upgrade-evidence}"
mkdir -p "$EVIDENCE_DIR"
identity() {
  "$AAPT" dump badging "$1" | sed -n "s/^package: name='\\([^']*\\)' versionCode='\\([^']*\\)'.*/\\1 \\2/p" | head -1
}
fingerprint() {
  "$SIGNER" verify --print-certs "$1" | sed -nE 's/^(Signer #[0-9]+ certificate SHA-256 digest: |V[123] Signer: certificate SHA-256 digest: )//p' | head -1 | tr '[:upper:]' '[:lower:]'
}
read -r base_pkg base_version <<< "$(identity "$V3_BASELINE_APK")"
read -r next_pkg next_version <<< "$(identity "$UPGRADE_CANDIDATE_APK")"
[[ "$base_pkg" == "$PACKAGE" && "$next_pkg" == "$PACKAGE" ]] || { echo 'BLOCKED: package identity mismatch'; exit 1; }
[[ "$next_version" =~ ^[0-9]+$ && "$base_version" =~ ^[0-9]+$ && "$next_version" -gt "$base_version" ]] || { echo 'BLOCKED: versionCode must increase'; exit 1; }
base_cert="$(fingerprint "$V3_BASELINE_APK")"; next_cert="$(fingerprint "$UPGRADE_CANDIDATE_APK")"
printf '{"baseline_package":"%s","baseline_versionCode":%s,"baseline_signer_sha256":"%s","candidate_package":"%s","candidate_versionCode":%s,"candidate_signer_sha256":"%s","expected_signer_sha256":"%s"}\n' \
  "$base_pkg" "$base_version" "$base_cert" "$next_pkg" "$next_version" "$next_cert" "$EXPECTED_SIGNER_SHA256" > "$EVIDENCE_DIR/apk-identity.json"
[[ -n "$base_cert" && "$base_cert" == "$next_cert" && "$next_cert" == "$EXPECTED_SIGNER_SHA256" ]] || { echo 'BLOCKED: signing identity mismatch'; exit 1; }
[[ "${ALLOW_ISOLATED_EMULATOR_INSTALL:-}" == "YES" ]] || { echo 'BLOCKED: isolated-emulator opt-in required'; exit 1; }
[[ -n "${SEED_VERIFY_COMMAND:-}" ]] || { echo 'BLOCKED: seeded-data assertion command required'; exit 1; }
[[ -f "${SEED_VERIFY_COMMAND}" && -x "${SEED_VERIFY_COMMAND}" ]] || { echo 'BLOCKED: SEED_VERIFY_COMMAND must be an executable test script'; exit 1; }
[[ -n "${ANDROID_SERIAL:-}" && "${ANDROID_SERIAL}" == emulator-* ]] || { echo 'BLOCKED: ANDROID_SERIAL must identify an emulator'; exit 1; }
adb -s "$ANDROID_SERIAL" wait-for-device
[[ "$(adb -s "$ANDROID_SERIAL" shell getprop ro.kernel.qemu | tr -d '\r')" == "1" ]] || { echo 'BLOCKED: target is not an emulator'; exit 1; }
[[ "$(adb -s "$ANDROID_SERIAL" shell pm path "$PACKAGE" 2>/dev/null || true)" == "" ]] || { echo 'BLOCKED: test emulator already contains target package; do not overwrite it'; exit 1; }
adb -s "$ANDROID_SERIAL" install "$V3_BASELINE_APK"
# Seed a marker into app-private data through an authorized app-side test hook or instrumentation;
# do not claim data preservation without an observed marker surviving the upgrade.
"$SEED_VERIFY_COMMAND" seed "$ANDROID_SERIAL" "$PACKAGE"
adb -s "$ANDROID_SERIAL" install -r "$UPGRADE_CANDIDATE_APK"
"$SEED_VERIFY_COMMAND" verify "$ANDROID_SERIAL" "$PACKAGE"
adb -s "$ANDROID_SERIAL" shell pm path "$PACKAGE"
report="${V34_UPGRADE_EVIDENCE_DIR:-artifacts/v34-upgrade-evidence}/data-after-restart.json"
if [[ -s "$report" ]] && grep -Fq '"full_upgrade_acceptance": "PASS"' "$report"; then
  echo 'PASS: same-package, same-signer, higher-version emulator upgrade and all required seeded-data checks passed'
else
  echo 'PARTIAL: package/signing/version continuity and completed UI assertions are recorded; full upgrade acceptance remains NOT VERIFIED in the data report'
fi
