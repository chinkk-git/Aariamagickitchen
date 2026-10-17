# V3 Implementation Status — My Magical Kitchen
Updated: 2026-10-17 | Evidence-based ledger | Active implementation: draft PR #2, branch `codex/v3-completion-core-20261017` @ `c806cbb2b8375909e48d304b1d2be2596fab0788`; base `feature/platform-v3` @ `235a121ef08ee1931d1cfb5578bc2017197e4e09`

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
