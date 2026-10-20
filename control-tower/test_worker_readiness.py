"""Read-only cutover readiness tests; no GitHub or worker execution."""
import unittest
from worker_readiness import readiness, REQUIRED_GATES

SHA = "a" * 40
def registry():
    return {"activation": "DISABLED", "workers": [
        {"id": "W01", "branch": "codex/v3-completion-core-20261017", "activation": "DISABLED", "runtime": "test-runtime"},
        {"id": "W03", "branch": "feature/v3.1-home-redesign", "activation": "DISABLED", "runtime": "test-runtime"},
    ]}
def evidence():
    return {gate: {"status": "PASS", "source": "protected-github-verifier", "commit_sha": SHA} for gate in REQUIRED_GATES}

class ReadinessTests(unittest.TestCase):
    def test_empty_evidence_fails_closed(self):
        result = readiness(registry(), {})
        self.assertFalse(result["ready_for_independent_review"])
        self.assertFalse(result["activation_authorized"])
        self.assertEqual(len(result["blockers"]), len(REQUIRED_GATES))
    def test_all_records_still_do_not_activate(self):
        result = readiness(registry(), evidence())
        self.assertTrue(result["ready_for_independent_review"])
        self.assertFalse(result["activation_authorized"])
    def test_each_missing_gate_blocks(self):
        for gate in REQUIRED_GATES:
            data = evidence()
            del data[gate]
            with self.subTest(gate=gate):
                self.assertIn("unverified gate " + gate, readiness(registry(), data)["blockers"])
    def test_self_attestation_denied(self):
        data = evidence()
        data["independent_security_review"]["source"] = "issue-comment"
        self.assertFalse(readiness(registry(), data)["ready_for_independent_review"])
    def test_wrong_worker_or_branch_denied(self):
        doc = registry()
        doc["workers"][1]["branch"] = "main"
        self.assertFalse(readiness(doc, evidence())["ready_for_independent_review"])
    def test_activation_before_review_denied(self):
        doc = registry()
        doc["activation"] = "ENABLED"
        self.assertFalse(readiness(doc, evidence())["ready_for_independent_review"])
    def test_missing_runtime_denied(self):
        doc = registry()
        doc["workers"][0]["runtime"] = "UNASSIGNED"
        self.assertIn("coding executor not assigned W01", readiness(doc, evidence())["blockers"])

if __name__ == "__main__":
    unittest.main()
