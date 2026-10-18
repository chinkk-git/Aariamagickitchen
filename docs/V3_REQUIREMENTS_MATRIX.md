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
| R012 | Authenticated data-only content packs | WP05 | signature/hash/security tests | IN PROGRESS — signed-pack verifier tests pass; pilot run [39080611176](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080611176) additionally proves installation fails closed when publisher trust assets are absent. Publisher key/key ID, feed/downloader, adult approval and runtime catalog integration remain absent. |
| R013 | Atomic activation and rollback | WP05 | fault injection | IN PROGRESS — staged directory swap/failed-activation restore passed CI 39061031142; recovery tests cover completed swap, incomplete swap and crash-before-swap state in AndroidContentPackRecoveryTest. Pilot tests continue passing in 39080611176/39080621336. Pilot runs [39080934453](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080934453) and [39080945482](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080945482) pass marker-retention and recovery-before-catalog-read regressions; process-kill/power-loss/disk-full device behavior remains unverified. |
| R014 | Signed APK upgrades preserve data | WP06 | device upgrade test | IN PROGRESS — the owner reports a successful signed APK update test after configuring the new production key. Data-preservation results and current-candidate device regression remain to be recorded. |
| R015 | Play Protect ON and parent guide | WP08 | real-device evidence | PARTIAL EVIDENCE |
| R016 | Accurate What's New for each update | WP07 | tour and replay tests | NOT STARTED |
| R017 | Child cooking safety/allergen accuracy | WP09 | content/safety review | NOT STARTED |
| R018 | No cooking timers | ALL | code/UI audit | NOT STARTED |
| R019 | Existing approved features preserved | ALL | baseline regression | NOT STARTED |
| R020 | Autonomous independently reviewed cluster | WP11 | agent files, CI, audit log | IN PROGRESS — session-scoped independent audit/review used; persisted profiles not found in audited tree |
| R021 | Continuous learning with validation | WP11 | learning register + tests | IN PROGRESS — evidence and remediation entries are recorded; persistence/independent profile validation loop remains open. |
| R022 | Verified signed family release | WP10 | build provenance + QA | IN PROGRESS — signed run [39080069478](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080069478) passed signing, certificate, packaged V3 HTML and release checks; artifact 12118841013 was produced. Owner reports an update test passed, while app behavior exposed the profile chooser stack-overflow bug that is fixed in the current draft branch. Latest WebView/CSP candidate is not included in that signed artifact; full release acceptance remains open. |

| R023 | Content manifest authenticated with bundled public key | WP05 | tamper/wrong-key/replay tests | IN PROGRESS — RSA verifier and tamper/wrong-key/replay tests pass in CI; trusted public key/key ID are not provisioned in the app. |
| R024 | Content packs reject scripts, traversal and decompression bombs | WP05 | negative security tests | IN PROGRESS — executable extension/path traversal/size protections are implemented; run [39081529933](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39081529933) passed invalid image magic, unsupported media, truncation, role/media mismatch and active-SVG cases; run [39082241731](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082241731) passed undeclared-entry rejection before staging; run [39082636745](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082636745) passed duplicate archive path rejection before staging; run [39083839601](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39083839601) passed a >100:1 compressed entry fixture exceeding the expanded-entry limit before staging. Publisher trust/feed, activation UI and device activation/rollback remain open. |
| R025 | APK signer/package/version continuity and adult confirmation | WP06 | package/version source; release APK signer lineage; installed APK comparison; upgrade/device tests | IN PROGRESS — protected production signing inputs and the certificate fingerprint are configured. Signed run [39080069478](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080069478) verified the APK signature and trusted certificate, packaged the V3 HTML and uploaded artifact 12118841013. The owner reports a successful update test. Confirming saved-data continuity, latest WebView/CSP candidate provenance and full device regression remains open. |
| R026 | Atomic update activation and rollback | WP05 | crash/disk-full tests | IN PROGRESS — activation/recovery implementation and failure test added; crash/process-death/disk-full/device evidence pending. |
| R027 | WebView release hardening and least privilege | WP02 | MainActivity.kt, AppAssetsUrlPolicy.kt, generated-page CSP, subframe policy and hosted runs 39057437535/39078143249/39083638168; WebView bridge/device tests | IN PROGRESS — exact appassets origin/path policy, restrictive CSP, subframe blocking and Android JVM tests are evidenced; run [39083638168](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39083638168) passed the share bridge size cap before Base64 decoding (15 MiB decoded maximum, 240-character title). This narrows a resource-exhaustion path but is not origin isolation. Full V2 resource inventory, origin-restricted bridge migration and phone/tablet regression remain open. |
| R028 | Transactional Aaria-to-multiprofile migration | WP00/WP04 | idempotency/integrity tests | IN PROGRESS — Robolectric SQLite tests pass for idempotency, retry, unknown fields and database isolation (CI 39061031142). Runtime profile switching now clears prior-profile fields absent from the incoming snapshot; regression script passes locally and in CI run 39062236604. Installed-app/device crash and recovery tests remain. |

