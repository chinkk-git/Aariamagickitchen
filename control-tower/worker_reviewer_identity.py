"""Fail-closed reviewer evidence policy.

Identity/permission and PR association must be fetched by a trusted server-side
GitHub App/Actions caller. Unverified issue comments are never approvals.
"""
ROLES = {"W05", "W06", "W07", "W08", "W09"}


def validate_review(record, candidate, trusted):
    errors = []
    role = record.get("role")
    if role not in ROLES:
        errors.append("invalid reviewer role")
    if record.get("result") != "PASS":
        errors.append("missing PASS")
    if record.get("sha") != candidate.get("sha") or record.get("artifact_sha256") != candidate.get("artifact_sha256"):
        errors.append("artifact/commit mismatch")
    if record.get("source") != "github_pull_request_review":
        errors.append("untrusted evidence source")
    if record.get("review_id") != trusted.get("review_id") or record.get("reviewer") != trusted.get("login"):
        errors.append("review identity mismatch")
    if trusted.get("state") != "APPROVED" or trusted.get("commit_id") != candidate.get("sha"):
        errors.append("GitHub approval state or commit mismatch")
    if trusted.get("permission") not in {"write", "maintain", "admin"}:
        errors.append("reviewer lacks write permission")
    if trusted.get("login") == candidate.get("author") or not trusted.get("login"):
        errors.append("author self-review")
    if trusted.get("pull_number") != candidate.get("pull_number"):
        errors.append("review belongs to another PR")
    if not trusted.get("fetched_from_github_api"):
        errors.append("GitHub API verification missing")
    return errors
