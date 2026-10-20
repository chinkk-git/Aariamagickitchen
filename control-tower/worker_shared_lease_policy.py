"""Pure advisory shared-authority lease policy.

This module specifies a future single authoritative CAS domain. It cannot
authorize GitHub writes, and must not be used as a substitute for a trusted
issuer, independent reviewer or atomic storage adapter.
"""
from datetime import datetime,timezone

class LeaseAuthorityError(PermissionError):pass

def _time(value):
    if not isinstance(value,str):raise LeaseAuthorityError("timestamp missing")
    try:dt=datetime.fromisoformat(value.replace("Z","+00:00"))
    except ValueError as exc:raise LeaseAuthorityError("invalid timestamp") from exc
    if dt.tzinfo is None:raise LeaseAuthorityError("timezone required")
    return dt.astimezone(timezone.utc)

def holder_identity(actor,worker,run_id,attempt):
    if not all(isinstance(v,str) and v for v in (actor,worker,run_id,attempt)):
        raise LeaseAuthorityError("holder identity missing")
    if not run_id.isdecimal() or not attempt.isdecimal() or int(run_id)<1 or int(attempt)<1:
        raise LeaseAuthorityError("invalid run identity")
    return {"actor":actor,"worker":worker,"run_id":run_id,"attempt":attempt}

def assert_authority_claimable(authority,branch,worker,now):
    """Validate a snapshot only; caller still requires one atomic shared CAS."""
    if not isinstance(authority,dict) or authority.get("schema_version")!=1 or not isinstance(authority.get("leases"),list):
        raise LeaseAuthorityError("shared authority unavailable")
    if not isinstance(branch,str) or not branch or not isinstance(worker,str) or not worker:
        raise LeaseAuthorityError("branch or worker missing")
    instant=_time(now)
    seen=set()
    for lease in authority["leases"]:
        if not isinstance(lease,dict) or not all(isinstance(lease.get(k),str) and lease[k] for k in ("branch","worker","expires_at")):
            raise LeaseAuthorityError("malformed lease")
        key=lease["branch"]
        if key in seen:raise LeaseAuthorityError("duplicate branch lease")
        seen.add(key)
        # Expired leases still need verified writer handover; never auto-steal.
        if lease["branch"]==branch or lease["worker"]==worker:
            raise LeaseAuthorityError("existing or expired lease requires verified handover")
        _time(lease["expires_at"])
    return True

def assert_holder_matches(lease,holder,now):
    """Exact holder match; NOT a proof that the holder was authenticated."""
    if not isinstance(lease,dict) or not isinstance(holder,dict):
        raise LeaseAuthorityError("lease holder missing")
    if _time(lease.get("expires_at"))<=_time(now):
        raise LeaseAuthorityError("lease expired")
    for field in ("actor","worker","run_id","attempt"):
        if not isinstance(lease.get(field),str) or lease[field]!=holder.get(field):
            raise LeaseAuthorityError("lease holder mismatch")
    return True
