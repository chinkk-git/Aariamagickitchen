# My Magical Kitchen — V3 Master Implementation Plan
Version: 2.0 | Updated: 2026-10-17 | Status: approved product direction; engineering verification pending
Repository: https://github.com/chinkk-git/Aariamagickitchen
Authority: this document governs V3 scope; actual repository state and assets must be audited before changes.

## 1. Mission and product identity
Build **My Magical Kitchen** (provisional name, pending trademark/name check), an inclusive, polished, offline-first cooking adventure for children **8–12** on Android phones and tablets. Tagline: **Your Kitchen. Your Creations. Your Magic.** Replace Aaria-specific generic branding, while preserving the original Aaria profile, approved artwork, recipes, content, and saved data. Avoid preschool-like copy. Cooking remains central, with two primary home actions and optional age-appropriate creative customization, kitchen mysteries, and subtle celebration/music, without feature bloat.

## 2. Binding decisions
- APK-first; GitHub Releases initially; no Google Play distribution requirement. Standalone HTML is no longer a public deliverable; existing HTML/CSS/JS may remain inside a Kotlin Android WebView.
- Preserve approved recipe journeys, artwork style, recipe IDs, features, landscape step layout, and protected working baseline. No cooking timers.
- **Exactly two fixed main chef designs**, approved concept **G1** (girl chef) and **B1** (boy chef). No avatar generator, skin-tone/hair customization, or mandatory gender field. Child chooses whichever avatar they prefer; use stable identifiers `CHEF_A` and `CHEF_B`.
- **Fixed supporting cast**: Mommy **M1**, Daddy **D1**, Friends **F1–F4**. Inclusive, non-stereotyped appearances; character identities, outfits, facial features and proportions locked via character reference sheets. Main chef is the only profile-dependent cast member.
- Onboarding: name/nickname and one of two chef avatars. No gender data collection. Allow avatar/name changes later. Support multiple local child profiles with isolated progress, favorites, achievements and preferences.
- Keep core content, artwork, user data and progress offline. No child login or cloud account required.
- Authenticated **data-only** recipe/artwork content packs without APK reinstall; no remote executable code. Signed APK updates for executable features, with Android installer confirmation.
- Every activated content or APK update gets an accurate, skippable/replayable **What's New** guided tour; consolidate simultaneous updates; never interrupt active cooking.
- Play Protect remains ON; no routine disabling. User reported successful installation on one Android phone after unfamiliar-developer warning and “Install anyway”; launch, safety, upgrades and tablet compatibility remain unverified.
- High-autonomy agent cluster handles planning, implementation, independent review, QA, remediation, merges when permissions permit, and version-controlled process learning without routine user approval. Escalate only real external decisions, unsafe/unverifiable release conditions, unavailable access, or mandatory device/platform confirmations. Do not weaken acceptance gates or alter product requirements autonomously.

## 3. Existing content and visual baseline
Audit the repository, history and latest approved build before editing. Determine actual recipe inventory and IDs; do not assume counts. Identify missing/wrong ingredient icons, inconsistent “You'll need” illustrations, incorrect finished-dish art, absent images, recipe-step character mismatch, incomplete Mommy/Daddy/Friends artwork, broken landscape scaling, and any rollback of approved layout. Repair defects with exact ingredient/dish correspondence and appropriate safety cues. Preserve approved family/friends cooking style and all previously accepted recipes; never silently replace them. Artwork is premium, warm, magical, age-appropriate for 8–12, readable on phones and tablets. No mismatched generic emoji/icons where finished illustrations are required. The original character concept sheets are **references**, not a guarantee that exact production assets exist. Inspect and version approved assets.

