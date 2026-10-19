# V3 — Verified recovery handover
Snapshot: 2026-10-19 | Owner: V3 | Issue: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Adaptive lifecycle policy](ADAPTIVE_SESSION_LIFECYCLE.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7). Re-verify GitHub state on every new session.

## Repository state
- Repo: `chinkk-git/Aariamagickitchen`
- Assigned branch: `codex/v3-completion-core-20261017`. No V3.1 edits or merge.
- Current branch head: `e3f2cd7f58b173de60b6a5f9a7915149d6759e80`; new V3-03 same-signer debug upgrade CI gate added. V3-05 lock fix `2e91aa97a587d1a9f5eef821a4611b2b79b66ca6` and test type correction `6f8d747713a3dd59291d85f4e27119f20a7f8d1b`; SQLite reopen test `6b7fae2ae95c0853915fafc19a29332646fe386c`; profile JS recovery `5285ab70660f3e7d53febb63465893c475bc4810`. Parent-install guide docs commit: `5eff7b8f5288291fcc32aa437336ce37529549c8`.
- Session `V3-20261019-0148-UTC` posted RECOVERY ACK. Recent Issue #4 comments showed no competing writer.
- App fix `5285ab7`: profile JS now records per-profile native-save-pending IDs, restores a pending local snapshot over stale native initialization, retries persistence at startup/profile activation, and retains/clears the marker based on the result. Regression covers stale native progress/favorites, repeated failure, and eventual recovery.
- Parent guide commit `5eff7b8`: requires a parent/guardian to personally initiate and approve APK installs/updates, clarifies Android's confirmation is not parental evidence, and states no in-app update feed or parent-verification gate exists.
- V3-03 test commit `6b7fae2`: verifies favourites, completed recipes and weekly progress survive closing/recreating the SQLite profile helper; run 39184100139 passed.
- V3-05 commit `2e91aa9`: content asset reads and directory inspection now share the activation monitor; regression passed in run `39184693683`.
- V3-03 commit `e3f2cd7`: pilot workflow now builds lower-version v6/v7 debug APK pair with same signer in one job, seeds app-private profile DB, checks upgrade install/start and before/after favorites/progress, then retains existing fresh-install emulator gate. Run `39185263015` pending. This is debug emulator evidence only; not previous production APK or release signer proof.
- Intermediate run `39184565504` failed at Kotlin test compile due to missing inferred InputStream type, not source behavior; test correction in `6f8d747`; final run `39184693683` passed.
- [Draft PR #2](https://github.com/chinkk-git/Aariamagickitchen/pull/2) remains open/draft to `feature/platform-v3`; no merge.

## CI and artifact evidence
- [Run 39185263015](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39185263015) queued at current head `e3f2cd7f58b173de60b6a5f9a7915149d6759e80`; same-signer v6→v7 debug upgrade/profile comparison gate pending.
- Prior [run 39184693683](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683) completed success at `6f8d747`, including synchronized-reader regression, APK assembly, emulator install/start/offline gate, and unsigned-release refusal.
- [Run 39184565504](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184565504) failed at Kotlin test compilation because the test result type was not explicit; APK/emulator skipped. Corrected and re-run successfully.
- Prior [run 39184100139](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184100139) also passed at `6b7fae2`, including SQLite store recreation persistence.
- Runtime fix `5285ab7` also passed in run 39183621624.
- Passed: 95-recipe/ID and approved artwork checks; profile adapter and failed-native-save recovery regression; Android JVM/WebView tests; APK assembly; strict install/launch emulator gate; unsigned-release refusal; all artifact uploads.
- Last green APK artifact [12157946161](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683/artifacts/12157946161), 23,130,754 bytes, artifact ZIP SHA-256 `43c014d01ccdece43a245bceb69ba5d8c40a0f1bf01f50addc36839d8b5abbb0`. Package `com.aaria.magickitchen.pilot`, versionCode 7, versionName 1.0.3. Debug-signed; not a signed release candidate; built before v6→v7 upgrade gate.
- HTML artifact [12157951118](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683/artifacts/12157951118), ZIP digest `e41e92d4cefd80c08fa347adfc1b77d1b365ff655267130e982e0353990ac88b`.
- Emulator diagnostics [12157941182](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683/artifacts/12157941182), ZIP digest `a27cfb6f8c7dc1104022fd2b3e3706441e5d60cfc61f87cf9336087d6072a658`.
- Emulator at source SHA `6f8d747`: adb install Success; MainActivity Status=ok, LaunchState=COLD; Android Back returned to Nexus Launcher; airplane mode state=1; after force-stop, offline MainActivity Status=ok, LaunchState=COLD. All workflow steps passed. This is fresh install/start evidence, **not** a signed upgrade, profile before/after migration comparison, or physical-device test.
- Previous emulator root cause was runner denied access to /dev/kvm (root:kvm 0660); ephemeral runner-group permission and accel-check fixed it. Old protected broadcast and strict-pipefail test harness issues are corrected.

## Delivery checklist
- V3-01 IN PROGRESS: installable debug APK and provenance current; signed current-head candidate/fingerprint/same-signer continuity blocked on protected signing access and dispatch.
- V3-02 VERIFIED in hosted emulator at source `6f8d747`; new workflow's fresh install rerun pending after upgrade gate. Physical phone/tablet and visual layout remain.
- V3-03 IN PROGRESS: legacy Aaria idempotency/malformed recovery, two-profile isolation, favorites/progress, native failure fallback/recovery tests pass CI. Real same-signer upgrade and before/after installed-profile state comparison pending signed APK/device.
- V3-04 IN PROGRESS: content signature/key-ID/hash/app-version/expiry/anti-replay/data-only/path/size tests exist; trust-root absence fails closed. Publisher key/ID provisioning and signed install pending.
- V3-05 IN PROGRESS: staged activation, monotonic version commit, rollback, startup recovery and concurrent-reader serialization tests pass run `39184693683`; disk-full/process-death filesystem/device evidence pending.
- V3-06 BLOCKED: protected signing access/dispatch, signer continuity and parent-supervised update evidence unavailable. Parent-install guide is explicit; no app-level parent verification or update feed.
- V3-07 PARTIAL: origin/CSP/navigation and camera-only picker guards pass tests; interactive external navigation/share/camera matrix pending.
- V3-08 VERIFIED source/test/CI at `6b7fae2`: user-opened, skippable/replayable EN-GB/pt-BR tour; no cooking interruption.
- V3-09 IN PROGRESS: 95 recipes/art and core CI pass; full primary-flow matrix, A08 child-safety review and A09 ages 8–10 usability/accessibility sign-off pending.
- V3-10 IN PROGRESS: independent review and complete evidence matrix remain.
- Not claimed: current-head signed APK, signer continuity, same-signer upgrade, physical-device test, signed publisher pack install, disk-full rollback, final A08/A09 signoff.

## Session/lifecycle checkpoint
SESSION_ID: V3-20261019-0148-UTC
HEALTH_REVIEW_AT_UTC: 2026-10-19T01:33:00Z
TASKS_OBSERVED: V3-03 profile persistence and generated same-signer upgrade CI gate; V3-05 activation reader race/fix/CI; V3-06 parent guide; V3-01/02 evidence; V3-10 checkpoints. Best-effort count.
TOOL_EVENTS_OBSERVED: >50 observed external tool events (best-effort estimate; exact count unknown)
RESPONSIVENESS: normal
CONTEXT_RELIABILITY: normal
RECOVERY_FRICTION: low; ACK, exact branch SHA, green code CI, artifact and issue checkpoint recorded
PRESSURE_SCORE: lower bound ~12 (4 substantial tasks estimated; >50 events; responsiveness/context/recovery factors 0; heuristic only)
CONFIDENCE: medium
DECISION: PREPARE (observed activity threshold reached; no active degradation)
CHECKPOINT: READY
BRANCH_HEADS: V3 `bf43641a8f06c7d1ef6fcdc93943d40295c00008`; V3.1 untouched
ISSUES_AND_CI: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4); failed signer-gate run [39185263015](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39185263015); follow-up CI/artifact status unavailable through connected run listing
NEXT: obtain exact-head CI/APK/device evidence for the fixed CI-only signer path; then continue independent source/test review.
USER_ROTATION_CONFIRMATION: pending (no rotation proposed)

