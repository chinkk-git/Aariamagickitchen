# V3 Android Security, Update Reception and Migration Architecture
Status: mandatory engineering specification supplied in the updated documentation ZIP. Baseline audit: `feature/platform-v3` @ `b057f8603f7950f5e5b5699732a346ee9e453f25`. Partial implementation evidence: WebView hardening commit `ee02895aaff8b9f30dd5dbb269076b35896ce61b`; other update/migration gates remain open.

## Security boundary and threat model
Protect child profiles, local progress, trusted content, release provenance, and APK signing identity against tampered downloads, compromised mirrors, stale/replayed manifests, path traversal, malicious embedded content, data corruption, and downgrade attacks. No child accounts or analytics by default. Do not store signing private keys or production credentials in Git. Separate GitHub publishing credentials from application trust keys. Use platform-backed secret handling and least privilege.

## Update channels
**Content channel**: recipes, ingredient artwork, dish images, chef variants, supporting cast artwork, metadata, and What's New tour data. JSON/strict declarative schemas plus image formats only; no executable HTML/JS, arbitrary URLs, native libraries, dynamic code loading, or untrusted WebView injection. Bundle trusted public verification key in APK. Sign canonical manifest including content version, minimum/maximum supported app/schema versions, pack hashes, size limits, asset roles, and expiry/anti-rollback sequence. SHA-256 validates bytes; cryptographic signature authenticates publisher. Validate each file's digest, MIME/magic bytes, dimensions and decompression limits; reject traversal, symlinks, unexpected paths, zip bombs, duplicate IDs, unsafe SVG/scripted formats, and unknown fields when relevant. Restrict to HTTPS trusted hosts; TLS alone is not sufficient.

**APK channel**: executable updates only through signed Android packages. Release metadata is signed/authenticated; download over HTTPS and verify hash, application ID, signer identity/signing lineage, versionCode monotonicity, SDK compatibility, and trusted release source before invoking Android's user-confirmed PackageInstaller/system installer. Never promise silent installation or bypass Play Protect. Signer continuity is critical; preserve signing key securely and document rotation/recovery. An app label/name change must not change the package ID if preserving existing installation and local data. A future Google Play listing requires a separate policy/distribution decision.

## Update state machine
IDLE → CHECKING → AVAILABLE → DOWNLOADING → VERIFYING → STAGED → READY_TO_ACTIVATE → ACTIVATING → ACTIVE → TOUR_PENDING → COMPLETE. On any validation/activation error: FAILED → ROLLBACK → previous verified version; preserve active cooking session and user profiles. Persist state across process death. Do not activate while cooking; wait for a safe checkpoint. Atomic rename/transaction for content index and files. Keep last known-good pack until health check passes. Content may be downloaded automatically on Wi-Fi by default; installation of APK requires adult/system action.

## Compatibility and artwork guarantees
Every pack declares schema_version, content_version, min_app_version, recipe IDs, scene IDs, CHEF_A/CHEF_B variants, supporting character IDs MOM_M1, DAD_D1, FRIEND_F1–F4, and fallback rules. Both main-chef scene variants must exist whenever the main chef appears; otherwise reject the pack or use intentionally character-free approved artwork. Profile avatar selection is local state, never overwritten by content updates. All recipes, ingredients and finished dishes must pass semantic and safety validation before release. Offline use after installation is mandatory.

## Storage and migrations
Store each child under a stable profile_id; scope favorites, progress, achievements, tours and preferences to that ID. On migration, snapshot/backup, use transactional idempotent migrations, check counts and referential integrity, and fail safely without destructive fallback. Existing Aaria data must be mapped to a preserved profile. App data usually survives same-package/same-signer upgrades, but uninstall behavior is different and must not be described as equivalent. Adult-controlled export/import is optional and must be authenticated or encrypted as appropriate; document backup limitations. Android Keystore can protect locally stored encryption keys where needed, but avoid pretending Keystore alone makes exported backups portable.