## 4. Character production specification
### 4.1 Character IDs
- `CHEF_A`: approved G1 girl-chef direction; purple-star chef hat, teal/purple apron, expressive and friendly.
- `CHEF_B`: approved B1 boy-chef direction; matching palette, proportions, visual treatment and age.
- `MOM_M1`: approved warm/encouraging M1 supporting character.
- `DAD_D1`: approved friendly/playful D1 supporting character.
- `FRIEND_F1`, `FRIEND_F2`, `FRIEND_F3`, `FRIEND_F4`: approved four-friend cast, diverse and recognizable.
No assumptions about real-world ethnicity, gender identity, or family composition from visual appearance. Supporting roles are story characters, not claims about a child's actual family.

### 4.2 Artwork rules
Create master turnarounds, expression sheets (happy, excited, thinking, surprised, proud, supportive), palette, clothing, pose, scale and prop reference. Lock character design only after objective consistency QA against the approved concept direction. Every scene with the main chef must have **both** `CHEF_A` and `CHEF_B` variants or an intentionally character-free fallback approved by QA. Share backgrounds, food, equipment, ingredient art and finished-dish art when possible. Use layered composition when visually sound; use separately illustrated variants where interactions/occlusion require it. Never overlay a floating avatar onto incompatible artwork. Do not show a wrong avatar as fallback. Scene registry must map `recipe_id`, `step_id`, `scene_id`, `variant`, dimensions, checksum, content version, alt text, and QA state. Require recipe/action fidelity: food, quantity, tool, action and safety. Ensure child/adult character continuity in all steps, achievements, tours, and family/friends scenes. Finished dish shows completed dish, not ingredients. Large landscape cooking art must not break text/navigation.

### 4.3 Example scene acceptance
- Rainbow Fruit Yogurt Parfait: wash fruit, adult-supervised cutting as appropriate, layer yogurt, add fruit/granola, completed layered dessert. Both chef variants; ingredient icons match recipe; no invented unsafe instructions.
- Banana Roll-Ups with Mommy: M1 plus chosen chef, exact spread/roll/serve sequence.
- Rainbow Veggie Nachos with Daddy: D1 plus chosen chef, accurate assembly and adult-managed hot appliance.
- Fruit Smoothie with Friends: chosen chef plus relevant F1–F4; adult supervises blender; no wrong supporting character or cross-scene identity drift.
These are visual QA examples, not automatic additions to recipe catalog.

## 5. First-run onboarding and profiles (WP00)
On first launch, show product welcome, name/nickname entry (length-limited, sanitized for display), two fixed avatar cards with visual preview, and confirmation to enter kitchen. Optional adult-facing settings are separate. Store no mandatory gender or precise birthdate. Allow nickname edits and avatar switches without losing progress. Support multiple local profiles, each with unique internal `profile_id` and scoped favorites, history, achievements, preferences, tours and recipe progress. Switching profiles must not leak progress. Preserve existing Aaria data through an idempotent, reversible-as-feasible migration: snapshot/backup, map legacy state to an Aaria profile, verify record counts and rollback on failure. If existing data is ambiguous, preserve it rather than overwrite it. Privacy-first, app-private storage, no analytics/ads by default, parental controls for export/import and network/update settings. Verify child-privacy obligations before public expansion.

## 6. Android architecture (WP01–WP02)
Inspect build scripts, package name, signing, dependencies, permissions, WebView security and GitHub Actions. Protect known-good baseline (tag/branch, hash, backups). Kotlin Android host + packaged HTML/CSS/JS WebView as pragmatic initial strategy; no unapproved rewrite. Responsive portrait and landscape layouts, tablet sizing, back navigation, accessibility, safe asset loading, no unsafe JavaScript bridges, restrictive external navigation. Reproducible debug/release builds. Signing keys never committed. Release package identity and signing certificate must be stable across upgrades. Do not assert APK existence unless build artifact is verified.

## 7. Persistence (WP04)
Room/SQLite for profiles, favorites, achievements, recipe history, progress, update history and content activation state; DataStore for preferences; app-private bundled/downloaded media. Versioned schema, foreign keys/profile scoping, atomic writes, non-destructive migrations, backup/restore controlled by an adult. Test reinstall/upgrade semantics accurately: ordinary upgrades preserve data if package and signing identity match; uninstall generally deletes app data absent an applicable backup mechanism. No automatic phone/tablet synchronization in V3.

