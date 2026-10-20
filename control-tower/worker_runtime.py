"""Protected, fail-closed GitHub Actions runtime adapter."""
import json,os,re,sys,urllib.error,urllib.parse,urllib.request
from datetime import datetime,timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from worker_executor import execute
from worker_github_cas import OWNER,REPOSITORY,TARGET_BRANCH
API_ROOT="https://api.github.com"
WORKFLOW_PATH=".github/workflows/control-tower-guarded-transactions.yml"
WORKER_IDS={"W01","W02","W03","W04"}
LOGIN=re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})$")
class GitHubApi:
    """Minimal token-backed client; token remains in memory and out of errors."""
    def __init__(self,token,opener=None):
        if not isinstance(token,str) or not token.strip(): raise PermissionError("ephemeral GitHub token missing")
        self.__token=token;self._opener=opener or urllib.request.urlopen
    def request(self,method,path,payload=None):
        if not path.startswith("/repos/") or path.startswith("//") or ".." in path:
            raise PermissionError("GitHub API path outside repository scope")
        data=json.dumps(payload).encode("utf-8") if payload is not None else None
        req=urllib.request.Request(API_ROOT+path,data=data,method=method,
            headers={"Authorization":"Bearer "+self.__token,"Accept":"application/vnd.github+json",
                     "X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"})
        try:
            with self._opener(req,timeout=15) as response:return json.load(response)
        except urllib.error.HTTPError as exc:
            error=RuntimeError("GitHub API request failed");error.status=exc.code;raise error from None
    def get_collaborator_permission(self,*,owner,repo,username):
        if (owner,repo)!=(OWNER,REPOSITORY) or not LOGIN.fullmatch(username or ""):
            raise PermissionError("invalid repository or actor for permission lookup")
        path=f"/repos/{owner}/{repo}/collaborators/{urllib.parse.quote(username,safe='')}/permission"
        response=self.request("GET",path)
        if not isinstance(response,dict) or (response.get("user") or {}).get("login")!=username:return "none"
        p=response.get("permission")
        return p if p in {"read","write","maintain","admin","none","triage"} else "none"
    def get_content(self,*,owner,repo,path,ref):
        if (owner,repo,path,ref)!=(OWNER,REPOSITORY,"control-tower/worker-runtime.json",TARGET_BRANCH):
            raise PermissionError("registry read outside fixed scope")
        return self.request("GET",f"/repos/{owner}/{repo}/contents/{urllib.parse.quote(path,safe='/')}?ref={urllib.parse.quote(ref,safe='')}")
    def put_content(self,*,owner,repo,branch,path,sha,content,message):
        if (owner,repo,branch,path)!=(OWNER,REPOSITORY,TARGET_BRANCH,"control-tower/worker-runtime.json"):
            raise PermissionError("registry write outside fixed scope")
        return self.request("PUT",f"/repos/{owner}/{repo}/contents/{urllib.parse.quote(path,safe='/')}",
            {"branch":branch,"sha":sha,"content":content,"message":message})
def parse_actor_worker_map(raw):
    try:mapping=json.loads(raw)
    except (TypeError,json.JSONDecodeError) as exc:raise PermissionError("protected actor-role map is invalid") from exc
    if not isinstance(mapping,dict) or not mapping:raise PermissionError("protected actor-role map is missing")
    result={}
    for login,workers in mapping.items():
        if not isinstance(login,str) or not LOGIN.fullmatch(login):raise PermissionError("protected actor-role map contains invalid login")
        if not isinstance(workers,list) or not workers or any(w not in WORKER_IDS for w in workers):
            raise PermissionError("protected actor-role map contains invalid worker roles")
        if len(set(workers))!=len(workers):raise PermissionError("protected actor-role map contains duplicate roles")
        result[login]=frozenset(workers)
    return result
def validate_event_actor(event_path,actor):
    if not event_path or not actor:raise PermissionError("trusted GitHub event actor context missing")
    try:event=json.loads(Path(event_path).read_text(encoding="utf-8"))
    except (OSError,json.JSONDecodeError) as exc:raise PermissionError("trusted GitHub event payload unavailable") from exc
    sender=(event.get("sender") or {}).get("login") if isinstance(event,dict) else None
    if sender!=actor:raise PermissionError("GitHub actor does not match event sender")
def main(env=None,api=None):
    env=os.environ if env is None else env
    if env.get("CT_TRANSACTION_ENABLED")!="1":raise PermissionError("trusted runtime disabled")
    if env.get("GITHUB_ACTIONS")!="true":raise PermissionError("GitHub Actions context required")
    if env.get("GITHUB_REPOSITORY")!=f"{OWNER}/{REPOSITORY}":raise PermissionError("wrong repository")
    if env.get("GITHUB_REF")!="refs/heads/main":raise PermissionError("workflow must execute from protected default branch")
    expected=f"{OWNER}/{REPOSITORY}/{WORKFLOW_PATH}@refs/heads/main"
    if env.get("GITHUB_WORKFLOW_REF")!=expected:raise PermissionError("workflow source is not protected default branch")
    if env.get("GITHUB_EVENT_NAME")!="workflow_dispatch":raise PermissionError("untrusted event")
    actor=env.get("GITHUB_ACTOR");validate_event_actor(env.get("GITHUB_EVENT_PATH"),actor)
    mapping=parse_actor_worker_map(env.get("CT_ACTOR_WORKER_MAP"))
    if not actor or actor not in mapping:raise PermissionError("GitHub actor is not assigned a protected worker role")
    token=env.get("GH_TOKEN")
    if not token:raise PermissionError("ephemeral GitHub token unavailable")
    task,worker,operation=env.get("CT_TASK_ID"),env.get("CT_WORKER"),env.get("CT_OPERATION")
    if not isinstance(task,str) or not re.fullmatch(r"[A-Z0-9][A-Z0-9-]{1,59}",task):raise ValueError("invalid task ID")
    if worker not in mapping[actor]:raise PermissionError("actor is not authorized for requested worker role")
    if operation not in {"claim","renew","release","recover"}:raise ValueError("invalid operation")
    run_id=env.get("GITHUB_RUN_ID")
    if not run_id or not run_id.isdecimal():raise PermissionError("trusted GitHub run ID missing")
    api=api or GitHubApi(token)
    permission=api.get_collaborator_permission(owner=OWNER,repo=REPOSITORY,username=actor)
    if permission not in {"write","maintain","admin"}:raise PermissionError("GitHub collaborator permission is insufficient")
    now=datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    return execute(api,owner=OWNER,repo=REPOSITORY,branch=TARGET_BRANCH,actor=actor,permission=permission,
        actor_worker_map=mapping,task_id=task,worker=worker,operation=operation,now=now,audit_ref="audit:actions-"+run_id)
if __name__=="__main__":main()