## WebView hardening
Bundle code/assets with Android asset loading, avoid unrestricted file access, disallow mixed content and unsafe navigation, disable debugging in release, restrict JavaScript interfaces to minimal audited methods, never evaluate content-pack strings as code, sanitize/encode user names and recipe text, enforce Content Security Policy where feasible, and test link handling. No downloaded executable code masquerading as content.

## Work scheduling and user experience
Check at app start subject to throttling and opportunistically with WorkManager. No guarantee of exact timing or instant delivery. Network loss must not break offline cooking. Verify and stage first; announce only activated changes. Generate accurate release-specific What's New tours; combine simultaneous activations; track per-profile completion; allow replay, skip, Back, Next, Let's Cook. Avoid interruption during cooking.

## Play Protect and first installation
User-reported evidence on 2026-10-17: unfamiliar-developer warning, Install anyway offered, installation succeeded with Play Protect enabled on one phone. This does not certify APK safety or future upgrade success. Parent guide must teach official release verification, unfamiliar-developer warning interpretation, unknown-app-source permissions and safe cleanup. Never instruct disabling Play Protect. Treat malware-specific warnings as security incidents, not routine bypasses.

## Required test matrix and gates
- Tampered manifest, wrong signing key, hash mismatch, expired/replayed version, invalid app compatibility: reject.
- Truncated download, corrupted ZIP, oversized image/zip bomb, path traversal, unsafe script content: reject without affecting current pack.
- Kill app mid-download/activation, offline restart, disk full, failed migration: recover or roll back; retain saved progress.
- Two profiles, CHEF_A and CHEF_B, family/friends scenes: correct artwork, no data crossover.
- Content update while active cooking: defer activation; tour shown at safe time.
- Signed APK upgrade from installed version with Play Protect ON: confirm installation, package/signing continuity and data preservation.
- Wrong signer, downgrade, wrong package ID: reject/Android installer refusal; never overwrite app data.
- Android phone and tablet, portrait and landscape, fresh install and upgrade; record real-device evidence.
- Verify release CI provenance, signing secrets not in repo, dependency/security scan, no excessive permissions, no arbitrary remote code.

## Acceptance artifacts
Security threat-model review; schema definitions; verification-key and key-rotation policy; release signing policy; migration and rollback test reports; update state-machine logs; Play Protect ON device test evidence; GitHub CI run and signed APK provenance; parent installation guide. No family release before mandatory security gates pass.

## Initial V3 source audit (2026-10-17)

Audited `feature/platform-v3` at `b057f8603f7950f5e5b5699732a346ee9e453f25`. Relevant sources: `phase2-pilot/apps/aaria-android/app/src/main/java/com/aaria/magickitchen/pilot/MainActivity.kt`, `app/src/main/AndroidManifest.xml`, `app/build.gradle.kts`, and `.github/workflows/android-pilot.yml`. Findings are static source observations, not test results:

- The current host loads packaged assets from `https://appassets.androidplatform.net/index.html`, enables JavaScript and DOM storage, sets `allowFileAccess=false` and `allowContentAccess=false`, and exposes a JavaScript bridge for sharing. The full bridge/page trust boundary still needs review.
- HTTP, HTTPS, and WhatsApp navigation is delegated to external activities; tighten and test URL handling and external intent behavior. The source does not explicitly set a mixed-content mode or Safe Browsing policy. Verify platform defaults and configure explicit release policy.
- The Android workflow invokes `assembleDebug` and uploads the debug APK. GitHub Actions run 39036629623 for the audited head completed successfully, but this is debug-build evidence only. The inspected Gradle file contains package/version values but no release signing configuration. Do not treat debug builds as evidence of signer continuity.
- No signed content manifest, content activation/rollback implementation, Android transactional profile migration layer, or anti-rollback state was located in the audited tree. Embedded HTML storage behavior was not exhaustively audited.
- Immediate implementation order: record and verify the installed package/signer baseline; add WebView hardening and regression tests; implement transactional profile migration; specify and test authenticated data-only packs with monotonic rollback state; configure protected release signing and test a user-confirmed signed upgrade.

