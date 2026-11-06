import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.a10_recovery_policy import classify

class RecoveryTests(unittest.TestCase):
    def test_transient_first_attempt(self):
        self.assertEqual(classify(conclusion="failure", failure_code="runner_lost"), "RETRY_ELIGIBLE")
    def test_transient_budget_exhausted(self):
        self.assertEqual(classify(conclusion="failure", failure_code="runner_lost", attempt=1), "CIRCUIT_OPEN")
    def test_deterministic_no_retry(self):
        for reason in ("assertion_failure", "image_regression", "compilation_failure", "security_gate_failure"):
            self.assertEqual(classify(conclusion="failure", failure_code=reason), "REMEDIATION_REQUIRED")
    def test_unknown_failure_never_retried(self):
        self.assertEqual(classify(conclusion="failure", failure_code="unknown"), "INVESTIGATE")
    def test_no_failure(self):
        self.assertEqual(classify(conclusion="success"), "PASS")
        self.assertEqual(classify(conclusion="in_progress"), "WAIT")
    def test_invalid_budget(self):
        self.assertEqual(classify(conclusion="failure", failure_code="runner_lost", attempt=True), "ESCALATE")
