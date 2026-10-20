"""Executor tests: no real credentials or GitHub writes."""
import base64
import importlib.util
import json
import sys
import unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
spec=importlib.util.spec_from_file_location("worker_executor",HERE/"worker_executor.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
SECRET="x"*40
NOW="2026-10-19T20:00:00Z"
class Api:
    def __init__(self,enabled=False):
        self.doc={"activation":"ENABLED" if enabled else "DISABLED",
                  "workers":{"W01":{"session_state":"UNKNOWN"},"W02":{"session_state":"UNKNOWN"}},
                  "tasks":[{"id":"A","owner":"W01","status":"READY","target_branch":"branch/a","depends_on":[],"lease":None},
                           {"id":"B","owner":"W02","status":"READY","target_branch":"branch/a","depends_on":[],"lease":None}]}
        self.sha="blob1";self.writes=0
    def get_content(self,**kwargs):
        return {"sha":self.sha,"content":base64.b64encode(json.dumps(self.doc).encode()).decode()}
    def put_content(self,**kwargs):
        self.writes+=1
        if kwargs["sha"]!=self.sha:
            error=RuntimeError("conflict");error.status=409;raise error
        self.doc=json.loads(base64.b64decode(kwargs["content"]))
        self.sha="blob2";return {"sha":self.sha}
def execute(api,**kw):
    args={"owner":"owner","repo":"repo","branch":"control-tower/worker-control-plan-20261019",
          "actor":"trusted","permission":"write","allowed_actors":{"trusted"},
          "trusted_actor":"trusted","capability":SECRET,"expected_capability":SECRET,
          "task_id":"A","worker":"W01","operation":"claim","now":NOW,"audit_ref":"audit:test"}
    args.update(kw)
    return m.execute(api,**args)
class ExecutorTests(unittest.TestCase):
    def test_disabled_no_write(self):
        a=Api()
        with self.assertRaises(PermissionError):execute(a)
        self.assertEqual(a.writes,0)
    def test_authenticated_claim_fixture(self):
        a=Api(True);execute(a)
        self.assertEqual(a.doc["tasks"][0]["status"],"CLAIMED")
    def test_wrong_actor(self):
        a=Api(True)
        with self.assertRaises(PermissionError):execute(a,actor="attacker")
        self.assertEqual(a.writes,0)
    def test_read_only(self):
        a=Api(True)
        with self.assertRaises(PermissionError):execute(a,permission="read")
    def test_bad_capability(self):
        a=Api(True)
        with self.assertRaises(PermissionError):execute(a,capability="z"*40)
        self.assertEqual(a.writes,0)
    def test_wrong_branch(self):
        a=Api(True)
        with self.assertRaises(PermissionError):execute(a,branch="main")
    def test_concurrent_branch_claim(self):
        a=Api(True);execute(a)
        with self.assertRaises(ValueError):execute(a,task_id="B",worker="W02")
    def test_stale_blob(self):
        a=Api(True)
        old=a.get_content
        def conflict(**kwargs):
            d=old(**kwargs);a.sha="other-writer";return d
        a.get_content=conflict
        with self.assertRaises(m.ConflictError):execute(a)
        self.assertEqual(a.doc["tasks"][0]["status"],"READY")
    def test_no_secret_in_persisted_registry(self):
        a=Api(True);execute(a)
        self.assertNotIn(SECRET,json.dumps(a.doc))
    def test_expired_recovery_blocks(self):
        a=Api(True);execute(a)
        execute(a,operation="recover",now="2026-10-19T20:15:00Z")
        self.assertEqual(a.doc["tasks"][0]["status"],"BLOCKED")
if __name__=="__main__":unittest.main()
