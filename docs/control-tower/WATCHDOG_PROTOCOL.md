# Aaria Delivery Watchdog & Recovery Protocol

## Scope
GitHub Actions workflow `.github/workflows/delivery-watchdog.yml` on `main` runs at minutes 07 and 37 each hour (GitHub cron may be delayed). It monitors V3 issue #4 and branch `codex/v3-completion-core-20261017`, and V3.1 issue #5 and branch `feature/v3.1-home-redesign`. It creates one issue titled `[Control Tower] Automated V3 / V3.1 session health` and updates one bot comment, avoiding notification spam.

## Signals
A commit or human issue comment is a heartbeat, **not** proof that a ChatGPT Work session is alive. Age <=30 minutes is ACTIVE, 31–60 WARNING, >60 STALLED. An in-progress CI run older than 45 minutes is also STALLED; investigate the actual workflow's configured timeout before cancellation. Latest run status/conclusion is shown independently. GitHub Actions scheduling may be delayed; thresholds are operational triage, not SLAs.

## Required worker loop
1. Read assigned issue checklist and latest branch/handover. Keep one writer per branch.
2. Choose highest-priority unblocked task; implement, test and preserve strict gates.
3. After a meaningful milestone or failure, comment with session ID, task IDs/status, SHA, CI link, artifact IDs, verified versus pending evidence, blocker and next two actions. During long work, send an evidence-backed checkpoint about every 30 minutes.
4. Immediately start the next unblocked task. If CI or signing blocks one task, switch to independent work in the same assigned branch.
5. Before session exhaustion, update handover and issue with exact recovery command and work-in-progress status.

## Escalation
WARNING: worker posts checkpoint or records why CI/artwork takes longer. STALLED: inspect CI/logs, verify whether the Work chat is actually still running; if stopped, start **one** replacement Work session using the issue/handover, never two writers on one branch. Monitoring cannot autonomously restart a Work session. Signing keys, protected releases, publisher trust and physical-device actions remain genuine external blockers.

## Guardrails
No watchdog branch edits, merges, production cutover, signing-key exposure, automated acceptance declarations or relaxation of screenshot, security, A08/A09 gates. V3 and V3.1 remain isolated; integration Issue #7 requires explicit user authorization. The existing Friday automation remains the consolidated management review. Monitor GitHub Actions minutes and disable or reduce frequency if needed.