## 8. Content-pack update engine (WP05)
Signed/versioned HTTPS manifest, authenticated publisher key, SHA-256 asset integrity, schema/app compatibility, strictly data-only formats, path traversal prevention, size limits, download staging, atomic activation, rollback, retention of prior good content, offline access. Include both chef variants where needed and validate registry completeness before activation. Default Wi-Fi-only background downloads, configurable in parent settings. WorkManager periodic checks are best effort, not exact schedules; app-start checks with throttling. Never run downloaded JavaScript as “content.”

## 9. APK updates and Play Protect (WP06/WP08)
Use trusted release source and verified metadata, package identity, signer continuity, higher `versionCode`, integrity and compatible install intent. Android/parent must confirm installer action; no silent installation promise. Provide illustrated parent guide before installation, including official release link, checksum/signature verification guidance, unknown-app-source permission, Play Protect unfamiliar-developer warning interpretation, first launch and revocation of unnecessary install permissions. Do not tell users to turn Play Protect off or ignore malware-specific warnings. Test signed upgrade on phone/tablet, saved-profile preservation, cancel/fail recovery and version reporting.

## 10. What's New engine (WP07)
Tour schema per release with exact installed changes, scene assets, release IDs, sequence, short age-appropriate copy, Back/Next/Skip/Let's Cook/Replay. Track per-profile completion; consolidated tour when multiple updates activate together; offline replay; no interruption to active recipe. Test first-run vs upgrade, small fixes, new recipes, avatar assets, skipped tour and replay. No misleading preview of features not installed.

## 11. Cooking experience and safety
Home screen retains immersive magical kitchen and two primary actions; cooking central. Age-appropriate 8–12 writing and optional creative food decoration, mystery/puzzle and subtle celebration/audio, without clutter. No timers. Accurate instructions, ingredient substitutions and allergen/nutrition disclosures must be evidence-backed; never claim independent nutritional/allergy review without evidence. Clearly flag knives, ovens, air fryers, hot pans and blenders as adult-supervised/handled where appropriate. Friendly, inclusive roles; no gender-based recipe restrictions. Accessible touch targets, readable text, image alt text, reduced-motion and audio settings.

## 12. Autonomous agent cluster (WP11)
Audit the **existing nine agents** before creating anything. Map roles (not necessarily 1:1): Orchestrator, Planner, Executor, independent Reviewer, Android, Artwork, Content/Safety, QA, Release, and Learning stewardship. Some roles may be combined; no duplicate agent sprawl. Define role profiles, authority, inputs/outputs, handoff contracts, test evidence and escalation thresholds. Operational cycle:
`Discover → Plan → Implement → Test → Independent Review → Remediate → Retest → Integrate → Learn → Continue`.
Routine approval NOT required for documentation, code changes, validated merges or sprint transitions when repository permissions allow. Never claim a PR was merged unless confirmed. Do not bypass platform/user security prompts, publish unsafe artifacts or change approved product scope silently. Automated agents cannot guarantee continuous execution outside active Work/CI/automation capacity.

### 12.1 Persistent learning
Maintain `docs/AGENT_LEARNING_REGISTER.md`: incident, root cause, evidence, corrective action, regression test, before/after metric, owner, date, commit. Promote improvements into version-controlled prompts/agent profiles/checklists only after independent validation. Preserve a changelog and rollback path for agent instructions. Prohibit self-modification that disables checks or broadens permissions. Track repeated regressions and improve test coverage.

