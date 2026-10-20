"""Adversarial deterministic acceptance for one-blob atomic lease transitions."""
import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("worker_atomic_lease",Path(__file__).with_name("worker_atomic_lease.py"))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
NOW="2026-10-19T20:00:00Z"
def state():return {"schema_version":1,"epoch":0,"leases":{}}
def alice():return m.holder("alice","W01","100","1","trusted-github-actions")
def bob():return m.holder("bob","W02","101","1","trusted-github-actions")
def tx(s,identity=None,operation="claim",branch="branch-a",**kw):
    return m.transition(s,branch=branch,identity=identity or alice(),operation=operation,now=NOW,expected_epoch=s["epoch"],**kw)
class AtomicLeaseTests(unittest.TestCase):
    def test_claim_renew_release(self):
        s=tx(state());self.assertEqual(s["epoch"],1)
        s=tx(s,operation="renew");self.assertEqual(s["epoch"],2)
        s=tx(s,operation="release");self.assertEqual(s["leases"],{})
    def test_stale_epoch_denied(self):
        s=tx(state())
        with self.assertRaises(m.LeaseDenied):m.transition(s,branch="branch-b",identity=bob(),operation="claim",now=NOW,expected_epoch=0)
    def test_same_branch_and_worker_conflicts(self):
        s=tx(state())
        for branch,identity in (("branch-a",bob()),("branch-b",alice())):
            with self.subTest(branch=branch),self.assertRaises(m.LeaseDenied):tx(s,branch=branch,identity=identity)
    def test_different_workers_different_branches(self):
        s=tx(state());s=tx(s,branch="branch-b",identity=bob());self.assertEqual(len(s["leases"]),2)
    def test_unauthorized_replay_attempt_actor_and_role(self):
        s=tx(state())
        for field,value in (("actor","bob"),("worker","W02"),("run_id","102"),("attempt","2"),("issuer","untrusted")):
            ident=dict(alice(),**{field:value})
            with self.subTest(field=field),self.assertRaises(m.LeaseDenied):tx(s,identity=ident,operation="release")
    def test_expired_lease_denies_renew_and_reclaim(self):
        s=tx(state());s["leases"]["branch-a"]["expires_at"]="2026-10-19T19:00:00Z"
        for operation in ("renew","claim"):
            with self.subTest(operation=operation),self.assertRaises(m.LeaseDenied):tx(s,operation=operation)
    def test_recovery_needs_independent_approval(self):
        s=tx(state());s["leases"]["branch-a"]["expires_at"]="2026-10-19T19:00:00Z"
        with self.assertRaises(m.LeaseDenied):tx(s,identity=bob(),operation="recover")
        with self.assertRaises(m.LeaseDenied):tx(s,identity=dict(alice(),recovery_approved=True),operation="recover")
        s=tx(s,identity=dict(bob(),recovery_approved=True),operation="recover")
        self.assertEqual(s["leases"],{})
    def test_malformed_authority_denied(self):
        for s in ({},None,{"schema_version":1,"epoch":0,"leases":{"x":{"expires_at":"bad"}}}):
            with self.subTest(s=s),self.assertRaises(m.LeaseDenied):
                m.transition(s,branch="branch-a",identity=alice(),operation="claim",now=NOW,expected_epoch=0)
    def test_untrusted_issuer_denied(self):
        with self.assertRaises(m.LeaseDenied):m.holder("alice","W01","100","1","untrusted")
    def test_pure_transition_does_not_mutate_input(self):
        s=state();tx(s);self.assertEqual(s["epoch"],0);self.assertEqual(s["leases"],{})
if __name__=="__main__":unittest.main()
