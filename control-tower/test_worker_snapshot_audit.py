"""Legacy cutover audit never converts a mutable snapshot into authority."""
import unittest
from worker_snapshot_audit import audit_snapshot

class SnapshotAuditTests(unittest.TestCase):
    def test_missing_legacy_fails(self):
        result = audit_snapshot(workers_registry={}, legacy_registry=None, evidence={}, trusted_head_sha="a"*40)
        self.assertFalse(result["activation_authorized"])
        self.assertIn("legacy registry unavailable", result["blockers"])
    def test_stopped_legacy_does_not_prove_fence(self):
        result = audit_snapshot(workers_registry={"activation": "DISABLED"}, legacy_registry={"sessions": {"V3.1": {"state": "STOPPED"}}}, evidence={}, trusted_head_sha="a"*40)
        self.assertFalse(result["ready_for_independent_review"])
        self.assertIn("legacy registry atomic fencing not proven by snapshot", result["blockers"])
    def test_unknown_legacy_does_not_prove_fence(self):
        result = audit_snapshot(workers_registry={"activation": "DISABLED"}, legacy_registry={"sessions": {"V3": {"state": "UNKNOWN"}}}, evidence={}, trusted_head_sha="a"*40)
        self.assertFalse(result["activation_authorized"])
    def test_malformed_legacy_denied(self):
        result = audit_snapshot(workers_registry={}, legacy_registry={"sessions": "STOPPED"}, evidence={}, trusted_head_sha="a"*40)
        self.assertIn("legacy session ownership not independently reconciled", result["blockers"])

if __name__ == "__main__":
    unittest.main()