## 13. Requirements traceability and acceptance
Maintain `docs/V3_REQUIREMENTS_MATRIX.md` mapping requirement IDs to owner, code/artifact, automated test, manual/device test, evidence link and status. Mandatory coverage:
- Branding and onboarding, exactly two main chefs, fixed M1/D1/F1–F4, multi-profile separation, legacy Aaria migration.
- Both avatar variants across home, recipe steps, family/friends, achievements and tours; no missing/wrong images.
- Offline cooking, local persistence, signed APK upgrade data survival, secure content packs and rollback, tour correctness.
- Android phone/tablet portrait/landscape, Play Protect ON, accessibility, child safety, recipe correctness, privacy.
- Reproducible builds, CI, protected baseline, verified release provenance.
Reviewer must reject partial or unevidenced acceptance. Real-device actions requiring a human must be listed as external test steps; do not invent results.

## 14. Roadmap and dependencies
Rebaseline the old six two-week sprints after audit; onboarding/profiles and cast registry are critical-path dependencies. Provisional sequence:
S0: repo audit, baseline, agents, requirements matrix, approved asset discovery.
S1: product rebrand, onboarding, multi-profile storage/migration, Android foundation.
S2: character bible, both chef variants, supporting cast registry, representative end-to-end recipe pilot.
S3: complete artwork defect remediation and recipe QA, responsive layouts.
S4: authenticated content packs and rollback.
S5: signed APK upgrades, Play Protect guidance, What's New tours.
S6: phone/tablet integration, safety/accessibility/regression, signed family release.
These are **work phases**, not guaranteed calendar commitments. Prioritize a small pilot before mass artwork creation; require independent QA approval, not routine user sign-off.

## 15. GitHub workflow and deliverables
Primary repo: `chinkk-git/Aariamagickitchen`. Work in dedicated branches; preserve baseline. Commit docs, agent specs, status, tests and implementation; use PRs/CI, merge automatically only when permitted and quality gates pass. Family release only when all mandatory evidence exists and platform/security conditions are met; do not bypass security checks. Deliver signed APK, GitHub Release links, parent guide, verified update manifest, What's New content, test reports, defect register, migration evidence, rollback instructions, and learning ledger.

## 16. Evidence baseline as of 2026-10-17
Only confirmed Android test: user successfully installed an APK on one Android phone with Play Protect ON after selecting “Install anyway” for an unfamiliar developer. APK launch, signer verification, update behavior, security, persistence, offline functionality and tablet testing **not confirmed**. Previously generated art is concept art; final character sheets and individual scene assets must be created/validated. Do not treat this plan as proof code was implemented.

## 16.1 Repository audit on 2026-10-17
- `main` at `95f86ccbfe1222d8b263a6a83810b3c46d793c7e` contains the legacy `index.html`, infomercial HTML and WhatsApp preview image. The V3 Android/pilot work is on `feature/platform-v3` at `b057f8603f7950f5e5b5699732a346ee9e453f25`; keep these baselines distinct.
- The V3 branch contains the pilot Android shell, tooling and CI, but no root `docs/` directory or persisted agent profiles were located in its 179-entry tree. No claim is made about files outside the audited repository tree.
- Existing CI run 39036629623 completed successfully on that head and builds a debug APK. This does not establish release signing continuity, security acceptance, or device readiness.
- Initial source audit found partial WebView restrictions. Subsequent implementation branch `codex/v3-webview-hardening-20261017` adds WebView hardening and five passing URL-policy unit tests (CI run 39057437535); see live status and architecture records for evidence and remaining device gates. Authenticated content updates, rollback/anti-rollback, transactional migration and release signing remain unimplemented.
- Documentation was added on an isolated branch and WebView hardening began from it. Continue through a PR to `feature/platform-v3`; do not merge to `main` or disturb legacy app assets.

## 17. Definition of done
Every work package has linked code/artifacts, reproducible build, passing automated tests, independent review, device tests where applicable, regression evidence, updated requirements matrix and status, and documented lessons. No fake PASS, no silently dropped requirements, no unchecked character substitutions. The cluster reports verified outputs and genuine blockers, not routine requests for approval.

