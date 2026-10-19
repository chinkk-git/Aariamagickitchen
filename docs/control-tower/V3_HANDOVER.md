# V3 — Verified recovery handover
Snapshot: 2026-10-19 01:12 UTC | Owner: V3 | Issue: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Adaptive lifecycle policy](ADAPTIVE_SESSION_LIFECYCLE.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7). Re-verify GitHub state on every new session.

## Repository state
- Repo: `chinkk-git/Aariamagickitchen`
- Assigned branch: `codex/v3-completion-core-20261017`. No V3.1 edits or merge.
- Current branch head: `5eff7b8f5288291fcc32aa437336ce37529549c8` (parent-install guide documentation only); latest app code: `5285ab70660f3e7d53febb63465893c475bc4810`.
- Session `V3-20261019-0148-UTC` posted RECOVERY ACK. Recent Issue #4 comments showed no competing writer.
- App fix `5285ab7`: profile JS now records per-profile native-save-pending IDs, restores a pending local snapshot over stale native initialization, retries persistence at startup/profile activation, and retains/clears the marker based on the result. Regression covers stale native progress/favorites, repeated failure, and eventual recovery.
- Parent guide commit `5eff7b8`: requires a parent/guardian to personally initiate and approve APK installs/updates, clarifies Android's confirmation is not parental evidence, and states no in-app update feed or parent-verification gate exists.
- [Draft PR #2](https://github.com/chinkk-git/Aariamagickitchen/pull/2) remains open/draft to `feature/platform-v3`; no merge.

## CI and artifact evidence
- [Workflow run 39183621624](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39183621624) completed success on app-code SHA `5285ab70660f3e7d53febb63465893c475bc4810`. Branch head then advanced only by doc commit `5eff7b8`; android-pilot path filters exclude that doc.
- Passed: 95-recipe/ID and approved artwork checks; profile adapter and failed-native-save recovery regression; Android JVM/WebView tests; APK assembly; strict install/launch emulator gate; unsigned-release refusal; all artifact uploads.
- APK artifact [12157382105](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39183621624/artifacts/12157382105), 23,130,686 bytes, artifact ZIP SHA-256 `a80d5e70cd5cef030912a820a4fe62e0c6c79c77bbeaa6e6b1777699a84c644b`. Package `com.aaria.magickitchen.pilot`, versionCode 7, versionName 1.0.3. Debug-signed; not a signed release candidate.
- HTML artifact [12157765144](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39183621624/artifacts/12157765144), ZIP digest `b2a25f5d136b1c139e2bbaf0d03be4e8fd7cf7c1c4a2959d7732d69b57bb5cd5`.
- Emulator diagnostics [12157347383](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39183621624/artifacts/12157347383), ZIP digest `17f054e6f5d4c88e50dc23b4e54cae60ec696fc67413daa5d59273cf36406a14`.
- Emulator at app code SHA `5285ab7`: adb install Success; MainActivity Status=ok, LaunchState=COLD; Android Back returned to Nexus Launcher; airplane mode state=1; after force-stop, offline MainActivity Status=ok, LaunchState=COLD. All workflow steps passed. This is fresh install/start evidence, **not** a signed upgrade, profile before/after migration comparison, or physical-device test.
- Previous emulator root cause was runner denied access to /dev/kvm (root:kvm 0660); ephemeral runner-group permission and accel-check fixed it. Old protected broadcast and strict-pipefail test harness issues are corrected.

## Delivery checklist
- V3-01 IN PROGRESS: installable debug APK and provenance current; signed current-head candidate/fingerprint/same-signer continuity blocked on protected signing access and dispatch.
- V3-02 VERIFIED in hosted emulator for app code `5285ab7`; physical phone/tablet and visual layout remain.
- V3-03 IN PROGRESS: legacy Aaria idempotency/malformed recovery, two-profile isolation, favorites/progress, native failure fallback/recovery tests pass CI. Real same-signer upgrade and before/after installed-profile state comparison pending signed APK/device.
- V3-04 IN PROGRESS: content signature/key-ID/hash/app-version/expiry/anti-replay/data-only/path/size tests exist; trust-root absence fails closed. Publisher key/ID provisioning and signed install pending.
- V3-05 IN PROGRESS: staged activation, monotonic version commit, rollback and startup recovery tests exist; disk-full/process-death filesystem/device evidence pending.
- V3-06 BLOCKED: protected signing access/dispatch, signer continuity and parent-supervised update evidence unavailable. Parent-install guide is explicit; no app-level parent verification or update feed.
- V3-07 PARTIAL: origin/CSP/navigation and camera-only picker guards pass tests; interactive external navigation/share/camera matrix pending.
- V3-08 VERIFIED source/test/CI at `5285ab7`: user-opened, skippable/replayable EN-GB/pt-BR tour; no cooking interruption.
- V3-09 IN PROGRESS: 95 recipes/art and core CI pass; full primary-flow matrix, A08 child-safety review and A09 ages 8–10 usability/accessibility sign-off pending.
- V3-10 IN PROGRESS: independent review and complete evidence matrix remain.
- Not claimed: current-head signed APK, signer continuity, same-signer upgrade, physical-device test, signed publisher pack install, disk-full rollback, final A08/A09 signoff.

## Session/lifecycle checkpoint
SESSION_ID: V3-20261019-0148-UTC
HEALTH_REVIEW_AT_UTC: 2026-10-19T01:12:00Z
TASKS_OBSERVED: V3-03 recovery defect/test/CI; V3-06 parent guide; V3-01/02 artifact and emulator evidence review; V3-10 checkpoint. Best-effort count.
TOOL_EVENTS_OBSERVED: UNKNOWN
RESPONSIVENESS: normal
CONTEXT_RELIABILITY: normal
RECOVERY_FRICTION: low; ACK, exact branch SHA, green code CI, artifact and issue checkpoint recorded
PRESSURE_SCORE: UNKNOWN (event counter unavailable)
CONFIDENCE: medium
DECISION: CONTINUE
CHECKPOINT: READY
BRANCH_HEADS: V3 `5eff7b8f5288291fcc32aa437336ce37529549c8`; V3.1 untouched
ISSUES_AND_CI: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4); [run 39183621624](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39183621624)
NEXT: continue V3-04/05 and V3-07–09 source/test review that does not depend on secrets or physical devices.
USER_ROTATION_CONFIRMATION: pending (no rotation proposed)

## Next actions
1. Continue independent V3-04/05 rollback/signature review and document any concrete defect with focused tests.
2. Keep protected signing, publisher trust root, physical device, parent-supervised installation and A08/A09 sign-off as explicit open gates.
3. Preserve V3.1/integration branches; no merge.
