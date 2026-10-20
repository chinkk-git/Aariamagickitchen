"""Executable security boundary rejects all unfenced legacy writers."""
import unittest
from worker_execution_boundary import verify_execution_boundary,RuntimeSecurityDenied
NOW="2026-10-19T20:00:00Z"
CONTEXT={"event_name":"workflow_dispatch","repository":"chinkk-git/Aariamagickitchen",
"ref":"refs/heads/main","workflow_ref":"chinkk-git/Aariamagickitchen/.github/workflows/control-tower-guarded-transactions.yml@refs/heads/main",
"actor":"chinkk-git","sender":"chinkk-git","worker":"W01","run_id":"123","attempt":"1"}
class BoundaryTests(unittest.TestCase):
 def test_no_implicit_activation(self):
  for verified in (False,True):
   with self.subTest(verified=verified),self.assertRaises(RuntimeSecurityDenied):
    verify_execution_boundary(context=CONTEXT,actor_worker_map={"chinkk-git":{"W01"}},
       permission="admin",legacy_registry={"schema_version":1,"workers":{},"tasks":[]},
       branch="control-tower/worker-control-plan-20261019",now=NOW,verified_by_protected_runner=verified)
 def test_forged_context_denied(self):
  for change in ({"sender":"mallory"},{"worker":"W02"},{"ref":"refs/heads/evil"},{"run_id":"0"}):
   with self.subTest(change=change),self.assertRaises(RuntimeSecurityDenied):
    verify_execution_boundary(context=dict(CONTEXT,**change),actor_worker_map={"chinkk-git":{"W01"}},
      permission="admin",legacy_registry={},branch="branch-a",now=NOW,verified_by_protected_runner=True)
if __name__=="__main__":unittest.main()
