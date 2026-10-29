import unittest
from worker_recovery_policy import classify,RecoveryDenied
NOW="2026-10-20T10:00:00Z"
class RecoveryTests(unittest.TestCase):
    def test_missing(self):
        self.assertEqual(classify(lease=None,now=NOW)["decision"],"NO_LEASE")
    def test_active(self):
        self.assertEqual(classify(lease={"expires_at":"2026-10-20T11:00:00Z"},now=NOW)["decision"],"ACTIVE_HOLDER")
    def test_expired_quarantine(self):
        result=classify(lease={"expires_at":"2026-10-20T09:00:00Z"},now=NOW)
        self.assertEqual(result["decision"],"QUARANTINE_UNCONFIRMED_WRITER")
        self.assertFalse(result["may_restart"])
    def test_independent_review_still_not_restart(self):
        result=classify(lease={"expires_at":"2026-10-20T09:00:00Z"},now=NOW,owner_verified_stopped=True,independent_approval=True)
        self.assertEqual(result["decision"],"ELIGIBLE_FOR_TRUSTED_RECOVERY_REVIEW")
        self.assertFalse(result["may_restart"])
    def test_malformed_denied(self):
        with self.assertRaises(RecoveryDenied):
            classify(lease={},now=NOW)
if __name__=="__main__":unittest.main()
