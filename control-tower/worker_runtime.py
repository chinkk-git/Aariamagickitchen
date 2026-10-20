"""GitHub Actions trusted-runtime prototype (intentionally DISABLED).

Uses GITHUB_TOKEN from a protected runner environment, not user inputs. This
file must never run from a pull_request head with write permissions. Runtime
requires CT_TRANSACTION_ENABLED=1, a trusted branch and explicit allowlist.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from worker_executor import execute


class GitHubApi:
    def __init__(self, token):
        self.token = token
    def request(self, method, url, payload=None):
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(
            url, data=data, method=method,
            headers={"Authorization": "Bearer " + self.token,
                     "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28",
                     "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            error = RuntimeError("GitHub API request failed")
            error.status = exc.code
            raise error from None
    def get_content(self, *, owner, repo, path, ref):
        from urllib.parse import quote
        return self.request("GET", f"https://api.github.com/repos/{owner}/{repo}/contents/{quote(path)}?ref={quote(ref)}")
    def put_content(self, *, owner, repo, branch, path, sha, content, message):
        from urllib.parse import quote
        return self.request("PUT", f"https://api.github.com/repos/{owner}/{repo}/contents/{quote(path)}",
                            {"branch":branch,"sha":sha,"content":content,"message":message})


def main(env=None, api=None):
    env = os.environ if env is None else env
    if env.get("CT_TRANSACTION_ENABLED") != "1":
        raise PermissionError("trusted runtime disabled")
    if env.get("GITHUB_REPOSITORY") != "chinkk-git/Aariamagickitchen":
        raise PermissionError("wrong repository")
    if env.get("GITHUB_REF") != "refs/heads/control-tower/worker-control-plan-20261019":
        raise PermissionError("untrusted branch")
    if env.get("GITHUB_EVENT_NAME") != "workflow_dispatch":
        raise PermissionError("untrusted event")
    actor = env.get("GITHUB_ACTOR")
    allowlist = {x for x in env.get("CT_ALLOWED_ACTORS", "").split(",") if x}
    if not actor or actor not in allowlist:
        raise PermissionError("actor not allowlisted")
    if not env.get("GITHUB_TOKEN") or not env.get("CT_CAPABILITY"):
        raise PermissionError("protected credentials absent")
    if env.get("CT_TASK_ID") is None or env.get("CT_WORKER") is None:
        raise ValueError("task and worker required")
    if env.get("CT_OPERATION") not in {"claim","renew","release","recover"}:
        raise ValueError("invalid operation")
    if not env.get("CT_NOW") or not env.get("CT_AUDIT_REF"):
        raise ValueError("trusted timestamp/audit reference required")
    # A production runner must query the GitHub collaborator permission API.
    # No trusted permission source is connected here: fail closed.
    raise PermissionError("GitHub actor permission lookup not integrated; execution blocked")


if __name__ == "__main__":
    main()
