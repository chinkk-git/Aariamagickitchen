"""Offline tests for the future coding task envelope. No network or writes."""
import unittest
from worker_task_envelope import validate_envelope, TaskEnvelopeDenied

SHA = "a" * 40
REGISTRY = {
    "activation": "ENABLED",
    "workers": [{"id": "W03", "activation": "ENABLED", "runtime": "trusted-coding-runtime"}],
}
TASK = {
    "task_id": "V31-CI-RECOVERY",
    "worker": "W03",
    "branch": "feature/v3.1-home-redesign",
    "base_sha": SHA,
    "actions": ["implement", "test", "report"],
    "executor": "trusted-coding-runtime",
    "allow_paid_services": False,
    "allow_merge": False,
    "allow_release": False,
}

class TaskEnvelopeTests(unittest.TestCase):
    def test_valid_is_only_structural_not_authorization(self):
        self.assertEqual(validate_envelope(TASK, registry=REGISTRY, trusted_base_sha=SHA)["worker"], "W03")

    def test_disabled_by_default(self):
        for key, value in [("activation", "DISABLED"), ("activation", None)]:
            with self.subTest(value=value), self.assertRaises(TaskEnvelopeDenied):
                validate_envelope(TASK, registry={**REGISTRY, key: value}, trusted_base_sha=SHA)

    def test_worker_disabled(self):
        registry = {**REGISTRY, "workers": [{"id": "W03", "activation": "DISABLED", "runtime": "trusted-coding-runtime"}]}
        with self.assertRaises(TaskEnvelopeDenied):
            validate_envelope(TASK, registry=registry, trusted_base_sha=SHA)

    def test_reject_untrusted_scope(self):
        changes = [
            {"worker": "W02"}, {"branch": "main"}, {"base_sha": "b" * 40},
            {"task_id": "../escape"}, {"actions": ["merge"]}, {"actions": ["test", "test"]},
            {"actions": []}, {"executor": "UNASSIGNED"}, {"executor": "attacker"},
            {"allow_paid_services": True}, {"allow_merge": True}, {"allow_release": True},
        ]
        for change in changes:
            with self.subTest(change=change), self.assertRaises(TaskEnvelopeDenied):
                validate_envelope({**TASK, **change}, registry=REGISTRY, trusted_base_sha=SHA)

    def test_trusted_sha_mismatch(self):
        with self.assertRaises(TaskEnvelopeDenied):
            validate_envelope(TASK, registry=REGISTRY, trusted_base_sha="b" * 40)

if __name__ == "__main__":
    unittest.main()