## Next actions
1. Continue independent V3-04/05 rollback/signature review and document any concrete defect with focused tests.
2. Keep protected signing, publisher trust root, physical device, parent-supervised installation and A08/A09 sign-off as explicit open gates.
3. Preserve V3.1/integration branches; no merge.


## Delivery checkpoint — 2026-10-19 follow-up

- V3 branch head: `bf43641a8f06c7d1ef6fcdc93943d40295c00008`. Failed attempt at `e3f2cd7f58b173de60b6a5f9a7915149d6759e80`, run 39185263015, stopped before install because the v6 fixture/current APK signer comparison failed. Remediation creates one ephemeral CI debug keystore and applies it to both build variants; the keystore path persists across GitHub Actions steps. Run 39186016870 established that both APKs had the same signer SHA-256 (`4ee1f9c41e0935db4f0d4f799bd1ddb902e9c851fae01c26f6057656d6759c96`) but the parser only matched `Signer #1` while apksigner emitted `V2 Signer: certificate`. Commit `bf43641a8f06c7d1ef6fcdc93943d40295c00008` accepts both labels, still requiring exactly one valid 64-hex SHA-256 signer for each APK and exact equality. Earlier certificate reports are retained for evidence. Production signing remains separate and release refusal remains in the workflow.
- The latest known run 39186016870 failed before install at signer extraction; its APK artifact is 12158121396 (failed run only) and diagnostics artifact is 12158445491. A run/artifact for parser-fix head `bf43641a8f06c7d1ef6fcdc93943d40295c00008`, plus emulator before/after evidence, are not surfaced by the connected workflow-run lookup. GitHub compare from last green app-source SHA `6f8d747713a3dd59291d85f4e27119f20a7f8d1b` to this fix head reports only `.github/workflows/android-pilot.yml` modified (five commits ahead, zero behind); no app source or V3.1 files changed. Do not claim v6→v7 upgrade, physical-device acceptance or current-head APK.
- Local checks at the current source: Node suite 12/12; pilot recipe validator pass; artwork verifier pass (47 records/checksums/references); legacy audit enumerates 95 recipes (65/15/15). Previous green Android CI remains run 39184693683 at `6f8d747713a3dd59291d85f4e27119f20a7f8d1b`, artifact 12157946161 (debug APK, 23,130,754 bytes; SHA-256 `43c014d01ccdece43a245bceb69ba5d8c40a0f1bf01f50addc36839d8b5abbb0`), passing hosted emulator fresh install/start, offline cold start and activation concurrency.
- V3-03 is in progress: SQLite migration/idempotency/profile isolation/favorites/progress tests previously green; generated lower-version hosted upgrade plus profile-before/after acceptance pending.
- V3-04/05 logic tests pass; publisher trust root and device-level disk-full/power-loss rollback evidence pending. V3-06 blocked by protected release signer/fingerprint/dispatch and in-app parent confirmation. V3-07 partial; V3-08 verified; V3-09 recipe/art inventory checks pass, A08/A09 review/signoff pending; V3-10 independent review pending.
- Environment checkpoint: GitHub connector offers no push-run listing/dispatch for this branch; browser surface is unauthenticated. No run was fabricated. Continue when exact-head CI evidence becomes available; meanwhile continue only independent safe tests/review.
- Adaptive lifecycle: activity threshold remains reached (>50 observed events), responsiveness/context normal, checkpoint ready, decision PREPARE. Continue from this checkpoint; no branch rotation/merge.

