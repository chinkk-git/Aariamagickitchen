"""Deterministic recovery decision engine, no worker restart or side effects."""
from worker_atomic_lease import instant

class RecoveryDenied(ValueError):
    pass

def classify(*, lease, now, owner_verified_stopped=False, independent_approval=False):
    current=instant(now)
    if lease is None:
        return {"decision":"NO_LEASE","may_restart":False}
    if not isinstance(lease,dict) or not isinstance(lease.get("expires_at"),str):
        raise RecoveryDenied("malformed lease")
    expiry=instant(lease["expires_at"])
    if expiry>current:
        return {"decision":"ACTIVE_HOLDER","may_restart":False}
    if owner_verified_stopped is not True:
        return {"decision":"QUARANTINE_UNCONFIRMED_WRITER","may_restart":False}
    if independent_approval is not True:
        return {"decision":"AWAIT_INDEPENDENT_APPROVAL","may_restart":False}
    return {"decision":"ELIGIBLE_FOR_TRUSTED_RECOVERY_REVIEW","may_restart":False}