Re-audit the source and run the threat-model negative-test matrix before marking any security gate complete.


## Implementation evidence update (2026-10-17)

- WebView source hardening is implemented on `codex/v3-webview-hardening-20261017`: explicit mixed-content prohibition, Safe Browsing, file URL access disabled, debugging restricted to debuggable builds, exact appassets HTTPS authority and path validation shared across navigation and resource callbacks, and local error responses for unsafe/missing assets.
- Five URL-policy JUnit tests run before APK assembly. GitHub Actions run [39057437535](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39057437535) passed tests and `assembleDebug`. Independent source review found no regression to existing sharing, camera/file-picker, appassets, or external handoff paths.
- Not verified: WebView bridge behavior across frames, device integration, CSP, and release-mode runtime behavior. The native bridge and broad external HTTP(S)/WhatsApp handoff remain subjects for dedicated integration/security review.
- CI debug APK signer continuity is disproven across runs 39036629623 and 39057437535: certificate fingerprints differ. Fingerprints were extracted from v2 signing blocks, but `apksigner` was unavailable; this is certificate identity evidence, not full APK signature verification. It says nothing conclusive about the installed APK or production signing lineage.
- Follow-up PR #2 adds signed content-pack verification/atomic activation/anti-replay foundations and SQLite profile migration scaffolding; CI run 39060262205 passed tests on commit c9c5c842bf18c60e381370b3e1dcdff52ff597f3. The subsequent trailing-JSON rejection change at code head bb2176911a2b1a5061454a9e9500a0499c0897f0 passed CI run 39060387158. APK update manager, publisher key provisioning, installed signer identity, migration fixtures and Play Protect ON upgrade tests remain open. Do not produce or distribute a production upgrade until the existing installed/release signer and protected production key lineage are recovered and verified.


## Current artifact and migration evidence (2026-10-17)

- CI run 39057437535 produced a debug APK archive [12110495010](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39057437535/artifacts/12110495010) and generated HTML archive [12110216216](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39057437535/artifacts/12110216216), available until 2026-11-16. These are test artifacts, not a signed family release.
- The legacy storage key and schema have not been verified from the actual shipped HTML or installed app data. A candidate key was reported by one audit but could not be confirmed by an independent review; treat the discrepancy as unresolved and do not migrate/delete data until a verified source or export fixture is available.
- Production signer/installed APK continuity, phone/tablet testing, authenticated data-only content updates, anti-rollback and migration remain release gates.


## Follow-up implementation evidence and unresolved trust roots (2026-10-17)

PR #2 adds an RSA SHA-256 signed content-pack verifier with exact payload signature verification, strict manifest keys, hash/type/path/size/version/expiry checks, replay rejection and staged activation with recovery state. CI run 39060262205 passed the tests and debug build on c9c5c842bf18c60e381370b3e1dcdff52ff597f3. A subsequent change at branch head bb2176911a2b1a5061454a9e9500a0499c0897f0 rejects trailing bytes after JSON values; this head passed CI run 39060387158. The repository does not provision `content-pack-publisher.x509` or key ID, so the installer fails closed pending an owner-controlled trust root. Fetching, user activation flow, catalog/runtime integration, WorkManager scheduling, key rotation and device recovery testing are not implemented.

A SQLite profile store and idempotent migration marker have been added. Root `index.html` statically identifies localStorage key `aariaPrivateKitchenV4`; migration has not been validated against an installed data export or tested with database fixtures, crash recovery, malformed state or multiple-profile isolation. This is partial implementation only.

APK signing continuity remains blocked: a protected release-signing configuration and manual GitHub Actions workflow are prepared, but the currently installed package signer and protected production key lineage are unknown. The workflow requires the existing keystore from protected Actions secrets and compares the resulting APK certificate fingerprint to repository variable `ANDROID_SIGNER_SHA256` before upload. Do not create a new production key or distribute an in-place upgrade until the trusted existing identity is established. The CI APK/HTML artifacts are development outputs, not family release output.


