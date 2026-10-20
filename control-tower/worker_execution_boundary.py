"""Executable fail-closed security preflight for a future trusted worker runtime.

No live transaction or migration is enabled by this module. This verifier
requires trusted caller context and authoritative legacy exclusion evidence;
a self-declared issuer string is never sufficient.
"""
from worker_atomic_lease import holder,LeaseDenied
from worker_security_evidence import assert_no_legacy_writer

class RuntimeSecurityDenied(PermissionError):pass

def verify_execution_boundary(*,context,actor_worker_map,permission,legacy_registry,
                              branch,now,verified_by_protected_runner=False):
    if verified_by_protected_runner is not True:
        raise RuntimeSecurityDenied("independent protected runner attestation missing")
    if not isinstance(context,dict) or context.get("event_name")!="workflow_dispatch":
        raise RuntimeSecurityDenied("trusted event context missing")
    if context.get("repository")!="chinkk-git/Aariamagickitchen" or context.get("ref")!="refs/heads/main":
        raise RuntimeSecurityDenied("unprotected workflow origin")
    if context.get("workflow_ref")!="chinkk-git/Aariamagickitchen/.github/workflows/control-tower-guarded-transactions.yml@refs/heads/main":
        raise RuntimeSecurityDenied("untrusted workflow source")
    actor=context.get("actor")
    if not isinstance(actor,str) or context.get("sender")!=actor:
        raise RuntimeSecurityDenied("actor/sender mismatch")
    worker=context.get("worker")
    if not isinstance(actor_worker_map,dict) or worker not in actor_worker_map.get(actor,()):
        raise RuntimeSecurityDenied("protected role mapping denied")
    if permission not in {"write","maintain","admin"}:
        raise RuntimeSecurityDenied("collaborator permission denied")
    try:
        identity=holder(actor,worker,str(context.get("run_id","")),str(context.get("attempt","")),
                        "trusted-github-actions")
        assert_no_legacy_writer(legacy_registry,branch,now)
    except (PermissionError,ValueError,TypeError,KeyError) as exc:
        raise RuntimeSecurityDenied("legacy exclusion or holder verification denied") from exc
    # A snapshot of legacy tasks.json is not atomic with the new authority.
    # Refuse to grant authority until migration freezes legacy writers.
    raise RuntimeSecurityDenied("legacy registry not atomically fenced; execution remains blocked")
