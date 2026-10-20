"""Trusted transaction executor for an eventual GitHub Actions integration.

The caller must provide authenticated GitHub actor and permission metadata from
a trusted API, plus a private capability handle. The capability is never logged
or persisted. This module makes no network requests and cannot activate workers.
"""
import hmac
from worker_github_cas import cas_update, ConflictError
from worker_transactions import transact


def execute(api, *, owner, repo, branch, actor, permission, allowed_actors,
            trusted_actor, capability, expected_capability, task_id, worker,
            operation, now, audit_ref, ttl=900):
    if not trusted_actor or actor != trusted_actor:
        raise PermissionError("actor does not match authenticated GitHub context")
    if not isinstance(capability, str) or not isinstance(expected_capability, str):
        raise PermissionError("missing private capability")
    if len(capability) < 32 or len(expected_capability) < 32 or not hmac.compare_digest(capability, expected_capability):
        raise PermissionError("invalid private capability")
    if branch != "control-tower/worker-control-plan-20261019":
        raise PermissionError("only isolated control tower branch permitted")
    def change(doc):
        if doc.get("activation") != "ENABLED":
            raise PermissionError("worker transactions are disabled")
        return transact(doc, task_id, worker, operation, now, audit_ref, ttl)
    return cas_update(api, owner, repo, branch, "control-tower/worker-runtime.json",
                      change, actor, allowed_actors, permission)
