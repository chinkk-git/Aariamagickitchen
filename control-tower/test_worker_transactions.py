import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("worker_transactions",Path(__file__).with_name("worker_transactions.py"))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
NOW="2026-10-19T20:00:00Z"
def registry():
    return {"workers":{"W01":{"session_state":"UNKNOWN"},"W02":{"session_state":"UNKNOWN"}},
            "tasks":[{"id":"A","owner":"W01","status":"READY","target_branch":"branch/a","depends_on":[],"lease":None},
                     {"id":"B","owner":"W02","status":"READY","target_branch":"branch/a","depends_on":[],"lease":None}]}
def tx(d,id="A",worker="W01",op="claim",now=NOW,ref="audit:one"):
    return m.transact(d,id,worker,op,now,ref)
class TransactionTests(unittest.TestCase):
    def test_claim(self):
        d=registry();self.assertEqual(tx(d)["tasks"][0]["status"],"CLAIMED");self.assertEqual(d["tasks"][0]["status"],"READY")
    def test_renew(self):
        d=tx(registry());self.assertEqual(tx(d,op="renew")["tasks"][0]["lease"]["expires_at"],"2026-10-19T20:15:00Z")
    def test_release(self):
        d=tx(registry());self.assertEqual(tx(d,op="release")["tasks"][0]["status"],"READY")
    def test_conflicting_branch(self):
        d=tx(registry())
        with self.assertRaises(ValueError):tx(d,"B","W02")
    def test_wrong_renew_credential(self):
        with self.assertRaises(ValueError):tx(tx(registry()),op="renew",ref="audit:other")
    def test_recovery_before_expiry(self):
        with self.assertRaises(ValueError):tx(tx(registry()),op="recover")
    def test_recovery_after_expiry(self):
        d=tx(registry());r=tx(d,op="recover",now="2026-10-19T20:15:00Z")
        self.assertEqual(r["tasks"][0]["status"],"BLOCKED")
        self.assertIsNone(r["tasks"][0]["lease"])
    def test_recovery_requires_handover(self):
        d=tx(registry());d["workers"]["W01"]["session_state"]="ACTIVE"
        with self.assertRaises(ValueError):tx(d,op="recover",now="2026-10-19T20:15:00Z")
    def test_reclaim_not_automatically_ready(self):
        d=tx(registry());d=tx(d,op="recover",now="2026-10-19T20:15:00Z")
        with self.assertRaises(ValueError):tx(d)
    def test_expired_renew_denied(self):
        with self.assertRaises(ValueError):tx(tx(registry()),op="renew",now="2026-10-19T20:15:00Z")
    def test_stopped_worker_claim_denied(self):
        d=registry();d["workers"]["W01"]["session_state"]="STOPPED"
        with self.assertRaises(ValueError):tx(d)
    def test_unverified_dependency(self):
        d=registry();d["tasks"][0]["depends_on"]=["B"]
        with self.assertRaises(ValueError):tx(d)
if __name__=="__main__":unittest.main()
