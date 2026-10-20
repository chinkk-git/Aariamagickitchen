"""Independent exact-SHA evidence gate. No approval is inferred from CI alone."""
REQUIRED = ("W05", "W06", "W07", "W08", "W09")


def assess_release(candidate):
    errors = []
    sha = candidate.get("sha")
    artifact = candidate.get("artifact_sha256")
    if not isinstance(sha, str) or len(sha) != 40 or any(c not in "0123456789abcdef" for c in sha):
        errors.append("missing exact commit SHA")
    if not isinstance(artifact, str) or len(artifact) != 64 or any(c not in "0123456789abcdef" for c in artifact):
        errors.append("missing APK SHA-256")
    if candidate.get("recipe_count") != 95:
        errors.append("95 approved recipes required")
    if candidate.get("complete_only") is not True:
        errors.append("complete-only requirement missing")
    if candidate.get("coinstall_test") is not True or candidate.get("offline_test") is not True:
        errors.append("coinstall/offline tests missing")
    if candidate.get("unapproved_items"):
        errors.append("unapproved items included")
    if candidate.get("critical_defects"):
        errors.append("critical defects remain")
    approvals = candidate.get("approvals", {})
    if not isinstance(approvals, dict):
        approvals = {}
    for role in REQUIRED:
        evidence = approvals.get(role, {})
        if not isinstance(evidence, dict) or evidence.get("result") != "PASS":
            errors.append(f"{role}: independent PASS missing")
            continue
        if evidence.get("sha") != sha or evidence.get("artifact_sha256") != artifact:
            errors.append(f"{role}: approval evidence mismatch")
        if not isinstance(evidence.get("url"), str) or not evidence["url"].startswith("https://github.com/"):
            errors.append(f"{role}: GitHub evidence link missing")
        if evidence.get("reviewer") in {None, "", candidate.get("author")}:
            errors.append(f"{role}: reviewer not independent")
    return errors
