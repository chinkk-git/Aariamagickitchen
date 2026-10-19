# V3 — Verified recovery handover
Snapshot: 2026-10-19 01:29 UTC | Owner: V3 | Issue: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Adaptive lifecycle policy](ADAPTIVE_SESSION_LIFECYCLE.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7). Re-verify GitHub state on every new session.

## Repository state
- Repo: `chinkk-git/Aariamagickitchen`
- Assigned branch: `codex/v3-completion-core-20261017`. No V3.1 edits or merge.
- Current branch head: `6f8d747713a3dd59291d85f4e27119f20a7f8d1b`; V3-05 lock fix: `2e91aa97a587d1a9f5eef821a4611b2b79b66ca6`; test type correction: `6f8d747713a3dd59291d85f4e27119f20a7f8d1b`. V3-03 SQLite store-recreation test: `6b7fae2ae95c0853915fafc19a29332646fe386c`; profile JS recovery: `5285ab70660f3e7d53febb63465893c475bc4810`. Parent-install guide docs commit: `5eff7b8f5288291fcc32aa437336ce37529549c8`.
- Session `V3-20261019-0148-UTC` posted RECOVERY ACK. Recent Issue #4 comments showed no competing writer.
- App fix `5285ab7`: profile JS now records per-profile native-save-pending IDs, restores a pending local snapshot over stale native initialization, retries persistence at startup/profile activation, and retains/clears the marker based on the result. Regression covers stale native progress/favorites, repeated failure, and eventual recovery.
- Parent guide commit `5eff7b8`: requires a parent/guardian to personally initiate and approve APK installs/updates, clarifies Android's confirmation is not parental evidence, and states no in-app update feed or parent-verification gate exists.
- V3-03 test commit `6b7fae2`: verifies favourites, completed recipes and weekly progress survive closing/recreating the SQLite profile helper; run 39184100139 passed.
- V3-05 commit `2e91aa9`: content asset reads and directory inspection now share the activation monitor, preventing concurrent WebView requests from seeing the brief two-rename gap. Regression holds the monitor, verifies a content read blocks, then reads the active JSON after release. CI green at `6f8d747`.
- Intermediate run `39184565504` failed at Kotlin test compile due to missing inferred InputStream type, not source behavior; test correction in `6f8d747`; final run `39184693683` passed.
- [Draft PR #2](https://github.com/chinkk-git/Aariamagickitchen/pull/2) remains open/draft to `feature/platform-v3`; no merge.

## CI and artifact evidence
- [Run 39184693683](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683) completed success at exact head `6f8d747713a3dd59291d85f4e27119f20a7f8d1b`. Passed Node and Android JVM/WebView tests, including synchronized-reader regression, APK assembly, emulator install/start/offline gate, and unsigned-release refusal.
- [Run 39184565504](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184565504) failed at Kotlin test compilation because the test result type was not explicit; APK/emulator skipped. Corrected and re-run successfully.
- Prior [run 39184100139](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184100139) also passed at `6b7fae2`, including SQLite store recreation persistence.
- Runtime fix `5285ab7` also passed in run 39183621624.
- Passed: 95-recipe/ID and approved artwork checks; profile adapter and failed-native-save recovery regression; Android JVM/WebView tests; APK assembly; strict install/launch emulator gate; unsigned-release refusal; all artifact uploads.
- APK artifact [12157946161](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683/artifacts/12157946161), 23,130,754 bytes, artifact ZIP SHA-256 `43c014d01ccdece43a245bceb69ba5d8c40a0f1bf01f50addc36839d8b5abbb0`. Package `com.aaria.magickitchen.pilot`, versionCode 7, versionName 1.0.3. Debug-signed; not a signed release candidate.
- HTML artifact [12157951118](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683/artifacts/12157951118), ZIP digest `e41e92d4cefd80c08fa347adfc1b77d1b365ff655267130e982e0353990ac88b`.
- Emulator diagnostics [12157941182](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683/artifacts/12157941182), ZIP digest `a27cfb6f8c7dc1104022fd2b3e3706441e5d60cfc61f87cf9336087d6072a658`.
- Emulator at source SHA `6f8d747`: adb install Success; MainActivity Status=ok, LaunchState=COLD; Android Back returned to Nexus Launcher; airplane mode state=1; after force-stop, offline MainActivity Status=ok, LaunchState=COLD. All workflow steps passed. This is fresh install/start evidence, **not** a signed upgrade, profile before/after migration comparison, or physical-device test.
- Previous emulator root cause was runner denied access to /dev/kvm (root:kvm 0660); ephemeral runner-group permission and accel-check fixed it. Old protected broadcast and strict-pipefail test harness issues are corrected.

## Delivery checklist
- V3-01 IN PROGRESS: installable debug APK and provenance current; signed current-head candidate/fingerprint/same-signer continuity blocked on protected signing access and dispatch.
- V3-02 VERIFIED in hosted emulator at source `6f8d747`; physical phone/tablet and visual layout remain.
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
HEALTH_REVIEW_AT_UTC: 2026-10-19T01:29:00Z
TASKS_OBSERVED: V3-03 recovery defect/test/CI and SQLite reopen; V3-05 activation-reader race review/fix/test/CI; V3-06 parent guide; V3-01/02 evidence; V3-10 checkpoints. Best-effort count.
TOOL_EVENTS_OBSERVED: >50 observed external tool events (best-effort estimate; exact count unknown)
RESPONSIVENESS: normal
CONTEXT_RELIABILITY: normal
RECOVERY_FRICTION: low; ACK, exact branch SHA, green code CI, artifact and issue checkpoint recorded
PRESSURE_SCORE: lower bound ~12 (4 substantial tasks estimated; >50 events; responsiveness/context/recovery factors 0; heuristic only)
CONFIDENCE: medium
DECISION: PREPARE (observed activity threshold reached; no active degradation)
CHECKPOINT: READY
BRANCH_HEADS: V3 `6f8d747713a3dd59291d85f4e27119f20a7f8d1b`; V3.1 untouched
ISSUES_AND_CI: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4); [green run 39184693683](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39184693683)
NEXT: continue V3-04/05 and V3-07–09 source/test review that does not depend on secrets or physical devices.
USER_ROTATION_CONFIRMATION: pending (no rotation proposed)

## Next actions
1. Continue independent V3-04/05 rollback/signature review and document any concrete defect with focused tests.
2. Keep protected signing, publisher trust root, physical device, parent-supervised installation and A08/A09 sign-off as explicit open gates.
3. Preserve V3.1/integration branches; no merge.
