"""Pure renewable-lease operations. Persist only with atomic GitHub SHA CAS.

Tokens must be secret in a trusted execution environment. Never use issue comments
or publicly committed task registries as credential stores.
"""
from datetime import datetime, timedelta, timezone


def instant(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timezone required")
    return parsed


def expiry(now, ttl):
    if not isinstance(ttl, int) or not 60 <= ttl <= 3600:
        raise ValueError("invalid ttl")
    return (instant(now) + timedelta(seconds=ttl)).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def renew(record, worker, token, now, ttl=900):
    lease = record.get("lease")
    if not lease or not worker or not token:
        raise ValueError("missing lease")
    if lease.get("worker") != worker or lease.get("token") != token:
        raise ValueError("lease owner mismatch")
    if instant(lease["expires_at"]) <= instant(now):
        raise ValueError("expired lease cannot renew")
    if record.get("status") not in {"CLAIMED", "IN_PROGRESS"}:
        raise ValueError("task not active")
    return {**record, "lease": {**lease, "expires_at": expiry(now, ttl),
                                "last_renewed_at": now}}


def reclaimable(record, now):
    lease = record.get("lease")
    return bool(lease and instant(lease["expires_at"]) <= instant(now))


def verify_branch_exclusion(tasks, now):
    """Reject two simultaneously leased tasks targeting the same branch."""
    branches = set()
    for task in tasks:
        lease = task.get("lease")
        if not lease or instant(lease["expires_at"]) <= instant(now):
            continue
        branch = task.get("target_branch")
        if not branch:
            raise ValueError("active task missing target branch")
        if branch in branches:
            raise ValueError("concurrent branch writer detected")
        branches.add(branch)
    return True
