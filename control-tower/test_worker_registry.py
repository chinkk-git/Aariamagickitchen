"""Run: python -m unittest control-tower/test_worker_registry.py"""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("worker_registry", HERE / "worker_registry.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RegistryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.baseline = json.loads((HERE / "workers.json").read_text(encoding="utf-8"))

    def test_baseline(self):
        self.assertEqual(module.validate_registry(self.baseline), [])

    def test_duplicate_writer(self):
        d = copy.deepcopy(self.baseline)
        d["workers"][2]["branch"] = d["workers"][0]["branch"]
        self.assertTrue(any("duplicate branch" in e for e in module.validate_registry(d)))

    def test_self_approval(self):
        d = copy.deepcopy(self.baseline)
        d["workers"][6]["can_self_approve"] = True
        self.assertTrue(module.validate_registry(d))

    def test_unapproved_activation(self):
        d = copy.deepcopy(self.baseline)
        d["workers"][0]["activation"] = "ENABLED"
        self.assertTrue(module.validate_registry(d))

    def test_paid_policy(self):
        d = copy.deepcopy(self.baseline)
        d["cost_policy"] = "ALLOW_PAID"
        self.assertTrue(module.validate_registry(d))

    def test_duplicate_identity(self):
        d = copy.deepcopy(self.baseline)
        d["workers"][1]["id"] = "W01"
        self.assertTrue(module.validate_registry(d))

    def test_assurance_cannot_write(self):
        d = copy.deepcopy(self.baseline)
        d["workers"][6]["branch"] = "security/main"
        self.assertTrue(module.validate_registry(d))


if __name__ == "__main__":
    unittest.main()