## Latest checkpoint — 2026-10-19 | Session V3-20261019-1223-UTC
- ACK [Issue #4 comment 6267138919](https://github.com/chinkk-git/Aariamagickitchen/issues/4#issuecomment-6267138919); A04 accountable, A07 support, A02 existing writer. No competing writer reported; no V3.1 edits or merge.
- Remote branch `codex/v3-completion-core-20261017` advanced to `075c01418a7bfd4c9994dfcdc75c79785e217651`; this commit adds a Robolectric test proving missing publisher key fails closed without creating content/version state.
- Exact-head CI [39252249021](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39252249021) SUCCESS: Android unit/WebView/recipe/art checks, APK build, emulator acceptance, unsigned-release refusal and uploads passed.
- Same-signer debug fixture v6→v7 passed on hosted emulator; signer SHA-256 `086595e62f0502614d4c2b68e0cd4179dff0c3249314a93e76a4bd12fb043564`; install Success at both versions; cold launches Status=ok; profile assertions passed; airplane-mode offline launch passed. Generated debug fixture only, not historical production APK or physical device.
- APK artifact 12186475950, archive SHA-256 `a817bea6ca1a5dc25b5e148055c42660537c4ab9b17f471737dffe23d428a6b4`, v7 debug APK. Diagnostics 12186103382, SHA-256 `1f410e11f92b4909e8c6705f2a260b8f83aee94b7bb7c918aceea336e1c8dfd1`.
- V3-03 fixture gate PASS; historical migration/device pending. V3-04 absent-key fail-closed test PASS; publisher root/key blocked. V3-05 code tests green; device fault injection pending. V3-06 production signing/in-app parent gate blocked. V3-07 partial; V3-08 verified; V3-09 A08/A09 and full-flow review pending; V3-10 A03 independent review pending.
- Next: continue code-only V3-05/07 regressions; obtain publisher/release inputs, historic APK/device evidence and independent A03/A08/A09 reviews. Issue checkpoint: [6267297953](https://github.com/chinkk-git/Aariamagickitchen/issues/4#issuecomment-6267297953).


## Recovery checkpoint — 2026-10-19 | Session V3-20261019-1534-UTC

- Remote branch `codex/v3-completion-core-20261017` fetched and confirmed at `075c01418a7bfd4c9994dfcdc75c79785e217651`; latest Issue #4 routing identifies A02 as the existing sole branch writer, with no competing writer reported. Recovery ACK: Issue #4 comment 6271031497.
- V3-05 code remediation committed and published as `eb702f49817d94078bf8b8be851bdfa7d4327597`: repository install cleanup now removes the staging path after validation/activation exits; synchronized recovery cleans stale `staged-*` directories while preserving the last-known-good active content. Added Robolectric regression. Local `git diff --check` passed. Gradle tests were not run locally because this checkout has no wrapper and the CLI is unavailable.
- Exact-head Android CI [39279326268](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39279326268) is queued. Current-head APK/emulator evidence is pending. Last exact-head green remains [39252249021](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39252249021) at `075c014`, APK artifact 12186475950, hosted debug-fixture v6→v7 same-signer install/profile persistence and offline cold start passing.
- Open evidence gates: actual historical production APK/profile migration; protected production signing continuity; publisher trust-root provisioning and signed content installation; disk-full/process-death/device rollback injection; in-app parent-confirmed update; physical-device acceptance; interactive WebView/share/camera matrix; complete feature regression; independent A03 review and A08/A09 child-safety/ages-8–10 sign-off.
- No V3.1 edits or merge. Next: inspect exact-head run 39279326268, fix any concrete regression, publish artifact/emulator evidence; continue V3-03..10 only where evidence and external dependencies permit.


## V3-07 follow-up — 2026-10-19 | Session V3-20261019-1534-UTC

- Source review found the camera-only file chooser path could parse and return a URI from Android's generic chooser result when the camera intent was canceled or returned no captured file. Commit `1919d94b44c52f92edab6fa0c24f8dd974dc563a` routes camera requests exclusively through the app-created capture URI after a successful non-empty output; otherwise it returns null. Non-camera picker handling is preserved. Robolectric tests cover canceled-camera fallback rejection, valid capture and normal picker behavior. Previous V3-05 commit `eb702f49817d94078bf8b8be851bdfa7d4327597` reclaims abandoned content staging after failures/recovery while preserving active content.
- V3 head: `1919d94b44c52f92edab6fa0c24f8dd974dc563a`. Exact-head CI [39279688314](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39279688314) queued. V3-05 head run [39279326268](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39279326268) also queued. No current-head APK/emulator artifact yet. Local `git diff --check` passed; Gradle unavailable in this checkout.
- Prior completed exact-head green remains [39252249021](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39252249021), APK artifact 12186475950 and hosted generated debug v6→v7 same-signer upgrade/profile persistence/offline startup. Do not promote this to production signer, historical database migration or physical-device evidence.
- Still open: real production APK/profile migration; protected release-signing continuity; publisher trust-key provisioning; disk-full/process-death rollback injection; parent-confirmed update flow; physical-device acceptance; full WebView/share/camera boundary matrix; A03 independent review; A08/A09 independent safety and 8–10 usability decisions.
- Next: inspect queued exact-head Actions; remediate any source/test failure and publish artifacts/device evidence. No V3.1 edits or merge.
