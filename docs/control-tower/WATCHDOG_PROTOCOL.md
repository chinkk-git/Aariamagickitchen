# Delivery Monitoring and A10 Recovery

The existing **Aaria Hourly Delivery Control** ChatGPT automation is the primary monitoring trigger. See [A10_RECOVERY.md](A10_RECOVERY.md) for detection, CI retry limits, evidence requirements and replacement Work session handover.

## Cost controls
No additional scheduled GitHub Actions watchdog is required. The earlier `.github/workflows/delivery-watchdog.yml` may still exist; **disable that workflow in GitHub Actions** to prevent recurring CI consumption. Do not assume it has been disabled without verification. Existing CI builds and any A10-authorized transient-failure rerun can consume included GitHub Actions quota; avoid retries if they could incur extra charges.

## Worker checkpoints
V3: issue #4, branch `codex/v3-completion-core-20261017`. V3.1: issues #5/#6, branch `feature/v3.1-home-redesign`. Workers checkpoint meaningful progress and continue to the next unblocked task. At >30 minutes without evidence classify WARNING; at >60 minutes classify SUSPECTED STALLED, not confirmed chat death. Investigate CI and session ownership. Recovery handovers follow [SESSION_PROTOCOL.md](SESSION_PROTOCOL.md).

## Constraints
The hourly task can inspect GitHub and prepare recovery instructions, but cannot restart ChatGPT Work sessions. One writer per branch; no cross-branch edits or integration merges. Preserve all strict Android/device/security, A08/A09, and original-recipe gates. Do not weaken failed tests to obtain a green CI.