## Migration parser validation update (2026-10-17)

Commit `81fdd93710e6ad19ca292655c9393d05c725e3f4` adds strict validation of legacy profile snapshots before database migration begins. Malformed/trailing/non-object/oversized values are rejected; unknown nested fields are retained in the parsed snapshot. CI run 39060716858 passed these unit tests and debug build. This is parser-level evidence only; SQLite transactionality, crash recovery, installed user-data preservation, multi-profile isolation and device migration remain open.


## SQLite migration test update (2026-10-17)

CI run 39061031142 passed Robolectric-backed SQLite tests for legacy migration idempotency, malformed-input retry, preservation of unknown fields and two-profile state isolation. This is local simulated Android database evidence; installed-data export comparison, device/process-death recovery, backup/restore and signed-upgrade preservation remain unverified.


## Protected release signing implementation (2026-10-17)

The Gradle release build accepts `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`. Partial configuration is rejected, and release APK/AAB tasks fail closed if no complete signing config exists.

The manual workflow `.github/workflows/android-release.yml` retrieves the base64 keystore and credentials from protected GitHub Actions secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). It requires repository variable `ANDROID_SIGNER_SHA256`, decodes the keystore only on the ephemeral runner, builds `assembleRelease`, runs `apksigner verify`, and refuses artifact upload unless the signing certificate matches the trusted fingerprint. The pipeline does not create or rotate a key.

This is prepared infrastructure, not proof of a valid signer or a release build. The GitHub integration available in this session can edit repository files but cannot read or provision Actions secrets. The owner must place the existing production key and its matching fingerprint into GitHub's protected settings and confirm that the fingerprint matches the installed/release APK lineage. Afterward run the workflow and complete an Android installer upgrade test with Play Protect enabled and saved-profile verification. Never transmit private key material through chat or Git.


CI run [39062826879](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062826879) passed after the release signing Gradle configuration was added. Run [39062992988](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988) passed; its `Verify unsigned release builds are refused` step confirmed that unsigned release assembly fails with the expected signing guard. It also published [debug APK artifact 12111849096](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988/artifacts/12111849096), SHA-256 `96c87003b4a82eaa30317b57a2455afcfd92a84f406ff9be4cdb177c24225438` and [HTML test artifact 12111729532](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39062992988/artifacts/12111729532), SHA-256 `27203e329dfccaf8fa5ba6bd2f8e793c633dc50202463d32f2c3ac1282b812c8`. The APK is debug-signed. This evidence does not verify the production signer or create a signed release APK.


## User-supplied APK signer inspection (2026-10-17)

Local inspection of attached `Aaria_Magical_Kitchen_V3.apk` found application ID `com.aaria.magickitchen.pilot`, version code 5/name 1.0.1 and a v2 signing-block certificate with subject `CN=Android Debug, O=Android, C=US`. Certificate SHA-256: `B5:EC:1E:57:50:BE:5B:C2:34:7F:8E:59:1C:C8:9E:67:FE:E7:13:24:3C:6D:C8:48:6A:6F:FE:10:00:0B:EB:1D`; APK SHA-256: `977fe6daf7eb703bf160b40e984d48cc13df353a7ae23cc4a591633e53098180`.

This identifies the supplied file as debug-signed, not the production signer. An APK does not contain its private signing key. The attached file has not been proven byte-for-byte identical to the installed copy, and a full `apksigner` verification could not be run in the analysis environment. Do not treat this as continuity evidence or uninstall the currently installed app. Resolve the installed-app signer and data-preserving transition before creating or installing a production-signed APK.


## Superseding release-signing decision (2026-10-17)

The owner explicitly approved creating a new permanent release signer after confirming there is no saved app data to preserve. This decision supersedes earlier notes in this plan that prohibited a replacement key. The attached/current APK inspected for this task is debug-signed; its private key cannot be recovered, and the exact installed APK bytes were not independently compared. Therefore the new key does **not** provide an in-place update from that debug installation. The first release signed with the new key requires a clean uninstall/reinstall; the owner confirmed saved data migration is not required. Do not uninstall until a verified new signed APK is ready. Keep the new key for every subsequent direct APK release. Any future Google Play transition must be planned around the same app signing identity and the Play App Signing setup; this new key does not sign unrelated apps or different package IDs.

