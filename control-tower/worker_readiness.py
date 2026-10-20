"""Deterministic readiness gate for the Control Tower coding-executor cutover.

Read-only: does not grant a lease, start an agent, change registry state, or
replace independent GitHub/security attestations.
"""
from worker_task_envelope import ALLOWED_BRANCHES

REQUIRED_GATES = (
    "protected_runner_identity",
    "authenticated_coding_executor",
    "legacy_writers_fenced",
    "single_authoritative_lease",
    "isolated_cas_acceptance",
    "independent_security_review",
    "cost_limit_verified",
    "exact_head_ci",
)

def readiness(registry, evidence):
    """Return sorted, explicit blockers. No self-attested green flags accepted.

    Evidence entries must be trusted verifier records containing status PASS,
    provenance 'protected-github-verifier', and the checked commit SHA. This
    is a schema preflight, not proof that a protected verifier actually ran.
    """
    blockers = []
    if not isinstance(registry, dict) or registry.get("activation") != "DISABLED":
        blockers.append("registry must remain disabled during readiness review")
    workers = registry.get("workers", []) if isinstance(registry, dict) else []
    if not isinstance(workers, list):
        workers = []
    for worker, branch in ALLOWED_BRANCHES.items():
        matching = [w for w in workers if isinstance(w, dict) and w.get("id") == worker]
        if len(matching) != 1 or matching[0].get("branch") != branch:
            blockers.append("missing or mismatched worker " + worker)
        elif matching[0].get("activation") != "DISABLED":
            blockers.append("worker not disabled " + worker)
        elif matching[0].get("runtime") in (None, "", "UNASSIGNED"):
            blockers.append("coding executor not assigned " + worker)
    if not isinstance(evidence, dict):
        evidence = {}
    for gate in REQUIRED_GATES:
        item = evidence.get(gate)
        if not isinstance(item, dict) or item.get("status") != "PASS" or item.get("source") != "protected-github-verifier" or not isinstance(item.get("commit_sha"), str) or len(item["commit_sha"]) != 40:
            blockers.append("unverified gate " + gate)
    # Even a complete document is not permission to activate: this gate is
    # intentionally incapable of issuing an authorization or changing state.
    return {"ready_for_independent_review": not blockers, "activation_authorized": False, "blockers": blockers}
