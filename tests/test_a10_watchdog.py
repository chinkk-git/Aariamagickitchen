"""A10 smoke tests: no external calls and no worker mutations."""
import ast
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "a10_watchdog.py"

class A10SafetyTests(unittest.TestCase):
    def test_script_compiles(self):
        ast.parse(SCRIPT.read_text(encoding="utf-8"))

    def test_default_is_dry_run(self):
        self.assertIn('os.getenv("A10_DRY_RUN", "true")', SCRIPT.read_text())

    def test_no_workflow_dispatch_or_branch_write(self):
        text = SCRIPT.read_text()
        self.assertNotIn('actions/workflows/', text)
        self.assertNotIn('git push', text)
        self.assertNotIn('pulls/', text)

if __name__ == "__main__":
    unittest.main()
