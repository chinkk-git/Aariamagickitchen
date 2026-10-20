import unittest
from worker_activation_audit import audit_registry,audit_workflow,ActivationAuditDenied
def registry():
    return {"activation":"DISABLED","cost_policy":"NO_ADDITIONAL_CHARGES","workers":[{"id":f"W{i:02d}","activation":"DISABLED","runtime":"UNASSIGNED","can_self_approve":False} for i in range(1,11)]}
WF='CT_TRANSACTION_ENABLED: "0"\nif: ${{ false }}\nenvironment: worker-control-runtime'
class AuditTests(unittest.TestCase):
    def test_disabled(self):
        self.assertTrue(audit_registry(registry()))
        self.assertTrue(audit_workflow(WF))
    def test_worker_activation_denied(self):
        for field,value in (("activation","ENABLED"),("runtime","external"),("can_self_approve",True)):
            r=registry();r["workers"][0][field]=value
            with self.assertRaises(ActivationAuditDenied):
                audit_registry(r)
    def test_missing_worker_denied(self):
        r=registry();r["workers"].pop()
        with self.assertRaises(ActivationAuditDenied):
            audit_registry(r)
    def test_global_activation_denied(self):
        r=registry();r["activation"]="ENABLED"
        with self.assertRaises(ActivationAuditDenied):
            audit_registry(r)
    def test_guard_mutation_denied(self):
        for changed in (WF.replace('"0"','"1"'),WF.replace('false','true'),WF.replace('worker-control-runtime','unprotected')):
            with self.assertRaises(ActivationAuditDenied):
                audit_workflow(changed)
if __name__=="__main__":unittest.main()
