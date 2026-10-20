"""Deterministic adversarial tests for advisory shared lease policy."""
import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("worker_shared_lease_policy",Path(__file__).with_name("worker_shared_lease_policy.py"))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
NOW="2026-10-19T20:00:00Z"
def holder():return m.holder_identity("alice","W01","123","1")
def lease():return dict(holder(),branch="branch-a",expires_at="2026-10-19T21:00:00Z")
class SharedAuthorityTests(unittest.TestCase):
    def test_empty_authority_claimable_only_as_advisory(self):
        self.assertTrue(m.assert_authority_claimable({"schema_version":1,"leases":[]},"branch-a","W01",NOW))
    def test_missing_or_malformed_authority_denied(self):
        for a in ({},None,{"schema_version":1,"leases":[{}]}):
            with self.subTest(a=a),self.assertRaises(m.LeaseAuthorityError):m.assert_authority_claimable(a,"branch-a","W01",NOW)
    def test_same_branch_and_same_worker_denied(self):
        for branch,worker in (("branch-a","W02"),("branch-b","W01")):
            with self.subTest(branch=branch,worker=worker),self.assertRaises(m.LeaseAuthorityError):
                m.assert_authority_claimable({"schema_version":1,"leases":[lease()]},branch,worker,NOW)
    def test_expired_lease_not_stolen(self):
        old=lease();old["expires_at"]="2026-10-19T19:00:00Z"
        with self.assertRaises(m.LeaseAuthorityError):m.assert_authority_claimable({"schema_version":1,"leases":[old]},"branch-a","W02",NOW)
    def test_duplicate_branch_denied(self):
        other=lease();other["worker"]="W02"
        with self.assertRaises(m.LeaseAuthorityError):m.assert_authority_claimable({"schema_version":1,"leases":[lease(),other]},"branch-z","W03",NOW)
    def test_exact_holder_match(self):
        self.assertTrue(m.assert_holder_matches(lease(),holder(),NOW))
    def test_actor_role_run_and_attempt_replay_denied(self):
        for field,value in (("actor","bob"),("worker","W02"),("run_id","124"),("attempt","2")):
            with self.subTest(field=field),self.assertRaises(m.LeaseAuthorityError):
                m.assert_holder_matches(lease(),dict(holder(),**{field:value}),NOW)
    def test_expired_renewal_denied(self):
        with self.assertRaises(m.LeaseAuthorityError):m.assert_holder_matches(lease(),holder(),"2026-10-19T22:00:00Z")
    def test_invalid_run_attempt_denied(self):
        for run,attempt in (("0","1"),("1","0"),("a","1"),("1","-1")):
            with self.subTest(run=run,attempt=attempt),self.assertRaises(m.LeaseAuthorityError):
                m.holder_identity("alice","W01",run,attempt)
if __name__=="__main__":unittest.main()
