# V3 Implementation Status — My Magical Kitchen
Updated: 2026-10-17 | Evidence-based ledger | Active implementation: draft PR #2, branch `codex/v3-completion-core-20261017` @ `6116d9b6709efd51a1172c335a17940c616ea151`; base `feature/platform-v3` @ `235a121ef08ee1931d1cfb5578bc2017197e4e09`

## Confirmed repository audit (GitHub, 2026-10-17)
- Audited `feature/platform-v3` at commit `b057f8603f7950f5e5b5699732a346ee9e453f25` (tree contains 179 entries). The existing pilot is under `phase2-pilot/`; the root `docs/` directory and all eight requested V3 documents were absent from that branch before this work.
- The branch contains the Kotlin WebView shell at `phase2-pilot/apps/aaria-android/`, Android workflow `.github/workflows/android-pilot.yml`, recipe tests and a two-recipe pilot. Workflow config builds a **debug APK**; this is not evidence of a signed release APK or device/security acceptance.
- Repository tree inspection found no persisted agent-profile directory or files. No claim is made that nine agents were installed. Task-scoped independent audit/review agents were engaged for this work session; they do not constitute a continuously running cluster.
- Initial `MainActivity.kt` audit found JavaScript/DOM storage and the `AariaNative` bridge; it did not yet have explicit mixed-content/Safe Browsing controls. The implementation branch now sets mixed content to never allow, enables Safe Browsing, disables file URL access, gates debugging to debuggable builds, and applies shared exact-origin/path checks for bundled appassets (commit `ee02895aaff8b9f30dd5dbb269076b35896ce61b`). Five unit tests and CI pass; runtime/device and bridge-origin integration tests remain open.
- `app/build.gradle.kts` sets application ID `com.aaria.magickitchen.pilot`, `versionCode` 5 and `versionName` 1.0.1. The Android workflow builds `assembleDebug`; release keystore/signing continuity is not configured or verified in inspected files.
- Follow-up implementation on PR #2 adds an Android SQLite profile store/migration path and signed data-only content-pack verifier/activation repository with monotonic content-version state. Root `index.html` statically contains localStorage key `aariaPrivateKitchenV4`; this confirms the source key only, not every installed data variant or migration integrity. Runtime migration, content update flow/catalog consumption, network scheduling, signer continuity and What's New remain incomplete.
- GitHub Actions run [39060124410](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39060124410) failed at Kotlin compilation (`BuildConfig` unresolved). BuildConfig generation was enabled in commit `c9c5c842bf18c60e381370b3e1dcdff52ff597f3`; CI run [39060262205](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39060262205) then passed HTML validation, Android unit tests, and `assembleDebug`, publishing debug APK and HTML artifacts. Run 39060262205 built commit c9c5...; follow-up CI run 39060387158 passed on current code commit bb217..., including strict rejection of trailing JSON. No device tests were run.

## Confirmed evidence
- **PASS (user-reported):** One Android APK installed on one phone with Play Protect enabled after selecting “Install anyway” on unfamiliar-developer warning.
- **NOT VERIFIED:** App launch/function, APK security, signing continuity, upgrades, data preservation, content packs, tours, tablet, artwork consistency.
- **APPROVED DESIGN:** Product direction “My Magical Kitchen” (name provisional); age 8–12; two fixed main chefs G1/B1; Mommy M1, Daddy D1, Friends F1–F4; autonomous agent cluster.
- **NOT VERIFIED:** Runtime behavior and security of the user-installed APK; production APK signing identity/continuity; profile/update behavior; physical phone/tablet tests.
- **READY FOR TESTING:** CI run 39057437535 published debug APK and generated HTML artifacts. APK archive [12110495010](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39057437535/artifacts/12110495010), SHA-256 `128ae39def9a66faebe3c4f2b31482d59b5688976a01129579e9268ed560cf1f`; HTML archive [12110216216](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39057437535/artifacts/12110216216), SHA-256 `f3fc1980d26ebb73d133f749fd78c7fd6c9b6488cacc5c34b3dd236903587ee5`. GitHub reports both unexpired through 2026-11-16. The APK is debug-signed and is not a production release.
- **EVIDENCE / BLOCKER:** Debug APK v2 signing-block certificates extracted from artifacts for runs 39036629623 and 39057437535 differ: `F3:E0:64:4F:A1:7C:55:7D:A3:EE:81:85:43:6B:CC:38:77:4D:76:AE:E6:17:F1:1C:2A:ED:2A:85:84:2E:28:74` vs `D8:37:E2:2F:2A:FB:17:A6:52:6B:E9:5F:ED:AE:A3:DD:09:7D:BA:15:58:7D:E8:4E:D1:AC:8C:F4:05:5C:AC:D8`. Both are debug certificates. Extraction/fingerprinting with OpenSSL did not perform full APK signature verification (`apksigner` unavailable); this does not establish the installed APK or production signer. Do not claim upgrade continuity or create a replacement production key.

