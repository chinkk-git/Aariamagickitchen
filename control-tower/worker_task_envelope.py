"""Fail-closed task envelope validation for a future external coding executor.

This module does not launch workers, grant leases, or authorize GitHub writes.
The protected runner must independently authenticate actor, lease and source SHA.
"""
import re

SHA = re.compile(r"^[0-9a-f]{40}$")
TASK = re.compile(r"^[A-Z][A-Z0-9-]{1,63}$")
ALLOWED_BRANCHES = {
    "W01": "codex/v3-completion-core-20261017",
    "W03": "feature/v3.1-home-redesign",
}
ALLOWED_ACTIONS = frozenset({"implement", "test", "report"})

class TaskEnvelopeDenied(PermissionError):
    pass

def validate_envelope(envelope, *, registry, trusted_base_sha):
    """Validate immutable task scope, never self-attested authority."""
    if not isinstance(envelope, dict) or not isinstance(registry, dict):
        raise TaskEnvelopeDenied("invalid envelope or registry")
    if registry.get("activation") != "ENABLED":
        raise TaskEnvelopeDenied("worker runtime disabled")
    worker = envelope.get("worker")
    branch = envelope.get("branch")
    if worker not in ALLOWED_BRANCHES or branch != ALLOWED_BRANCHES[worker]:
        raise TaskEnvelopeDenied("worker/branch mismatch")
    if not TASK.fullmatch(str(envelope.get("task_id", ""))):
        raise TaskEnvelopeDenied("invalid task id")
    sha = envelope.get("base_sha")
    if not isinstance(sha, str) or not SHA.fullmatch(sha) or sha != trusted_base_sha:
        raise TaskEnvelopeDenied("base commit mismatch")
    actions = envelope.get("actions")
    if not isinstance(actions, list) or not actions or any(a not in ALLOWED_ACTIONS for a in actions):
        raise TaskEnvelopeDenied("unsupported action")
    if len(actions) != len(set(actions)):
        raise TaskEnvelopeDenied("duplicate action")
    if envelope.get("allow_paid_services") is not False:
        raise TaskEnvelopeDenied("paid services forbidden")
    if envelope.get("allow_merge") is not False or envelope.get("allow_release") is not False:
        raise TaskEnvelopeDenied("merge/release forbidden")
    if envelope.get("executor") in (None, "", "UNASSIGNED"):
        raise TaskEnvelopeDenied("coding runtime not configured")
    configured = registry.get("workers", [])
    matches = [w for w in configured if isinstance(w, dict) and w.get("id") == worker]
    if len(matches) != 1 or matches[0].get("activation") != "ENABLED":
        raise TaskEnvelopeDenied("worker not enabled")
    if matches[0].get("runtime") != envelope["executor"]:
        raise TaskEnvelopeDenied("untrusted executor")
    return {
        "task_id": envelope["task_id"],
        "worker": worker,
        "branch": branch,
        "base_sha": sha,
        "actions": tuple(actions),
        "executor": envelope["executor"],
    }
