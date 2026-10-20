"""Worker claim atomic-plan and adversarial tests."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("worker_claims", Path(__file__).with_name("worker_claims.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NOW = "2026-10-19T20:00:00Z"

def registry():
    return {"workers": {"W01": {"session_state": "UNKNOWN"}, "W02": {"session_state": "UNKNOWN"}},
            "tasks": [{"id": "T1", "owner": "W01", "status": "READY", "target_branch": "b1",
                       "depends_on": [], "lease": None},
                      {"id": "T2", "owner": "W02", "status": "READY", "target_branch": "b1",
                       "depends_on": [], "lease": None}]}

class ClaimTests(unittest.TestCase):
    def test_claim(self):
        original = registry()
        result = m.plan_claim(original, "T1", "W01", NOW, "audit:run-123")
        self.assertEqual(result["tasks"][0]["status"], "CLAIMED")
        self.assertEqual(original["tasks"][0]["status"], "READY")

    def test_branch_conflict(self):
        r = m.plan_claim(registry(), "T1", "W01", NOW, "audit:run-123")
        with self.assertRaisesRegex(ValueError, "branch already leased"):
            m.plan_claim(r, "T2", "W02", NOW, "audit:run-456")

    def test_wrong_owner(self):
        with self.assertRaises(ValueError):
            m.plan_claim(registry(), "T1", "W02", NOW, "audit:run-123")

    def test_no_secret_reference(self):
        with self.assertRaises(ValueError):
            m.plan_claim(registry(), "T1", "W01", NOW, "my-secret")

    def test_missing_dependency(self):
        r = registry()
        r["tasks"][0]["depends_on"] = ["missing"]
        with self.assertRaises(ValueError):
            m.plan_claim(r, "T1", "W01", NOW, "audit:run-123")

    def test_stopped_worker(self):
        r = registry()
        r["workers"]["W01"]["session_state"] = "STOPPED"
        with self.assertRaises(ValueError):
            m.plan_claim(r, "T1", "W01", NOW, "audit:run-123")

    def test_duplicate_task(self):
        r = registry()
        r["tasks"].append(r["tasks"][0].copy())
        with self.assertRaises(ValueError):
            m.plan_claim(r, "T1", "W01", NOW, "audit:run-123")

    def test_pending_branch_denied(self):
        r = registry()
        r["tasks"][0]["target_branch"] = "integration/pending"
        with self.assertRaises(ValueError):
            m.plan_claim(r, "T1", "W01", NOW, "audit:run-123")

    def test_same_worker_parallel_denied(self):
        r = registry()
        r["tasks"][1]["owner"] = "W01"
        r["tasks"][1]["target_branch"] = "b2"
        r = m.plan_claim(r, "T1", "W01", NOW, "audit:run-123")
        with self.assertRaisesRegex(ValueError, "worker already busy"):
            m.plan_claim(r, "T2", "W01", NOW, "audit:run-456")

    def test_expired_claim_rejected_until_recovery(self):
        r = registry()
        r["tasks"][0]["status"] = "CLAIMED"
        r["tasks"][0]["lease"] = {"worker": "W01", "expires_at": NOW}
        with self.assertRaises(ValueError):
            m.plan_claim(r, "T1", "W01", NOW, "audit:run-456")

if __name__ == "__main__":
    unittest.main()