## Work packages
| ID | Work package | State | Evidence / next action |
|---|---|---|---|
| WP00 | Product identity, onboarding, two-avatar selection, profiles, migration | IN PROGRESS | Text profile UI and SQLite migration path added in PR #2; source key `aariaPrivateKitchenV4` found in root `index.html`. Migration fixture, transaction/isolation tests and visual approval remain open. |
| WP01 | Repository baseline, agents, traceability | IN PROGRESS | Baseline audited; eight governed docs merged to `feature/platform-v3` via PR #1; current feature work in draft PR #2. No persisted agent profiles located, and full asset discovery/review remains open. |
| WP02 | Android foundation, signing and responsive shell | IN PROGRESS | Kotlin shell hardened in `ee02895aaff8b9f30dd5dbb269076b35896ce61b`; run 39057437535 passed five URL-policy tests and debug build. Runtime/bridge/device gates remain open. Production signing continuity is unverified; two debug CI certificates differ. |
| WP03 | Character bible, supporting cast, artwork/recipe defects | NOT STARTED | Inventory all scene assets |
| WP04 | Room/DataStore and backup/restore | IN PROGRESS | SQLite profile tables and migration marker added. Robolectric SQLite tests pass for idempotent migration, malformed-input retry, unknown-field preservation and two-profile isolation in CI run 39061031142. Installed-data, device, backup/restore and crash-recovery tests remain open. |
| WP05 | Authenticated data-only content updates | IN PROGRESS | RSA signature/hash/schema/path/version/expiry verifier and atomic activation repository plus negative tests added. CI runs 39060387158 and 39060716858 passed relevant verifier tests. Trusted publisher public key is absent, installer fails closed; no feed/downloader, user activation flow, catalog/runtime integration or device test. |
| WP06 | Signed APK upgrade manager | BLOCKED | Protected release-signing workflow and Gradle configuration are prepared; existing installed signer and protected production key are still unavailable, so no safe in-place upgrade can be built or verified. |
| WP07 | What's New tours | NOT STARTED | Tour schema and replay tests |
| WP08 | Parent guide and Play Protect test matrix | PARTIAL EVIDENCE | Installation observed; upgrade pending |
| WP09 | Safety, accessibility, QA and device coverage | NOT STARTED | Establish test matrix |
| WP10 | CI, signing, release distribution | IN PROGRESS | Debug CI and tests pass. Signed release Gradle config and manual protected release workflow are prepared; production signer inputs/provenance and end-to-end signed-release run remain unavailable. |
| WP11 | Autonomous agents and learning loop | IN PROGRESS | Session-scoped independent audit/review engaged; no persisted agent profiles found. Define and version role prompts/workflow before claiming durable cluster activation. |

## Required run ledger (append on each Work session)
| Date | Work session | Branch / commit | Changed artifacts | Tests / evidence | Defects / blockers | Next action |
|---|---|---|---|---|---|---|
| 2026-10-17 | V3 docs bootstrap and source audit | `codex/v3-docs-security-audit-20261017` @ `f18d42469005e09f551364416cd034a3200affc0` | Eight root `docs/` files; initial docs review corrections | Repository tree/source audit; baseline CI 39036629623 successful (debug only). | Device, release signing, updates and migration open; no durable agent profiles. | Continue with isolated reviewed implementation |
| 2026-10-17 | WebView hardening, documentation, and merge | PR #1 squash merge `c8e490fbd45e0631f51ccfff69a27d769028a10f` to `feature/platform-v3`; source commit `ee02895aaff8b9f30dd5dbb269076b35896ce61b` | WebView policy, shared appassets URL policy, five unit tests, CI gate, and eight governed V3 docs | Run 39057437535 passed HTML validation/packaging, adapter syntax tests, five URL-policy tests, and assembleDebug; debug APK + HTML artifacts 12110495010/12110216216 are downloadable through 2026-11-16. Independent source review found no regression in app routes/bridge/share/camera/file-picker flows. | Production signer and installed APK unverified; bridge/device integration pending; content updater, migration and anti-rollback not implemented. Debug certificate identities differ; full signature verification unavailable. | Recover trusted installed/release APK and production signer lineage; then implement migration and signed content/update rollback.

