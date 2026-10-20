"""Adversarial isolated tests for actor authorization and CAS concurrency."""
import base64,importlib.util,json,sys,threading,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
spec=importlib.util.spec_from_file_location("worker_executor",HERE/"worker_executor.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
NOW="2026-10-19T20:00:00Z";ACTORS={"trusted":{"W01","W02"}}
class Api:
    def __init__(self,enabled=False,barrier=None):
        self.doc={"activation":"ENABLED" if enabled else "DISABLED","workers":{"W01":{"session_state":"UNKNOWN"},"W02":{"session_state":"UNKNOWN"}},
          "tasks":[{"id":"A","owner":"W01","status":"READY","target_branch":"control-tower/worker-control-plan-20261019","depends_on":[],"lease":None},
                   {"id":"B","owner":"W02","status":"READY","target_branch":"control-tower/worker-control-plan-20261019","depends_on":[],"lease":None}]}
        self.sha="blob1";self.writes=0;self.lock=threading.Lock();self.barrier=barrier
    def get_content(self,**kw):
        with self.lock:r={"sha":self.sha,"content":base64.b64encode(json.dumps(self.doc).encode()).decode()}
        if self.barrier:self.barrier.wait(timeout=5)
        return r
    def put_content(self,**kw):
        with self.lock:
            self.writes+=1
            if kw["sha"]!=self.sha:e=RuntimeError("stale");e.status=409;raise e
            self.doc=json.loads(base64.b64decode(kw["content"]));self.sha="blob2";return {"commit":{"sha":self.sha}}
def run(api,**kw):
    a={"owner":"chinkk-git","repo":"Aariamagickitchen","branch":"control-tower/worker-control-plan-20261019","actor":"trusted",
       "permission":"write","actor_worker_map":ACTORS,"task_id":"A","worker":"W01","operation":"claim","now":NOW,"audit_ref":"audit:test"}
    a.update(kw);return m.execute(api,**a)
class ExecutorTests(unittest.TestCase):
    def test_disabled_no_write(self):
        a=Api()
        with self.assertRaises(PermissionError):run(a)
        self.assertEqual(a.writes,0)
    def test_authorized_claim(self):
        a=Api(True);run(a);self.assertEqual(a.doc["tasks"][0]["status"],"CLAIMED")
    def test_actor_role_permission_and_scope_denials(self):
        a=Api(True)
        for u in ({"actor":"bad"},{"worker":"W05"},{"permission":"read"},{"owner":"bad"},{"repo":"bad"},{"branch":"main"}):
            with self.subTest(u=u),self.assertRaises(PermissionError):run(a,**u)
        self.assertEqual(a.writes,0)
    def test_same_branch_exclusion(self):
        a=Api(True);run(a)
        with self.assertRaises(ValueError):run(a,task_id="B",worker="W02")
    def test_cannot_lease_v3_or_v31_branch(self):
        a=Api(True)
        a.doc["tasks"][0]["target_branch"]="codex/v3-completion-core-20261017"
        with self.assertRaises(PermissionError):run(a)
        self.assertEqual(a.writes,0)
    def test_stale_blob_rejected(self):
        a=Api(True);old=a.get_content
        def change(**kw):r=old(**kw);a.sha="changed";return r
        a.get_content=change
        with self.assertRaises(m.ConflictError):run(a)
        self.assertEqual(a.doc["tasks"][0]["status"],"READY")
    def test_ephemeral_credential_not_persisted(self):
        a=Api(True);run(a);self.assertNotIn("ephemeral-test-token",json.dumps(a.doc))
    def test_two_racing_claims_exactly_one_cas_wins(self):
        a=Api(True,threading.Barrier(2));result=[]
        def claim(task,worker):
            try:run(a,task_id=task,worker=worker);result.append("success")
            except m.ConflictError:result.append("conflict")
        ts=[threading.Thread(target=claim,args=("A","W01")),threading.Thread(target=claim,args=("B","W02"))]
        [t.start() for t in ts];[t.join(10) for t in ts]
        self.assertTrue(all(not t.is_alive() for t in ts));self.assertCountEqual(result,["success","conflict"])
        self.assertEqual(sum(t["status"]=="CLAIMED" for t in a.doc["tasks"]),1)
if __name__=="__main__":unittest.main()
