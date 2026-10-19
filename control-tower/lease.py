#!/usr/bin/env python3
"""Pure deterministic claim/release state machine. Storage CAS must be enforced by caller."""
import datetime as dt
UTC=dt.timezone.utc
def parse(t): return dt.datetime.fromisoformat(t.replace("Z","+00:00"))
def claim(record,worker,token,now,ttl=900):
    if not worker or not token or ttl<60 or ttl>3600: raise ValueError("invalid lease parameters")
    active=record.get("lease")
    if active and parse(active["expires_at"])>parse(now):
        raise ValueError("task already claimed")
    if record.get("status") not in ("READY","CLAIMED","IN_PROGRESS"): raise ValueError("task not ready")
    until=(parse(now)+dt.timedelta(seconds=ttl)).isoformat().replace("+00:00","Z")
    return {**record,"status":"CLAIMED","lease":{"worker":worker,"token":token,"claimed_at":now,"expires_at":until}}
def release(record,worker,token,now):
    lease=record.get("lease")
    if not lease or lease["worker"]!=worker or lease["token"]!=token: raise ValueError("lease owner mismatch")
    if parse(lease["expires_at"])<=parse(now): raise ValueError("lease expired")
    return {**record,"status":"READY","lease":None}
