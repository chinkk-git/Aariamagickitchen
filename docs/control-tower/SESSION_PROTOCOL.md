# Control Tower — Short-Session Execution and Recovery Protocol
Version 1 | 2026-10-18 | Coordination branch: main

## Goal and authority
Work conversations are **ephemeral execution sessions**. GitHub code, issues, the [coordination protocol](../CONTROL_TOWER_PROTOCOL.md), and these handovers are the durable record. Never assume that a new session knows the old conversation. GitHub files cannot themselves wake, monitor, close, or restart ChatGPT Work sessions. "Automatic" checkpoints below mean instructions the **active Work agent executes** at task boundaries; there is no unattended scheduler or paid runner.

## Ownership and source of truth
- V3: `codex/v3-completion-core-20261017`; [issue #4](https://github.com/chinkk-git/Aariamagickitchen/issues/4); [V3 handover](V3_HANDOVER.md).
- V3.1: `feature/v3.1-home-redesign`; [issues #5](https://github.com/chinkk-git/Aariamagickitchen/issues/5) and [#6](https://github.com/chinkk-git/Aariamagickitchen/issues/6); [V3.1 handover](V31_HANDOVER.md).
- Integration: [issue #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7), dependent on #4, #5 and #6.
- Write coordination files on `main` only; implementation on the assigned existing branch only. Never rewrite another owner's branch or force push.
- A handover's SHA and CI result are **point-in-time snapshots**, not claims about the current live state. Refresh branch head, issue comments and CI before acting.

## START (new or recovered session)
1. Read this file, your handover, the shared coordination protocol, and only your assigned issue(s), relevant plan and code. Do not load the old full chat.
2. Fetch actual branch head, `git status`, open PRs and latest relevant CI; compare with handover SHA. If a mismatch exists, update your understanding before editing.
3. Check for a currently active worker on the same branch via issue comments and recent commits. Post `RECOVERY ACK | SESSION <id> | BRANCH <name> | HEAD <sha> | ISSUE <#> | INTENT <task>`. This is advisory coordination, **not an atomic lock**.
4. If another session is actively writing, do not push: ask Control Tower to confirm the old worker is stopped, or use an explicitly approved separate branch. Never race on a shared branch.
5. Pick one small, dependency-unblocked task. No whole-roadmap task bundles.

## EXECUTE and automatic checkpoints
The active worker MUST checkpoint without waiting for routine approval:
- After each completed issue subtask, significant commit, CI run or newly discovered blocker.
- Before context becomes lengthy, before ending, and at least every ~60–90 minutes of active work where feasible.
- If responses become slow, after ~10–20 substantial tasks, or after 1–2 intensive days, checkpoint and recommend rotation. These are operational heuristics, not platform limits.
Checkpoint procedure: commit coherent tested changes on own branch; never commit credentials or signing keys; push; link commit and CI to issue; update handover on `main` with exact SHA, test evidence, blockers, owner, next one or two actions and timestamp. If a test is not run, write `NOT RUN`, never imply passing. Handover is short (target <= 150 lines); reference external logs rather than pasting them. Update the issue even if a handover write is blocked.

## CHECKPOINT status template (issue comment)
```text
CHECKPOINT | SESSION: <id> | OWNER: V3/V3.1
BRANCH: <branch> | HEAD: <full sha>
ISSUE: #N | STATUS: queued/in-progress/blocked/review/verified
DONE: <specific changes, paths, tests>
CI: <run URL and conclusion, or NOT RUN>
APK/DEVICE: <artifact, install and smoke test, or NOT TESTED>
A08/A09: <evidence or PENDING>
BLOCKERS: <specific items or none>
NEXT: <single executable step>
HANDOVER: docs/control-tower/V3_HANDOVER.md or V31_HANDOVER.md
```

## ROTATE / RECOVER
1. Stop new tasks and finish a safe checkpoint; if the chat is frozen, use GitHub's latest pushed SHA, issue comments and CI instead. Uncommitted chat-local work is not recoverable unless separately persisted.
2. Retire the old session from writing. Do **not** delete it, delete branches, force push, or merge in haste.
3. Start a fresh Work session on the **same assigned branch**, read this protocol and the handover, verify actual GitHub head, post RECOVERY ACK and continue the next eligible issue.
4. If old session resumes unexpectedly, it must stop writing until ownership is clarified. The new session must re-fetch head before every push; never overwrite a newer remote commit.
5. Control Tower audits issue ACK, SHA, CI, dependencies, and device evidence; GitHub evidence is not proof that a chat is healthy or active.

## Gates and cost controls
Preserve all 95 original recipes, child protection A08, child experience A09, offline Android, UK English/pt-BR, signed update/profile/rollback security and approved characters. Do not introduce paid services, scheduled polling, external runners or new GitHub Actions workflows without a quota/cost check. Existing workflows can be run by active Work sessions; GitHub Actions usage may consume included quota. Do not auto-merge or modify signing credentials.