## 18. Mandatory security/update engineering addendum
Implement and test `docs/V3_ANDROID_SECURITY_UPDATE_ARCHITECTURE.md` as a binding specification for signed content manifests, safe data-only packs, signer-preserving APK updates, transactional migrations, Play Protect ON testing, WebView hardening, anti-rollback, key management and failure recovery. The security reviewer must verify these gates before release.


## 16.2 Implementation continuation evidence (2026-10-17)

The WebView pilot was hardened on `codex/v3-webview-hardening-20261017` at `ee02895aaff8b9f30dd5dbb269076b35896ce61b`. CI run 39057437535 passed the new appassets URL-policy tests and debug build. This does not satisfy device, release-signing, content-update, migration, or anti-rollback acceptance. Two CI debug APK artifact certificates differ; the installed APK and trusted production signer remain unknown. The immediate security prerequisite is to recover the original installed/release APK or trusted signer fingerprint and protected production key lineage before planning an upgrade. Continue migration and authenticated data-only update implementation after establishing appropriate data/identity baselines. The autonomous agent work in this session was task-scoped audit/review; durable agent profiles and continuous execution have not been established.


## 16.3 Development artifact readiness (2026-10-17)

GitHub Actions run 39057437535 passed HTML validation/packaging, adapter syntax checks, five WebView URL-policy tests, and debug APK assembly. It published the generated HTML archive [12110216216](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39057437535/artifacts/12110216216) and debug APK archive [12110495010](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39057437535/artifacts/12110495010), with artifact digests recorded in `V3_IMPLEMENTATION_STATUS.md`. Both archives are available until 2026-11-16. The APK is debug-signed and intended for development testing; it is not proof of continuity with the installed app or production release readiness.

Migration remains unstarted until the actual shipped HTML or a verified installed-data export confirms the source key/schema and a representative fixture. One independent audit reported a candidate key, but another reviewer could not verify it from the available source; preserve this uncertainty rather than encoding an assumption. Production signer lineage and device tests remain required gates.


## 16.4 Bounded implementation evidence and key gate (2026-10-17)

Draft PR #2 (`codex/v3-completion-core-20261017`) adds profile storage/migration scaffolding, signed data-only pack verification and atomic activation foundations. The root `index.html` source statically confirms localStorage key `aariaPrivateKitchenV4`; this does not replace validation against installed user data. CI run 39060124410 exposed a missing generated BuildConfig; enabling BuildConfig led to passing run 39060262205 on c9c5c842bf18c60e381370b3e1dcdff52ff597f3. That run published debug APK and HTML artifacts (12111410525 and 12110882719). Follow-up run 39060387158 passed on branch code head bb2176911a2b1a5061454a9e9500a0499c0897f0, including strict JSON parsing, and published development artifacts 12111033320/12111286874.

The current APK remains debug-signed. The codebase contains no production signing configuration or trusted installed APK signer evidence, and no content publisher key is provisioned. Do not generate a replacement production key or claim APK upgrade continuity. Resume after the owner establishes the existing APK signer/key lineage through a trusted channel and provisions the content publisher trust root; then rerun CI on the current branch head and complete device/migration/update tests. PR #2 remains draft and is not merged.


## 16.5 Migration safety progress (2026-10-17)

The profile migration parser was hardened in commit `81fdd93710e6ad19ca292655c9393d05c725e3f4`: invalid, oversized, trailing and non-object JSON is rejected before migration completion can be recorded; unknown nested fields are preserved. CI run [39060716858](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39060716858) passed Android tests and debug APK/HTML assembly. SQLite transaction/recovery and installed-data fixture tests remain open. This is a bounded engineering step, not completion of WP00/WP04.


## 16.6 SQLite profile migration evidence (2026-10-17)

Robolectric-backed SQLite tests in commit `e5425c6539c93492c241814bf380755b3f9439ae` pass in CI run [39061031142](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39061031142). They verify idempotent legacy migration, retry after malformed input, preservation of unknown fields, and isolation between two profiles. This does not establish migration behavior on the user's installed app data or Android devices. Release signing, content publisher trust, backup/restore and device QA remain open.


