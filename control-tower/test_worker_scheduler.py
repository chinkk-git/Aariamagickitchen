"""Deterministic scheduler contract tests."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("worker_scheduler", Path(__file__).with_name("worker_scheduler.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NOW = "2026-10-19T20:00:00Z"


def task(id, owner="v3", status="READY", branch="branch/a", deps=None, lease=None, priority=0):
    return {"id": id, "owner": owner, "status": status, "target_branch": branch,
            "depends_on": deps or [], "lease": lease, "priority": priority}


class SchedulerTests(unittest.TestCase):
    def test_ready(self):
        r = {"workers": {"v3": {"session_state": "UNKNOWN"}}, "tasks": [task("A")]}
        self.assertEqual(m.eligible_tasks(r, "v3", NOW), ["A"])

    def test_dependency_blocks(self):
        r = {"workers": {"v3": {}}, "tasks": [task("A", deps=["B"]), task("B", status="BLOCKED")]}
        self.assertEqual(m.eligible_tasks(r, "v3", NOW), [])

    def test_branch_collision(self):
        active = {"worker": "v31", "expires_at": "2026-10-19T20:10:00Z"}
        r = {"workers": {"v3": {}, "v31": {}}, "tasks": [task("A"), task("B", "v31", "IN_PROGRESS", lease=active)]}
        self.assertEqual(m.eligible_tasks(r, "v3", NOW), [])

    def test_expired_branch_lease(self):
        expired = {"worker": "v31", "expires_at": NOW}
        r = {"workers": {"v3": {}, "v31": {}}, "tasks": [task("A"), task("B", "v31", "IN_PROGRESS", lease=expired)]}
        self.assertEqual(m.eligible_tasks(r, "v3", NOW), ["A"])

    def test_stopped_worker(self):
        r = {"workers": {"v3": {"session_state": "STOPPED"}}, "tasks": [task("A")]}
        self.assertEqual(m.eligible_tasks(r, "v3", NOW), [])

    def test_priority_and_stable_tiebreak(self):
        r = {"workers": {"v3": {}}, "tasks": [task("B", branch="b"), task("C", branch="c", priority=2), task("A", branch="a")]}
        self.assertEqual(m.eligible_tasks(r, "v3", NOW), ["C", "A", "B"])

    def test_unknown_worker_rejected(self):
        with self.assertRaises(ValueError):
            m.eligible_tasks({"workers": {}, "tasks": []}, "missing", NOW)


if __name__ == "__main__":
    unittest.main()
