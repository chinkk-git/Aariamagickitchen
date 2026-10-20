"""No-network adversarial tests for protected actor binding and runtime."""
import base64,importlib.util,json,tempfile,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("worker_runtime",HERE/"worker_runtime.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Api:
    def __init__(self,permission="write",enabled=False):
        self.permission=permission;self.doc={"activation":"ENABLED" if enabled else "DISABLED",
          "workers":{"W01":{"session_state":"UNKNOWN"}},
          "tasks":[{"id":"AA","owner":"W01","status":"READY","target_branch":"control-tower/worker-control-plan-20261019","depends_on":[],"lease":None}]}
        self.sha="blob1";self.writes=0
    def get_collaborator_permission(self,**kw):return self.permission
    def get_content(self,**kw):return {"sha":self.sha,"content":base64.b64encode(json.dumps(self.doc).encode()).decode()}
    def put_content(self,**kw):
        self.writes+=1
        if kw["sha"]!=self.sha:e=RuntimeError("stale");e.status=409;raise e
        self.doc=json.loads(base64.b64decode(kw["content"]));self.sha="blob2";return {"commit":{"sha":"fixture"}}
def env(path,**updates):
    d={"CT_TRANSACTION_ENABLED":"1","GITHUB_ACTIONS":"true","GITHUB_REPOSITORY":"chinkk-git/Aariamagickitchen",
       "GITHUB_REF":"refs/heads/main","GITHUB_WORKFLOW_REF":"chinkk-git/Aariamagickitchen/.github/workflows/control-tower-guarded-transactions.yml@refs/heads/main",
       "GITHUB_EVENT_NAME":"workflow_dispatch","GITHUB_EVENT_PATH":str(path),"GITHUB_ACTOR":"trusted","GITHUB_RUN_ID":"1234",
       "CT_ACTOR_WORKER_MAP":json.dumps({"trusted":["W01"]}),"GH_TOKEN":"ephemeral-test-token",
       "CT_TASK_ID":"AA","CT_WORKER":"W01","CT_OPERATION":"claim"}
    d.update(updates);return d
class RuntimeTests(unittest.TestCase):
    def event(self,sender="trusted"):
        f=tempfile.NamedTemporaryFile(mode="w",encoding="utf-8",delete=False);json.dump({"sender":{"login":sender}},f);f.close()
        self.addCleanup(Path(f.name).unlink,missing_ok=True);return f.name
    def test_disabled_by_default(self):
        with self.assertRaises(PermissionError):m.main({})
    def test_wrong_repo_ref_event_or_workflow_source(self):
        for update in ({"GITHUB_REPOSITORY":"bad/repo"},{"GITHUB_REF":"refs/heads/control-tower/worker-control-plan-20261019"},
          {"GITHUB_EVENT_NAME":"pull_request"},{"GITHUB_WORKFLOW_REF":"bad@refs/heads/main"}):
            with self.subTest(update=update),self.assertRaises(PermissionError):m.main(env(self.event(),**update),Api(enabled=True))
    def test_event_actor_binding(self):
        with self.assertRaisesRegex(PermissionError,"event sender"):m.main(env(self.event("attacker")),Api(enabled=True))
    def test_role_map_and_worker_role_fail_closed(self):
        for raw in ("","[]",'{"trusted":["W99"]}','{"trusted":["W01","W01"]}'):
            with self.subTest(raw=raw),self.assertRaises(PermissionError):m.main(env(self.event(),CT_ACTOR_WORKER_MAP=raw),Api(enabled=True))
        with self.assertRaisesRegex(PermissionError,"requested worker"):m.main(env(self.event(),CT_WORKER="W02"),Api(enabled=True))
    def test_read_permission_denied_without_write(self):
        api=Api("read",True)
        with self.assertRaisesRegex(PermissionError,"permission is insufficient"):m.main(env(self.event()),api)
        self.assertEqual(api.writes,0)
    def test_registry_disabled_after_authentication(self):
        api=Api("write",False)
        with self.assertRaisesRegex(PermissionError,"transactions are disabled"):m.main(env(self.event()),api)
        self.assertEqual(api.writes,0)
    def test_verified_permission_then_whole_registry_cas(self):
        api=Api("write",True);result=m.main(env(self.event()),api)
        self.assertEqual(result["commit"]["sha"],"fixture")
        self.assertEqual(api.doc["tasks"][0]["status"],"CLAIMED")
        self.assertNotIn("ephemeral-test-token",json.dumps(api.doc))
    def test_runtime_registry_is_empty_and_disabled(self):
        registry=json.loads((HERE/"worker-runtime.json").read_text())
        self.assertEqual(registry["activation"],"DISABLED")
        self.assertEqual(registry["tasks"],[])
        self.assertEqual(registry["cost_policy"],"NO_ADDITIONAL_CHARGES")
    def test_permission_endpoint_scope_and_login_match(self):
        calls=[]
        class Client(m.GitHubApi):
            def __init__(self):self._opener=None;self._GitHubApi__token="test"
            def request(self,method,path,payload=None):
                calls.append((method,path));return {"user":{"login":"trusted"},"permission":"write"}
        c=Client()
        self.assertEqual(c.get_collaborator_permission(owner="chinkk-git",repo="Aariamagickitchen",username="trusted"),"write")
        self.assertEqual(calls,[("GET","/repos/chinkk-git/Aariamagickitchen/collaborators/trusted/permission")])
        with self.assertRaises(PermissionError):c.get_collaborator_permission(owner="bad",repo="repo",username="trusted")
        class Mismatch(Client):
            def request(self,method,path,payload=None):return {"user":{"login":"other"},"permission":"admin"}
        self.assertEqual(Mismatch().get_collaborator_permission(owner="chinkk-git",repo="Aariamagickitchen",username="trusted"),"none")
if __name__=="__main__":unittest.main()
