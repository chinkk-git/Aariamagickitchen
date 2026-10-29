"""Deterministic advisory checks; never a standalone authorization grant.

The legacy registry and isolated runtime registry have different CAS domains.
Checking both snapshots does not make a cross-file atomic transaction. The
production executor remains hard-disabled until a trusted shared authority exists.
"""
from datetime import datetime, timezone

class SecurityEvidenceError(PermissionError):
    pass

def _timestamp(value):
    if not isinstance(value, str):
        raise SecurityEvidenceError("missing lease expiry")
    try:
        dt=datetime.fromisoformat(value.replace("Z","+00:00"))
    except ValueError as exc:
        raise SecurityEvidenceError("invalid lease expiry") from exc
    if dt.tzinfo is None:
        raise SecurityEvidenceError("lease expiry requires timezone")
    return dt.astimezone(timezone.utc)

def assert_no_legacy_writer(legacy, branch, now):
    """Reject ambiguous legacy ownership; result is advisory, not atomic."""
    if not isinstance(legacy,dict) or not isinstance(legacy.get("workers"),dict) or not isinstance(legacy.get("tasks"),list):
        raise SecurityEvidenceError("legacy registry unavailable")
    if not isinstance(branch,str) or not branch:
        raise SecurityEvidenceError("invalid branch")
    instant=_timestamp(now)
    for name,worker in legacy["workers"].items():
        if not isinstance(worker,dict):
            raise SecurityEvidenceError("malformed legacy worker")
        if worker.get("branch")!=branch:
            continue
        if worker.get("writer") or worker.get("session_state") not in {"STOPPED","NOT_STARTED"}:
            raise SecurityEvidenceError("legacy writer not verifiably stopped")
    for task in legacy["tasks"]:
        if not isinstance(task,dict) or not isinstance(task.get("id"),str):
            raise SecurityEvidenceError("malformed legacy task")
        if task.get("target_branch")!=branch:
            continue
        lease=task.get("lease")
        if lease is not None:
            if not isinstance(lease,dict):
                raise SecurityEvidenceError("malformed legacy lease")
            if _timestamp(lease.get("expires_at"))>instant:
                raise SecurityEvidenceError("live legacy lease")
            # An expired lease does not prove the writer has stopped.
            raise SecurityEvidenceError("expired legacy lease requires handover")
        if task.get("status") in {"CLAIMED","IN_PROGRESS"}:
            raise SecurityEvidenceError("legacy task still active")
    return True

def validate_holder_context(*, actor, worker, run_id, attempt, authenticated_actor, assigned_roles):
    """Validate identity shape, not possession of an unforgeable lease token."""
    if not all(isinstance(v,str) and v for v in (actor,worker,run_id,attempt,authenticated_actor)):
        raise SecurityEvidenceError("missing holder identity context")
    if actor!=authenticated_actor or not run_id.isdecimal() or not attempt.isdecimal():
        raise SecurityEvidenceError("holder context mismatch")
    if not isinstance(assigned_roles,(set,frozenset)) or worker not in assigned_roles:
        raise SecurityEvidenceError("holder role unauthorized")
    return (actor,worker,run_id,attempt)