## Evidence boundary

`IN PROGRESS` means partial work/evidence exists, not acceptance. CI run 39061031142 passed HTML validation, Android unit tests (including Robolectric SQLite migration/isolation and signed-pack verifier tests), and debug APK assembly; artifacts 12111133727/12111930308 are available through 2026-11-16. Current code head e5425c6539c93492c241814bf380755b3f9439ae passed CI run 39061031142 with SQLite migration/isolation coverage. No device tests were run. The production signing workflow and signer check now pass in signed run 39080069478; the owner also reports an update test passed. Saved-data continuity and latest-candidate acceptance remain open. Content publisher key provisioning remains an external trust-root action; content installation correctly fails closed until supplied.


## Historical pause gate — superseded by signed-run evidence (2026-10-17)

This paragraph records the earlier state before the production key was configured. It is superseded by signed run 39080069478 and the owner's report of a successful update test. Do not use the historical blocker description as current status. The content-pack verifier deliberately fails closed until a trusted publisher public key/key ID is bundled; provisioning that trust root and protecting its private signing key is a separate external security action.


CI run 39060387158 passed the latest code head bb2176911a2b1a5061454a9e9500a0499c0897f0 and published development artifacts 12111033320 (debug APK) and 12111286874 (HTML).

## Profile-switch regression CI evidence

CI run 39062236604 passed the profile snapshot reset regression in the adapter-validation step on code commit `44681326da2079d5fee3841eccd7c85b574a7191`. Device validation is still pending.


## Production signing gate update (2026-10-17)

The release build path is implemented in Gradle and `.github/workflows/android-release.yml`. It requires all keystore inputs from protected GitHub Actions secrets and a trusted signer fingerprint from repository variable `ANDROID_SIGNER_SHA256`; `apksigner` must verify the generated APK and the certificate fingerprint must match before artifact upload. Release tasks fail closed when Gradle signing inputs are missing.

This resolves the repository-side configuration gap only. It does not resolve signer continuity: no production keystore, installed signer evidence or verified key lineage is available in the repository/session. R025, R014 and R022 remain BLOCKED or not accepted until the existing signer is established, a signed APK passes fingerprint verification, and a user-confirmed upgrade preserves app data on a device. Do not generate a replacement signer or share private signing material in chat.


CI run [39062826879](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062826879) passed after adding the release signing Gradle configuration. A follow-up run [39062992988](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988) is in progress to prove release assembly is refused when trusted signing inputs are absent. Neither run creates a production-signed APK; R025 remains blocked on the existing signer and protected key lineage.


## Unsigned release fail-closed test (2026-10-17)

CI run [39062992988](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988) passed. The `Verify unsigned release builds are refused` step confirmed the release task fails for the expected missing-signing-input reason; the debug APK and HTML test artifact were still built and uploaded. [debug APK artifact 12111849096](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988/artifacts/12111849096), SHA-256 `96c87003b4a82eaa30317b57a2455afcfd92a84f406ff9be4cdb177c24225438`; [HTML test artifact 12111729532](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988/artifacts/12111729532), SHA-256 `27203e329dfccaf8fa5ba6bd2f8e793c633dc50202463d32f2c3ac1282b812c8`. The run does not verify or produce the existing production signer.


## User-supplied APK signer evidence (2026-10-17)

The attached APK reports package `com.aaria.magickitchen.pilot`, version code 5/name 1.0.1 and an embedded debug certificate fingerprint `B5:EC:1E:57:50:BE:5B:C2:34:7F:8E:59:1C:C8:9E:67:FE:E7:13:24:3C:6D:C8:48:6A:6F:FE:10:00:0B:EB:1D`; APK SHA-256 is `977fe6daf7eb703bf160b40e984d48cc13df353a7ae23cc4a591633e53098180`. This is not production signing material. The user reports that the app is installed and that the APK came from a previously supplied link, but the attached file has not been compared with the installed bytes. No full independent `apksigner` verification was available in the analysis environment. R025 remains BLOCKED; do not uninstall or install a differently signed APK until a data-preserving transition is verified.


