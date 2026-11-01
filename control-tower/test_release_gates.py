#!/usr/bin/env python3
"""Adversarial release-manifest checks against the real validator."""
import json,pathlib,subprocess,sys,tempfile,unittest
root=pathlib.Path(__file__).resolve().parent
original=json.loads((root/"tasks.json").read_text())
class ReleaseGates(unittest.TestCase):
 def validate(self,d):
  with tempfile.TemporaryDirectory() as tmp:
   p=pathlib.Path(tmp)
   (p/"tasks.json").write_text(json.dumps(d))
   (p/"validate.py").write_text((root/"validate.py").read_text())
   return subprocess.run([sys.executable,str(p/"validate.py")],capture_output=True,text=True)
 def test_current_manifest_valid(self):
  self.assertEqual(self.validate(original).returncode,0)
 def test_draft_inclusion_rejected(self):
  d=json.loads(json.dumps(original));d["release"]["items"][1]["decision"]="INCLUDE"
  self.assertNotEqual(self.validate(d).returncode,0)
 def test_missing_review_evidence_rejected(self):
  d=json.loads(json.dumps(original));d["tasks"][0]["status"]="VERIFIED";d["tasks"][0]["evidence"]=[]
  self.assertNotEqual(self.validate(d).returncode,0)
 def test_stopped_worker_claim_rejected(self):
  d=json.loads(json.dumps(original));d["tasks"][2]["status"]="IN_PROGRESS"
  self.assertNotEqual(self.validate(d).returncode,0)
 def test_release_without_completed_integration_rejected(self):
  d=json.loads(json.dumps(original));d["release"]["status"]="VERIFIED"
  self.assertNotEqual(self.validate(d).returncode,0)
if __name__=="__main__": unittest.main(verbosity=2)
