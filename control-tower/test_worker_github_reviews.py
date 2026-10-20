"""Trusted API adapter tests with adversarial API responses."""
import importlib.util
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
spec = importlib.util.spec_from_file_location("worker_github_reviews", HERE / "worker_github_reviews.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
SHA, APK = "a"*40, "b"*64

class Api:
    def __init__(self):
        self.review = {"id": 7, "user": {"login": "reviewer"}, "state": "APPROVED", "commit_id": SHA}
        self.permission = "write"
    def get_review(self, **kwargs):
        return self.review
    def get_collaborator_permission(self, **kwargs):
        return self.permission

def fixture():
    c = {"sha": SHA, "artifact_sha256": APK, "author": "author", "pull_number": 27}
    r = {"role": "W08", "result": "PASS", "sha": SHA, "artifact_sha256": APK,
         "source": "github_pull_request_review", "review_id": 7, "reviewer": "reviewer"}
    return c, r

class GitHubReviewTests(unittest.TestCase):
    def check(self, api=None, roles=None):
        c, r = fixture()
        return m.verify_github_review(api or Api(), "owner", "repo", 27, 7, "W08", c, r,
                                      roles if roles is not None else {"W08": {"reviewer"}})
    def test_approved(self):
        self.assertEqual(self.check(), [])
    def test_unassigned_reviewer(self):
        self.assertTrue(self.check(roles={"W08": {"other"}}))
    def test_no_role(self):
        self.assertTrue(self.check(roles={}))
    def test_read_only(self):
        a = Api(); a.permission = "read"
        self.assertTrue(self.check(api=a))
    def test_stale_review(self):
        a = Api(); a.review["commit_id"] = "c"*40
        self.assertTrue(self.check(api=a))
    def test_comment_only(self):
        a = Api(); a.review["state"] = "COMMENTED"
        self.assertTrue(self.check(api=a))
    def test_spoofed_record(self):
        c, r = fixture(); r["reviewer"] = "spoofed"
        self.assertTrue(m.verify_github_review(Api(), "owner", "repo", 27, 7, "W08", c, r, {"W08": {"reviewer"}}))
    def test_invalid_review_id(self):
        c, r = fixture()
        self.assertTrue(m.verify_github_review(Api(), "owner", "repo", 27, -1, "W08", c, r, {"W08": {"reviewer"}}))

if __name__ == "__main__":
    unittest.main()
