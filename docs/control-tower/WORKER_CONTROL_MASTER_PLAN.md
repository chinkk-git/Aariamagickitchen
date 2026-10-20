# GitHub Worker Control — implementation specification (draft)

Status: **PLANNING / NOT ACTIVATED**. Source baseline main `6b54f39e436c4072c37e04aee7a6fbbb0e51a288`. This PR does not start AI sessions, change production Android branches, or modify active lease workflows.

## Goal
Single replaceable ChatGPT Control Tower conversation; GitHub authoritative for tasks, dependency graph, leases, branch ownership, CI, independent gates, evidence, cost and handovers. Ten logical roles in `control-tower/workers.json` are **not** ten active AI sessions.

## Authority
W01 Android, W02 Visual, W03 Recipes, W04 Integration are branch-scoped writers; W05 Functional QA, W06 A09 UAT, W07 A03 Security, W08 A08 Child Safety, W09 Release Verification are independent reviewers; W10 Recovery/learning has no merge or gate override power. Reviewers cannot approve their own changes. W04 is the **only** integration writer once nominated, superseding any legacy V3 integration assignment after coordinated handover. No new writer may assume an existing branch without verified previous-writer stop.

## Rollout and acceptance
| Phase | Scope | Required exit evidence |
| --- | --- | --- |
| P0 | Reconcile HEAD, issues, workflows, billing and owners | Recorded baseline and risks |
| P1 | Worker registry and schema | 10 identities; validation; backward-compatible migration |
| P2 | Generic scheduler, leases and heartbeat | Same-task and same-branch exclusion; expiry/recovery tests |
| P3 | QA, A03, A08, A09, release gates | Independent exact-SHA evidence; critical failures block |
| P4 | Status and session rotation | GitHub-backed status and resumable handover |
| P5 | Two-worker isolated acceptance | Conflicting claims rejected; CI and veto tested |
| P6 | Supervised rollout and APK | Complete-only 95 recipes; emulator/device evidence |

## Task state and security contract
BACKLOG -> READY -> CLAIMED -> IN_PROGRESS -> IMPLEMENTED -> CI_PASS -> REVIEW_PENDING -> VERIFIED. BLOCKED and FAILED are explicit outcomes; transitions require actor authorization and evidence. A claim must atomically check task, branch, dependencies and active writer ownership. Leases need renewable TTL, non-public credentials or trusted GitHub-native actor binding, idempotent claims, heartbeat proof and safe recovery. The CT25 public issue-comment token bridge is a **prototype**, not a production security boundary. Never evaluate untrusted issue text as shell or workflow expression. Use least-privilege permissions, reviewed pinned actions, no untrusted PR execution with write tokens, and no automated gate bypass.

## Release contract
The candidate's exact integrated SHA, APK hash, package identity, signing provenance, CI and emulator results must match independent W05/W06/W07/W08/W09 approvals. Preserve 95 approved recipes and existing working features. Exclude 55 unapproved draft atlases, unfinished home redesign, unfinished scenes, experimental recipes 96–98 and placeholder controls. A successful APK build alone is not acceptance. Existing installed app must coexist with the separately labeled preview. Child UAT automation is not a substitute for supervised child evaluation.

## Zero-additional-cost contract
No paid model API, hosted agent, paid runner, subscription or billing escalation. No automatic high-frequency polling. Verify GitHub billing/account spending controls separately; repository policy cannot guarantee zero charges. Level 2 Codex/Work manual activation was verified in CT25; Level 3 unattended AI startup remains **UNVERIFIED and DISABLED**.

## Existing baseline and migration
Retain `control-tower/tasks.json`, `control-tower/lease.py`, existing workflows and CT25 VERIFIED evidence. Add `workers.json` as non-authoritative draft. Before migration, map existing v3/v31/integration to W01/W02/W04, resolve legacy integration owner, and add W03/W05–W10 without falsely asserting they are running. P1–P5 require isolated PR review and passing deterministic CI before enabling dispatch.

## Immediate next tasks
1. Review this specification and threat model.
2. Implement a pure deterministic schema validator and migration test on this isolated branch.
3. Design generic lease/branch-lock operations without changing live CT25 bridge.
4. Build failure-path tests and independent evidence gate contracts.
5. Enable roles progressively only after verified acceptance and explicit free-runtime feasibility.


## Trusted runtime implementation checkpoint

Rotation 3 adds a disabled Actions runtime prototype, protected actor-to-worker
mapping, GitHub collaborator permission lookup, exact repository/default-source/
target-branch checks, whole-registry blob-SHA CAS, and an in-memory concurrent
claim acceptance test. The runtime registry is separate, empty, and DISABLED;
legacy tasks.json and its lease/CT25 workflows are preserved. Assurance roles
cannot be selected by the write workflow. No production worker can start from
this change. Independent security review, protected environment setup, billing
validation, actual GitHub CAS race acceptance, and a verified V3/V3.1 handover
remain blockers before any live write is considered.
