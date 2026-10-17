# V3 Android Security, Update Reception and Migration Architecture
Status: mandatory engineering specification; source audit completed for `feature/platform-v3` at `b057f8603f7950f5e5b5699732a346ee9e453f25`; implementation and tests pending.

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
