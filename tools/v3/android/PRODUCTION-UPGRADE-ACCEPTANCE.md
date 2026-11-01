# W01 production-upgrade test — prerequisites and evidence contract

Status: **BLOCKED, NOT EXECUTED**. Preview CI proves co-installation, not an in-place upgrade. No real installation or user-data mutation is authorized.

## Immutable inputs

- `V3_BASELINE_APK`: authentic existing V3 APK (`com.aaria.magickitchen.pilot`, observed versionCode 7). Baseline certificate fingerprint from CI: `9d0e87112841198295a0b33da7c6770cf7785c4d8634417468c18f642ac2db8b`.
- `UPGRADE_CANDIDATE_APK`: newly built unified APK with **same package**, **same certificate**, **versionCode > 7**. Never use `com.aaria.magickitchen.pilot.v31preview` as candidate.
- Signing must be performed by a separately authorized secure release-signing workflow. Never copy keys, keystore files or passwords into the repository, logs, test artifacts or this harness.
- `ANDROID_SERIAL`: dedicated disposable emulator, not a phone; `ALLOW_ISOLATED_EMULATOR_INSTALL=YES`. Harness refuses a preinstalled target package.
- `SEED_VERIFY_COMMAND`: executable, independently validated test script taking `seed|verify SERIAL PACKAGE`. It must use the app's authorized test instrumentation/UI to create a uniquely identified user profile, favorites, recent recipe, planner selection, shopping list and other persisted data **inside the app**, and then compare exact values after upgrade. Merely checking that the APK launches or using an external file marker is **not** sufficient.

## Required test transcript

1. Record exact APK SHA-256, package, versionCode and signer certificate digests; never print secrets.
2. Boot isolated emulator; assert original target package absent.
3. Install authentic V3 baseline; use app instrumentation to seed real user state, persist a reference digest and verify the pre-upgrade state.
4. Execute `adb install -r` with the authorized candidate, **without** `adb uninstall`, `pm clear`, or wiping emulator data between installs.
5. Re-open app and independently compare persisted profile, favorites, shopping list, planner and other supported app state. Check offline launch and user-visible update tour.
6. Capture redacted logs and before/after screenshots; record emulator identity, pass/fail and artifact hashes.
7. Fail on any missing test hook, signing mismatch, version regression, data discrepancy, or installation error. Never claim production upgrade eligibility from the preview co-install smoke.

## Artwork acceptance

Independent A08/A09 decisions for recipes 27, 39, 40, 51 and 63 remain **HOLD** (30 panels). See `../artwork/remediation-pilot/A08-A09-REVIEW-PACKET.md`. Panel-level reviewer identity/date, hazard and mitigation, bilingual usability/accessibility screenshots, provenance/rights clearance and explicit asset-hash promotion approval are still required. No draft artwork integration before approvals.
