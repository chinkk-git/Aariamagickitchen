"""Pure worker scheduler: no GitHub writes, no AI startup, fail-closed branch exclusion."""
from datetime import datetime, timezone


def active_lease(task, now):
    lease = task.get("lease")
    if not lease:
        return False
    expiry = datetime.fromisoformat(lease["expires_at"].replace("Z", "+00:00"))
    current = datetime.fromisoformat(now.replace("Z", "+00:00"))
    if expiry.tzinfo is None or current.tzinfo is None:
        raise ValueError("timestamps must be timezone aware")
    return expiry > current


def eligible_tasks(registry, worker, now):
    """Return eligible task IDs in stable priority order; do not mutate input."""
    tasks = registry["tasks"]
    by_id = {t["id"]: t for t in tasks}
    if len(by_id) != len(tasks):
        raise ValueError("duplicate task IDs")
    if worker not in registry["workers"]:
        raise ValueError("unknown worker")
    if registry["workers"][worker].get("session_state") == "STOPPED":
        return []
    busy_branches = set()
    for task in tasks:
        if task.get("status") in {"CLAIMED", "IN_PROGRESS"} and active_lease(task, now):
            if task.get("target_branch"):
                busy_branches.add(task["target_branch"])
    ready = []
    for task in tasks:
        if task.get("owner") != worker or task.get("status") != "READY":
            continue
        if active_lease(task, now):
            continue
        deps = task.get("depends_on", [])
        if any(dep not in by_id or by_id[dep]["status"] != "VERIFIED" for dep in deps):
            continue
        if task.get("target_branch") in busy_branches:
            continue
        ready.append(task)
    ready.sort(key=lambda t: (-int(t.get("priority", 0)), t["id"]))
    return [t["id"] for t in ready]
