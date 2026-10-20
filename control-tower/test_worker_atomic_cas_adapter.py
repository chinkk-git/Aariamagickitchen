"""Offline CAS acceptance: conflict, scope, identity and atomicity."""
import base64,importlib.util,json,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from worker_atomic_cas_adapter import apply_atomic_lease,AUTHORITY_PATH
from worker_atomic_lease import holder,LeaseDenied
from worker_github_cas import OWNER,REPOSITORY,TARGET_BRANCH,ConflictError
NOW="2026-10-19T20:00:00Z"
class FakeApi:
    def __init__(self):
        self.doc={"schema_version":1,"epoch":0,"leases":{}}
        self.sha="sha0";self.writes=0;self.conflict=False
    def get_content(self,**kwargs):
        return {"sha":self.sha,"encoding":"base64","content":base64.b64encode(json.dumps(self.doc).encode()).decode()}
    def put_content(self,**kwargs):
        if self.conflict or kwargs["sha"]!=self.sha:
            error=RuntimeError("conflict");error.status=409;raise error
        self.doc=json.loads(base64.b64decode(kwargs["content"]))
        self.writes+=1;self.sha="sha"+str(self.writes)
        return {"content":{"sha":self.sha}}
def args(api):
    return dict(api=api,owner=OWNER,repo=REPOSITORY,branch=TARGET_BRANCH,path=AUTHORITY_PATH,
                identity=holder("alice","W01","100","1","trusted-github-actions"),
                operation="claim",target_branch="branch-a",now=NOW,expected_epoch=0,
                permission="write",allowed_actors={"alice"})
class AdapterTests(unittest.TestCase):
    def test_single_authority_claim(self):
        api=FakeApi();apply_atomic_lease(**args(api))
        self.assertEqual(api.writes,1);self.assertEqual(api.doc["epoch"],1)
    def test_stale_epoch_no_write(self):
        api=FakeApi();apply_atomic_lease(**args(api))
        with self.assertRaises(LeaseDenied):apply_atomic_lease(**args(api))
        self.assertEqual(api.writes,1)
    def test_concurrent_blob_conflict_no_retry(self):
        api=FakeApi();api.conflict=True
        with self.assertRaises(ConflictError):apply_atomic_lease(**args(api))
        self.assertEqual(api.writes,0)
    def test_scope_and_permission_fail_before_read(self):
        for change in ({"path":"control-tower/tasks.json"},{"branch":"main"},{"permission":"read"},
                       {"allowed_actors":{"mallory"}},{"identity":{"actor":"alice","issuer":"fake"}}):
            api=FakeApi();params=args(api);params.update(change)
            with self.subTest(change=change),self.assertRaises(PermissionError):apply_atomic_lease(**params)
            self.assertEqual(api.writes,0)
    def test_malformed_authority_denied(self):
        api=FakeApi();api.doc={"activation":"ENABLED"}
        with self.assertRaises(LeaseDenied):apply_atomic_lease(**args(api))
        self.assertEqual(api.writes,0)
    def test_conflicting_worker_denied(self):
        api=FakeApi();apply_atomic_lease(**args(api))
        params=args(api);params.update(target_branch="branch-b",expected_epoch=1)
        with self.assertRaises(LeaseDenied):apply_atomic_lease(**params)
        self.assertEqual(api.writes,1)
    def test_holder_replay_denied(self):
        api=FakeApi();apply_atomic_lease(**args(api))
        params=args(api);params.update(operation="release",expected_epoch=1,
            identity=holder("alice","W01","100","2","trusted-github-actions"))
        with self.assertRaises(LeaseDenied):apply_atomic_lease(**params)
        self.assertEqual(api.writes,1)
if __name__=="__main__":unittest.main()
