import io
import json
import unittest
import urllib.error
from unittest.mock import patch

from scripts.a10_github_api import GitHubGitAPI, GitHubAPIError
from scripts.a10_ref_store import Conflict
from scripts.a10_state import Task

class Response:
    def __init__(self, obj):
        self.data = json.dumps(obj).encode()
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self): return self.data

class APITests(unittest.TestCase):
    def make(self, results=None):
        calls = []
        queue = iter(results or [])
        def transport(req, timeout):
            calls.append((req.get_method(), req.full_url, json.loads(req.data) if req.data else None))
            return Response(next(queue))
        return GitHubGitAPI("chinkk-git/Aariamagickitchen",token="test-token",transport=transport), calls

    def test_ref_allowlist(self):
        api,_ = self.make()
        for ref in ("refs/heads/main", "refs/heads/a10-state/../bad", "refs/heads/a10-state/a/b"):
            with self.assertRaises(ValueError):
                api.ref_path(ref)

    def test_nonforced_update(self):
        api,calls = self.make([{"ref":"ok"}])
        api.update_ref("refs/heads/a10-state/task1", "a"*40)
        self.assertEqual(calls[0][2]["force"], False)
        with self.assertRaises(ValueError):
            api.update_ref("refs/heads/a10-state/task1","a"*40,force=True)

    def test_missing_token(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(ValueError):
                GitHubGitAPI("owner/repo")

    def test_init_create_only(self):
        api,calls = self.make([{"sha":"a"*40},{"sha":"b"*40},{"sha":"c"*40},{"ref":"ok"}])
        api.initialize("task1",Task("task1","W01"))
        self.assertEqual(calls[-1][0],"POST")
        self.assertTrue(calls[-1][1].endswith("/git/refs"))
        self.assertEqual(calls[-1][2]["ref"],"refs/heads/a10-state/task1")

    def test_http_conflict(self):
        def fail(req, timeout):
            raise urllib.error.HTTPError(req.full_url,422,"unprocessable",None,io.BytesIO(b""))
        api = GitHubGitAPI("owner/repo",token="test-token",transport=fail)
        with self.assertRaises(GitHubAPIError) as cm:
            api.update_ref("refs/heads/a10-state/task1","a"*40)
        self.assertEqual(cm.exception.status,422)
        self.assertNotIn("test-token",str(cm.exception))

    def test_transport_failure(self):
        def fail(req,timeout):
            raise urllib.error.URLError("network unavailable")
        api = GitHubGitAPI("owner/repo",token="test-token",transport=fail)
        with self.assertRaises(GitHubAPIError) as cm:
            api.put_blob("{}")
        self.assertEqual(cm.exception.status,0)

    def test_no_untrusted_repository(self):
        with self.assertRaises(ValueError):
            GitHubGitAPI("owner/repo/extra",token="x")

if __name__ == "__main__":
    unittest.main()
