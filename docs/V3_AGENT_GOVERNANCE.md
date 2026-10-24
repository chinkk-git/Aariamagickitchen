# Autonomous Agent Cluster — Governance and Continuous Learning
Status: governance specification. GitHub audit of `feature/platform-v3` at `b057f8603f7950f5e5b5699732a346ee9e453f25` found no persisted agent profiles under recognizable agent paths. Task-scoped independent audit/review roles operated for this session; durable autonomous operation is not yet established.

## Discovery first
Find and inspect existing nine agent profiles and their workflows. Reconcile roles without assuming exact old IDs or creating unnecessary duplicates.

## Responsibilities
- Orchestrator: scope, priority, dependencies, evidence-based decisions.
- Planner: atomic tasks, risks, acceptance criteria, dependency graph.
- Executor: implementation, tests, commits, remediation.
- Reviewer: independent requirements and code/artifact verification.
- Android specialist: app shell, data, signing, updates.
- Artwork specialist: character bible, scene registry, image QA.
- Content/safety specialist: recipes, allergies, supervision, accuracy.
- QA specialist: automated and real-device test design/evidence.
- Release steward: CI, artifacts, versioning, provenance.
- Learning steward (may be combined): incident reviews, prompt improvements, regression tests.

## Autonomous lifecycle
Discover → Plan → Execute → Test → Independent Review → Fix → Retest → Integrate → Learn → Continue.

Routine user approvals are not required for authorized repository operations or engineering decisions within approved requirements. Merge only with required CI and independent review. Escalate permissions, unsafe releases, missing external inputs, ambiguous new product requirements and physical-device confirmations. Do not pretend the agents can run indefinitely without an active Work session, CI or automation.

## Learning protocol
For each significant incident, record root cause, proof, failed test, fix, new regression test, process improvement and measurable result in `AGENT_LEARNING_REGISTER.md`. Independently review agent profile changes; regression-test and version-control them. Never relax safety/QA requirements to improve pass rates. Track repeat failures and roll back harmful prompt changes.

## Initial discovery evidence (2026-10-17)

- Repository tree audit: 179 entries on `feature/platform-v3`; no root agent profile files were present in the audited tree.
- This session used independent, read-only Android security and governance review tasks. Their results must be recorded after receipt; task-scoped agents do not persist after the active work session.
- Durable activation requires version-controlled role prompts, explicit least-privilege authority, workflow/handoff implementation, CI gates, and evidence that the cycle runs. Until then, WP11 remains `IN PROGRESS`, not complete.



## Current task-scoped review evidence — 2026-10-17
An independent reviewer inspected the phone-reported chooser failure and confirmed the self-recursive renderer root cause and code-level correction at `133fbb4b35fb06789b13ffd1b5d0b83508d0c5df`. The reviewer also identified the standalone HTML profile roster persistence gap; that remediation and a Node regression test were added. The reviewer explicitly notes that source-pattern tests do not substitute for a DOM/WebView smoke test. This is a task-scoped review, not evidence that a persistent nine-agent runtime is installed or continuously executing. CI and phone retest remain gates; no routine user approval is required for the authorized implementation work.