## Current next actions
1. Validate the statically confirmed `aariaPrivateKitchenV4` source key/schema against a representative installed-data export; add migration fixtures and DB tests before trusting preservation.
2. Add WebView bridge-origin and navigation integration/device tests; retain phone/tablet and existing-route regression coverage.
3. Implement idempotent transactional legacy-profile migration with backup, integrity checks, and failure recovery.
4. Implement authenticated data-only content packs, atomic activation, and replay/downgrade protection; then signed APK upgrade handling and What's New.
5. Recover the installed/release APK or trusted signer fingerprint and protected production key lineage before attempting an upgrade or production release.
6. Add persistent agent role prompts and handoff/evidence contracts; current agents were task-scoped only.

## Completion rules
Use `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, `VERIFIED`, or `PARTIAL EVIDENCE`. Never promote to VERIFIED without concrete evidence. No user review needed for routine work; escalate only unavoidable external actions, new product decisions or unsafe conditions.

## Security/update architecture addendum
`V3_ANDROID_SECURITY_UPDATE_ARCHITECTURE.md` is mandatory. WebView hardening and helper tests are implemented; device/integration gates remain open. Signed-pack verifier/activation and profile migration scaffolding are IN PROGRESS; production APK continuity is BLOCKED; content key provisioning, migration fixtures, rollback/device testing and Play Protect ON upgrade tests remain open.


## Artifact readiness note (2026-10-17)

The latest verified pipeline artifact set is ready for development testing: debug APK archive [12110495010](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39057437535/artifacts/12110495010) and HTML archive [12110216216](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39057437535/artifacts/12110216216). Both were built from app source inputs matching the merged `feature/platform-v3` branch; docs-only commits followed. This does not satisfy production signing continuity, device tests, or family-release gates.


## 2026-10-17 bounded implementation and pause gate

PR #2 is draft at https://github.com/chinkk-git/Aariamagickitchen/pull/2. CI run 39060387158 passed on code commit `bb2176911a2b1a5061454a9e9500a0499c0897f0` and published debug APK archive [12111033320](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39060387158/artifacts/12111033320) (SHA-256 `aa42efca6f2092a3e0ed5a0e6557080231b1c24d4228cdbc99ef3158aa9b492e`) plus HTML archive [12111286874](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39060387158/artifacts/12111286874) (SHA-256 `a7eed6a40ce661f2c0640deb7acba60990ab524fe4075a098d1fc0d37bb97624`). Both expire 2026-11-16. These are development outputs, not release-signed APKs.

Current code commit `bb2176911a2b1a5061454a9e9500a0499c0897f0` passed CI run 39060387158, including strict trailing-data rejection for signed JSON packs. No APK is ready for safe in-place upgrade: the repository has no production keystore/signing config, the installed package signer is unknown, and the content publisher public key is not provisioned. No private key should be sent in chat. Pause here pending trusted signer/key inputs and rerun of CI on the current head.


## Migration safety follow-up (2026-10-17)

Code commit `81fdd93710e6ad19ca292655c9393d05c725e3f4` factors legacy snapshot validation into `LegacyProfileMigration`. It rejects malformed, trailing, non-object and oversized JSON before migration can mark completion, preserves unknown fields in the snapshot object, and has unit coverage for empty/default data. CI run [39060716858](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39060716858) passed the test/build/artifact steps. This does not test SQLite transactions, a real installed-data export, device migration, restore, or multi-profile data isolation.

Artifacts: debug APK [12111825146](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39060716858/artifacts/12111825146), SHA-256 `e6c0040962e415bec1d8e6591ab8bc82a9ba5757ef9b9312cff42d5090bde503`; HTML [12111670590](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39060716858/artifacts/12111670590), SHA-256 `f11336426681b793f1d70eab9145f1cd7564fe81c3e6f102789374e7e29344f5`. Debug signing is not production signing.


## SQLite migration and profile isolation tests (2026-10-17)

Robolectric database tests were added in code commit `e5425c6539c93492c241814bf380755b3f9439ae`. CI run [39061031142](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39061031142) passed the Android unit-test step and debug APK/HTML build. Tests cover one-time migration/retry, preservation of unknown legacy fields, malformed input not consuming the migration marker, and state isolation when switching profiles. This remains simulated Android SQLite evidence; no installed-data export, phone/tablet migration, backup/restore, process-death or Play Protect upgrade test was run.

Artifacts: debug APK [12111133727](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39061031142/artifacts/12111133727), SHA-256 `528648fdca4831c44b5dde5e2e4f99a2e69468ad3dea1eef8adc6184185ce706`; HTML [12111930308](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39061031142/artifacts/12111930308), SHA-256 `f9041f97934ec9a1079ed8681da637055d7f9ad8dd07a1d1085db24a450ea973`. Both expire 2026-11-16. APK is debug-signed.


## Current master-plan checklist (supersedes earlier snapshots; 2026-10-17)

### Roadmap phases

| Phase | State | Checklist |
|---|---|---|
| S0 — Audit, baseline, agents, requirements, asset discovery | IN PROGRESS | [x] Protected baseline audited and retained. [x] Eight governed V3 documents established. [x] Requirements traceability started. [ ] Durable agent profiles/roles validated. [ ] Full approved-asset inventory and evidence-backed asset baseline. |
| S1 — Branding, onboarding, profiles, Android foundation | IN PROGRESS | [x] Android WebView hardening foundation and profile storage/migration scaffold. [x] Two chef identifiers and text-first profile UI scaffold. [x] Migration parser and SQLite tests pass in CI. [ ] Full branded UI and visual onboarding. [ ] Validate migration against real installed Aaria data, backup/restore, crash recovery, and device upgrade. |
| S2 — Character bible and representative recipe pilot | NOT STARTED | [ ] Lock CHEF_A/CHEF_B and M1/D1/F1–F4 references. [ ] Both chef variants and cast/scene registry. [ ] Independent end-to-end recipe/art QA. |
| S3 — Artwork remediation and responsive QA | NOT STARTED | [ ] Inventory and repair all recipe/ingredient/dish/step artwork. [ ] Verify landscape, portrait, phone, tablet and offline behavior. |
| S4 — Authenticated content packs and rollback | IN PROGRESS | [x] Signed data-only verifier, validation, replay protections, staging/activation foundations, and negative tests. [ ] Provision trusted publisher public key/key ID. [ ] Feed/download/scheduling and parent activation flow. [ ] Catalog/runtime integration. [ ] Crash, disk-full, restart, downgrade and device tests. |
| S5 — Signed APK updates, parent guidance, What's New | BLOCKED / IN PROGRESS | [x] Parent installation guide draft created at [PARENT_INSTALL_GUIDE_DRAFT.md](PARENT_INSTALL_GUIDE_DRAFT.md). [ ] Complete guide with trusted release URL, signer/checksum and device support. [ ] Verify existing APK signer and protected production signing-key lineage. [ ] Signed upgrade manager, data-preservation test and What's New tour/replay. |
| S6 — Device QA, safety, accessibility, family release | NOT STARTED | [ ] Phone/tablet integration tests with Play Protect ON. [ ] Safety/allergen/accessibility and no-timer audits. [ ] Existing-feature regression and reproducible release provenance. [ ] Verified signed family APK release. |

### Requirement register summary (details remain in V3_REQUIREMENTS_MATRIX.md)

- IN PROGRESS: R003 onboarding; R005 profile isolation; R006 legacy migration; R012 authenticated data-only content packs; R013/R026 activation and rollback; R020/R021 agent governance and learning; R023/R024 manifest authentication and unsafe-pack rejection; R025 signer/package/version continuity; R027 WebView hardening; R028 transactional migration.
- PARTIAL EVIDENCE: R015 Play Protect and parent installation guidance (user reported one install with Play Protect on; guide draft is not device validation).
- NOT STARTED: R001 full-app branding; R002 inclusive-language review; R004 privacy/schema audit; R007–R011 character/artwork/layout/offline acceptance; R014 signed APK upgrade/data preservation; R016 What's New tours; R017 cooking safety/allergen review; R018 no-timer audit; R019 baseline regression; R022 verified family release.
- No requirement is VERIFIED end-to-end. CI proves automated checks on a debug build only; it does not prove device behavior or production release readiness.

### Latest continuation evidence

- CI run [39061031142](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39061031142) passed HTML validation, adapter checks, Android unit tests (including Robolectric migration/profile-isolation and signed-pack tests), debug APK assembly, and artifact upload on code commit `e5425c6539c93492c241814bf380755b3f9439ae`.
- Debug APK [12111133727](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39061031142/artifacts/12111133727), SHA-256 `528648fdca4831c44b5dde5e2e4f99a2e69468ad3dea1eef8adc6184185ce706`; HTML test artifact [12111930308](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39061031142/artifacts/12111930308), SHA-256 `f9041f97934ec9a1079ed8681da637055d7f9ad8dd07a1d1085db24a450ea973`. Both expire 2026-11-16. APK is debug-signed; HTML is a test artifact, not a public V3 deliverable.
- Draft PR #2 evidence refreshed: https://github.com/chinkk-git/Aariamagickitchen/pull/2.
- External security inputs still required: trusted existing APK signer/key lineage and content-publisher trust root. Keep the baseline and existing user data protected; do not bypass Android installer or Play Protect warnings.


## Profile-switch data isolation follow-up (2026-10-17)

- Found a runtime isolation risk in `v3SetActiveProfile`: shallow-merging an incoming snapshot into the previous profile's state left prior values in keys missing from the new snapshot.
- Added `v3ProfileStateFor` to clear the previous state's arrays and nested values before applying the incoming profile snapshot. Incoming unknown fields remain intact; language is retained when omitted.
- Added `tools/v3/test-profile-isolation.mjs` to exercise cleared progress, nested contacts, boolean/numeric fields, unknown-field reset, and incoming unknown-field preservation. Wired it into the Android CI validation workflow.
- Local Node execution of the helper and checked-in regression assertions passed. The change is **not yet CI-verified**: no workflow run for the latest branch head has been confirmed.
- Implementation commits: helper `f2bf706`; test `d2188cd`; workflow `f477afe`; corrected nested reset expectation `4468132`. These are development-branch commits, not a release.
- Remaining evidence: CI on latest PR head, runtime/WebView integration, and real-device profile switching. Requirements R005 and R028 remain IN PROGRESS.


## Profile-switch CI result (2026-10-17)

This entry supersedes the preceding note that CI was unconfirmed. GitHub Actions run [39062236604](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062236604) completed successfully on code commit `44681326da2079d5fee3841eccd7c85b574a7191`. The adapter-validation step included the new profile-reset regression script; Android unit tests, HTML validation, APK assembly and both artifact uploads also passed.

- Debug APK artifact [12111467878](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062236604/artifacts/12111467878), GitHub artifact digest `sha256:b80ab62513081fb6768aeaa3debdb1268d8eb683df5bd19d920f3e30cd02ce99`.
- HTML test artifact [12112145804](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062236604/artifacts/12112145804), GitHub artifact digest `sha256:6cc7c9244eb5d5afc25191a0b02f00921f1713463cf12b33fb3ba7a69734f27b`.
- Both artifacts expire 2026-11-16. The APK is debug-signed; the HTML is an internal test artifact, not a public V3 release.
- Real-device migration/isolation and production signer continuity remain unverified.


## Production APK signing gate — prepared path (2026-10-17)

The repository contains no verified production keystore, installed APK signer evidence, or GitHub release record. Do not generate a replacement production key: it would not preserve upgrade continuity. The code-side release path is now prepared:

- `app/build.gradle.kts` accepts only the complete protected input set (`ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) and refuses an `assembleRelease`/`bundleRelease` request when signing is incomplete.
- `.github/workflows/android-release.yml` is a manual workflow. It reads a base64 keystore and credentials from GitHub Actions secrets, requires repository variable `ANDROID_SIGNER_SHA256`, builds the release APK, verifies the APK signature using Android `apksigner`, compares the SHA-256 certificate fingerprint to the trusted variable, and only then uploads the APK.
- CI run [39062826879](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062826879) passed on commit `9c701d8885f135f58eb82764eb046d9ba84834b5`, including the standard HTML/adapter checks, Android unit tests and debug APK build. CI run [39062992988](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988) passed on commit `32c5398bba5d55502b2499dd32ae0af69cc6f48b`: the new test confirmed that `assembleRelease` fails with the expected signing guard when no protected signer inputs are present, while HTML validation, Android unit tests, `assembleDebug`, and artifact uploads passed. It published [debug APK artifact 12111849096](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988/artifacts/12111849096), SHA-256 `96c87003b4a82eaa30317b57a2455afcfd92a84f406ff9be4cdb177c24225438` and [HTML test artifact 12111729532](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988/artifacts/12111729532), SHA-256 `27203e329dfccaf8fa5ba6bd2f8e793c633dc50202463d32f2c3ac1282b812c8`; both expire 2026-11-16. These remain development/test artifacts, not a production APK. The release workflow is manual and has not been run because production credentials are not available to this session.
- **Still blocked:** this path does not identify or recreate the existing signer. The owner must provide the existing keystore/key through protected GitHub Actions secrets and the matching verified signer fingerprint through a repository variable, or provide equivalent managed-signing access with verified lineage. The installed/release APK and signer lineage must be checked before an upgrade claim.
- Required protected names: secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`; repository variable `ANDROID_SIGNER_SHA256` (64 hexadecimal SHA-256 fingerprint, colons optional). Never send the private key or passwords in chat or commit them to Git.
- No signed release APK has been produced. The existing debug APKs remain development-only artifacts; the production signing and upgrade gates remain BLOCKED.


## User-supplied APK inspection (2026-10-17)

Inspected the attached `Aaria_Magical_Kitchen_V3.apk` locally. APK SHA-256: `977fe6daf7eb703bf160b40e984d48cc13df353a7ae23cc4a591633e53098180`. Its Android manifest reports application ID `com.aaria.magickitchen.pilot`, version code 5, version name 1.0.1. The APK Signing Block contains a v2 signer certificate whose subject is `CN=Android Debug, O=Android, C=US`; extracted certificate SHA-256 fingerprint: `B5:EC:1E:57:50:BE:5B:C2:34:7F:8E:59:1C:C8:9E:67:FE:E7:13:24:3C:6D:C8:48:6A:6F:FE:10:00:0B:EB:1D`.

This is debug signing evidence, not a production key or a recoverable private key. The APK contains a public certificate, not the private signing keystore. The user said the app is installed and that this APK came from a previously provided link, but this inspection alone does not prove the attached bytes are exactly the installed copy. No `apksigner` executable was available in this analysis environment, so independent full APK signature verification was not performed. Keep the app installed; do not claim safe in-place upgrade or request uninstall. Production signing continuity remains BLOCKED pending a verified signing/migration path.


## Superseding release-signing decision (2026-10-17)

The owner explicitly approved creating a new permanent release signer after confirming there is no saved app data to preserve. This decision supersedes earlier notes in this plan that prohibited a replacement key. The attached/current APK inspected for this task is debug-signed; its private key cannot be recovered, and the exact installed APK bytes were not independently compared. Therefore the new key does **not** provide an in-place update from that debug installation. The first release signed with the new key requires a clean uninstall/reinstall; the owner confirmed saved data migration is not required. Do not uninstall until a verified new signed APK is ready. Keep the new key for every subsequent direct APK release. Any future Google Play transition must be planned around the same app signing identity and the Play App Signing setup; this new key does not sign unrelated apps or different package IDs.

A PKCS#12 RSA-3072 release keystore was generated for alias `aaria-v3-release`; certificate SHA-256 fingerprint: `3A:ED:A9:B7:1A:B2:9C:4C:21:D9:FC:A5:15:54:18:B5:68:4A:21:11:CE:C6:FC:17:22:2B:64:DB:03:69:75:88`. Public certificate fingerprint was verified with Java `keytool`. Private keystore and passwords are not committed to GitHub. The owner must securely back up the keystore and configure environment secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` plus environment variable `ANDROID_SIGNER_SHA256` in GitHub environment `android-production-signing`. Until configured, a signed release build, APK verification, device install, and future update continuity remain unverified.


