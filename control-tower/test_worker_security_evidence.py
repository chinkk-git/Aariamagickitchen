"""Adversarial advisory security checks; no network or write authorization."""
import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("worker_security_evidence",Path(__file__).with_name("worker_security_evidence.py"))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
NOW="2026-10-19T20:00:00Z";BRANCH="control-tower/worker-control-plan-20261019"
def registry():
    return {"workers":{"v3":{"branch":"other","session_state":"UNKNOWN","writer":"V3"}},
            "tasks":[{"id":"CT25","target_branch":"other","status":"VERIFIED","lease":None}]}
class EvidenceTests(unittest.TestCase):
    def test_unrelated_writer_does_not_block_advisory_check(self):
        self.assertTrue(m.assert_no_legacy_writer(registry(),BRANCH,NOW))
    def test_same_branch_writer_denied(self):
        r=registry();r["workers"]["v3"]["branch"]=BRANCH
        with self.assertRaises(m.SecurityEvidenceError):m.assert_no_legacy_writer(r,BRANCH,NOW)
    def test_unknown_session_denied_even_without_writer(self):
        r=registry();r["workers"]["v3"].update(branch=BRANCH,writer=None)
        with self.assertRaises(m.SecurityEvidenceError):m.assert_no_legacy_writer(r,BRANCH,NOW)
    def test_live_and_expired_leases_both_denied(self):
        for expires in ("2026-10-19T21:00:00Z","2026-10-19T19:00:00Z"):
            with self.subTest(expires=expires):
                r=registry();r["tasks"][0].update(target_branch=BRANCH,lease={"expires_at":expires})
                with self.assertRaises(m.SecurityEvidenceError):m.assert_no_legacy_writer(r,BRANCH,NOW)
    def test_active_task_without_lease_denied(self):
        r=registry();r["tasks"][0].update(target_branch=BRANCH,status="CLAIMED")
        with self.assertRaises(m.SecurityEvidenceError):m.assert_no_legacy_writer(r,BRANCH,NOW)
    def test_malformed_or_missing_registry_denied(self):
        for r in ({},None,{"workers":{},"tasks":[{}]}):
            with self.subTest(r=r),self.assertRaises(m.SecurityEvidenceError):m.assert_no_legacy_writer(r,BRANCH,NOW)
    def test_valid_holder_context(self):
        self.assertEqual(m.validate_holder_context(actor="alice",worker="W01",run_id="12",attempt="2",authenticated_actor="alice",assigned_roles={"W01"}),("alice","W01","12","2"))
    def test_replay_role_and_actor_mismatch_denied(self):
        for kwargs in ({"actor":"bob"},{"assigned_roles":{"W02"}},{"attempt":"bogus"},{"run_id":""},{"authenticated_actor":"mallory"}):
            args=dict(actor="alice",worker="W01",run_id="12",attempt="2",authenticated_actor="alice",assigned_roles={"W01"});args.update(kwargs)
            with self.subTest(kwargs=kwargs),self.assertRaises(m.SecurityEvidenceError):m.validate_holder_context(**args)
if __name__=="__main__":unittest.main()
