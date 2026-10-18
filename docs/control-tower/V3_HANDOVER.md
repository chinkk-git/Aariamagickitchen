# V3 — Verified recovery handover
Snapshot: 2026-10-18 UTC | Owner: V3 | Issue: [#4](https://github.com/chinkk-git/Aariamagickitchen/issues/4)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7). Verify GitHub state again on session start.

## Repository state (observed)
- Repo: `chinkk-git/Aariamagickitchen`
- Implementation branch: `codex/v3-completion-core-20261017`
- Latest observed head: `ba24025d27aefc9108f91ddb8076fc0ef2b11b4b`
- Latest commit message: `Add profile-aware artwork for recipes 3 and 4` (2026-10-18 13:40 UTC).
- Latest observed V3 Android CI: [run 39132619157](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39132619157), completed **success** (started 2026-10-18 13:41 UTC). This confirms a workflow conclusion, **not** signed release validation or installation on a physical device.
- Open [draft PR #2](https://github.com/chinkk-git/Aariamagickitchen/pull/2): V3 branch -> `feature/platform-v3`. Not approved/merged.
- Issue #4: open, no ACK or issue comments at snapshot; acceptance criteria still unchecked.
- Relative to V3, V3.1 was 12 commits ahead and 0 behind at snapshot; the V3.1 implementation branch has progressed independently. Recompare before integration.

## Verified vs pending
- VERIFIED: GitHub branch and latest commit exist; Android workflow concluded success; draft PR #2 exists.
- NOT VERIFIED: signed production APK/install, signing key continuity, device smoke tests, profile migration end-to-end, secure content update rollback, all 95 recipe functional tests, A08/A09 final acceptance. Do not infer these from CI success.
- V3 implementation includes profile/artwork and Android security/update-related changes according to prior branch audit; re-open source and tests before asserting complete functionality.

## Immediate next steps (one at a time)
1. RECOVERY ACK issue #4 with session ID and latest head; ensure no old Work worker still pushes to this branch.
2. Audit existing Android CI artifact, signing mode, release/install instructions and failing/untested gates; avoid duplicating prior work.
3. Implement/fix highest-priority missing gate, run CI, post checkpoint with evidence; update this file on `main`.
4. Supply verified stable V3 SHA to integration issue #7 only after required gates; do not merge V3.1 yet.

## Checkpoint fields to replace each rotation
Session ID: NOT STARTED / Branch head: `ba24025d27aefc9108f91ddb8076fc0ef2b11b4b` / Active issue: #4 / CI: success run 39132619157 / APK device: NOT VERIFIED / A08/A09: PENDING / Blockers: verification evidence and worker responsiveness / Next: ACK and audit APK.