The protected manual APK workflow was merged to `main` in commit `89f4c19d353364e5952c5dd8bcacfa22bf31f914`. It uses the `android-production-signing` environment, pins the Android build source to `32c5398bba5d55502b2499dd32ae0af69cc6f48b`, and is still unrun. Owner setup of the four environment secrets and the `ANDROID_SIGNER_SHA256` environment variable is required before its manual dispatch can produce an APK.

## Signed APK V3 integration correction (2026-10-17)

The user-installed signed APK came from GitHub Actions run [39074229018](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39074229018). The run succeeded at secret/fingerprint validation, release APK assembly, packaged-page presence, APK signature verification against the configured trusted certificate, and artifact upload. Its artifact was **not the intended V3 implementation**: the workflow pinned source commit `dc4709a42e7e8cf73f4531644cbc8bf1081c9102`, checked only that `assets/index.html` existed and was large, and did not run `tools/v3/transform-production.mjs`. The user observed `ERR_HTTP_RESPONSE_CODE_FAILURE` at the appassets index page after installation. Thus run 39074229018 is signed-build evidence only; it is not V3 app-launch or content evidence.

The approved implementation model is the V2 production `index.html` baseline transformed with the V3 layer, packaged into the existing hardened Android WebView shell. Commit `6116d9b6709efd51a1172c335a17940c616ea151` on PR #2 contains the V3 implementation and sets app versionCode 7/versionName 1.0.3, preserving the package ID and exceeding the prior signed pilot versionCode 6. An initial workflow edit at `d638ec9204712981dd52bc74a8c65be86cecc39d` pinned the correct source and added test setup but missed the transform step. A follow-up audit caught that omission. Final workflow commit `5f0a937707ba4f8c941b7f32d06458776935b962` now runs the V3 transformer and validator plus Android unit tests, packages the generated page, and asserts the V3 build marker inside the APK. This final workflow has **not yet run**. The next evidence gate is a successful signed run, followed by on-device launch/feature and update-preservation checks; no V3 delivery claim is made before those checks.

