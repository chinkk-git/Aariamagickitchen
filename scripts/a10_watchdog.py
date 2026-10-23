#!/usr/bin/env python3
"""A10 read-only CI diagnosis + deduplicated GitHub issue escalation.

No branch mutation, workflow dispatch, merges, or releases. CI retry requires a
separately reviewed allowlisted implementation, not a speculative rerun.
"""
import json
import os
import subprocess
from datetime import datetime, timezone

REPO = os.environ["GH_REPO"]
DRY_RUN = os.getenv("A10_DRY_RUN", "false").lower() == "true"
WORKERS = {
    "W01": {"issue": 45, "branch": "feature/v3.2-magical-cookbook"},
    "W02": {"issue": 39, "branch": "feature/v3.3-world-map-explorer"},
}

def gh(path, method="GET", payload=None):
    args = ["gh", "api", "-X", method, "-H", "Accept: application/vnd.github+json", path]
    if payload is not None:
        args += ["--input", "-"]
    p = subprocess.run(args, input=json.dumps(payload) if payload is not None else None,
                       text=True, capture_output=True, check=False, timeout=35)
    if p.returncode:
        raise RuntimeError(f"GitHub API failed ({p.returncode}): {p.stderr[:300]}")
    return json.loads(p.stdout) if p.stdout.strip() else {}

def check(name, cfg):
    issue, branch = cfg["issue"], cfg["branch"]
    try:
        ref = gh(f"repos/{REPO}/branches/{branch}")
        sha = ref["commit"]["sha"]
        runs = gh(f"repos/{REPO}/actions/runs?branch={branch}&per_page=10")
        matches = [r for r in runs.get("workflow_runs", [])
                   if r.get("head_sha") == sha and r.get("event") != "schedule"]
        latest = matches[0] if matches else None
        if not latest:
            print(f"{name}: no exact-head CI found; do not infer worker stuck")
            return
        conclusion = latest.get("conclusion")
        if conclusion != "failure":
            print(f"{name}: exact-head CI {latest['id']} status={latest.get('status')} conclusion={conclusion}")
            return
        jobs = gh(f"repos/{REPO}/actions/runs/{latest['id']}/jobs?per_page=100")
        failed = [j for j in jobs.get("jobs", []) if j.get("conclusion") == "failure"]
        failed_steps = [s["name"] for j in failed for s in j.get("steps", [])
                        if s.get("conclusion") == "failure"]
        # Escalate reproducible test failures; NEVER automatically rerun them.
        if not failed_steps:
            print(f"{name}: failed run lacks step evidence; no recovery action")
            return
        signature = f"<!-- a10-watch:{name}:{sha}:{latest['id']} -->"
        comments = gh(f"repos/{REPO}/issues/{issue}/comments?per_page=100")
        if any(signature in c.get("body", "") for c in comments):
            print(f"{name}: recovery already posted for run {latest['id']}")
            return
        msg = (f"{signature}\n### P0 — A10 evidence-backed CI blocker ({name})\n"
               f"- Branch: `{branch}`; exact HEAD: `{sha}`\n"
               f"- Failed run: {latest['html_url']}\n"
               f"- Failed steps: {', '.join(failed_steps[:8])}\n"
               "- Next action: inspect failed job logs/artifacts, isolate demonstrated cause, "
               "correct only that cause, then rerun exact-head gates; post APK, SHA-256 and screenshots.\n"
               "- No test weakening, automatic code modification, merge or release. "
               "GitHub instructions do not resume stopped Work sessions.")
        if DRY_RUN:
            print(f"DRY RUN: would post to #{issue}: {msg}")
        else:
            gh(f"repos/{REPO}/issues/{issue}/comments", "POST", {"body": msg})
            print(f"{name}: posted evidence to issue #{issue}")
    except Exception as exc:
        print(f"{name}: monitoring error: {exc}")

if __name__ == "__main__":
    for worker, config in WORKERS.items():
        check(worker, config)
