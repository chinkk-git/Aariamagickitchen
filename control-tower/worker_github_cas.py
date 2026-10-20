"""GitHub API transaction adapter: authenticated actor + Git blob-SHA CAS.

Network I/O is injected for unit testing. No workflow dispatch or runtime activation.
This adapter must run only in a trusted GitHub Actions context, never issue comments.
"""
import base64
import json


class ConflictError(RuntimeError):
    pass


def actor_authorized(actor, allowed, permission):
    """Caller supplies GitHub-verified actor and repository permission."""
    return bool(actor and actor in allowed and permission in {"write", "maintain", "admin"})


def cas_update(api, owner, repo, branch, path, transform, actor, allowed, permission):
    if not actor_authorized(actor, allowed, permission):
        raise PermissionError("GitHub actor lacks trusted write authority")
    file = api.get_content(owner=owner, repo=repo, path=path, ref=branch)
    if not isinstance(file.get("sha"), str) or not file["sha"]:
        raise ValueError("missing expected blob SHA")
    old = json.loads(base64.b64decode(file["content"]).decode("utf-8"))
    updated = transform(old)
    if not isinstance(updated, dict):
        raise ValueError("invalid transaction result")
    encoded = base64.b64encode((json.dumps(updated, indent=2) + "\n").encode("utf-8")).decode("ascii")
    try:
        return api.put_content(owner=owner, repo=repo, branch=branch, path=path,
                               sha=file["sha"], content=encoded,
                               message="control-tower: trusted atomic update")
    except Exception as exc:
        if getattr(exc, "status", None) in {409, 422}:
            raise ConflictError("concurrent update rejected; re-read and revalidate") from exc
        raise
