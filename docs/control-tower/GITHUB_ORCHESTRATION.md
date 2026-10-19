# GitHub-native task orchestration v1

This implementation is a **deterministic coordination foundation**, not an autonomous coding agent. Source of truth: `control-tower/tasks.json`. Validation: `python3 control-tower/validate.py`. CI: `.github/workflows/control-tower-gates.yml`.

## Worker protocol
1. At startup, active Work session reads Issue #9, this protocol, its assigned task records and source issue.
2. Worker verifies current GitHub HEAD and owner before writing. It must not claim that a GitHub comment wakes a stopped Work session.
3. The sole branch writer updates task state and attaches exact commit, CI, screenshot and review evidence. Branch ownership is coordinated through Issue #7; never concurrently write the same branch.
4. BLOCKED tasks are not included in the consolidated APK. All release items must be classified INCLUDE / EXCLUDE / BLOCKED. INCLUDE requires VERIFIED evidence.
5. Independent A03/A08/A09 reviewers must provide genuine review evidence; passing CI does not manufacture their approvals.
6. Control Tower updates dependencies, prioritization and issue routing; A10 remains silent except for genuine intervention blockers.

## Limitations and next implementation stages
The task file is not yet an atomic lock service: GitHub issue comments, labels and task edits cannot enforce cross-session mutual exclusion. Before parallel writers, implement compare-and-swap claims with GitHub API ETags or a protected single-writer coordinator, expiring leases and branch protection. Do not pretend a stale issue comment is a live lease.

GitHub Actions here only validates task metadata. It does **not** run unattended LLM coding, start or resume ChatGPT Work sessions, grant signing secrets, perform independent child-safety reviews, or release APKs. Existing Android CI remains the APK builder. No scheduled workflow was added; existing watchdog must be audited separately because its ACTIVE/STALL labels describe GitHub activity, not Work session liveness.

To enable unattended coding, a separately authorized GitHub-connected coding worker must be installed/configured with explicit repository permissions, protected branch PRs, spending limits and a sandbox. No such worker is claimed to exist.

## Next steps
- Review and merge this coordination-only PR.
- Implement authenticated atomic task claim/release with TTL, validation and branch protection.
- Extend CI to verify Android-built APK contents and independently recorded A03/A08/A09 gates; require approval of trusted reviewers, not self-declared JSON fields.
- Add GitHub issue-driven dispatch to a genuine coding worker only after permissions and budget controls are approved.
