# V3 — Verified recovery handover
Snapshot: 2026-10-19 01:06 UTC | Owner: V3 | Issue: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Adaptive lifecycle policy](ADAPTIVE_SESSION_LIFECYCLE.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7). Re-verify GitHub state on every new session.

## Repository state
- Repo: `chinkk-git/Aariamagickitchen`
- Assigned implementation branch: `codex/v3-completion-core-20261017`. Existing branch preserved; no V3.1 changes or merge.
- Latest branch head: `5285ab70660f3e7d53febb63465893c475bc4810`; commit parent `a3e1067c0d4f60845c3ac3621a0feb452dca0bb3`.
- Session `V3-20261019-0148-UTC` posted RECOVERY ACK to Issue #4. Recent Issue #4 comments showed no competing V3 writer.
- New V3-03 change: local snapshot fallback now records per-profile native-save-pending IDs; on next native profile initialization/activation, restore pending local snapshot before display, retry SQLite save, and retain/clear the marker according to retry result. Removed a second localStorage write that discarded the marker. Regression exercises stale native progress/favourites, repeated retry failure and later success.
- [Draft PR #2](https://github.com/chinkk-git/Aariamagickitchen/pull/2) remains open/draft V3 -> `feature/platform-v3`, not approved or merged.

## CI and artifacts
- New-head [run 39183621624](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39183621624) is queued on `5285ab7`; no CI or new-head artifact result yet.
- Local checks on the exact committed files passed: profile isolation regression; `node --check`; V3 transform; 95 recipes/95 IDs; approved Chef A/B source checksums; CSP policy; phase2-pilot Node tests (12/12); recipe validator; artwork validator; `git diff --check`.
- Gradle/Android SDK are not installed in this work runtime; Android unit tests and APK/emulator run are NOT RUN locally. Await hosted CI.
- Last green exact-head CI before this change: [run 39181546014](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39181546014) at `a3e1067`.
- Last available APK artifact: [12156651628](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39181546014/artifacts/12156651628), 23,130,318 bytes, ZIP SHA-256 `f8ec9d965963ca80f01840731ff31b59ceb087e589dfc84176a45add35d785cf`, package `com.aaria.magickitchen.pilot`, versionCode 7, versionName 1.0.3; debug APK, not signed release candidate and built from prior head.
- Prior-head emulator diagnostics [12156601773](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39181546014/artifacts/12156601773) and HTML [12156601789](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39181546014/artifacts/12156601789). Prior evidence: install Success; cold MainActivity launch/status ok; rotation-setting process check; Back to launcher; airplane-mode force-stop then cold offline startup. Hosted emulator only, no physical-device claim. Do not attribute this evidence to `5285ab7` until new CI passes.

## Delivery checklist
- V3-01 IN PROGRESS: provenance and installable debug APK verified at prior head; current-head signed release, fingerprint and same-signer upgrade blocked on protected signing access.
- V3-02 VERIFIED at prior head in hosted emulator CI; current-head rerun pending. Physical phone/tablet and visual layout checks pending.
- V3-03 IN PROGRESS: Aaria migration idempotency, malformed recovery, two-profile isolation, favourites/progress tests exist. New failure-recovery fix at `5285ab7`; hosted CI pending. Real same-signer upgrade and before/after state comparison require signed APK/device.
- V3-04/05 IN PROGRESS: signed manifest/key-ID/hash/expiry/version/replay/data-only/path/size tests and atomic rollback/recovery tests exist. Publisher trust root is absent; signed pack install, disk-full and actual device-crash evidence pending. Fail closed without trust root.
- V3-06 BLOCKED: protected release-signing dispatch/access, signer continuity and parent-confirmed install/update evidence unavailable; parent install guide remains draft.
- V3-07 PARTIAL: WebView origin/CSP/navigation and camera-only picker boundary tests pass; external navigation/share/camera interaction matrix pending.
- V3-08 VERIFIED source/test/CI at prior head: user-opened, skippable/replayable three-step EN-GB/pt-BR tour; no cooking interruption. New-head CI pending.
- V3-09 IN PROGRESS: recipe/art validation passes locally and at prior CI; full primary-flow interaction matrix and A08/A09 review/signoff pending.
- V3-10 IN PROGRESS: independent review and evidence matrix remain.
- NOT CLAIMED: signed current-head APK, signer continuity, physical-device verification, current-head emulator pass, full disk-full rollback proof, final A08/A09 signoff.

## Session/lifecycle checkpoint
SESSION_ID: V3-20261019-0148-UTC
HEALTH_REVIEW_AT_UTC: 2026-10-19T01:06:00Z
TASKS_OBSERVED: branch recovery; V3-03 defect review/fix/test/checkpoint. Best-effort task-level count.
TOOL_EVENTS_OBSERVED: UNKNOWN
RESPONSIVENESS: normal
CONTEXT_RELIABILITY: normal
RECOVERY_FRICTION: low; ACK, exact branch SHA, issue checkpoint, queued CI and local tests recorded
PRESSURE_SCORE: UNKNOWN (event counter unavailable)
CONFIDENCE: medium
DECISION: CONTINUE
CHECKPOINT: READY
BRANCH_HEADS: V3 `5285ab70660f3e7d53febb63465893c475bc4810`; V3.1 not modified
ISSUES_AND_CI: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4); [new-head run 39183621624](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39183621624)
NEXT: inspect new-head CI; continue V3-04/05 tests and parent install guide review without weakening signer or publisher trust.
USER_ROTATION_CONFIRMATION: pending (no rotation proposed)

## Next actions
1. Inspect [run 39183621624](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39183621624); record exact-head test, APK and emulator results.
2. Continue focused V3-04/05 security and recovery review; keep signing, publisher-key, physical device, parent confirmation and A08/A09 gaps visible.
3. Keep V3.1 and integration branches untouched; do not merge.
