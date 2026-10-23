import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.a10_state import Task, transition

class StateTests(unittest.TestCase):
    def test_lifecycle(self):
        t = transition(Task("#47", "A10"), "READY")
        t = transition(t, "CLAIMED", lease_until="2099-01-01T00:00:00Z", exact_sha="a"*40)
        self.assertEqual(t.attempt, 1)
        t = transition(t, "RUNNING", now=datetime(2026, 10, 22, tzinfo=timezone.utc))
        t = transition(t, "VERIFYING")
        self.assertEqual(transition(t, "DONE").state, "DONE")

    def test_cannot_skip_review(self):
        with self.assertRaises(ValueError):
            transition(Task("#47", "A10"), "DONE")

    def test_claim_requires_exact_sha(self):
        with self.assertRaises(ValueError):
            transition(Task("#47", "A10", "READY"), "CLAIMED",
                       lease_until="2099-01-01T00:00:00Z", exact_sha="main")

    def test_expired_lease_blocks_execution(self):
        with self.assertRaises(ValueError):
            transition(Task("#47", "A10", "READY"), "CLAIMED",
                       lease_until="2020-01-01T00:00:00Z", exact_sha="a"*40,
                       now=datetime(2026, 10, 22, tzinfo=timezone.utc))

    def test_expired_lease_blocks_verification(self):
        t = transition(Task("#47", "A10", "READY"), "CLAIMED",
                       lease_until="2026-10-23T00:00:00Z", exact_sha="a"*40,
                       now=datetime(2026, 10, 22, tzinfo=timezone.utc))
        t = transition(t, "RUNNING", now=datetime(2026, 10, 22, tzinfo=timezone.utc))
        with self.assertRaises(ValueError):
            transition(t, "VERIFYING", now=datetime(2026, 10, 24, tzinfo=timezone.utc))

    def test_expired_lease_blocks_completion(self):
        t = transition(Task("#47", "A10", "READY"), "CLAIMED",
                       lease_until="2026-10-23T00:00:00Z", exact_sha="a"*40,
                       now=datetime(2026, 10, 22, tzinfo=timezone.utc))
        t = transition(t, "RUNNING", now=datetime(2026, 10, 22, tzinfo=timezone.utc))
        t = transition(t, "VERIFYING", now=datetime(2026, 10, 22, tzinfo=timezone.utc))
        with self.assertRaises(ValueError):
            transition(t, "DONE", now=datetime(2026, 10, 24, tzinfo=timezone.utc))

    def test_done_is_terminal(self):
        with self.assertRaises(ValueError):
            transition(Task("#47", "A10", "DONE"), "READY")

if __name__ == "__main__":
    unittest.main()
