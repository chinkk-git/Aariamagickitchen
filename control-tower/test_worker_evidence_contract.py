import unittest
from worker_evidence_contract import validate_evidence,EvidenceDenied
SHA="a"*40
def item(kind="ci",**kw):
    return dict({"kind":kind,"task_id":"CT-03","worker":"W01","commit_sha":SHA,"source_ref":"github:run/123","status":"PASS"},**kw)
class EvidenceTests(unittest.TestCase):
    def test_valid_schema(self):
        self.assertEqual(validate_evidence([item()],trusted_head_sha=SHA,task_id="CT-03",worker="W01"),("ci",))
    def test_stale_or_wrong_identity(self):
        for evidence in ([item(commit_sha="b"*40)],[item(worker="W03")],[item(task_id="CT-04")]):
            with self.assertRaises(EvidenceDenied):
                validate_evidence(evidence,trusted_head_sha=SHA,task_id="CT-03",worker="W01")
    def test_duplicate_and_untrusted_status(self):
        for evidence in ([item(),item()],[item(status="QUEUED")],[item(source_ref="")],[item(kind="dispatch")]):
            with self.assertRaises(EvidenceDenied):
                validate_evidence(evidence,trusted_head_sha=SHA,task_id="CT-03",worker="W01")
    def test_unknown_fields_rejected(self):
        e=item();e["activate"]=True
        with self.assertRaises(EvidenceDenied):
            validate_evidence([e],trusted_head_sha=SHA,task_id="CT-03",worker="W01")
    def test_missing_head_rejected(self):
        with self.assertRaises(EvidenceDenied):
            validate_evidence([item()],trusted_head_sha=None,task_id="CT-03",worker="W01")
if __name__=="__main__":unittest.main()
