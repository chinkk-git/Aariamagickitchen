# A10 autonomous recovery infrastructure

Governing issue: #47. Worker authorities: W01 #45, W02 #39.

## Isolation and safety
- Independent branch and draft PR; no changes to worker implementation branches.
- Hourly GitHub Actions watcher, manually dispatchable in dry-run mode.
- Read-only branch/CI diagnostics; issue comment is the only permitted mutation.
- Deduplicates comments by worker, exact SHA and failed run.
- Deterministic CI failures are **not retried**. CI reruns and code remediation are deliberately **not enabled** until a verified transient-failure allowlist, retry budget, permissions and tests are reviewed.
- ChatGPT A10 hourly automation already exists; coordinate comment ownership to avoid duplicate notifications.
- No merge, release, secret disclosure, or Work-session restart.

## Validation and rollout
1. Review workflow security and inspect dry-run logs.
2. Validate no duplicate issue comments, failure detection and error paths.
3. Only then approve PR and enable scheduled watcher on default branch.
4. A scheduled workflow on this feature branch does not run until merged to the default branch.
5. Rollback: disable the workflow; existing W01/W02 work is unaffected.
