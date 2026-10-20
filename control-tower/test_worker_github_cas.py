"""CAS tests use isolated in-memory fixture; no live GitHub mutations."""
import base64,importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("worker_github_cas",Path(__file__).with_name("worker_github_cas.py"))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Api:
    def __init__(self):self.data={"version":0};self.sha="blob0";self.calls=0
    def get_content(self,**kw):return {"sha":self.sha,"content":base64.b64encode(json.dumps(self.data).encode()).decode()}
    def put_content(self,**kw):
        self.calls+=1
        if kw["sha"]!=self.sha:e=RuntimeError("stale");e.status=409;raise e
        self.data=json.loads(base64.b64decode(kw["content"]));self.sha="blob1";return {"sha":self.sha}
class CasTests(unittest.TestCase):
    def run_tx(self,a,actor="trusted",permission="write",transform=lambda d:{**d,"version":d["version"]+1},**scope):
        args={"owner":m.OWNER,"repo":m.REPOSITORY,"branch":m.TARGET_BRANCH,"path":m.REGISTRY_PATH};args.update(scope)
        return m.cas_update(a,**args,transform=transform,actor=actor,allowed={"trusted"},permission=permission)
    def test_success(self):
        a=Api();self.run_tx(a);self.assertEqual(a.data["version"],1)
    def test_wrapped_base64_content(self):
        a=Api();original=a.get_content
        def wrapped(**kw):
            response=original(**kw);content=response["content"]
            response["content"]="\r\n".join(content[i:i+12] for i in range(0,len(content),12))
            return response
        a.get_content=wrapped;self.run_tx(a)
        self.assertEqual(a.data["version"],1)
    def test_authorization_and_fixed_scope(self):
        a=Api()
        for u in ({"actor":"bad"},{"permission":"read"},{"branch":"main"},{"path":"tasks.json"}):
            with self.subTest(u=u),self.assertRaises(PermissionError):self.run_tx(a,**u)
        self.assertEqual(a.calls,0)
    def test_stale_sha_conflict_no_retry(self):
        a=Api()
        def stale(d):a.sha="other";return {**d,"version":1}
        with self.assertRaises(m.ConflictError):self.run_tx(a,transform=stale)
        self.assertEqual(a.data["version"],0);self.assertEqual(a.calls,1)
    def test_bad_transform_no_write(self):
        a=Api()
        with self.assertRaises(ValueError):self.run_tx(a,transform=lambda d:None)
        self.assertEqual(a.calls,0)
if __name__=="__main__":unittest.main()
