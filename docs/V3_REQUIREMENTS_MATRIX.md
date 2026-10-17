# V3 Requirements Traceability Matrix
States: NOT STARTED / IN PROGRESS / BLOCKED / VERIFIED. Link actual code/test/evidence during implementation. Audit basis: `feature/platform-v3` baseline `b057f8603f7950f5e5b5699732a346ee9e453f25`; changes merged via PR #1 at `c8e490fbd45e0631f51ccfff69a27d769028a10f`. Run 39057437535 passed unit tests and debug build; no device tests.

| ID | Requirement | Responsible area | Required evidence | State |
|---|---|---|---|---|
| R001 | Brand My Magical Kitchen throughout app | WP00 | UI screenshots + app label | NOT STARTED |
| R002 | Audience 8–12 inclusive language | WP00/WP09 | content review | NOT STARTED |
| R003 | Onboarding name + CHEF_A/CHEF_B only | WP00 | UI + persistence tests | IN PROGRESS — text-first profile UI and two chef choices added; visual assets, persistence integration tests and first-run/legacy device flows remain open. |
| R004 | No gender field collected | WP00 | schema/privacy audit | NOT STARTED |
| R005 | Multiple isolated local profiles | WP00/WP04 | profile isolation tests | IN PROGRESS — Robolectric SQLite isolation tests pass in CI 39061031142. A runtime merge could retain fields missing from a switched-to snapshot; the profile apply path now clears prior values before overlaying incoming data. CI run 39062236604 passed the adapter-validation step including the new Node regression script; real-device verification remains pending. |
| R006 | Legacy Aaria data migration | WP00/WP04 | verified source key/schema, representative fixture, idempotency/integrity checks | IN PROGRESS — key `aariaPrivateKitchenV4` confirmed in root source; Robolectric tests pass for idempotency, malformed retry and unknown-field preservation (CI 39061031142); installed-data comparison and device recovery remain. |
| R007 | Fixed supporting cast M1/D1/F1–F4 | WP03 | character reference and scene QA | NOT STARTED |
| R008 | Both chef variants in applicable scenes | WP03 | scene registry completeness | NOT STARTED |
| R009 | Correct ingredients and finished dishes | WP03 | recipe-to-artwork QA | NOT STARTED |
| R010 | Landscape and tablet layouts | WP02/WP03 | device screenshots/tests | NOT STARTED |
| R011 | Offline recipes and progress | WP04 | airplane-mode tests | NOT STARTED |
| R012 | Authenticated data-only content packs | WP05 | signature/hash/security tests | IN PROGRESS — verifier/negative tests pass in CI 39061031142; publisher public key is not provisioned, so content installation fails closed. |
| R013 | Atomic activation and rollback | WP05 | fault injection | IN PROGRESS — staged directory swap and failed-activation restore test pass in CI 39061031142; crash/disk-full/restart tests remain open. |
| R014 | Signed APK upgrades preserve data | WP06 | device upgrade test | NOT STARTED |
| R015 | Play Protect ON and parent guide | WP08 | real-device evidence | PARTIAL EVIDENCE |
| R016 | Accurate What's New for each update | WP07 | tour and replay tests | NOT STARTED |
| R017 | Child cooking safety/allergen accuracy | WP09 | content/safety review | NOT STARTED |
| R018 | No cooking timers | ALL | code/UI audit | NOT STARTED |
| R019 | Existing approved features preserved | ALL | baseline regression | NOT STARTED |
| R020 | Autonomous independently reviewed cluster | WP11 | agent files, CI, audit log | IN PROGRESS — session-scoped independent audit/review used; persisted profiles not found in audited tree |
| R021 | Continuous learning with validation | WP11 | learning register + tests | IN PROGRESS — evidence and remediation entries are recorded; persistence/independent profile validation loop remains open. |
| R022 | Verified signed family release | WP10 | build provenance + QA | NOT STARTED |

