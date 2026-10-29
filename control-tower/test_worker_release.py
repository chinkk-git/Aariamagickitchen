"""Fail-closed release evidence checks. Does not authenticate GitHub reviewers."""
import copy
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("worker_release", Path(__file__).with_name("worker_release.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
SHA = "a" * 40
APK = "b" * 64


def candidate():
    return {"sha": SHA, "artifact_sha256": APK, "recipe_count": 95,
            "complete_only": True, "coinstall_test": True, "offline_test": True,
            "unapproved_items": [], "critical_defects": [], "author": "developer",
            "approvals": {role: {"result": "PASS", "sha": SHA, "artifact_sha256": APK,
                                  "url": "https://github.com/example/repo/issues/1",
                                  "reviewer": "independent-reviewer"}
                          for role in m.REQUIRED}}


class ReleaseTests(unittest.TestCase):
    def test_complete_evidence(self):
        self.assertEqual(m.assess_release(candidate()), [])

    def test_missing_a08(self):
        d = candidate()
        del d["approvals"]["W08"]
        self.assertTrue(m.assess_release(d))

    def test_mismatched_apk(self):
        d = candidate()
        d["approvals"]["W07"]["artifact_sha256"] = "c" * 64
        self.assertTrue(m.assess_release(d))

    def test_self_review(self):
        d = candidate()
        d["approvals"]["W06"]["reviewer"] = d["author"]
        self.assertTrue(m.assess_release(d))

    def test_critical_defect(self):
        d = candidate()
        d["critical_defects"] = ["unsafe camera permission"]
        self.assertTrue(m.assess_release(d))

    def test_unapproved_atlas(self):
        d = candidate()
        d["unapproved_items"] = ["draft-atlas-11"]
        self.assertTrue(m.assess_release(d))

    def test_missing_coexistence(self):
        d = candidate()
        d["coinstall_test"] = False
        self.assertTrue(m.assess_release(d))


if __name__ == "__main__":
    unittest.main()
