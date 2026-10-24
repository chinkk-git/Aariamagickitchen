# W01 zero-cost execution policy

Effective 2026-10-21. This policy applies to all W01 work in this repository, including the V3.2 delivery tracked by Issue #38 and future V3.3 work tracked by Issue #39.

## Hard cost ceiling

All implementation, CI, QA, artwork, documentation, evidence capture and delivery must have an additional cost of **$0**. Use only current entitlements, free tools and already-included quotas.

Never enable billing, raise a spending limit, accept automatic overages, upgrade a plan, add a subscription, use a paid API, use a billable runner or cloud service, or incur any charge for extra storage, minutes, tokens, bandwidth or generated assets.

If a proposed operation could exceed an included allowance or its cost cannot be verified, stop that operation and record the specific cost uncertainty for owner approval. Continue independent work that is demonstrably free. Do not infer that an operation is free merely because the repository is public or because a prior run succeeded.

## GitHub Actions and artifacts

- Before triggering, rerunning or changing a workflow, inspect its runner type, triggers, outputs, artifact retention and any external services.
- Standard GitHub-hosted runners are free for public repositories under GitHub's published policy. Larger runners and third-party services can be billable.
- Artifact and package storage share plan limits. Confirm the repository owner's available storage allowance before uploading new or extended-retention artifacts. If current usage or remaining allowance is unavailable, do not initiate another artifact-producing run; escalate the storage check.
- Prefer existing exact-head CI results and artifacts. Avoid redundant builds, reruns, polling, artifact copies and long retention. Inspect existing logs once, then check run status only at meaningful milestones.
- Do not change billing, spending controls, runner selection or retention to evade a limit. Do not cancel or overwrite an already-authorized run solely to conceal usage; report any newly discovered cost risk and use the safest available stop mechanism.
- Record workflow URL, exact source SHA, result, artifact IDs, retention, actual APK SHA-256 and evidence links. An archive's checksum is not the checksum of the APK inside it.

## Permanent CI polling circuit breaker

Every W01 execution that observes a GitHub Actions run must follow [the CI polling circuit breaker](CI_POLLING_CIRCUIT_BREAKER.md). It applies to the Control Tower and every worker:
- At most **3 status reads per run per Work execution**; never duplicate an identical jobs/status query in consecutive calls.
- Use bounded backoff only when the interface supports scheduling; detect no progress and enter `WAITING_FOR_CI` instead of busy-waiting.
- Keep a hard budget of **12 GitHub Actions API calls per run per Work execution**, including status, jobs, logs, artifacts and downloads. One required issue handover is outside this Actions-call budget.
- A `WAITING_FOR_CI` handover is mandatory and ends the current execution. Resume only in a new Work execution on a terminal CI event or explicit owner instruction.

## Other work

- Use existing local/free tooling and included quotas for code, tests, artwork, screenshots, documentation and review.
- Do not call paid image, language-model or QA services. Do not enable trials or subscriptions.
- If artwork provenance, licensed access, independent review, device access or other evidence requires a paid service, stop that portion and identify the owner decision needed. Continue unrelated free tasks.
- Keep V3.1 Classic preserved. V3.3 Issue #39 remains deferred until separately authorized. No merge or release is implied by this policy.

## Session handoff

Every W01 session must read and follow this policy before source changes, CI dispatch, artifact upload, artwork generation or external-service use. Include it in handover notes and report any blocked cost verification clearly.