## Superseding release-signing decision (2026-10-17)

The owner explicitly approved creating a new permanent release signer after confirming there is no saved app data to preserve. This decision supersedes earlier notes in this plan that prohibited a replacement key. The attached/current APK inspected for this task is debug-signed; its private key cannot be recovered, and the exact installed APK bytes were not independently compared. Therefore the new key does **not** provide an in-place update from that debug installation. The first release signed with the new key requires a clean uninstall/reinstall; the owner confirmed saved data migration is not required. Do not uninstall until a verified new signed APK is ready. Keep the new key for every subsequent direct APK release. Any future Google Play transition must be planned around the same app signing identity and the Play App Signing setup; this new key does not sign unrelated apps or different package IDs.

A PKCS#12 RSA-3072 release keystore was generated for alias `aaria-v3-release`; certificate SHA-256 fingerprint: `3A:ED:A9:B7:1A:B2:9C:4C:21:D9:FC:A5:15:54:18:B5:68:4A:21:11:CE:C6:FC:17:22:2B:64:DB:03:69:75:88`. Public certificate fingerprint was verified with Java `keytool`. Private keystore and passwords are not committed to GitHub. The owner must securely back up the keystore and configure environment secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` plus environment variable `ANDROID_SIGNER_SHA256` in GitHub environment `android-production-signing`. Until configured, a signed release build, APK verification, device install, and future update continuity remain unverified.

## Signed APK implementation-source correction (2026-10-17)

Run [39074229018](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39074229018) verified a signed artifact with the configured certificate, but the user-observed appassets load failure and workflow source audit showed that the run used an older HTML page without the V3 transformation. This run does not satisfy R019 (baseline feature preservation) or R022 (verified signed family release). Main workflow commit `5f0a937707ba4f8c941b7f32d06458776935b962` now transforms and validates the approved V2 baseline, packages the V3 layer, and checks its marker in the APK. CI signing/build and device acceptance evidence for that corrected path are still outstanding.

## Run #7 V3 build evidence (2026-10-17)

Run #7 passed the V3 transform/validation step and protected signing certificate fingerprint check. It failed before APK assembly because Android unit tests inherited only `ANDROID_KEYSTORE_PATH` from the staging step; Gradle correctly rejected incomplete signing configuration. Workflow commit `5f0a937707ba4f8c941b7f32d06458776935b962` moves unit tests before keystore staging. R022 and R025 remain IN PROGRESS until this corrected signed build passes signature and package checks, then the phone launch/upgrade test succeeds.


## Signed V3 workflow run #8 (2026-10-17)

User-provided GitHub Actions screenshot shows run #8 succeeded on `main` commit `5f0a937707ba4f8c941b7f32d06458776935b962` in 2m13s and published one artifact. The workflow gates include generated V3 HTML validation, Android unit tests before keystore staging, APK V3 marker check, and trusted signer verification. This verifies the CI build path, not phone launch or update behavior. R022/R025 remain IN PROGRESS pending on-device install/update and launch checks.



## Post-run #8 device and crash evidence — 2026-10-17
Owner reports the configured permanent APK key successfully updated the installed app. The phone screenshot then exposed the profile chooser recursion crash. Runtime fix and regression tests are on source commit `56e08ba321535645953bcc216bfd485125cb922b`; the main signed-release workflow now pins that exact source at workflow commit `eaa4263fc131547ca24b5cdc1bea0aff2a6dfc28`. The next workflow run and corrected phone retest are still required before R003, R014, R022 or R025 can be marked VERIFIED. Content-pack publisher trust is separate and remains open under R012/R023.

## WebView security follow-up — 2026-10-17


The candidate includes a direct `AppAssetsUrlPolicyTest` for subframe rejection versus main-frame routing (`524e85a33f874ac9c12e8b4e7943b7dad4c9b294`). Unit test execution, WebView instrumentation and phone checks remain pending.


## Independent WebView review follow-up — 2026-10-17
R027 candidate source is `524e85a33f874ac9c12e8b4e7943b7dad4c9b294`. Added `connect-src 'self'`, `child-src 'none'`, duplicate-directive rejection, and negative validator cases for wildcard/data script sources, remote connections/frames, and duplicate directives. Local checks pass; Android CI, full resource inventory and real WebView/device tests are pending. Image/style/font/media sources remain insufficiently constrained until the approved baseline is audited; R027 stays IN PROGRESS. 


