"""Fail-closed executor for the isolated Control Tower runtime registry."""
from worker_github_cas import cas_update,ConflictError,OWNER,REPOSITORY,TARGET_BRANCH,REGISTRY_PATH
from worker_transactions import transact
WORKER_IDS={"W01","W02","W03","W04"}
def execute(api,*,owner,repo,branch,actor,permission,actor_worker_map,task_id,worker,operation,now,audit_ref,ttl=900):
    if (owner,repo,branch)!=(OWNER,REPOSITORY,TARGET_BRANCH):
        raise PermissionError("only isolated Control Tower registry branch is writable")
    if worker not in WORKER_IDS or not isinstance(actor_worker_map,dict):
        raise PermissionError("unknown worker role")
    if worker not in actor_worker_map.get(actor,set()):
        raise PermissionError("authenticated actor is not mapped to this worker role")
    allowed={login for login,roles in actor_worker_map.items() if isinstance(roles,(set,frozenset)) and roles}
    def change(doc):
        if doc.get("activation")!="ENABLED": raise PermissionError("worker transactions are disabled")
        matches=[t for t in doc.get("tasks",[]) if t.get("id")==task_id]
        if len(matches)!=1 or matches[0].get("target_branch")!=branch:
            raise PermissionError("worker transaction is restricted to the isolated Control Tower branch")
        return transact(doc,task_id,worker,operation,now,audit_ref,ttl)
    return cas_update(api,owner,repo,branch,REGISTRY_PATH,change,actor,allowed,permission)