A PKCS#12 RSA-3072 release keystore was generated for alias `aaria-v3-release`; certificate SHA-256 fingerprint: `3A:ED:A9:B7:1A:B2:9C:4C:21:D9:FC:A5:15:54:18:B5:68:4A:21:11:CE:C6:FC:17:22:2B:64:DB:03:69:75:88`. Public certificate fingerprint was verified with Java `keytool`. Private keystore and passwords are not committed to GitHub. The owner must securely back up the keystore and configure environment secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` plus environment variable `ANDROID_SIGNER_SHA256` in GitHub environment `android-production-signing`. Until configured, a signed release build, APK verification, device install, and future update continuity remain unverified.



## Security and device update evidence update — 2026-10-17
The owner reports the permanent direct APK signing key is configured and the signed APK update succeeded on the phone; GitHub run #8 independently passed the trusted-certificate and packaged V3 marker gates. Preserve this as owner-reported device evidence alongside the CI record. The profile onboarding crash found immediately afterward is a release blocker for usability and is tracked in the implementation status.

The code-level remediation captures the previous renderer before installing the profile-aware wrapper (commit `133fbb4b35fb06789b13ffd1b5d0b83508d0c5df`). A second review finding fixed local HTML profile roster persistence (commit `0c702f4b9a0feb85d69e0b98a24ac34afc7443bc`). Node syntax, profile reset/isolation, and localStorage roster persistence checks pass locally; hosted CI for latest head `56e08ba321535645953bcc216bfd485125cb922b` is not confirmed. Main signed-release workflow commit `eaa4263fc131547ca24b5cdc1bea0aff2a6dfc28` now pins immutable fix source `56e08ba321535645953bcc216bfd485125cb922b`; the next run will execute the regression/build/signature gates. No artifact from that run exists yet.

APK signing trust and content-update trust are distinct controls. The owner-reported APK key completion does not provision the content-pack publisher public key/key ID. Signed content feed delivery, parent approval and “What’s New” flow, replay/rollback enforcement, crash recovery, and device-level WebView bridge-origin validation remain open. Keep all update paths fail-closed until their own trust and acceptance tests pass.


## WebView bridge containment follow-up — 2026-10-17
Candidate source `524e85a33f874ac9c12e8b4e7943b7dad4c9b294` injects a CSP at the start of `<head>` with script-src limited to packaged-origin and required inline code; `frame-src` and `object-src` are denied; `base-uri` and `form-action` are restricted to self. Android navigation rejects every non-main-frame navigation before appassets and external-link routing. This keeps inline V2/V3 behavior intact while reducing remote-frame access to the legacy JavaScript interface.

Remaining hardening: exercise CSP and frame attempts in Android WebView instrumentation tests; verify all V2 scripts/resources against the policy; replace `addJavascriptInterface` with `WebViewCompat.addWebMessageListener` restricted to the exact packaged origin and main frame, with typed commands. Do not claim the interface itself is origin-bound until that migration is complete.

The subframe guard is factored as `AppAssetsUrlPolicy.shouldBlockSubframeNavigation` and is covered by a JVM unit test. It verifies the navigation decision only; it does not replace a WebView instrumentation test for iframe injection, script execution, CSP enforcement, or bridge isolation.


## Independent WebView review follow-up — 2026-10-17
The policy now includes `connect-src 'self'` and `child-src 'none'`; its validator rejects duplicate directives and disallowed remote/wildcard script and connection sources. Local synthetic checks pass for valid policy and negative cases. Resource compatibility remains only partially assessed: style, image, font and media directives are not yet constrained because the full approved V2 baseline resource inventory has not been verified. Complete that audit, choose precise required sources, then enforce default/resource directives without losing approved artwork or styling. 