| R023 | Content manifest authenticated with bundled public key | WP05 | tamper/wrong-key/replay tests | IN PROGRESS — RSA verifier and tamper/wrong-key/replay tests pass in CI; trusted public key/key ID are not provisioned in the app. |
| R024 | Content packs reject scripts, traversal and decompression bombs | WP05 | negative security tests | IN PROGRESS — executable extension/path traversal/size protections tested; dedicated decompression-bomb/device tests remain open. |
| R025 | APK signer/package/version continuity and adult confirmation | WP06 | package/version source; release APK signer lineage; installed APK comparison; upgrade/device tests | BLOCKED — package/version inspected; protected release-signing workflow and Gradle config are prepared, but installed signer and existing production key lineage remain unverified and unavailable. Debug certificate differences do not identify the installed production signer. |
| R026 | Atomic update activation and rollback | WP05 | crash/disk-full tests | IN PROGRESS — activation/recovery implementation and failure test added; crash/process-death/disk-full/device evidence pending. |
| R027 | WebView release hardening and least privilege | WP02 | `MainActivity.kt`, `AppAssetsUrlPolicy.kt`, `AppAssetsUrlPolicyTest.kt`; CI run 39057437535; bridge/navigation device tests | IN PROGRESS — mixed content, Safe Browsing, file URL access, debuggable-only inspection, and exact appassets origin/path policy implemented; five unit tests and CI pass. Bridge-origin/runtime/device review remains open. |
| R028 | Transactional Aaria-to-multiprofile migration | WP00/WP04 | idempotency/integrity tests | IN PROGRESS — Robolectric SQLite tests pass for idempotency, retry, unknown fields and database isolation (CI 39061031142). Runtime profile switching now clears prior-profile fields absent from the incoming snapshot; regression script passes locally and in CI run 39062236604. Installed-app/device crash and recovery tests remain. |

## Evidence boundary

`IN PROGRESS` means partial work/evidence exists, not acceptance. CI run 39061031142 passed HTML validation, Android unit tests (including Robolectric SQLite migration/isolation and signed-pack verifier tests), and debug APK assembly; artifacts 12111133727/12111930308 are available through 2026-11-16. Current code head e5425c6539c93492c241814bf380755b3f9439ae passed CI run 39061031142 with SQLite migration/isolation coverage. No device tests were run. Production APK signer continuity is BLOCKED on trusted signer/key evidence; content publisher key provisioning is also outstanding.


## Current pause gate (2026-10-17)

Draft PR #2 contains the profile/content foundation. The installable artifact from CI is debug-signed and cannot establish an upgrade over the existing app. Before resuming release/update implementation, identify the installed APK signer and secure the existing production signing key lineage outside chat. The content-pack verifier deliberately fails closed until a trusted publisher public key/key ID is bundled; provisioning that trust root and protecting its private signing key is a separate external security action.


CI run 39060387158 passed the latest code head bb2176911a2b1a5061454a9e9500a0499c0897f0 and published development artifacts 12111033320 (debug APK) and 12111286874 (HTML).

## Profile-switch regression CI evidence

CI run 39062236604 passed the profile snapshot reset regression in the adapter-validation step on code commit `44681326da2079d5fee3841eccd7c85b574a7191`. Device validation is still pending.


## Production signing gate update (2026-10-17)

The release build path is implemented in Gradle and `.github/workflows/android-release.yml`. It requires all keystore inputs from protected GitHub Actions secrets and a trusted signer fingerprint from repository variable `ANDROID_SIGNER_SHA256`; `apksigner` must verify the generated APK and the certificate fingerprint must match before artifact upload. Release tasks fail closed when Gradle signing inputs are missing.

This resolves the repository-side configuration gap only. It does not resolve signer continuity: no production keystore, installed signer evidence or verified key lineage is available in the repository/session. R025, R014 and R022 remain BLOCKED or not accepted until the existing signer is established, a signed APK passes fingerprint verification, and a user-confirmed upgrade preserves app data on a device. Do not generate a replacement signer or share private signing material in chat.


CI run [39062826879](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062826879) passed after adding the release signing Gradle configuration. A follow-up run [39062992988](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988) is in progress to prove release assembly is refused when trusted signing inputs are absent. Neither run creates a production-signed APK; R025 remains blocked on the existing signer and protected key lineage.


## Unsigned release fail-closed test (2026-10-17)

CI run [39062992988](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988) passed. The `Verify unsigned release builds are refused` step confirmed the release task fails for the expected missing-signing-input reason; the debug APK and HTML test artifact were still built and uploaded. [debug APK artifact 12111849096](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988/artifacts/12111849096), SHA-256 `96c87003b4a82eaa30317b57a2455afcfd92a84f406ff9be4cdb177c24225438`; [HTML test artifact 12111729532](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988/artifacts/12111729532), SHA-256 `27203e329dfccaf8fa5ba6bd2f8e793c633dc50202463d32f2c3ac1282b812c8`. The run does not verify or produce the existing production signer.
