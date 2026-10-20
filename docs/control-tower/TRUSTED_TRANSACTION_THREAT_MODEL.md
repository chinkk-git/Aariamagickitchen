# Trusted transaction runtime — security threat model

Status: **DESIGN / DISABLED**. This document does not authorize activation.

## Trust boundaries

1. GitHub Actions event metadata is not a substitute for an authorization decision. Only a trusted, protected workflow may read `github.actor`, `github.repository`, and its own authenticated token. Never trust actor or permission values supplied by issue comments, workflow inputs, pull-request files or artifacts.
2. A workflow executing pull-request code must have **contents: read** and no secrets. Any future write-enabled workflow must use reviewed code from a protected default branch, never execute untrusted PR-head Python, and must reject forked/untrusted triggers.
3. GitHub `GITHUB_TOKEN` is short-lived and should be passed through the runner environment, never written to `tasks.json`, PR comments, logs or artifacts. Never use a user-supplied lease token as a secret. Public `credential_ref` values are audit identifiers, **not authentication**.
4. For write operations, verify GitHub repository permission and an explicit allowlist or protected environment, and bind worker identity to a server-side mapping. The current pure executor receives authenticated metadata from its caller; its unit tests **do not prove the caller is trusted**.
5. Claim, renew, release and recover must re-read the full authoritative registry and perform an exact blob-SHA conditional write; on 409/422 abort and re-evaluate, never blindly retry a stale plan. Enforce one writer per branch, including existing V3/V3.1 branch ownership.
6. Expired lease recovery must leave the task **BLOCKED** pending human-independent verified session termination and handover; lease expiry does not prove the old process stopped writing.
7. Reviewer approval requires a GitHub API-backed PR review at the exact SHA, repository permission, and role assignment maintained outside untrusted PR changes. GitHub PR review alone is not A03/A08/A09 testing.
8. A public repository can expose issue comments and workflow inputs. The legacy CT25 bridge accepts public tokens in comments and must not be generalized for production worker authorization.
9. R$0 additional cost is a policy, not a billing guarantee. Keep write runtime disabled until GitHub Actions quotas/billing are independently checked. Do not invoke paid AI APIs.
10. APK release stays blocked until all independent A03/A08/A09, QA/UAT, recipe coverage, offline, coexistence, signing and complete-only checks pass.

## Required activation gates

- Independent security review of the protected workflow and permission model
- Trusted role mapping and authentication integration
- End-to-end GitHub CAS conflict tests on an isolated fixture
- Verified branch writer handover and lease recovery tests
- Explicit free-tier/budget validation
- Release gate and security approval independent of the implementer

**This PR must remain draft and the worker registry DISABLED.**


## Rotation 3 implementation boundary

The prototype now has an API-backed collaborator-permission lookup and compares the
GitHub event sender with the immutable Actions actor context. A protected environment
secret maps actor logins to worker IDs. The runtime accepts only a manual dispatch
from the protected default branch, the exact repository, and the isolated
Control Tower branch; it only claims tasks assigned to that isolated branch.
The ephemeral GitHub token is held in process memory and is never persisted.
Whole-registry Contents API writes use the fetched blob SHA and stop on 409/422.

The workflow remains hard-disabled (job condition false and transaction flag 0).
The separate worker-runtime registry starts DISABLED and empty. The legacy
control-tower/tasks.json lease schema and CT25 comment bridge are not used or
modified. This prototype therefore does not yet orchestrate V3/V3.1 or prove
cross-registry writer exclusion. Independent security review, protected
environment configuration, GitHub quota/billing validation, and live API/CAS
acceptance remain required before any future activation.
