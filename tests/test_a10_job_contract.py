import json
import subprocess
import tempfile
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from a10_job_contract import validate

BASE = {"worker": "W01", "branch": "feature/v3.2-magical-cookbook",
        "base_sha": "a" * 40, "issue": "#45", "mode": "inspect",
        "max_minutes": 5, "attempt": 1}

class ManifestTests(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(validate(BASE), BASE)

    def test_cross_branch(self):
        with self.assertRaises(ValueError):
            validate({**BASE, "branch": "feature/v3.3-world-map-explorer"})

    def test_unapproved_execution(self):
        with self.assertRaises(ValueError):
            validate({**BASE, "mode": "repair"})

    def test_injection_fields(self):
        with self.assertRaises(ValueError):
            validate({**BASE, "shell": "echo unsafe"})

    def test_retry_budget(self):
        with self.assertRaises(ValueError):
            validate({**BASE, "attempt": 2})

    def test_type_safety(self):
        with self.assertRaises(ValueError):
            validate({**BASE, "max_minutes": True})

    def test_w02(self):
        self.assertEqual(validate({**BASE, "worker": "W02",
          "branch": "feature/v3.3-world-map-explorer", "issue": "#39"})["worker"], "W02")

if __name__ == "__main__":
    unittest.main()
