"""Read-only policy audit of worker and workflow activation controls.

This is a static defense-in-depth check, not a security review or proof that
external actors cannot modify GitHub configuration.
"""
import json
from pathlib import Path

class ActivationAuditDenied(PermissionError):
    pass

def audit_registry(registry):
    if not isinstance(registry,dict) or registry.get("activation")!="DISABLED" or registry.get("cost_policy")!="NO_ADDITIONAL_CHARGES":
        raise ActivationAuditDenied("global worker activation or cost policy unsafe")
    workers=registry.get("workers")
    if not isinstance(workers,list) or len(workers)!=10:
        raise ActivationAuditDenied("worker registry incomplete")
    expected={f"W{i:02d}" for i in range(1,11)}
    ids=[w.get("id") for w in workers if isinstance(w,dict)]
    if set(ids)!=expected or len(ids)!=len(set(ids)):
        raise ActivationAuditDenied("worker identity registry mismatch")
    for worker in workers:
        if worker.get("activation")!="DISABLED" or worker.get("runtime")!="UNASSIGNED" or worker.get("can_self_approve") is not False:
            raise ActivationAuditDenied("worker runtime or self-approval unsafe")
    return True

def audit_workflow(text):
    if not isinstance(text,str):
        raise ActivationAuditDenied("workflow missing")
    # These checks are deliberately strict and tied to the disabled workflow.
    if 'CT_TRANSACTION_ENABLED: "0"' not in text or 'if: ${{ false }}' not in text:
        raise ActivationAuditDenied("guarded transaction no longer hard-disabled")
    if "worker-control-runtime" not in text:
        raise ActivationAuditDenied("protected environment missing")
    return True

def audit_checkout(root):
    root=Path(root)
    audit_registry(json.loads((root/"control-tower/workers.json").read_text()))
    audit_workflow((root/".github/workflows/control-tower-guarded-transactions.yml").read_text())
    return True

if __name__=="__main__":
    audit_checkout(Path(__file__).resolve().parent.parent)
    print("PASS: static activation safeguards remain disabled")
