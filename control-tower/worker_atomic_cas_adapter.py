"""Offline single-authority GitHub blob-SHA CAS adapter; NEVER a live entrypoint.

The authority registry must be the only writer-lease source for ALL branches.
No production migration or activation is performed by this module.
"""
import base64,json
from worker_atomic_lease import LeaseDenied,transition
from worker_github_cas import OWNER,REPOSITORY,TARGET_BRANCH,ConflictError

AUTHORITY_PATH="control-tower/worker-lease-authority.json"

def apply_atomic_lease(api,*,owner,repo,branch,path,identity,operation,target_branch,now,
                       expected_epoch,permission,allowed_actors,ttl=900):
    """Prepare one CAS write; caller MUST supply independently verified identity.

    API is injected for offline tests. This function is deliberately not called
    by the disabled production executor or GitHub Actions runtime.
    """
    if (owner,repo,branch,path)!=(OWNER,REPOSITORY,TARGET_BRANCH,AUTHORITY_PATH):
        raise PermissionError("authority scope denied")
    if not isinstance(identity,dict) or identity.get("issuer")!="trusted-github-actions":
        raise PermissionError("trusted identity missing")
    actor=identity.get("actor")
    if not isinstance(allowed_actors,(set,frozenset)) or actor not in allowed_actors:
        raise PermissionError("actor not in protected role map")
    if permission not in {"write","maintain","admin"}:
        raise PermissionError("collaborator permission denied")
    file=api.get_content(owner=owner,repo=repo,path=path,ref=branch)
    if not isinstance(file,dict) or not isinstance(file.get("sha"),str) or not file["sha"]:
        raise LeaseDenied("authoritative blob SHA missing")
    if file.get("encoding")!="base64" or not isinstance(file.get("content"),str):
        raise LeaseDenied("authoritative blob encoding invalid")
    try:
        raw=base64.b64decode("".join(file["content"].split()),validate=True)
        doc=json.loads(raw.decode("utf-8"))
    except (ValueError,UnicodeDecodeError) as exc:
        raise LeaseDenied("invalid authority registry") from exc
    updated=transition(doc,branch=target_branch,identity=identity,operation=operation,
                       now=now,ttl=ttl,expected_epoch=expected_epoch)
    payload=base64.b64encode((json.dumps(updated,sort_keys=True,indent=2)+"\n").encode()).decode()
    try:
        return api.put_content(owner=owner,repo=repo,branch=branch,path=path,sha=file["sha"],
                               content=payload,message="control-tower: offline-authorized lease CAS")
    except Exception as exc:
        if getattr(exc,"status",None) in {409,422}:
            raise ConflictError("stale lease authority blob rejected") from exc
        raise