## Corrected V3 release workflow run #7 (2026-10-17)

The user-provided screenshot of signed-release run #7 confirms checkout, Node/JDK/Android/Gradle setup, **Build and validate V3 HTML from the approved V2 baseline**, protected signing-input staging, and staged certificate fingerprint validation all passed. The run then failed at `Run Android unit tests` before APK assembly. Gradle reported: `Release signing is partially configured; provide all protected signing inputs.` Cause: the keystore staging step persisted `ANDROID_KEYSTORE_PATH` through `GITHUB_ENV`, while the password/alias variables were scoped only to that step; the later test step therefore saw an incomplete signing configuration. Workflow commit `5f0a937707ba4f8c941b7f32d06458776935b962` moves Android unit tests before keystore staging. Run #8 on `main` at commit `5f0a937707ba4f8c941b7f32d06458776935b962` is green (user screenshot: success, 2m 13s, one artifact). The complete workflow therefore passed V3 HTML transformation/validation, Android tests, protected signing, APK marker and trusted signature checks. APK download/install/launch and upgrade preservation on the phone remain pending.



## Owner-reported update success and V3 profile crash — 2026-10-17
- The owner reports the production signing key is configured and the APK update test succeeded on the Android phone. Run #8 was independently visible in GitHub as successful and included V3 HTML generation, Android unit tests, APK content marker verification, trusted signer verification, and one uploaded artifact. Device behavior beyond the owner's report has not been independently instrumented.
- The attached phone screenshot shows V3 loaded and the legacy “Choose your chef” modal opened, then reports “Maximum call stack size exceeded” after a chef selection. The approved V2 baseline and migrated kitchen progress remain in view behind the modal.
- Root cause confirmed by code review: the last profile render wrapper called its own named function recursively. Fixed in commit [133fbb4](https://github.com/chinkk-git/Aariamagickitchen/commit/133fbb4b35fb06789b13ffd1b5d0b83508d0c5df) by capturing and calling the previous renderer. Added regression coverage; independent reviewer confirms the code-level fix.
- Independent review found a second defect in standalone HTML profile persistence: newly created local profiles were not written when the saved roster was empty. Fixed in commit [0c702f4](https://github.com/chinkk-git/Aariamagickitchen/commit/0c702f4b9a0feb85d69e0b98a24ac34afc7443bc). Profile reset/isolation and fallback persistence tests pass locally with Node; the workflow is configured to run these tests.
- Latest branch head: `56e08ba321535645953bcc216bfd485125cb922b`. The GitHub connector returned no CI runs/status checks for this head, so hosted CI is not yet verified. Main signed-release workflow commit `eaa4263fc131547ca24b5cdc1bea0aff2a6dfc28` now pins fix source commit `56e08ba321535645953bcc216bfd485125cb922b`. Its next run will execute the V3 transform/validator, profile regression tests, Android unit tests, signer checks, and packaged marker checks before upload. That run is pending; current build artifact is not the chooser fix.
- Remaining release acceptance: successful hosted CI on current source, signed APK built from exact tested source with the same trusted key, phone retest of both chef choices and retained progress, and broader offline/security/rollback/device checks. The content-publisher trust key is separate from the APK signer and remains unprovisioned.


## WebView CSP and subframe hardening — 2026-10-17
- Candidate code head `524e85a33f874ac9c12e8b4e7943b7dad4c9b294` injects a Content-Security-Policy meta tag immediately after the production document's opening `<head>`. It limits executable scripts to the packaged origin plus required inline V2/V3 code, disables frames and plugin objects, and restricts base/form targets. The V3 validator now rejects missing or loosened core directives.
- Android `MainActivity` blocks subframe navigations before routing URLs; top-level approved appassets and existing external-link flow remain.
- These changes reduce the JavaScript bridge exposure from remote/nested frames without changing the legacy inline application scripts. A dedicated WebView instrumentation test, packaged HTML run, hosted CI and phone regression are still pending. No claim of complete origin isolation is made; migrating from `addJavascriptInterface` to an origin-restricted message bridge remains planned.
- The signed-release workflow on `main` still pins `56e08ba321535645953bcc216bfd485125cb922b`; automatic review rejected moving protected `main` to this not-yet-hosted-CI/device-validated candidate. Candidate remains in draft PR #2.

- Follow-up commit `524e85a33f874ac9c12e8b4e7943b7dad4c9b294` routes `shouldOverrideUrlLoading` through an explicit subframe policy and adds a unit test proving all subframes are rejected while main-frame routing remains available. The Android unit test has been added but is not yet hosted/device verified.


- Local verification for the final candidate: `node --check` passes for the V3 transformer and validator; synthetic CSP tests accept the intended policy and reject wildcard/data script sources and remote frames; `test-profile-isolation.mjs` passes both snapshot isolation and localStorage persistence cases. Android/JVM execution, actual V2 HTML transform and phone/WebView behavior are not confirmed by this local check.


## Independent WebView review follow-up — 2026-10-17
- Candidate source is now `524e85a33f874ac9c12e8b4e7943b7dad4c9b294`. The generated policy also restricts script network connections to the packaged origin and disables child frames; the validator rejects duplicate directives and remote/wildcard script or connection sources. Local Node syntax checks, intended-policy acceptance, wildcard/data/remote/duplicate-policy rejection, and profile isolation/persistence regressions pass.
- Independent review found no concrete incompatibility in the subframe guard with the inline single-document model. Remaining evidence: run the Android unit tests in CI; exercise actual WebView callbacks, CSP, external top-level links and chooser/profile behavior on device.
- The baseline HTML source was not available for complete resource inventory, so CSP still does not constrain every style/image/font/media source. Keep R027 IN PROGRESS until baseline compatibility and resource policy are verified. 


## Persistent CSP regression checks — 2026-10-17
- Extracted the core CSP policy check into `tools/v3/csp-policy.mjs`; added `tools/v3/test-csp-policy.mjs` for valid, missing, wildcard/data script, remote connect/frame, missing child-frame directive, and duplicate-directive cases.
- Wired the regression script into `.github/workflows/android-pilot.yml` before Android unit tests.
- The first local run caught an over-escaped whitespace parser in the extracted helper. Corrected the parser and made rejection messages explicit; CSP policy tests and profile persistence/isolation tests now pass locally, along with Node syntax checks for runtime/transformer/validator.
- These are local Node checks from current PR branch contents. The push-triggered Android workflow result, actual generated V2-to-V3 HTML build, Android/JVM tests, and phone/WebView regression remain unverified. Do not use this candidate as the family APK until hosted tests and device checks pass.


## Android pilot run 105 — 2026-10-17
- GitHub Actions run [39078143249](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39078143249) completed successfully on code commit `78374426c82a63c38993feb4c6fee899bd529abe`. HTML transform/validation, adapter checks (including CSP and profile regressions), WebView asset policy unit tests, debug APK assembly, and the unsigned-release refusal guard all passed.
- Uploaded debug APK artifact [12117857547](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39078143249) (artifact digest `sha256:8e57efe618d3942b180bb4c09a13d1be2ab27025c468bef9014cfc691d0d46cb`) and generated V3 HTML artifact [12117643371](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39078143249) (artifact digest `sha256:0825365a258d8a2bfd365aeca95ca5b49a1b1464c04cd1a17367ebab378b3f67`). These are workflow artifact digests; the APK is debug-signed and is not a family production release.
- This run supersedes the immediately preceding “hosted run pending” note for this candidate. It does not verify production signer continuity, installation/upgrade, profile migration on the owner’s phone, WebView behavior on device, or content-pack updates. Keep those gates open.


## Production signed release run — 2026-10-17
- Manual signed-release run [39080069478](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080069478) completed successfully on workflow commit `eaa4263fc131547ca24b5cdc1bea0aff2a6dfc28`; its immutable Android source checkout is `56e08ba321535645953bcc216bfd485125cb922b`, which includes the profile chooser recursion and persistence fixes.
- Hosted steps passed V3 HTML generation/validation, Android unit tests, protected signing-input staging, expected certificate fingerprint comparison, signed APK assembly, packaged V3 page check, APK signature/trusted-certificate verification, and artifact upload. Artifact `my-magical-kitchen-v3-signed-apk` (ID `12118841013`) is available from the run page.
- This is the first production-signed candidate containing the chooser fix. On-phone installation/upgrade, chooser interaction, saved-data preservation, and WebView behavior remain unverified. It predates the separate CSP/subframe-hardening candidate in PR #2; do not describe it as the latest security candidate or complete V3 release.

- Downloaded the uploaded APK payload from artifact 12118841013 and extracted the single `app-release.apk`; local SHA-256: `8999c844d84329055f28ab8d6c26f1d60f3a25bc4b32c634ec8eb9615421fab5`. GitHub’s successful release job verified this APK signature against the expected trusted certificate before upload.
