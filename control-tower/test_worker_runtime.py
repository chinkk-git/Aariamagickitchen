"""No-network security smoke tests for intentionally disabled runtime."""
import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("worker_runtime",Path(__file__).with_name("worker_runtime.py"))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class RuntimeTests(unittest.TestCase):
    def test_default_disabled(self):
        with self.assertRaises(PermissionError):m.main({})
    def test_wrong_repository(self):
        with self.assertRaises(PermissionError):m.main({"CT_TRANSACTION_ENABLED":"1","GITHUB_REPOSITORY":"attacker/repo"})
    def test_pr_event_rejected(self):
        e={"CT_TRANSACTION_ENABLED":"1","GITHUB_REPOSITORY":"chinkk-git/Aariamagickitchen",
           "GITHUB_REF":"refs/heads/control-tower/worker-control-plan-20261019",
           "GITHUB_EVENT_NAME":"pull_request"}
        with self.assertRaises(PermissionError):m.main(e)
    def test_actor_spoof_denied(self):
        e={"CT_TRANSACTION_ENABLED":"1","GITHUB_REPOSITORY":"chinkk-git/Aariamagickitchen",
           "GITHUB_REF":"refs/heads/control-tower/worker-control-plan-20261019",
           "GITHUB_EVENT_NAME":"workflow_dispatch","GITHUB_ACTOR":"attacker","CT_ALLOWED_ACTORS":"trusted"}
        with self.assertRaises(PermissionError):m.main(e)
    def test_even_full_fixture_fails_without_permission_api(self):
        e={"CT_TRANSACTION_ENABLED":"1","GITHUB_REPOSITORY":"chinkk-git/Aariamagickitchen",
           "GITHUB_REF":"refs/heads/control-tower/worker-control-plan-20261019",
           "GITHUB_EVENT_NAME":"workflow_dispatch","GITHUB_ACTOR":"trusted","CT_ALLOWED_ACTORS":"trusted",
           "GITHUB_TOKEN":"test-token","CT_CAPABILITY":"x"*40,
           "CT_TASK_ID":"A","CT_WORKER":"W01","CT_OPERATION":"claim",
           "CT_NOW":"2026-10-19T20:00:00Z","CT_AUDIT_REF":"audit:test"}
        with self.assertRaisesRegex(PermissionError,"permission lookup not integrated"):m.main(e)
if __name__=="__main__":unittest.main()
