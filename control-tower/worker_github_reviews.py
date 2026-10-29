"""Trusted GitHub PR-review metadata adapter.

Transport is injected; caller must use an authenticated GitHub API client.
No user-provided 'verified' flags are accepted. GitHub API responses alone do
not prove role assignment: caller must also bind role to a trusted policy.
"""
from worker_reviewer_identity import validate_review


def verify_github_review(api, owner, repo, pull_number, review_id, role, candidate, record, role_members):
    if role not in role_members or not role_members[role]:
        return ["reviewer role not configured"]
    if not isinstance(review_id, int) or review_id <= 0:
        return ["invalid review ID"]
    if pull_number != candidate.get("pull_number"):
        return ["candidate PR mismatch"]
    review = api.get_review(owner=owner, repo=repo, pull_number=pull_number, review_id=review_id)
    login = (review.get("user") or {}).get("login")
    if not login or login not in role_members[role]:
        return ["reviewer not assigned to role"]
    permission = api.get_collaborator_permission(owner=owner, repo=repo, username=login)
    trusted = {"review_id": review.get("id"), "login": login,
               "state": review.get("state"), "commit_id": review.get("commit_id"),
               "permission": permission, "pull_number": pull_number,
               "fetched_from_github_api": True}
    return validate_review(record, candidate, trusted)
