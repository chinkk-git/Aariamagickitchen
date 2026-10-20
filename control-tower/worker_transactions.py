"""Fail-closed registry transactions for a future trusted GitHub Actions caller.

Pure transformations only. A trusted caller MUST authenticate actor and use
GitHub blob-SHA compare-and-swap for the entire tasks.json write.
"""
from copy import deepcopy
from datetime import datetime, timedelta, timezone

def instant(value):
    t = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if t.tzinfo is None:
        raise ValueError("timezone required")
    return t

def live(lease, now):
    return bool(lease and instant(lease["expires_at"]) > instant(now))

def until(now, ttl):
    if type(ttl) is not int or not 60 <= ttl <= 3600:
        raise ValueError("invalid TTL")
    return (instant(now) + timedelta(seconds=ttl)).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

def transact(registry, task_id, worker, operation, now, audit_ref, ttl=900):
    if operation not in {"claim", "renew", "release", "recover"}:
        raise ValueError("invalid operation")
    if not isinstance(audit_ref, str) or not audit_ref.startswith("audit:") or len(audit_ref) > 128:
        raise ValueError("invalid non-secret audit reference")
    if worker not in registry.get("workers", {}):
        raise ValueError("unknown worker")
    tasks = registry.get("tasks", [])
    if len({t["id"] for t in tasks}) != len(tasks):
        raise ValueError("duplicate task ID")
    matches = [t for t in tasks if t["id"] == task_id]
    if len(matches) != 1:
        raise ValueError("task missing")
    task = matches[0]
    if task.get("owner") != worker:
        raise ValueError("wrong owner")
    if registry["workers"][worker].get("session_state") == "STOPPED" and operation != "recover":
        raise ValueError("worker stopped")
    current = instant(now)
    lease = task.get("lease")
    if operation == "claim":
        if task.get("status") != "READY" or live(lease, now):
            raise ValueError("task not ready")
        branch = task.get("target_branch")
        if not isinstance(branch, str) or not branch or branch.endswith("/pending"):
            raise ValueError("branch unassigned")
        by_id = {t["id"]: t for t in tasks}
        if any(by_id.get(dep, {}).get("status") != "VERIFIED" for dep in task.get("depends_on", [])):
            raise ValueError("dependency not verified")
        for other in tasks:
            if other["id"] == task_id or not live(other.get("lease"), now):
                continue
            if other.get("target_branch") == branch or other["lease"].get("worker") == worker:
                raise ValueError("branch or worker busy")
    elif operation in {"renew", "release"}:
        if not live(lease, now) or lease.get("worker") != worker or lease.get("credential_ref") != audit_ref:
            raise ValueError("lease ownership mismatch or expired")
        if task.get("status") not in {"CLAIMED", "IN_PROGRESS"}:
            raise ValueError("task not active")
    else:
        if not lease or live(lease, now) or task.get("status") not in {"CLAIMED", "IN_PROGRESS"}:
            raise ValueError("only expired active leases may be recovered")
        if registry["workers"][worker].get("session_state") not in {"STOPPED", "UNKNOWN", "NOT_STARTED"}:
            raise ValueError("recovery requires stopped/unknown session")
    out = deepcopy(registry)
    target = next(t for t in out["tasks"] if t["id"] == task_id)
    if operation == "claim":
        target["status"] = "CLAIMED"
        target["lease"] = {"worker": worker, "credential_ref": audit_ref,
                           "claimed_at": now, "expires_at": until(now, ttl)}
    elif operation == "renew":
        target["lease"]["expires_at"] = until(now, ttl)
        target["lease"]["last_renewed_at"] = now
    else:
        target["status"] = "READY" if operation == "release" else "BLOCKED"
        target["lease"] = None
        if operation == "recover":
            target["blocker"] = "Expired lease recovered; explicit writer handover required"
    return out
