"""Authenticated GitHub Git Data API adapter for the A10 task-ref store.

Token is supplied by the runtime, never embedded. Ref mutations are restricted
to refs/heads/a10-state/<validated-key>. No worker branch access is required.
"""
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

from scripts.a10_ref_store import PREFIX, KEY, Conflict

SHA = re.compile(r"^[a-f0-9]{40}$")

class GitHubAPIError(RuntimeError):
    def __init__(self, status, message):
        super().__init__(f"GitHub API HTTP {status}: {message}")
        self.status = status

class GitHubGitAPI:
    def __init__(self, repository, token=None, transport=None):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
            raise ValueError("invalid repository")
        self.repository = repository
        self.token = token if token is not None else os.getenv("GH_TOKEN")
        if not self.token:
            raise ValueError("missing GH_TOKEN")
        self.transport = transport or urllib.request.urlopen

    def request(self, method, endpoint, payload=None):
        if not endpoint.startswith("/"):
            raise ValueError("invalid API path")
        url = "https://api.github.com/repos/" + self.repository + endpoint
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, method=method, headers={
            "Authorization": "Bearer " + self.token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "a10-task-store",
        })
        try:
            with self.transport(req, timeout=20) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            # Never log response bodies: providers may include sensitive details.
            raise GitHubAPIError(exc.code, exc.reason) from None
        except (urllib.error.URLError, TimeoutError) as exc:
            raise GitHubAPIError(0, "transport failure") from None

    @staticmethod
    def ref_path(ref):
        if not ref.startswith(PREFIX) or not KEY.fullmatch(ref[len(PREFIX):]):
            raise ValueError("ref outside A10 state namespace")
        return urllib.parse.quote(ref.removeprefix("refs/"), safe="/")

    def get(self, ref):
        path = self.ref_path(ref)
        head = self.request("GET", "/git/ref/" + path)["object"]["sha"]
        commit = self.request("GET", "/git/commits/" + head)
        tree = self.request("GET", "/git/trees/" + commit["tree"]["sha"])
        entries = [e for e in tree["tree"] if e["path"] == "state.json" and e["type"] == "blob"]
        if len(entries) != 1:
            raise ValueError("task state blob missing or ambiguous")
        blob = self.request("GET", "/git/blobs/" + entries[0]["sha"])
        import base64
        if blob.get("encoding") != "base64":
            raise ValueError("unsupported blob encoding")
        return head, base64.b64decode(blob["content"], validate=False).decode("utf-8")

    def put_blob(self, content):
        return self.request("POST", "/git/blobs", {"content": content, "encoding": "utf-8"})["sha"]

    def put_tree(self, blob_sha):
        if not SHA.fullmatch(blob_sha):
            raise ValueError("invalid blob SHA")
        return self.request("POST", "/git/trees", {"tree": [
            {"path": "state.json", "mode": "100644", "type": "blob", "sha": blob_sha}
        ]})["sha"]

    def put_commit(self, tree_sha, parent_sha):
        if not SHA.fullmatch(tree_sha) or not SHA.fullmatch(parent_sha):
            raise ValueError("invalid commit/tree SHA")
        return self.request("POST", "/git/commits", {
            "message": "a10: task state transition",
            "tree": tree_sha, "parents": [parent_sha]
        })["sha"]

    def update_ref(self, ref, sha, force=False):
        if force is not False or not SHA.fullmatch(sha):
            raise ValueError("only non-forced updates with valid SHA allowed")
        return self.request("PATCH", "/git/refs/" + self.ref_path(ref), {
            "sha": sha, "force": False
        })

    def initialize(self, key, task):
        """Create-only task initialization; 422 conflicts must not overwrite."""
        from scripts.a10_ref_store import encode
        if not KEY.fullmatch(key) or task.key != key:
            raise ValueError("invalid task key")
        blob = self.put_blob(encode(task))
        tree = self.put_tree(blob)
        commit = self.request("POST", "/git/commits", {
            "message": "a10: initialize task", "tree": tree, "parents": []
        })["sha"]
        try:
            return self.request("POST", "/git/refs", {
                "ref": PREFIX + key, "sha": commit
            })
        except GitHubAPIError as exc:
            if exc.status == 422:
                raise Conflict("task already initialized") from exc
            raise