## Superseding release-signing decision (2026-10-17)

The owner explicitly approved creating a new permanent release signer after confirming there is no saved app data to preserve. This decision supersedes earlier notes in this plan that prohibited a replacement key. The attached/current APK inspected for this task is debug-signed; its private key cannot be recovered, and the exact installed APK bytes were not independently compared. Therefore the new key does **not** provide an in-place update from that debug installation. The first release signed with the new key requires a clean uninstall/reinstall; the owner confirmed saved data migration is not required. Do not uninstall until a verified new signed APK is ready. Keep the new key for every subsequent direct APK release. Any future Google Play transition must be planned around the same app signing identity and the Play App Signing setup; this new key does not sign unrelated apps or different package IDs.

A PKCS#12 RSA-3072 release keystore was generated for alias `aaria-v3-release`; certificate SHA-256 fingerprint: `3A:ED:A9:B7:1A:B2:9C:4C:21:D9:FC:A5:15:54:18:B5:68:4A:21:11:CE:C6:FC:17:22:2B:64:DB:03:69:75:88`. Public certificate fingerprint was verified with Java `keytool`. Private keystore and passwords are not committed to GitHub. The owner must securely back up the keystore and configure environment secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` plus environment variable `ANDROID_SIGNER_SHA256` in GitHub environment `android-production-signing`. Until configured, a signed release build, APK verification, device install, and future update continuity remain unverified.



## Continuation checkpoint — 2026-10-17
The owner reports that the new permanent APK signing key is configured and that an APK update using it succeeded on the phone. GitHub Actions run #8 also passed the signed V3 build and trusted-certificate checks. This confirms the signing/update milestone by CI plus owner-reported device behavior; it does not independently verify every saved profile field or Play Protect behavior.

The phone then exposed a real profile-onboarding crash: selecting Chef A or Chef B showed “Maximum call stack size exceeded.” Source review traced it to a profile-aware render wrapper calling itself. Fix commit `133fbb4b35fb06789b13ffd1b5d0b83508d0c5df` captures and calls the prior renderer. A follow-up regression check was added, and independent review confirmed the recursion cause and fix. Review also found and a follow-up fixed a standalone HTML profile persistence defect at `0c702f4b9a0feb85d69e0b98a24ac34afc7443bc`; Node syntax and profile reset/persistence tests pass locally on the branch. GitHub CI has not yet reported a run for the latest head `56e08ba321535645953bcc216bfd485125cb922b`.

Next execution order: (1) run CI for the latest head and repair any failures; (2) build a fresh signed APK from that exact immutable source commit and verify the trusted signer and packaged V3 marker; (3) retest launch, legacy chef selection, saved progress, and update on the phone; (4) complete content publisher key provisioning and signed data-only update/replay/rollback tests; (5) finish migration recovery, WebView bridge/device review, What's New tours, artwork/cooking-safety review, and phone/tablet regression. The text-only Chef A/B buttons remain a visual acceptance gap against the Character Bible. Do not treat the current artifact as fixing the chooser until a phone retest passes.



