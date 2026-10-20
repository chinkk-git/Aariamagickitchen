"""Single-authority atomic lease state machine (pure, no GitHub writes).

The entire lease map must be stored in ONE CAS-protected blob. A trusted
GitHub Actions adapter must authenticate the caller and obtain a stable
server-side holder binding before invoking this model. No runtime activation.
"""
from copy import deepcopy
from datetime import datetime,timedelta,timezone

class LeaseDenied(PermissionError):pass

def instant(value):
    if not isinstance(value,str):raise LeaseDenied("timestamp missing")
    try:t=datetime.fromisoformat(value.replace("Z","+00:00"))
    except ValueError as exc:raise LeaseDenied("timestamp invalid") from exc
    if t.tzinfo is None:raise LeaseDenied("timezone required")
    return t.astimezone(timezone.utc)

def holder(actor,worker,run_id,attempt,issuer):
    if not all(isinstance(v,str) and v for v in (actor,worker,run_id,attempt,issuer)):
        raise LeaseDenied("authenticated holder context missing")
    if not run_id.isdecimal() or not attempt.isdecimal() or int(run_id)<1 or int(attempt)<1:
        raise LeaseDenied("invalid run identity")
    if issuer!="trusted-github-actions":raise LeaseDenied("untrusted identity issuer")
    return {"actor":actor,"worker":worker,"run_id":run_id,"attempt":attempt,"issuer":issuer}

def transition(registry,*,branch,identity,operation,now,ttl=900,expected_epoch=None):
    """Pure state transition. CAS storage must compare the entire registry SHA."""
    if not isinstance(registry,dict) or registry.get("schema_version")!=1 or not isinstance(registry.get("leases"),dict):
        raise LeaseDenied("single authority missing")
    if not isinstance(branch,str) or not branch or not isinstance(identity,dict):
        raise LeaseDenied("invalid request")
    if branch not in {"codex/v3-completion-core-20261017","feature/v3.1-home-redesign"}:\n        raise LeaseDenied("branch outside protected worker scope")\n    if identity.get("worker") not in {"W01","W03"} or (identity.get("worker")=="W01" and branch!="codex/v3-completion-core-20261017") or (identity.get("worker")=="W03" and branch!="feature/v3.1-home-redesign"):\n        raise LeaseDenied("worker/branch policy mismatch")\n    if operation not in {"claim","renew","release","recover"}:raise LeaseDenied("invalid operation")
    if type(ttl) is not int or not 60<=ttl<=3600:raise LeaseDenied("invalid TTL")
    if not isinstance(expected_epoch,int) or isinstance(expected_epoch,bool) or expected_epoch<0:
        raise LeaseDenied("expected epoch required")
    if not isinstance(registry.get("epoch"),int) or isinstance(registry["epoch"],bool) or registry["epoch"]!=expected_epoch:
        raise LeaseDenied("stale authority epoch")
    current=instant(now)
    for field in ("actor","worker","run_id","attempt","issuer"):
        if not isinstance(identity.get(field),str) or not identity[field]:raise LeaseDenied("holder identity incomplete")
    if identity["issuer"]!="trusted-github-actions":raise LeaseDenied("holder issuer invalid")
    if not identity["run_id"].isdecimal() or not identity["attempt"].isdecimal() or int(identity["run_id"])<1 or int(identity["attempt"])<1:
        raise LeaseDenied("run identity invalid")
    leases=registry["leases"]
    for key,value in leases.items():
        if not isinstance(key,str) or not isinstance(value,dict) or not isinstance(value.get("expires_at"),str):
            raise LeaseDenied("corrupt authoritative lease")
        instant(value["expires_at"])
    active=leases.get(branch)
    if operation=="claim":
        if active is not None:raise LeaseDenied("existing lease requires explicit release or recovery")
        if any(v.get("worker")==identity["worker"] for v in leases.values()):
            raise LeaseDenied("worker already owns another branch")
    elif operation in {"renew","release"}:
        if active is None or instant(active["expires_at"])<=current:
            raise LeaseDenied("lease absent or expired")
        if any(active.get(k)!=identity[k] for k in ("actor","worker","run_id","attempt","issuer")):
            raise LeaseDenied("authenticated lease holder mismatch")
    else:
        if active is None or instant(active["expires_at"])>current:
            raise LeaseDenied("only expired leases can be recovered")
        # Recovery needs a distinct trusted operator and an explicit handover.
        if identity["worker"]==active.get("worker") or identity.get("actor")==active.get("actor"):
            raise LeaseDenied("recovery requires independent operator")
        if identity.get("recovery_approved") is not True:
            raise LeaseDenied("independent recovery approval required")
    out=deepcopy(registry)
    if operation=="claim":
        out["leases"][branch]={**{k:identity[k] for k in ("actor","worker","run_id","attempt","issuer")},
                               "expires_at":(current+timedelta(seconds=ttl)).isoformat()}
    elif operation=="renew":
        out["leases"][branch]["expires_at"]=(current+timedelta(seconds=ttl)).isoformat()
    else:
        del out["leases"][branch]
    out["epoch"]+=1
    return out
