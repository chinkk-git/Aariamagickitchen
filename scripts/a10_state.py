"""A10 pure task-state transitions; no GitHub or agent execution side effects."""
from dataclasses import dataclass
from datetime import datetime, timezone

TRANSITIONS = {
    "NEW": {"READY", "BLOCKED"},
    "READY": {"CLAIMED", "BLOCKED"},
    "CLAIMED": {"RUNNING", "READY", "BLOCKED"},
    "RUNNING": {"VERIFYING", "BLOCKED", "ESCALATED"},
    "VERIFYING": {"DONE", "READY", "BLOCKED", "ESCALATED"},
    "BLOCKED": {"READY", "ESCALATED"},
    "ESCALATED": {"READY"},
    "DONE": set(),
}

@dataclass(frozen=True)
class Task:
    key: str
    worker: str
    state: str = "NEW"
    attempt: int = 0
    lease_until: str = ""
    exact_sha: str = ""

def transition(task, next_state, *, now=None, lease_until="", exact_sha=""):
    if next_state not in TRANSITIONS.get(task.state, set()):
        raise ValueError(f"illegal transition: {task.state} -> {next_state}")
    if task.state == "READY" and next_state == "CLAIMED":
        if not lease_until or not exact_sha:
            raise ValueError("claim requires lease and exact SHA")
        from .a10_job_contract import SHA
        if not SHA.fullmatch(exact_sha):
            raise ValueError("invalid exact SHA")
        until = datetime.fromisoformat(lease_until.replace("Z", "+00:00"))
        clock = now or datetime.now(timezone.utc)
        if until.tzinfo is None or until <= clock:
            raise ValueError("claim requires a future timezone-aware lease")
        return Task(task.key, task.worker, next_state, task.attempt + 1,
                    lease_until, exact_sha)
    if next_state == "RUNNING":
        if not task.lease_until or not task.exact_sha:
            raise ValueError("missing claim lease or SHA")
        clock = now or datetime.now(timezone.utc)
        until = datetime.fromisoformat(task.lease_until.replace("Z", "+00:00"))
        if until.tzinfo is None or until <= clock:
            raise ValueError("expired or naive lease")
    if next_state == "VERIFYING":
        clock = now or datetime.now(timezone.utc)
        until = datetime.fromisoformat(task.lease_until.replace("Z", "+00:00"))
        if until <= clock:
            raise ValueError("cannot verify after lease expiration")
    return Task(task.key, task.worker, next_state, task.attempt,
                task.lease_until if next_state in {"RUNNING", "VERIFYING"} else "",
                task.exact_sha)
