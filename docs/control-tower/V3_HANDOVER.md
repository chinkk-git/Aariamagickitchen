# V3 — Verified recovery handover
Snapshot: 2026-10-19 01:24 UTC | Owner: V3 | Issue: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Adaptive lifecycle policy](ADAPTIVE_SESSION_LIFECYCLE.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7). Re-verify GitHub state on every new session.

## Repository state
- Repo: `chinkk-git/Aariamagickitchen`
- Assigned branch: `codex/v3-completion-core-20261017`. No V3.1 edits or merge.
- Current branch head: `6f8d747713a3dd59291d85f4e27119f20a7f8d1b`; V3-05 lock fix: `2e91aa97a587d1a9f5eef821a4611b2b79b66ca6`; latest commit corrects the test's explicit InputStream type after CI compilation failure. V3-03 SQLite store-recreation test: `6b7fae2ae95c0853915fafc19a29332646fe386c`; profile JS recovery: `5285ab70660f3e7d53febb63465893c475bc4810`. Parent-install guide docs commit: `5eff7b8f5288291fcc32aa437336ce37529549c8`.
- Session `V3-20261019-0148-UTC` posted RECOVERY ACK. Recent Issue #4 comments showed no competing writer.
- App fix `5285ab7`: profile JS now records per-profile native-save-pending IDs, restores a pending local snapshot over stale native initialization, retries persistence at startup/profile activation, and retains/clears the marker based on the result. Regression covers stale native progress/favorites, repeated failure, and eventual recovery.
- Parent guide commit `5eff7b8`: requires a parent/guardian to personally initiate and approve APK installs/updates, clarifies Android's confirmation is not parental evidence, and states no in-app update feed or parent-verification gate exists.
- V3-03 test commit `6b7fae2`: verifies favourites, completed recipes and weekly progress survive closing/recreating the SQLite profile helper; run 39184100139 passed.
- V3-05 commit `2e91aa9`: content asset reads and directory inspection now use the same repository monitor held across activation, preventing concurrent WebView requests from seeing the brief two-rename gap. First test compile failed because the executor result type was inferred too broadly; test-only correction `6f8d747` explicitly sets InputStream; rerun pending.
- [Draft PR #2](https://github.com/chinkk-git/Aariamagickitchen/pull/2) remains open/draft to `feature/platform-v3`; no merge.

## CI and artifact evidence
- [Run 39184693683](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683) is queued at current branch head `6f8d747713a3dd59291d85f4e27119f20a7f8d1b`.
- [Run 39184565504](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184565504) failed at Kotlin test compilation (unresolved nullable InputStream type in test); APK/emulator steps skipped. The test typing correction is in the queued commit.
- Prior [run 39184100139](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184100139) completed success at `6b7fae2ae95c0853915fafc19a29332646fe386c`, including profile DB recreation, APK, emulator gate and unsigned-release refusal.
- Runtime fix `5285ab7` also passed in run 39183621624.
- Passed: 95-recipe/ID and approved artwork checks; profile adapter and failed-native-save recovery regression; Android JVM/WebView tests; APK assembly; strict install/launch emulator gate; unsigned-release refusal; all artifact uploads.
- Last green APK artifact [12157112487](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184100139/artifacts/12157112487), 23,130,691 bytes, artifact ZIP SHA-256 `709729e7250e8d5609feb41a541e6ba17ce4d33ef01bef844f54bb6b749aa711`. Package `com.aaria.magickitchen.pilot`, versionCode 7, versionName 1.0.3. Debug-signed; not a signed release candidate and built before V3-05 lock change.
- HTML artifact [12157411704](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184100139/artifacts/12157411704), ZIP digest `c6d9a9bd1c756069ad5e7742b00bd4008435491c2692062099b5ebc595511cc9`.
- Emulator diagnostics [12157152285](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184100139/artifacts/12157152285), ZIP digest `c045e31a8b6c6fdb805752b136a0cf4384f2072384d7a3e32fd901f66b04bc7f`.
- Emulator at source SHA `6b7fae2`: adb install Success; MainActivity Status=ok, LaunchState=COLD; Android Back returned to Nexus Launcher; airplane mode state=1; after force-stop, offline MainActivity Status=ok, LaunchState=COLD. All workflow steps passed. This is fresh install/start evidence, **not** a signed upgrade, profile before/after migration comparison, or physical-device test.
- Previous emulator root cause was runner denied access to /dev/kvm (root:kvm 0660); ephemeral runner-group permission and accel-check fixed it. Old protected broadcast and strict-pipefail test harness issues are corrected.

## Delivery checklist
- V3-01 IN PROGRESS: installable debug APK and provenance current; signed current-head candidate/fingerprint/same-signer continuity blocked on protected signing access and dispatch.
- V3-02 VERIFIED in hosted emulator for source `6b7fae2`; V3-05 new-head rerun pending. Physical phone/tablet and visual layout remain.
- V3-03 IN PROGRESS: legacy Aaria idempotency/malformed recovery, two-profile isolation, favorites/progress, native failure fallback/recovery tests pass CI. Real same-signer upgrade and before/after installed-profile state comparison pending signed APK/device.
- V3-04 IN PROGRESS: content signature/key-ID/hash/app-version/expiry/anti-replay/data-only/path/size tests exist; trust-root absence fails closed. Publisher key/ID provisioning and signed install pending.
- V3-05 IN PROGRESS: staged activation, monotonic version commit, rollback and startup recovery tests exist; monitor serialization prevents concurrent reads across activation. Run 39184565504 failed in test compilation; test typing fix awaits run 39184693683. Disk-full/process-death filesystem/device evidence pending.
- V3-06 BLOCKED: protected signing access/dispatch, signer continuity and parent-supervised update evidence unavailable. Parent-install guide is explicit; no app-level parent verification or update feed.
- V3-07 PARTIAL: origin/CSP/navigation and camera-only picker guards pass tests; interactive external navigation/share/camera matrix pending.
- V3-08 VERIFIED source/test/CI at `6b7fae2`: user-opened, skippable/replayable EN-GB/pt-BR tour; no cooking interruption.
- V3-09 IN PROGRESS: 95 recipes/art and core CI pass; full primary-flow matrix, A08 child-safety review and A09 ages 8–10 usability/accessibility sign-off pending.
- V3-10 IN PROGRESS: independent review and complete evidence matrix remain.
- Not claimed: current-head signed APK, signer continuity, same-signer upgrade, physical-device test, signed publisher pack install, disk-full rollback, final A08/A09 signoff.

## Session/lifecycle checkpoint
SESSION_ID: V3-20261019-0148-UTC
HEALTH_REVIEW_AT_UTC: 2026-10-19T01:24:00Z
TASKS_OBSERVED: V3-03 recovery defect/test/CI and SQLite reopen; V3-05 activation-reader race review/fix/test; V3-06 parent guide; V3-01/02 evidence; V3-10 checkpoints. Best-effort count.
TOOL_EVENTS_OBSERVED: UNKNOWN
RESPONSIVENESS: normal
CONTEXT_RELIABILITY: normal
RECOVERY_FRICTION: low; ACK, exact branch SHA, green code CI, artifact and issue checkpoint recorded
PRESSURE_SCORE: UNKNOWN (event counter unavailable)
CONFIDENCE: medium
DECISION: CONTINUE
CHECKPOINT: READY
BRANCH_HEADS: V3 `6f8d747713a3dd59291d85f4e27119f20a7f8d1b`; V3.1 untouched
ISSUES_AND_CI: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4); [queued run 39184693683](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683)
NEXT: inspect run 39184693683; then continue V3-04/05 and V3-07–09 source/test review that does not depend on secrets or physical devices.
USER_ROTATION_CONFIRMATION: pending (no rotation proposed)

## Next actions
1. Continue independent V3-04/05 rollback/signature review and document any concrete defect with focused tests.
2. Keep protected signing, publisher trust root, physical device, parent-supervised installation and A08/A09 sign-off as explicit open gates.
3. Preserve V3.1/integration branches; no merge.
