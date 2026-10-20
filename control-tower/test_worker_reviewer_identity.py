import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("worker_reviewer_identity", Path(__file__).with_name("worker_reviewer_identity.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def fixture():
    candidate = {"sha": "a"*40, "artifact_sha256": "b"*64, "author": "author", "pull_number": 27}
    record = {"role": "W08", "result": "PASS", "sha": candidate["sha"],
              "artifact_sha256": candidate["artifact_sha256"],
              "source": "github_pull_request_review", "review_id": 123, "reviewer": "reviewer"}
    trusted = {"review_id": 123, "login": "reviewer", "state": "APPROVED",
               "commit_id": candidate["sha"], "permission": "write", "pull_number": 27,
               "fetched_from_github_api": True}
    return candidate, record, trusted


class ReviewerTests(unittest.TestCase):
    def test_verified(self):
        self.assertEqual(m.validate_review(fixture()[1], fixture()[0], fixture()[2]), [])

    def test_issue_comment_not_approval(self):
        c, r, t = fixture()
        r["source"] = "issue_comment"
        self.assertTrue(m.validate_review(r, c, t))

    def test_self_review(self):
        c, r, t = fixture()
        t["login"] = c["author"]
        r["reviewer"] = c["author"]
        self.assertTrue(m.validate_review(r, c, t))

    def test_unverified_identity(self):
        c, r, t = fixture()
        t["fetched_from_github_api"] = False
        self.assertTrue(m.validate_review(r, c, t))

    def test_stale_commit(self):
        c, r, t = fixture()
        t["commit_id"] = "c"*40
        self.assertTrue(m.validate_review(r, c, t))

    def test_wrong_pr(self):
        c, r, t = fixture()
        t["pull_number"] = 26
        self.assertTrue(m.validate_review(r, c, t))

    def test_read_permission_only(self):
        c, r, t = fixture()
        t["permission"] = "read"
        self.assertTrue(m.validate_review(r, c, t))

    def test_not_approved(self):
        c, r, t = fixture()
        t["state"] = "COMMENTED"
        self.assertTrue(m.validate_review(r, c, t))

if __name__ == "__main__":
    unittest.main()
