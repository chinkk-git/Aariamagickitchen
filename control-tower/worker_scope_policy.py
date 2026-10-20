"""Scope validation at the adapter boundary, not in the generic lease model."""
from worker_task_envelope import ALLOWED_BRANCHES

class WorkerScopeDenied(PermissionError):
    pass

def assert_worker_scope(*, worker, branch, operation):
    if not isinstance(worker,str) or not isinstance(branch,str):
        raise WorkerScopeDenied("missing worker scope")
    if worker not in ALLOWED_BRANCHES or branch != ALLOWED_BRANCHES[worker]:
        raise WorkerScopeDenied("worker/branch policy mismatch")
    if operation not in {"claim","renew","release","recover"}:
        raise WorkerScopeDenied("unsupported lease operation")
    return True
