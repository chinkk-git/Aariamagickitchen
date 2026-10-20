"""Offline-only controlled cutover planner. No GitHub API, no file writes.

The plan does not authorize legacy writers or grant leases. A future cutover
requires a separate enforced writer fence and explicit owner approval.
"""
from copy import deepcopy
from datetime import datetime,timezone
from worker_security_evidence import SecurityEvidenceError

class CutoverDenied(PermissionError): pass

def plan_cutover(legacy, *, source_sha, now, fence_evidence=None):
    if not isinstance(legacy,dict) or legacy.get("schema_version")!=1:
        raise CutoverDenied("legacy schema invalid")
    if not isinstance(legacy.get("workers"),dict) or not isinstance(legacy.get("tasks"),list):
        raise CutoverDenied("legacy ownership data missing")
    if not isinstance(source_sha,str) or len(source_sha)!=40 or any(c not in "0123456789abcdef" for c in source_sha):
        raise CutoverDenied("immutable source SHA required")
    try:
        timestamp=datetime.fromisoformat(now.replace("Z","+00:00"))
        if timestamp.tzinfo is None:raise ValueError()
    except (AttributeError,ValueError):
        raise CutoverDenied("timezone-aware timestamp required")
    if fence_evidence is not None:
        # No caller-supplied dict/string may attest that legacy writes are fenced.
        raise CutoverDenied("external fence evidence is not independently authenticated")
    workers=deepcopy(legacy["workers"])
    for key,record in workers.items():
        if not isinstance(record,dict) or not isinstance(record.get("session_state"),str):
            raise CutoverDenied("malformed worker ownership")
        if record.get("session_state") not in {"STOPPED","NOT_STARTED"} or record.get("writer"):
            # UNKNOWN and active writer remain quarantined; never auto-release.
            record["migration_disposition"]="QUARANTINED"
        else:
            record["migration_disposition"]="UNCONFIRMED_FREE"
    branches={}
    for record in workers.values():
        branch=record.get("branch")
        if branch:
            if not isinstance(branch,str):raise CutoverDenied("invalid branch")
            if branch in branches:raise CutoverDenied("duplicate branch ownership")
            branches[branch]={"state":record["migration_disposition"],"writer":record.get("writer")}
    for task in legacy["tasks"]:
        if not isinstance(task,dict) or not isinstance(task.get("id"),str) or not isinstance(task.get("target_branch"),str):
            raise CutoverDenied("malformed legacy task")
        lease=task.get("lease")
        if lease is not None:
            if not isinstance(lease,dict):raise CutoverDenied("invalid legacy lease")
            raise CutoverDenied("legacy lease requires explicit reconciliation, even if expired")
        if task.get("status") in {"CLAIMED","IN_PROGRESS"}:
            raise CutoverDenied("active legacy task requires handover")
        branch=task["target_branch"]
        if branch in branches and branches[branch]["state"]=="QUARANTINED":continue
        branches.setdefault(branch,{"state":"UNCONFIRMED_FREE","writer":None})
    return {"mode":"OFFLINE_PLAN_ONLY","activation":"DISABLED","source_sha":source_sha,
            "generated_at":now,"legacy_fence":"NOT_VERIFIED","migration_authorized":False,
            "workers":workers,"branches":branches,"tasks":deepcopy(legacy["tasks"]),
            "next_gate":"independent legacy write fence + explicit owner cutover approval"}