## CSP regression automation follow-up — 2026-10-17
R027 now has persistent Node regression coverage in `tools/v3/test-csp-policy.mjs`, with its policy logic shared by the generated-HTML validator and the test. The Android pilot workflow runs it automatically on push/dispatch. Local CSP, profile persistence/isolation, and Node syntax checks pass on the current draft branch. The resulting hosted workflow, full HTML transform, Android unit tests, CSP compatibility with baseline resources, and real-device behavior are still pending; R027 remains IN PROGRESS.


## Android pilot run 105 evidence — 2026-10-17
Run [39078143249](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39078143249) passed on candidate code `78374426c82a63c38993feb4c6fee899bd529abe`: generated HTML validation, CSP/profile regression checks, Android WebView asset policy JVM tests, debug APK assembly, and fail-closed unsigned release check. It uploaded debug APK artifact [12117857547](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39078143249) and HTML artifact [12117643371](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39078143249). This is CI evidence only; production signer release and owner-phone install/upgrade/data/WebView checks remain pending. R027 remains IN PROGRESS pending actual device testing and approved baseline resource-policy audit.


## Production signed run evidence — 2026-10-17
Signed-release run [39080069478](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080069478) succeeded. It validated protected signer fingerprint continuity, Android unit tests, V3 HTML packaged in the APK, APK signature/trusted certificate, and artifact upload. Signed APK artifact ID: `12118841013`. The workflow checked out immutable source `56e08ba321535645953bcc216bfd485125cb922b`, which includes the profile chooser fix. R022/R025 remain IN PROGRESS until the owner installs this exact artifact over the signed app and confirms chooser behavior and saved data. This artifact predates the draft CSP/subframe candidate; remaining security and roadmap gates are tracked separately.

APK payload SHA-256 for artifact 12118841013: `8999c844d84329055f28ab8d6c26f1d60f3a25bc4b32c634ec8eb9615421fab5`. Owner phone install/upgrade testing remains required.


## Current evidence superseding earlier gate wording (2026-10-17)

Signed run [39080069478](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080069478) passed signer, signature and packaged V3 HTML checks; owner reports the APK update test succeeded. The owner also reported a phone chooser error (“Maximum call stack size exceeded”), so R014 and R022 remain IN PROGRESS, with chooser/device/data checks open. Current pilot runs [39080611176](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080611176) and [39080621336](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080621336) pass the new missing-publisher-key fail-closed and invalid-image tests. Earlier text below that calls signing blocked or says no signed APK exists is historical and superseded; no authenticated content-update feed exists and its publisher key still requires owner security action.


Legacy chooser regression run [39080987371](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080987371) passes for the current JavaScript path; R003/R014 remain open until the signed candidate is retested on the owner’s phone and saved progress is checked.


## Content-pack security test update — 2026-10-18

R024 has additional hosted evidence in pilot run [39081529933](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39081529933), source `ad61ef004d14327ec9177d72bb13662e38631488`: oversized entries are rejected before stage-directory creation; unsupported media types, truncated ZIP archives, artwork role/media mismatches and active SVG content are rejected. The same run passed the Android unit suite, V3 HTML/CSP/profile checks, debug APK build and unsigned-release guard. R024 remains IN PROGRESS because duplicate-entry/decompression-bomb edge fixtures and on-device content activation are not yet covered. The debug APK artifact is [12118364099](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39081529933/artifacts/12118364099); HTML artifact is [12118747562](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39081529933/artifacts/12118747562).


## Archive-set rejection update — run 115

Pilot run [39082241731](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082241731) passed a new signed-pack test rejecting undeclared ZIP payloads before staging. This adds exact archive-set coverage to R024. Duplicate ZIP-name/decompression-bomb edge cases, authenticated feed integration and on-device activation remain unverified; R024 stays IN PROGRESS. The run also passed V3 transform/CSP/profile checks, Android unit tests, debug APK build and unsigned-release refusal. Debug APK [12119461755](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082241731/artifacts/12119461755); HTML [12119297506](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082241731/artifacts/12119297506).


## Duplicate ZIP-path test — run 116

R024 gains hosted regression evidence from [run 39082636745](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082636745): a correctly structured signed archive containing a duplicate ZIP path is rejected before staging. Run #116 passed the Android pilot suite on source `807520cff9594d2ae7e8d574e5c3231a31297b80`. Decompression-bomb limits at expanded-pack scale, publisher feed integration and device activation remain open, so R024 stays IN PROGRESS. Artifacts: debug APK [12119193578](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082636745/artifacts/12119193578), HTML [12118969797](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082636745/artifacts/12118969797).
