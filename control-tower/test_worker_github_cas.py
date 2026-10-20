"""CAS adapter tests; simulated API enforces stale-SHA rejection."""
import base64
import copy
import importlib.util
import json
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("worker_github_cas", Path(__file__).with_name("worker_github_cas.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class Api:
    def __init__(self):
        self.data = {"version": 0}
        self.sha = "blob0"
        self.calls = 0
    def get_content(self, **kwargs):
        return {"sha": self.sha, "content": base64.b64encode(json.dumps(self.data).encode()).decode()}
    def put_content(self, **kwargs):
        self.calls += 1
        if kwargs["sha"] != self.sha:
            error = RuntimeError("stale SHA")
            error.status = 409
            raise error
        self.data = json.loads(base64.b64decode(kwargs["content"]))
        self.sha = "blob1"
        return {"sha": self.sha}

class CasTests(unittest.TestCase):
    def run_tx(self, api, actor="trusted", permission="write", transform=lambda d: {**d, "version": d["version"] + 1}):
        return m.cas_update(api, "owner", "repo", "branch", "tasks.json", transform, actor, {"trusted"}, permission)

    def test_success(self):
        api = Api()
        self.run_tx(api)
        self.assertEqual(api.data["version"], 1)

    def test_untrusted_actor(self):
        api = Api()
        with self.assertRaises(PermissionError):
            self.run_tx(api, actor="attacker")
        self.assertEqual(api.calls, 0)

    def test_read_only_permission(self):
        with self.assertRaises(PermissionError):
            self.run_tx(Api(), permission="read")

    def test_stale_sha_conflict(self):
        api = Api()
        def concurrent(d):
            api.sha = "changed-by-other-writer"
            return {**d, "version": 1}
        with self.assertRaises(m.ConflictError):
            self.run_tx(api, transform=concurrent)
        self.assertEqual(api.data["version"], 0)

    def test_transform_failure_no_write(self):
        api = Api()
        with self.assertRaises(ValueError):
            self.run_tx(api, transform=lambda d: None)
        self.assertEqual(api.calls, 0)

    def test_no_automatic_retry_on_conflict(self):
        api = Api()
        def concurrent(d):
            api.sha = "changed"
            return d
        with self.assertRaises(m.ConflictError):
            self.run_tx(api, transform=concurrent)
        self.assertEqual(api.calls, 1)

if __name__ == "__main__":
    unittest.main()
