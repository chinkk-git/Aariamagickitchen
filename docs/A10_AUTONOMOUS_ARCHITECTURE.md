# A10 — Autonomous Software Delivery Architecture (proposal v1)

Governing issue: #47. Draft PR: #48. Worker authorities: W01 #45, W02 #39.
Status: DESIGN; not production-enabled.

## Mission
Replace manual copy/paste coordination with auditable task dispatch, bounded agent execution, evidence-driven CI repair, independent quality gates and human approval at release boundaries.

## Components
1. **Control plane:** GitHub Issues/labels and immutable task manifests. A10 planner/controller selects ready tasks based on priority, dependencies, worker leases and budgets.
2. **Event ingestion:** GitHub webhooks (push, workflow_run, issue changes) plus scheduled reconciliation to avoid missed events. Validate signatures, deduplicate delivery IDs.
3. **Durable state:** GitHub task records and checkpoint artifacts, with state machine NEW -> READY -> CLAIMED -> RUNNING -> VERIFYING -> DONE or BLOCKED/ESCALATED. Include attempt count, lease expiry, last heartbeat, exact branch SHA, evidence links.
4. **Worker execution plane:** independently deployed, permission-scoped coding agent runners, one writer per worker branch. A GitHub comment cannot wake a ChatGPT Work session; runner must use an explicitly supported agent execution API/CLI, configured by the owner.
5. **Recovery controller:** distinguish transient infra failure (bounded same-SHA rerun), deterministic test failure (agent fix task), missing artifact (rebuild/reupload), blocked external approval (escalate). Retry budget, exponential backoff, circuit breaker.
6. **Quality plane:** independent build/QA security gates, A08 child safety and A09 child usability, 95-recipe integrity, approved #12 art, EN-GB/PT-BR, phone/tablet orientations. No test weakening to force green.
7. **Artifact registry:** CI run, exact commit SHA, signed/hash-verified APK, SHA-256, screenshots, test matrix and provenance. No unverified APK promotion.
8. **Notification plane:** concise daily/exception reporting, no duplicate GitHub comments, user approval requests only for owner-only decisions.

## Security and autonomy policy
- Agent runners use short-lived scoped credentials (GitHub App preferred), not personal access tokens in issue bodies or logs.
- Per-worker repository branch allowlists; never write W01's branch from W02 or vice versa.
- No executing arbitrary commands supplied by issue commenters; signed/validated task schema and trusted runner config only.
- A10 cannot bypass branch protection, A08/A09, code review, secret scanning, or release approvals.
- No auto-merge, publishing, Play Store upload or user-data migration without explicit policy approval.
- Separate monitoring and execution credentials; principle of least privilege.
- Bounded cost/time/concurrency, kill switch, audit trail and rollback.

## Phased delivery
**Phase 0 — Stabilise:** Validate existing PR #48 dry-run, tests, API pagination, error handling, deduplication, branch permissions. Existing ChatGPT hourly A10 remains active.
**Phase 1 — Reliable supervisor:** Events + scheduled reconciliation, worker status ledger, deduplicated actionable blocker comments and daily digest.
**Phase 2 — Deterministic recovery:** Allowlisted infra-only retries, retry budget, checkpoint tracking, artifact integrity checks, tests with simulated failure cases.
**Phase 3 — Executing agents:** Deploy supported persistent coding-agent runners, configure credentials and isolated workspaces, task leasing, heartbeat, checkpoint/resume and bounded repair loops. Pilot W02 sample APK or W01 emulator CI issue on a safe test branch.
**Phase 4 — Full autonomous SDLC:** Dependency-aware planning, independent reviewers, A08/A09, security gates, APK distribution evidence, approval-controlled promotion and continuous improvement.

## Owner decisions / external prerequisites
1. Choose and connect the agent runner (e.g. supported Codex/agent API or self-hosted runner with audited execution interface). Do not pretend existing ChatGPT Work sessions can be programmatically resumed.
2. Approve installation and permission scopes for GitHub App/runner infrastructure and any cloud compute cost.
3. Decide whether automatic branch-local code remediation is allowed, with review and limits; release remains owner-approved.

## Definition of done
A new GitHub task can be claimed, executed, tested, corrected and closed by a scoped worker without copy/paste; A10 reports exact evidence; unsafe/ambiguous situations stop for approval. Demonstrate in a pilot before broad rollout.

## Isolated runner pilot implementation (2026-10-22)
- Added `scripts/a10_job_contract.py`: strict schema, exact SHA, W01/W02 branch allowlist, governing issue check, inspect-only mode, ten-minute maximum, one attempt.
- Added `tests/test_a10_job_contract.py`: branch crossover, injection field, execution mode, retry and type validation tests.
- Added manual-only `.github/workflows/a10-isolated-runner-pilot.yml` with `contents: read`, concurrency lock and inspect-only job. No coding-agent execution, writes or CI reruns.
- Next phase requires owner-approved agent runtime, authenticated scoped credentials and verified CI before switching from inspect to any code-changing mode. Scheduled workflows on the unmerged feature branch do not run.
