"""Strict schema for read-only execution evidence; never authenticates its issuer.

Evidence must be independently obtained from protected GitHub APIs, not from
task input, comments, issue text, or worker-generated JSON.
"""
import re

SHA = re.compile(r"^[0-9a-f]{40}$")
KINDS = frozenset({"commit","ci","review","artifact","lease_release"})

class EvidenceDenied(ValueError):
    pass

def validate_evidence(items, *, trusted_head_sha, task_id, worker):
    if not isinstance(trusted_head_sha,str) or not SHA.fullmatch(trusted_head_sha):
        raise EvidenceDenied("trusted HEAD missing")
    if not isinstance(task_id,str) or not task_id or not isinstance(worker,str) or not worker:
        raise EvidenceDenied("task identity missing")
    if not isinstance(items,list) or not items:
        raise EvidenceDenied("evidence missing")
    seen=set()
    for item in items:
        if not isinstance(item,dict) or set(item)!={"kind","task_id","worker","commit_sha","source_ref","status"}:
            raise EvidenceDenied("invalid evidence schema")
        kind=item["kind"]
        if kind not in KINDS or kind in seen:
            raise EvidenceDenied("unknown or duplicate evidence kind")
        seen.add(kind)
        if item["task_id"]!=task_id or item["worker"]!=worker or item["commit_sha"]!=trusted_head_sha:
            raise EvidenceDenied("evidence identity or SHA mismatch")
        if item["status"]!="PASS" or not isinstance(item["source_ref"],str) or not item["source_ref"].strip():
            raise EvidenceDenied("unverified evidence status or source")
    return tuple(sorted(seen))
