# Permanent CI polling circuit breaker

**Scope:** all Work executions, Control Tower orchestration, and worker tasks in this repository that inspect GitHub Actions. This policy prevents repeated status checks from consuming execution time or producing endless wait loops. It uses existing tools only and adds no paid service.

## Per-run execution budget

- Track a separate budget for every workflow run ID in each Work execution.
- Make no more than **3 status reads per run** in that execution. A status read is any request that retrieves workflow-run status or job status. Do not fetch an identical job/status result in consecutive calls.
- Make no more than **12 GitHub Actions API calls per run per Work execution** total, counting status, jobs, steps, logs, artifacts, artifact downloads and reruns. The one required Issue #40 handover is outside this Actions API budget.
- Never cancel an authorized run merely because the current execution is ending. Never rerun a workflow unless expressly authorized and the existing free/cost gates permit it.

## Poll and progress rules

1. Start with one read-only status check and record run ID, exact head SHA, status/conclusion, `updated_at`, and any progress data already returned.
2. Do not busy-wait, loop, or immediately repeat a status or jobs request. If delayed checks are supported, use at most two additional reads with backoff of at least 5 minutes then 15 minutes. State why each read is needed. If scheduling/delayed checks are unavailable, end the execution in `WAITING_FOR_CI`; do not sleep in a loop.
3. Compare status and progress signatures (active job/step, completed job count, timestamps, artifact state). If the signature is unchanged across two observations, or the run has no meaningful update for 15 minutes, detect no progress and stop polling. A merely `in_progress` status is not a reason to change code.
4. On a terminal run state, inspect jobs once and artifacts once, within the remaining call budget. Perform bounded acceptance QA against the exact head. Correct only a demonstrated failure, and any new source head requires a new run and a fresh per-run budget.

## Required state and handover

When the run remains active, no progress is detected, or the bounded budget is exhausted, set the work state to **`WAITING_FOR_CI`** and end the current Work execution. Do not leave the agent waiting or call status again in this execution. Publish one concise handover to Issue #40 containing:

- Exact run ID and workflow URL; exact run head SHA; last observed status, conclusion if any, and observation time.
- Last known progress signature and whether no progress was detected.
- Acceptance checks still outstanding, plus artifacts/screenshots not yet available.
- Calls/read budget used and any cost or authorization blockers.
- A clear next resume instruction: start a new Work execution only after a terminal CI event or explicit owner instruction; first reconcile branch HEAD before reading status.

If the run is terminal but acceptance is not complete, hand over the precise missing checks and evidence rather than marking `VERIFIED_APK_READY`. Use **`VERIFIED_APK_READY`** only when exact-head QA passed, the APK was extracted and its own SHA-256 computed, screenshots were reviewed, and the evidence is published.

## Writer and gate controls

W01 remains the sole implementation writer on the authorized feature branch. Other workers may perform independent read-only preparation/review, but must not modify implementation or bypass required A08/A09, content, artwork-rights, nutrition/allergen, or Android security/signing approvals. Engineering checks never substitute for an accountable reviewer’s explicit decision. No merge, release, B02, destructive install, or extra spend is implied by a successful CI run.
