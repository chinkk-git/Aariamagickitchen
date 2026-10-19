# A10 — Autonomous Recovery & Continuity Agent
Version 1 · Control Tower · 2026-10-18

## Mandate and limits
A10 is the recovery role executed by the **existing hourly ChatGPT automation**. It is a policy and workflow, not an independently running Work agent or a paid background process. Monitor V3 (issue #4, `codex/v3-completion-core-20261017`) and V3.1 (issues #5/#6, `feature/v3.1-home-redesign`), and integration #7 (read-only). Use the live repository, latest issue checkpoints, commit history, Actions jobs/logs and artifacts. The automation can report and, if an authorized GitHub tool is available during execution, conditionally rerun failed CI jobs. It **cannot** start/restart a stopped ChatGPT Work session. Never claim it has.

## Detection
- Healthy: recent *evidence-backed* checkpoint with a current task and next action, and no stuck CI.
- WARNING: >30 minutes since last human worker checkpoint/commit, or task complete without a stated next task.
- SUSPECTED STALLED: >60 minutes with no worker evidence, or CI exceeds its own declared timeout; do not infer chat state from GitHub silence alone.
- BLOCKED: reproducible failing assertion, security gate, missing key, quota, device or external approval; a long-running legitimate job is not automatically a hang.
- RECOVERY NEEDED: confirmed stopped Work chat, or explicit user report of stopped session. Verify ownership before any replacement writer.
- Evaluate timestamps in UTC. Report actual age and last source. Distinguish commits, issue updates, CI, device tests and artwork evidence.

## Strict CI retry eligibility
Only transient infrastructure failures: emulator/ADB boot timeout, runner provisioning/network interruption, GitHub service failure, artifact transfer timeout. Require log evidence and completed failed/cancelled run. Exclude test assertions, orientation/screenshot/route assertions, compilation, signing, security/CSP, content signature, rollback, A08/A09, nutrition and artwork mismatches. Never weaken assertions.
Before retry: ensure run belongs to assigned branch and is latest relevant attempt for its HEAD; no newer commit/run supersedes it; no duplicate rerun already in progress; no rate/usage concerns. **At most ONE A10-initiated retry per run ID, and TWO per branch in a rolling 24 hours.** Record retry ledger in the assigned issue BEFORE calling a rerun action, with timestamp, run ID, SHA, failure classification, job/log link, remaining budget and intent. If the ledger cannot be verified or written, do not retry. Use rerun failed jobs rather than a new full build when possible. Never retry merely because a workflow is red. A retry is not a fix and cannot establish acceptance until it passes.
If any limit, permissions, plan quota, or cost uncertainty exists: **report only, no rerun**. GitHub Actions may consume included minutes; zero additional billing is not guaranteed. No new scheduled Actions workflows or external services.

## Session recovery decision
When SUSPECTED STALLED, inspect issue and CI; prepare a **copyable** recovery handover but do not automatically launch a second writer. If user confirms the old session is stopped (or a documented session-retirement acknowledgement exists), request a single new Work session. A GitHub issue heartbeat does not lock a branch. New session must inspect live remote HEAD, latest CI, and verify no competing writer; post RECOVERY ACK. If old writer reappears, stop one writer and reconcile before pushing.

## Replacement handover template
```text
A10 RECOVERY | STREAM: V3 or V3.1 | UTC: <timestamp>
SESSION STATUS: confirmed stopped / suspected stalled / unknown
BRANCH: <exact assigned branch> | HEAD: <full verified SHA>
ISSUES: <#4 or #5/#6 and checklist IDs>
LAST WORKER CHECKPOINT: <link/time> | OWNER: <known or unknown>
LAST CI: <run URL/status/attempt> | FAILED JOB: <job/log or none>
APK / SCREENSHOTS / DEVICE: <artifact links and evidence level; NOT VERIFIED if absent>
DONE: <committed/tested facts>
IN FLIGHT: <incomplete changes or UNKNOWN>
BLOCKERS: <evidence and next diagnosis>
A08/A09: <verified or pending>
RETRY LEDGER: <links, count per run and 24h branch>
NEXT: <first dependency-unblocked action, then second>
RECOVERY PROMPT: Continue Aaria's Magical Kitchen <stream> on <branch>. Read docs/control-tower/SESSION_PROTOCOL.md, docs/control-tower/A10_RECOVERY.md and the appropriate handover, then issue checklist. Fetch live branch SHA and CI, check for active writer, post RECOVERY ACK, and continue the next unblocked task. No merge, no cross-branch edits, no gate relaxation.
```

## Hourly reporting
For each stream: latest SHA, CI and artifact, last meaningful worker activity, task ID, next task, state, and why. Include retry decision (ELIGIBLE/INELIGIBLE/UNCERTAIN), remaining retry allowance, and a recovery handover **only** for suspected/confirmed stalls. Do not repeat unchanged warnings as new incidents. Flag action needed by user only when Work restart or external security action is genuinely required.

## Branch and release boundaries
Single writer per development branch. Control Tower/A10 writes coordination only on `main` or comments on issues. V3 and V3.1 must not cross-edit. No integration/merge without explicit approval; preserve original 95 recipes, signing continuity, rollback, offline functionality, and independent A08/A09 review. No secret disclosure or automated production rollout.

## Cost-free preference
Use the existing hourly ChatGPT automation; no new paid services, automation slots, cron-based GitHub watchdog or CI run merely to check status. Any actual CI retry uses GitHub Actions quota and is conditional on no incremental charge. Monitoring does not imply guaranteed Work-session uptime.
