# Option B+ — Lightweight Parallel Delivery Protocol

Status: PLANNING ONLY. No autonomous worker activation or writer lease granted.
Baseline verified: V3 1b3a46f774a9185e0325783c75e85039aa0c5f3c; V3.1 a115fc00e2a516df1e819e97ec737bc55e7b2cfc; Control Tower 3a5ae2a7c13cb86dea277afcee4fdeeb7456d117.

## Execution boundaries
- W01 is the only permitted V3 coding writer, on codex/v3-completion-core-20261017.
- W03 is the only permitted V3.1 coding writer, on feature/v3.1-home-redesign.
- W02/W06/W07/W08 are independent review roles. They may read branches, post findings and propose changes; they must not silently become coding writers.
- Parallel execution is allowed **across distinct branches only** after each branch's previous writer has conclusively relinquished ownership.
- GitHub issue comments, STOPPED labels, and snapshot lease records are advisory, not atomic writer fencing.
- No worker is launched by this protocol. All control-tower/workers.json entries remain DISABLED/UNASSIGNED.
- No merge, release, workflow activation, production overwrite or paid service is authorized.

## Stage 0 — Verify ownership (mandatory before branch writes)
1. Query current branch HEAD, recent commits, exact-head workflows and outstanding jobs.
2. Confirm prior writer session stopped through its actual execution environment or an independently trusted handover. For V3, legacy status UNKNOWN is a hard stop.
3. Assign a single writer for each branch and publish a session identifier and start SHA to the corresponding issue.
4. If ownership is ambiguous or branch HEAD changes unexpectedly, stop writes and escalate. Never assume expired leases prove a writer stopped.

## Stage 1 — W01 V3 Android (Issue #4)
1. Inspect current Android implementation, failures and acceptance gaps.
2. Implement Android Back, profiles, offline functionality and update integrity/recovery.
3. Run 95-recipe regression, emulator and separately installable APK checks.
4. Publish commits, exact-head CI, test logs and artifact identity. No claim of device install without evidence.

## Stage 2 — W03 V3.1 Visual (Issue #5)
1. Compare installed APK screenshots with approved Pinterest-style home.
2. Integrate original character scenes and recipe art; verify 11–65 atlas coverage and all 95 recipes.
3. Validate portrait/landscape, accessibility, missing assets and visual regressions.
4. Produce co-installable preview with distinct package identity and screenshots.

## Stage 3 — Independent reviews (may run concurrently)
- W02: Android build, instrumentation, emulator, package coexistence and regression.
- W06: features, recipes, camera behavior, planners, shopping lists and localization.
- W07/A08: child safety, cooking precautions, privacy and update-system safety.
- W08/A09: age 8–10 navigation, readability, imagery and usability.
Each reviewer publishes PASS/FAIL/BLOCKED with tested SHA, environment and evidence. No self-approval.

## Stage 4 — Controlled integration
1. Require verified W01/W03 exact-head builds and independent reviews.
2. Identify a single integration writer; isolate integration branch and produce a reviewed PR.
3. Run end-to-end emulator tests, 95-recipe content audit, APK coexistence and rollback tests.
4. Preserve existing production installation and data. No merge or release without separate authorization.

## Monitoring and failure handling
- Control Tower conversation and GitHub Issues #4/#5/#28 track status, not unattended AI execution.
- Report branch HEAD, last successful exact-head CI, owner, reviewer evidence, blocked tests and next action.
- A stalled session requires trusted stop/handover before reassignment; no automatic recovery or competing writes.
- Retain disabled guarded workflows and NO_ADDITIONAL_CHARGES policy.

## B+ acceptance
Two separately authorized coding sessions can work in parallel on different branches; independent reviews are reproducible; exact-head CI and artifacts are linked; no conflicting writer, activation, merge, release or paid action occurs.
