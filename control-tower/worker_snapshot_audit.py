"""Read-only snapshot audit for a Control Tower rollout.

No network, lease mutation, worker dispatch, or activation. The caller must
supply independently fetched exact-head registries and authoritative evidence.
"""
from worker_readiness import readiness

def audit_snapshot(*, workers_registry, legacy_registry, evidence, trusted_head_sha):
    result = readiness(workers_registry, evidence, trusted_head_sha=trusted_head_sha)
    blockers = list(result["blockers"])
    if not isinstance(legacy_registry, dict):
        blockers.append("legacy registry unavailable")
    else:
        sessions = legacy_registry.get("sessions")
        if not isinstance(sessions, (dict, list)):
            blockers.append("legacy session ownership not independently reconciled")
        # This audit cannot prove that an old Work session stopped. Even a
        # STOPPED flag in mutable JSON is insufficient for atomic fencing.
        blockers.append("legacy registry atomic fencing not proven by snapshot")
    return {
        "ready_for_independent_review": False if blockers else result["ready_for_independent_review"],
        "activation_authorized": False,
        "blockers": blockers,
    }
