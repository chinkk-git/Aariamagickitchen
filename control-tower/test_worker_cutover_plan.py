"""Adversarial tests for offline legacy registry cutover planning."""
import copy,unittest
from worker_cutover_plan import plan_cutover,CutoverDenied
SHA="a"*40;NOW="2026-10-19T20:00:00Z"
def legacy():
 return {"schema_version":1,"workers":{
  "v3":{"branch":"codex/v3-completion-core-20261017","session_state":"UNKNOWN","writer":"V3 Rotation 2"},
  "v31":{"branch":"feature/v3.1-home-redesign","session_state":"STOPPED","writer":None}},
  "tasks":[{"id":"CT25","target_branch":"control-tower/ct25-codex-worker-test","status":"VERIFIED","lease":None}]}
class CutoverTests(unittest.TestCase):
 def test_preserves_ownership_and_input_immutable(self):
  data=legacy();before=copy.deepcopy(data)
  plan=plan_cutover(data,source_sha=SHA,now=NOW)
  self.assertEqual(data,before)
  self.assertEqual(plan["workers"]["v3"]["writer"],"V3 Rotation 2")
  self.assertEqual(plan["workers"]["v3"]["migration_disposition"],"QUARANTINED")
  self.assertEqual(plan["workers"]["v31"]["session_state"],"STOPPED")
  self.assertEqual(plan["activation"],"DISABLED")
  self.assertFalse(plan["migration_authorized"])
  self.assertEqual(plan["legacy_fence"],"NOT_VERIFIED")
 def test_caller_fence_attestation_rejected(self):
  for forged in ({"fenced":True},"APPROVED",True):
   with self.subTest(forged=forged),self.assertRaises(CutoverDenied):
    plan_cutover(legacy(),source_sha=SHA,now=NOW,fence_evidence=forged)
 def test_live_or_expired_lease_never_silently_migrates(self):
  for expiry in ("2026-10-20T00:00:00Z","2026-10-18T00:00:00Z"):
   d=legacy();d["tasks"][0]["lease"]={"expires_at":expiry}
   with self.subTest(expiry=expiry),self.assertRaises(CutoverDenied):
    plan_cutover(d,source_sha=SHA,now=NOW)
 def test_active_task_denied(self):
  d=legacy();d["tasks"][0]["status"]="IN_PROGRESS"
  with self.assertRaises(CutoverDenied):plan_cutover(d,source_sha=SHA,now=NOW)
 def test_duplicate_branch_denied(self):
  d=legacy();d["workers"]["v31"]["branch"]=d["workers"]["v3"]["branch"]
  with self.assertRaises(CutoverDenied):plan_cutover(d,source_sha=SHA,now=NOW)
 def test_invalid_source_and_schema_denied(self):
  for sha in ("abc","z"*40,""):
   with self.subTest(sha=sha),self.assertRaises(CutoverDenied):
    plan_cutover(legacy(),source_sha=sha,now=NOW)
  d=legacy();d.pop("workers")
  with self.assertRaises(CutoverDenied):plan_cutover(d,source_sha=SHA,now=NOW)
if __name__=="__main__":unittest.main()
