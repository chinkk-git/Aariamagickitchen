"""Pure atomic-plan worker claims; caller must CAS-write the entire registry."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone

def parse_time(value):
    t = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if t.tzinfo is None:
        raise ValueError("timezone required")
    return t

def plan_claim(registry, task_id, worker, now, credential_ref, ttl=900):
    if not isinstance(ttl, int) or not 60 <= ttl <= 3600:
        raise ValueError("invalid TTL")
    if not isinstance(credential_ref, str) or not credential_ref.startswith("audit:") or len(credential_ref) > 128:
        raise ValueError("invalid audit reference")
    if worker not in registry.get("workers", {}):
        raise ValueError("unknown worker")
    if registry["workers"][worker].get("session_state") == "STOPPED":
        raise ValueError("worker stopped")
    tasks = registry.get("tasks", [])
    matches = [t for t in tasks if t.get("id") == task_id]
    if len(matches) != 1:
        raise ValueError("task missing or duplicate")
    task = matches[0]
    if task.get("owner") != worker or task.get("status") != "READY":
        raise ValueError("not authorized or not ready")
    branch = task.get("target_branch")
    if not isinstance(branch, str) or not branch or branch.endswith("/pending"):
        raise ValueError("target branch not assigned")
    by_id = {t["id"]: t for t in tasks}
    if len(by_id) != len(tasks):
        raise ValueError("duplicate task IDs")
    if any(dep not in by_id or by_id[dep].get("status") != "VERIFIED" for dep in task.get("depends_on", [])):
        raise ValueError("dependency not verified")
    current = parse_time(now)
    for other in tasks:
        lease = other.get("lease")
        if not lease or parse_time(lease["expires_at"]) <= current:
            continue
        if other["id"] == task_id:
            raise ValueError("task already leased")
        if other.get("target_branch") == branch:
            raise ValueError("branch already leased")
        if lease.get("worker") == worker:
            raise ValueError("worker already busy")
    out = deepcopy(registry)
    for candidate in out["tasks"]:
        if candidate["id"] == task_id:
            candidate["status"] = "CLAIMED"
            candidate["lease"] = {
                "worker": worker, "credential_ref": credential_ref,
                "claimed_at": now,
                "expires_at": (current + timedelta(seconds=ttl)).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
            }
    return out
