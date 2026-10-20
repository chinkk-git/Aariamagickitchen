"""Renewable lease contract tests, including exact expiry boundary."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("worker_leases", Path(__file__).with_name("worker_leases.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NOW = "2026-10-19T20:00:00Z"


def record(expires="2026-10-19T20:10:00Z"):
    return {"status": "IN_PROGRESS", "target_branch": "b", "lease":
            {"worker": "W01", "token": "secret-test-token", "expires_at": expires}}


class LeaseTests(unittest.TestCase):
    def test_renew(self):
        new = m.renew(record(), "W01", "secret-test-token", NOW, 900)
        self.assertEqual(new["lease"]["expires_at"], "2026-10-19T20:15:00Z")

    def test_original_not_mutated(self):
        old = record()
        m.renew(old, "W01", "secret-test-token", NOW)
        self.assertNotIn("last_renewed_at", old["lease"])

    def test_wrong_worker(self):
        with self.assertRaises(ValueError):
            m.renew(record(), "W02", "secret-test-token", NOW)

    def test_wrong_token(self):
        with self.assertRaises(ValueError):
            m.renew(record(), "W01", "incorrect", NOW)

    def test_exact_expiry_denied(self):
        with self.assertRaises(ValueError):
            m.renew(record(NOW), "W01", "secret-test-token", NOW)

    def test_expiry_reclaimable(self):
        self.assertTrue(m.reclaimable(record(NOW), NOW))

    def test_duplicate_branch_rejected(self):
        a, b = record(), record()
        b["lease"]["worker"] = "W02"
        with self.assertRaises(ValueError):
            m.verify_branch_exclusion([a, b], NOW)

    def test_expired_branch_does_not_block(self):
        self.assertTrue(m.verify_branch_exclusion([record(), record(NOW)], NOW))

    def test_missing_branch_rejected(self):
        a = record()
        a["target_branch"] = None
        with self.assertRaises(ValueError):
            m.verify_branch_exclusion([a], NOW)

    def test_invalid_ttl(self):
        with self.assertRaises(ValueError):
            m.renew(record(), "W01", "secret-test-token", NOW, 7200)


if __name__ == "__main__":
    unittest.main()
