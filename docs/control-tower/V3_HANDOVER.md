# V3 — Verified recovery handover
Snapshot: 2026-10-19 00:20 UTC | Owner: V3 | Issue: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Adaptive lifecycle policy](ADAPTIVE_SESSION_LIFECYCLE.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7). Re-verify GitHub state on every new session.

## Repository state
- Repo: `chinkk-git/Aariamagickitchen`
- Implementation branch: `codex/v3-completion-core-20261017`; no new branch, no V3.1 edits, no merge.
- Latest observed V3 head: `ea6e83411e3bf62b9780489b56ec395edb1ff75b`
- Session `V3-20261019-0010-UTC` RECOVERY ACK is on Issue #4. Recent comments/commits showed no competing V3 writer.
- New work: `ce050417...` grants scoped runner-group access to ephemeral KVM and verifies acceleration; `c015667...` retains verbose boot diagnostics; `f701c6cc...` preserves structured native profile migration errors for JS fallback; `69a2a11b...` tests the migration error path; `0820eb70...` adds the user-opened, replayable What's New tour; `7f2fdd88...` tests tour copy/controls; `b09929e5...` saves locally if native profile snapshot persistence fails; `ea6e8341...` tests that fallback persistence.
- Earlier branch commits include malformed profile recovery, camera-only picker hardening, and AVD creation/path/ADB fixes.
- [Draft PR #2](https://github.com/chinkk-git/Aariamagickitchen/pull/2) remains open/draft: V3 -> `feature/platform-v3`; no approval or merge.

## Latest CI and artifacts
- Current-head workflow [39179883667](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39179883667) on `ea6e834...` completed success. Passed 95 recipe/ID validation, approved chef art, Android adapter/profile/WebView tests, APK assembly, emulator install/startup/process/crash checks, unsigned-release refusal and artifact uploads.
- Current-head debug APK: [12156330014](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39179883667/artifacts/12156330014), 23,130,321 bytes, artifact zip SHA-256 `ba8acbfae67586b99755f00abc6dfdca5c7269f8a5b69ae421933f58fcb921d7`. Package `com.aaria.magickitchen.pilot`, versionCode 7, versionName 1.0.3. Debug build, not a release candidate.
- Current-head emulator diagnostics: [12156320046](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39179883667/artifacts/12156320046), 26,302 bytes, zip SHA-256 `bf1c020d299fba954b52abb518d54c0b8bb87638a868354aed2076cba6cbc0e1`. Includes verbose emulator boot log, AVD config, memory/CPU/KVM and ADB/boot/app state.
- Current-head HTML: [12155803067](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39179883667/artifacts/12155803067), zip SHA-256 `9c241a3e4e2bff2c38d6d866a9342238f50c2139e24542903f57acfdd6280d99`.
- Emulator evidence: runner memory 15 GiB total / 14 GiB available; scoped /dev/kvm group change to runner; KVM v12 usable; sys.boot_completed=1; ADB install Success; MainActivity Status=ok, LaunchState=COLD, TotalTime=2212 ms; PID retained and no AndroidRuntime fatal exception. Emulator CI only; no physical-device claim.
- Root cause in prior failed emulator logs: /dev/kvm existed as root:kvm mode 0660 but runner lacked access, so x86_64 acceleration failed and ADB stayed empty; memory was sufficient. The scoped permission fix and acceleration check are in current code.
- Prior green KVM-fix run [39179149231](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39179149231). Older signed candidate [39087561238](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39087561238) verifies only source `9f1fdd6345d7b784249504a9838657d26e777e41`, not current-head signing continuity.

## V3 delivery checklist
- V3-01 IN PROGRESS: current-head build provenance/debug artifact verified. Protected current-head signed APK, certificate fingerprint and family-installed signer continuity pending.
- V3-02 PARTIAL: hosted emulator install/startup/process/crash gate verified at current head. Portrait/landscape, Android back, offline startup and physical phone/tablet remain pending.
- V3-03 IN PROGRESS: malformed profile recovery, native migration error fallback, local persistence fallback and profile/native unit tests pass current-head CI. Same-signer APK upgrade and before/after profile-state comparison pending signed candidate/device.
- V3-04/05 IN PROGRESS: signed data-only pack verifier, key ID/signature/hash/version/expiry/anti-replay checks, archive/path limits and atomic rollback implementation/tests exist. Publisher trust-key provisioning and end-to-end signed install, disk-full/interrupted activation evidence remain pending. Missing trusted root fails closed.
- V3-06 BLOCKED: protected release signing access/dispatch and current-head upgrade/signing continuity unavailable. No credentials stored.
- V3-07 PARTIAL: WebView origin/CSP/navigation guards and camera-only request isolation; CI policy tests pass. External navigation/share/camera end-to-end regression pending.
- V3-08 VERIFIED (source/tests/CI): short 3-step EN-GB/pt-BR tour, launched on demand from Home or Settings, Back/Next, Skip/Finish, Escape dismissal and replay; does not interrupt cooking.
- V3-09 IN PROGRESS: 95 recipes/IDs and approved chef art validate in CI. Interactive primary-flow matrix and A08 safety/A09 ages 8–10 accessibility/usability sign-off pending.
- V3-10 IN PROGRESS: independent review/remediation active; final evidence matrix and release review pending.
- NOT CLAIMED: signed current-head release, signer continuity, physical-device verification, end-to-end pack install/disk-full rollback, or final A08/A09 sign-off.

## Session/lifecycle checkpoint
SESSION_ID: V3-20261019-0010-UTC
HEALTH_REVIEW_AT_UTC: 2026-10-19T00:20:00Z
TASKS_OBSERVED: V3-02 emulator root-cause/fix and evidence; V3-03 fallback review/fix/tests; V3-08 tour/test; V3-10 review checkpoint. Best-effort task count only.
TOOL_EVENTS_OBSERVED: UNKNOWN
RESPONSIVENESS: normal
CONTEXT_RELIABILITY: normal
RECOVERY_FRICTION: low; latest SHA, ACK, CI and artifacts recorded
PRESSURE_SCORE: UNKNOWN; activity count unavailable, no full score
CONFIDENCE: medium
DECISION: CONTINUE
CHECKPOINT: READY
BRANCH_HEADS: V3 `ea6e83411e3bf62b9780489b56ec395edb1ff75b`; V3.1 not modified
ISSUES_AND_CI: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4); [current-head run 39179883667](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39179883667)
NEXT: complete signed same-signer/profile upgrade and update/rollback evidence when protected keys/device are available; meanwhile add emulator orientation/back/offline and broader A08/A09/feature checks.
USER_ROTATION_CONFIRMATION: pending (no rotation proposed)

## Next actions
1. Expand emulator acceptance for orientation, back navigation and offline startup while preserving install/process/crash gates.
2. Continue current-branch security/regression review; keep publisher-key, signing and physical-device blockers explicit.
3. Keep V3.1 and integration branches untouched; do not merge.
