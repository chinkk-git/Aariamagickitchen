# Coding executor integration contract (inactive)

This is an implementation boundary, not a running AI agent. Control Tower remains DISABLED.

## Required external adapter

A trusted, independently reviewed coding-runtime adapter must accept an immutable task envelope validated by `worker_task_envelope.py`. The adapter must use a protected identity to obtain GitHub task context, check exact source HEAD, acquire an exclusive authoritative lease, enforce the legacy-writer fence, execute code in a constrained workspace, run tests, publish evidence, and release its lease in a `finally` block. A GitHub issue comment or `workflow_dispatch` is not itself an AI coding runtime.

## Trust and isolation requirements

1. An independent protected GitHub runner verifies actor and repository permissions. Never trust an actor or `verified_by_protected_runner` field supplied by a task.
2. Resolve the W01 or W03 branch from protected policy, not the issue body. Preserve separate branch ownership; never spawn two writers for one branch.
3. Require compare-and-swap against one authoritative lease record, plus atomic fencing of legacy `tasks.json`. A stale heartbeat does not prove an old writer stopped.
4. The executor must bind task, actor, run, attempt, worker, branch and exact SHA to the lease. Reject mismatches before writing.
5. Only approved code and tests within task scope. No release, merge, credential disclosure, production site changes or paid service usage.
6. Capture commit SHA, exact-head CI, Android emulator/artifact evidence, A08 and A09 reviews separately. CI success is not visual or device acceptance.
7. On crash or timeout, fail closed; quarantine ambiguous ownership rather than automatically starting a replacement.
8. After independent acceptance, activation still requires explicit authorization. No module in this branch may change activation to ENABLED.

## Current missing capabilities

- No authenticated external AI coding executor or supported connector for launching one.
- No independently accepted atomic fence between legacy and new writer registries.
- No trusted live actor/lease binding that authorizes branch writes.
- No independent security sign-off or verified cost enforcement.

The deterministic readiness module is a **preflight** only. It cannot establish protected provenance from a JSON record or authorize a restart. Keep all workers and guarded workflows disabled.
