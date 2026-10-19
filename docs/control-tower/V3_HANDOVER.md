# V3 — Verified recovery handover
Snapshot: 2026-10-19 00:42 UTC | Owner: V3 | Issue: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Adaptive lifecycle policy](ADAPTIVE_SESSION_LIFECYCLE.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7). Re-verify GitHub state on every new session.

## Repository state
- Repo: `chinkk-git/Aariamagickitchen`
- Assigned implementation branch: `codex/v3-completion-core-20261017`. Existing branch preserved; no V3.1 changes or merge.
- Latest verified V3 head: `a3e1067c0d4f60845c3ac3621a0feb452dca0bb3`
- Session `V3-20261019-0010-UTC` posted RECOVERY ACK to Issue #4. Inspected recent comments/commits had no competing V3 writer.
- Recent implementation: `ce050417...` scopes /dev/kvm access to ephemeral runner group and requires acceleration; `c015667...` retains verbose emulator diagnostics; `f701c6cc...` preserves structured native profile migration errors for fallback; `69a2a11b...` tests native migration error handling; `0820eb70...` adds user-opened/replayable What's New tour; `7f2fdd88...` tests tour; `b09929e5...` persists local fallback state on failed native save; `ea6e8341...` tests it; `96197f4e...` uses Android connectivity shell API for offline mode; `bc2664ff...` requires force-stopped cold offline launch; `5e63ae6e...` bounds process visibility wait; `a3e1067c...` handles expected empty pidof status under strict shell mode.
- Earlier branch fixes include malformed profile recovery, camera-only picker hardening, AVD setup/path and ADB diagnostics.
- [Draft PR #2](https://github.com/chinkk-git/Aariamagickitchen/pull/2) remains open/draft V3 -> `feature/platform-v3`, not approved or merged.

## Current-head CI and artifacts
- [Workflow run 39181546014](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39181546014) is completed success on the latest head. Passes: 95 recipes/IDs and approved art validation; Android adapter/profile migration/fallback/tour tests; WebView origin policy tests; APK assembly; install/startup/emulator regression; unsigned-release refusal; all artifacts.
- Current APK: [artifact 12156651628](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39181546014/artifacts/12156651628), 23,130,318 bytes, ZIP SHA-256 `f8ec9d965963ca80f01840731ff31b59ceb087e589dfc84176a45add35d785cf`. Package `com.aaria.magickitchen.pilot`, versionCode 7, versionName 1.0.3. Debug APK, not signed release candidate.
- Emulator diagnostics: [artifact 12156601773](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39181546014/artifacts/12156601773), 27,622 bytes, ZIP SHA-256 `d82597da9e3e679fc0154d289af9d376a8fe5df924fbf1e8aa09b1173f166454`. Contains verbose emulator boot log and AVD, memory/CPU, KVM, ADB, orientation/back, airplane mode and startup diagnostics.
- HTML: [artifact 12156601789](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39181546014/artifacts/12156601789), ZIP SHA-256 `1be8a0278d91b2acf4e5d6c69184139547f1066fcb6e73534d7a6c9b9acbfe0b`.
- Emulator evidence: 15 GiB RAM / 14 GiB available; KVM v12 usable after runner-group-only permission adjustment; sys.boot_completed=1; install Success; initial MainActivity Status=ok, LaunchState=COLD, 3032 ms. Portrait/landscape rotation settings were applied while process remained alive. Back returned to Nexus Launcher. With airplane_mode_on=1, am force-stop removed app PID and offline MainActivity cold launch returned Status=ok, LaunchState=COLD, 2456 ms; bounded PID and no-fatal-exception checks passed. Hosted emulator CI only; no physical-device claim.
- The original emulator ADB failure was caused by runner lacking access to existing /dev/kvm (root:kvm 0660), not memory pressure. The protected AIRPLANE_MODE broadcast later failed with Android 15 SecurityException; replaced with connectivity service shell API. Expected no-process pidof under strict pipefail also surfaced and is handled while retaining explicit absence/presence checks.
- Older signed candidate [run 39087561238](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39087561238) verifies only older source `9f1fdd6345d7b784249504a9838657d26e777e41`, not current-head signing.

## Delivery checklist
- V3-01 IN PROGRESS: current-head build provenance and installable debug artifact verified; signed current-head release, certificate fingerprint and family-install signer continuity pending.
- V3-02 VERIFIED IN HOSTED EMULATOR CI: fresh install/start, persistent process/no fatal exception, orientation-setting process smoke, Android Back exit, airplane mode and force-stopped cold offline launch verified. Physical phone/tablet and visual layout checks pending.
- V3-03 IN PROGRESS: malformed recovery, native initialization error fallback and local persistence on native-save failure tested and passing current-head CI. Real same-signer upgrade/profile state before-after comparison pending signed release/device.
- V3-04/05 IN PROGRESS: data-only signed-pack validation, key ID/signature/hash/version/expiry/anti-replay, path/size limits and atomic rollback implementation/tests exist. Publisher key provisioning, signed install and disk-full/interrupted activation device/end-to-end evidence pending; absent trust root fails closed.
- V3-06 BLOCKED: protected release signing access/dispatch and continuity unavailable.
- V3-07 PARTIAL: WebView origin/CSP/navigation policy and camera-only picker boundary tests pass; external navigation/share/camera interaction regression pending.
- V3-08 VERIFIED SOURCE/TEST/CI: short 3-step EN-GB/pt-BR tour, user-opened from Home/Settings, back/next/skip/finish/Escape and replay; does not interrupt cooking.
- V3-09 IN PROGRESS: 95 recipes/IDs and approved art validate in CI. Full interactive primary-flow matrix and A08/A09 sign-off pending.
- V3-10 IN PROGRESS: independent review and targeted remediation continue; release evidence matrix/review pending.
- NOT CLAIMED: signed current-head APK, signer continuity, physical-device verification, full signed-pack disk-full rollback, final A08/A09 sign-off.

## Session/lifecycle checkpoint
SESSION_ID: V3-20261019-0010-UTC
HEALTH_REVIEW_AT_UTC: 2026-10-19T00:42:00Z
TASKS_OBSERVED: V3-02 root cause + emulator gate; V3-03 migration fallback review/tests; V3-08 tour/test; V3-10 evidence checkpoint. Best-effort task-level count.
TOOL_EVENTS_OBSERVED: UNKNOWN
RESPONSIVENESS: normal
CONTEXT_RELIABILITY: normal
RECOVERY_FRICTION: low; ACK, exact branch SHA, current CI and artifacts recorded
PRESSURE_SCORE: UNKNOWN (event counter unavailable)
CONFIDENCE: medium
DECISION: CONTINUE
CHECKPOINT: READY
BRANCH_HEADS: V3 `a3e1067c0d4f60845c3ac3621a0feb452dca0bb3`; V3.1 not modified
ISSUES_AND_CI: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4); [current-head run 39181546014](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39181546014)
NEXT: continue only evidence-backed V3-03..V3-10 work not requiring protected signing, publisher root or physical device.
USER_ROTATION_CONFIRMATION: pending (no rotation proposed)

## Next actions
1. Independently review profile, content-pack rollback and WebView/camera behavior; add focused source/CI tests only for identified gaps.
2. Document signing/publisher/physical device blockers; complete current-head signed upgrade and end-to-end A08/A09 evidence when dependencies are available.
3. Keep V3.1 and integration branches untouched; do not merge.
