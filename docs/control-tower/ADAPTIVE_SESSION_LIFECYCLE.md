# Adaptive Session Lifecycle Policy — Balanced v1
Effective: 2026-10-18 | Applies to: Control Tower (CT), V3, V3.1 | Authority: `main`

## Fundamental limits
The ChatGPT conversation's exact context-window occupancy, remaining tokens, tool-call counts, internal latency, and whether another chat is running are **not exposed reliably** to this GitHub protocol. Never claim a measured context percentage, true remaining capacity, continuous monitoring, or automatic chat creation. Counters must be explicitly maintained by the active session and labelled **observed**, **estimated**, or **unknown**. GitHub Actions can prove CI execution, not Work chat responsiveness. This is a manually invoked, evidence-based health review, not a paid or background agent.

## Balanced profile: review triggers (not hard rotation limits)
- At **20 substantial tasks** since the session began, review health and checkpoint readiness.
- At **50 tool activity events** since session start, review health. One event = one external tool invocation or large result/log consumed; explicitly count as best-effort, and use UNKNOWN if tracking is unavailable. Do not substitute repository-wide Actions count.
- Review immediately on sustained slow responses, unresponsive sends, repeated actions, lost decisions, contradictions, context failures, or unsafe concurrent writers, regardless of counts.
- No fixed 3–5-day rule. Age alone is not a rotation trigger. Reset counters only when a genuinely new chat starts, not when a task completes.

## What counts
A substantial task is a coherent deliverable (implemented feature/fix, investigation with actionable evidence, PR review, integration or release gate) with an issue or checkpoint reference. Tiny messages, acknowledgements, and tool calls alone are not substantial tasks. Record a short task ledger or count in the handover; never fabricate historical counts.

## Evidence-based rotation-pressure index (0–100)
This is **rotation pressure**, NOT session health, context utilisation or a probability of failure. Score only indicators for which evidence exists; explicitly list UNKNOWN indicators and confidence. Use the following fixed components:
- Workload, 0–20: min(20, 10 × observed substantial tasks / 20 + 10 × observed tool events / 50). If either counter is unknown, compute known contribution only and mark total a **lower bound**, not a full score.
- Responsiveness, 0/10/20/30: 0 = normal; 10 = user/agent reports intermittent slowdown; 20 = repeated slow responses or stalled tool interactions; 30 = messages send but no Work response or repeated persistent stalls. This is self/user-reported unless independently measured.
- Context reliability, 0/10/20/30: 0 = no observed problem; 10 = isolated repeated work or forgotten detail; 20 = repeated contradictory decisions or duplicated implementation; 30 = repeated loss of critical requirements/unsafe state. Cite issue/commit or direct user report.
- Recovery friction, 0/10/20: 0 = fresh handover, branch head, issue evidence; 10 = stale handover or incomplete checkpoint; 20 = unknown branch owner, conflicting writer, or unrecoverable pending local edits. This factor raises urgency to stabilise, **not permission to rotate unsafely**.

A score is meaningful only with enough evidence; if observations are mostly UNKNOWN, report **INSUFFICIENT DATA** and review manually rather than guessing zero. Scores are heuristics to prioritise a human review, not calibrated predictive metrics.

## Decisions
- **CONTINUE**: pressure <40, no critical symptoms, current issue/branch evidence coherent.
- **PREPARE**: pressure 40–59, any review threshold reached, any unknown high-impact indicator, or noticeable slowdown. Perform checkpoint and offer rotation option.
- **ROTATE RECOMMENDED**: pressure >=60, persistent unresponsiveness, repeated context failures, or explicit user request. Never force a rotation without user confirmation.
- **BLOCKED — STABILISE FIRST**: any active competing writer, unpushed critical work, missing branch ownership, or unresolved security/release operation. Save evidence, retire competing worker, and only then rotate.
Thresholds are provisional. Prefer direct symptoms over score; if a user says the chat is frozen, recommend recovery even when counters are unavailable.

## Independent checkpoint-readiness gate
A handover is READY only if all of the following are recorded and verified against current GitHub:
1. Repo and assigned branch; exact latest remote SHA and any local/unpushed changes explicitly stated.
2. Active issue IDs, owner, task status, dependencies, latest commits and CI evidence (or NOT RUN).
3. One executable next action, blockers, pending tests and security approvals.
4. Handover updated on `main` (or issue comment as fallback) with timestamp and session ID.
5. No competing writer on the same branch; existing writer stopped or ownership explicitly coordinated.
6. No credentials or signing keys in the handover.
If any is missing: **CHECKPOINT REQUIRED**. If the old chat is frozen, reconstruct from GitHub and mark unavailable local state UNKNOWN; do not claim recovered unpushed work. For CT, branch ownership refers to coordination edits on `main`, not a development branch.

## Manual rotation interaction
At a review, display: pressure score and evidence/confidence, counters, symptom summary, checkpoint readiness, and choices **Continue**, **Prepare checkpoint**, **Rotate to new chat**. The last option is enabled only when READY, or as an explicitly disclosed emergency recovery from a frozen session. The user must confirm rotation. ChatGPT/GitHub cannot spawn, transfer, or close Work chats programmatically through this policy.
- On confirmation, generate a short bootstrap prompt pointing to `docs/control-tower/CT_BOOTSTRAP.md` for CT, or `SESSION_PROTOCOL.md` and `V3_HANDOVER.md`/`V31_HANDOVER.md` for Work.
- In the new chat, re-fetch current GitHub head/issues/CI, post RECOVERY ACK, and reset per-session observed counters.
- Stop the old writer. Never push from two Work chats to the same branch. ACK comments are advisory, not atomic locks.

## Checkpoint record (append/update in the appropriate handover)
```text
SESSION_ID: CT-XX | V3-XX | V31-XX
HEALTH_REVIEW_AT_UTC: YYYY-MM-DDTHH:MM:SSZ
TASKS_OBSERVED: integer | UNKNOWN
TOOL_EVENTS_OBSERVED: integer | UNKNOWN
RESPONSIVENESS: normal | intermittent | degraded | unresponsive | UNKNOWN
CONTEXT_RELIABILITY: normal | isolated_issue | repeated_issue | critical | UNKNOWN
RECOVERY_FRICTION: clear | incomplete | conflicting | UNKNOWN
PRESSURE_SCORE: integer | lower-bound integer | INSUFFICIENT DATA
CONFIDENCE: high | medium | low
DECISION: CONTINUE | PREPARE | ROTATE RECOMMENDED | BLOCKED
CHECKPOINT: READY | CHECKPOINT REQUIRED
BRANCH_HEADS: <verified SHAs>
ISSUES_AND_CI: <URLs>
NEXT: <one action>
USER_ROTATION_CONFIRMATION: yes | no | pending
```

## Integration with GitHub Issues
CT checks issues #4 (V3), #5/#6 (V3.1), and #7 (integration) at explicit SYNC/SESSION HEALTH commands; it does not poll unattended. Active Work sessions post checkpoint comments and update handovers at task boundaries. Preserve both implementation branches and use existing no-cost capabilities. Do not enable paid runners, cron polling, extra Actions workflows, automatic merging or release signing changes for lifecycle management.
