"""Whole-file GitHub Contents API CAS; stale updates fail without retry."""
import base64
import json
OWNER="chinkk-git"
REPOSITORY="Aariamagickitchen"
TARGET_BRANCH="control-tower/worker-control-plan-20261019"
REGISTRY_PATH="control-tower/worker-runtime.json"
class ConflictError(RuntimeError): pass
def actor_authorized(actor,allowed,permission):
    return bool(actor and actor in allowed and permission in {"write","maintain","admin"})
def cas_update(api,owner,repo,branch,path,transform,actor,allowed,permission):
    if (owner,repo,branch,path)!=(OWNER,REPOSITORY,TARGET_BRANCH,REGISTRY_PATH):
        raise PermissionError("repository, branch, or registry path outside allowlist")
    if not actor_authorized(actor,allowed,permission):
        raise PermissionError("GitHub actor lacks trusted write authority")
    file=api.get_content(owner=owner,repo=repo,path=path,ref=branch)
    if not isinstance(file,dict) or not isinstance(file.get("sha"),str) or not file["sha"]:
        raise ValueError("missing expected blob SHA")
    if file.get("encoding","base64")!="base64" or not isinstance(file.get("content"),str):
        raise ValueError("registry content is not base64")
    compact="".join(ch for ch in file["content"] if ch not in " \t\r\n")
    try: old=json.loads(base64.b64decode(compact,validate=True).decode("utf-8"))
    except (ValueError,UnicodeDecodeError,json.JSONDecodeError) as exc:
        raise ValueError("invalid authoritative registry") from exc
    if not isinstance(old,dict): raise ValueError("registry must be an object")
    updated=transform(old)
    if not isinstance(updated,dict): raise ValueError("invalid transaction result")
    if updated is old: raise ValueError("transaction must return an independent document")
    if old.get("activation") != "DISABLED" or updated.get("activation") != "DISABLED":
        raise PermissionError("CAS cannot activate workers")
    if old.get("cost_policy") != "NO_ADDITIONAL_CHARGES" or updated.get("cost_policy") != "NO_ADDITIONAL_CHARGES":
        raise PermissionError("CAS cannot change cost policy")
    encoded=base64.b64encode((json.dumps(updated,indent=2,sort_keys=True)+"\n").encode()).decode("ascii")
    try:
        return api.put_content(owner=owner,repo=repo,branch=branch,path=path,sha=file["sha"],
            content=encoded,message="control-tower: trusted atomic registry transaction")
    except Exception as exc:
        if getattr(exc,"status",None) in {409,422}:
            raise ConflictError("concurrent update rejected; re-read and revalidate") from exc
        raise
