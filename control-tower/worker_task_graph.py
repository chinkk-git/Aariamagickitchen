"""Strict, read-only task graph validation for future Control Tower planning.

Does not dispatch workers, grant leases, or mutate the legacy task registry.
"""
import re

TASK_ID = re.compile(r"^[A-Z][A-Z0-9-]{1,63}$")
TERMINAL = frozenset({"VERIFIED", "CANCELLED"})
STATUSES = frozenset({"BLOCKED", "READY", "CLAIMED", "IN_PROGRESS", "REVIEW", "VERIFIED", "FAILED", "CANCELLED"})

class TaskGraphDenied(ValueError):
    pass

def validate_graph(tasks):
    if not isinstance(tasks, list):
        raise TaskGraphDenied("tasks must be a list")
    by_id = {}
    for task in tasks:
        if not isinstance(task, dict):
            raise TaskGraphDenied("task must be object")
        key = task.get("id")
        if not isinstance(key, str) or not TASK_ID.fullmatch(key) or key in by_id:
            raise TaskGraphDenied("invalid or duplicate task id")
        if task.get("status") not in STATUSES:
            raise TaskGraphDenied("invalid task status")
        deps = task.get("depends_on", [])
        if not isinstance(deps, list) or any(not isinstance(x, str) for x in deps) or len(set(deps)) != len(deps):
            raise TaskGraphDenied("invalid or duplicate dependencies")
        if type(task.get("priority", 0)) is not int:
            raise TaskGraphDenied("priority must be integer")
        by_id[key] = task
    for key, task in by_id.items():
        for dep in task.get("depends_on", []):
            if dep not in by_id:
                raise TaskGraphDenied("unknown dependency")
            if dep == key:
                raise TaskGraphDenied("self dependency")
    visiting, visited = set(), set()
    def visit(key):
        if key in visiting:
            raise TaskGraphDenied("dependency cycle")
        if key in visited:
            return
        visiting.add(key)
        for dep in by_id[key].get("depends_on", []):
            visit(dep)
        visiting.remove(key)
        visited.add(key)
    for key in sorted(by_id):
        visit(key)
    return by_id

def plan_ready(tasks):
    """Return IDs in deterministic priority order, without authorizing execution."""
    by_id = validate_graph(tasks)
    eligible = [task for task in by_id.values()
                if task["status"] == "READY"
                and all(by_id[dep]["status"] == "VERIFIED" for dep in task.get("depends_on", []))]
    eligible.sort(key=lambda task: (-task.get("priority", 0), task["id"]))
    return [task["id"] for task in eligible]