## Release workflow source pin — 2026-10-17
Main signed-release workflow was updated at commit `eaa4263fc131547ca24b5cdc1bea0aff2a6dfc28` to check out immutable fix source `56e08ba321535645953bcc216bfd485125cb922b`. That source includes the recursive-render fix, standalone profile persistence fix, and their Node regressions. The next signed workflow run executes these tests plus V3 transformation, Android unit tests, trusted signer verification and APK marker checks. It has not yet run; this GitHub integration cannot dispatch Actions workflows, so the owner can start it from the [signed-release workflow page](https://github.com/chinkk-git/Aariamagickitchen/actions/workflows/android-release.yml).

## WebView containment follow-up — 2026-10-17
The chooser crash and standalone profile-persistence defect have code-level fixes and local regressions. Candidate source `524e85a33f874ac9c12e8b4e7943b7dad4c9b294` adds generated-page CSP checks and subframe navigation rejection. Next: hosted CI and the phone regression; WebView CSP compatibility/instrumentation; origin-restricted message bridge; then the existing roadmap for trusted content publisher provisioning, authenticated downloads, parent activation, rollback/recovery, profile/device migration, visual and safety review, and production release acceptance. The approved baseline remains unchanged.

The security candidate now includes a unit test for explicit subframe navigation policy. Treat this as code-level coverage only; CSP compatibility and bridge isolation need WebView instrumentation and device acceptance before completion.


## Independent WebView review follow-up — 2026-10-17
Independent review confirmed the inline-script and subframe changes are coherent with the single-document V2/V3 model, and identified unrestricted network connections plus duplicate CSP directives. Candidate `524e85a33f874ac9c12e8b4e7943b7dad4c9b294` now limits script connections to self, disables child frames, rejects duplicate directives, and has local negative tests. Complete the actual V2 resource inventory before restricting image/style/font/media categories, then run hosted Android tests and real-device WebView/profile acceptance. 


## Execution checkpoint — 2026-10-17 (current evidence)

This section reconciles later verified work with older “signing blocked / no release artifact” notes in the plan. Those older notes remain historical audit records, not current blockers.

**Completed and evidenced:** the permanent release signer is configured in GitHub; signed Actions run [39080069478](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080069478) verified the trusted certificate and APK signature, packaged the V3 HTML and uploaded artifact 12118841013. The owner reports a successful update test. Profile storage/migration scaffolding, content-pack verification/activation recovery, and WebView policy foundations are implemented in draft PR #2. Pilot runs [39080611176](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080611176) and [39080621336](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080621336) pass unit/build checks, including fail-closed missing publisher trust assets and invalid image-byte rejection.

**Still in progress:** the phone shows “Maximum call stack size exceeded” in the legacy chef chooser, so fix and retest onboarding/chooser before a new signed candidate; confirm saved progress during update. Content update delivery has no bundled publisher public key/key ID, feed/downloader, parent approval/activation flow, catalog runtime integration, offline scheduler or What's New tour. Existing replay/version checks are app-private and device-clock based, not hardware-backed anti-rollback or trusted-time enforcement. Complete process-kill/disk-full recovery and real legacy-data validation. Audit the full baseline resource inventory, finish WebView bridge-origin hardening and device tests. Complete approved cast/artwork/recipe review, cooking-safety/allergen/accessibility review, no-timer audit, and phone/tablet/offline/baseline regression.

The currently signed artifact predates the draft CSP/subframe changes and does not constitute a complete V3 family release. Continue implementation in draft PR #2 and preserve the protected feature/platform-v3 baseline. Do not claim release readiness until the chooser bug and required device/security acceptance gates are closed.


### Latest implementation follow-up — 2026-10-17

The draft branch now keeps the activation recovery marker on failure and performs interrupted-swap recovery before serving the recipe catalog. Pilot runs [39080934453](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080934453) and [39080945482](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080945482) passed these regression checks. The legacy chooser path now updates the chef identity and visible profile button without synchronously rerendering the full kitchen; run [39080987371](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39080987371) passed the JavaScript flow regression. The owner’s reported phone stack overflow remains open until a newly signed APK passes device retest. No production release or full-device rollback claim is made.


The exact-source signed-candidate workflow is prepared in draft PR #2 and its YAML parses successfully. It runs V3 HTML validation, CSP/profile regressions, Android unit tests, signer fingerprint checks, APK signature validation and V3 marker verification before upload. It still requires a manual Actions dispatch because the connected GitHub API has no dispatch call; use the draft branch `codex/v3-completion-core-20261017`. The resulting signed APK must then be retested on phone for legacy chooser completion and data preservation before it can be accepted.


### Implementation checkpoint — 2026-10-18

Pilot run [39081529933](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39081529933) passed on exact source `ad61ef004d14327ec9177d72bb13662e38631488`. Hosted evidence covers the V3 transform/validator, CSP and profile regressions, Android unit tests, APK assembly and the unsigned-release refusal guard. Content-pack negative tests now explicitly reject oversized entries before staging, unsupported media, truncated archives, mismatched artwork roles and active SVG. The generated HTML and debug APK are artifacts [12118747562](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39081529933/artifacts/12118747562) and [12118364099](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39081529933/artifacts/12118364099). The APK is debug-signed; neither artifact is a family release.

The remainder of WP00–WP11 stays active: dispatch and device-test the latest same-signer APK; verify actual legacy data migration and profile recovery; provision a separate content publisher trust root and build the HTTPS feed/downloader, adult approval, catalog and What's New flow; finish WebView resource inventory and origin-restricted bridge; audit approved recipes/artwork, child safety/allergens and no-timer/baseline preservation; then verify offline use, accessibility, phone/tablet layouts, rollback/failure behavior, and release acceptance. The publisher public key/key ID and a device-runner/owner device confirmation are external dependencies; no implementation may bypass their trust or acceptance checks. The protected baseline remains unchanged and PR #2 remains draft.


### Archive-set validation checkpoint — 2026-10-18

Added a signed content-pack regression proving an archive containing undeclared payload data is rejected before staging. Pilot run [39082241731](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082241731) passed on source `53dfd150df68c52b480b40bfbb9fb5195689ab76`, including V3 HTML/CSP/profile checks, Android unit tests, debug APK assembly and unsigned-release refusal. This is incremental WP05/R024 progress; publisher key/feed, activation UI, duplicate ZIP-name and decompression-bomb cases, plus device validation remain open. The artifact is debug-signed and not a release.


### Duplicate ZIP member checkpoint — 2026-10-18

WP05/R024 now includes a hosted regression for a structurally valid signed ZIP with a duplicate path; the verifier rejects it before staging. Pilot run [39082636745](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082636745) passed on source `807520cff9594d2ae7e8d574e5c3231a31297b80`. The APK/HTML artifacts [12119193578](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082636745/artifacts/12119193578) and [12118969797](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39082636745/artifacts/12118969797) are development outputs; the APK is debug-signed. Decompression-bomb scale, publisher trust/feed, activation UI, and device verification remain open.


### Native share bridge input bound — 2026-10-18

WP02/R027 hardening now rejects unsupported share-image data URLs and payloads exceeding the 15 MiB decoded-image budget before Base64 decoding; share titles are capped at 240 characters. Unit tests cover accepted boundaries, over-limit payloads, unsupported MIME types and oversized titles. Hosted Android pilot run [39083638168](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39083638168) passed on source `9ef44f1ffe2da57a94554d4f73611a047516a92f`. The run uploaded debug APK artifact [12119168709](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39083638168/artifacts/12119168709) and generated HTML artifact [12119792034](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39083638168/artifacts/12119792034); these are development artifacts, not a production-signed family release. R027 remains open for origin-restricted bridge migration, full baseline resource inventory and device regression.


### High-ratio content archive rejection — 2026-10-18

WP05/R024 now explicitly proves rejection of a highly compressible ZIP entry whose expanded data exceeds the per-entry limit: the fixture asserts a compressed ratio above 100:1 and verifies the staging directory is never created. Pilot run [39083839601](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39083839601) passed on source `90f6ab655ec070b1a11cdc8e50dd740192b0a48f`. Artifacts [12119644017](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39083839601/artifacts/12119644017) (debug APK) and [12120345126](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39083839601/artifacts/12120345126) (generated HTML) are development outputs; the APK is not production-signed. Remaining WP05 work: trusted publisher key/key ID, authenticated feed/downloader, adult activation/catalog UI and on-device activation/rollback checks.
