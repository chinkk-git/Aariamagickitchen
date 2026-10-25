#!/usr/bin/env python3
"""Validate immutable A10 job manifests before an isolated runner is permitted."""
import json
import re
import sys

BRANCHES = {
    "W01": "feature/v3.2-magical-cookbook",
    "W02": "feature/v3.3-world-map-explorer",
}
SHA = re.compile(r"^[0-9a-f]{40}$")
TASK = re.compile(r"^#[1-9][0-9]{0,5}$")
ALLOWED = {"worker", "branch", "base_sha", "issue", "mode", "max_minutes", "attempt"}
def validate(job):
    if not isinstance(job, dict) or set(job) != ALLOWED:
        raise ValueError("manifest fields must match the fixed schema")
    worker = job["worker"]
    if worker not in BRANCHES or job["branch"] != BRANCHES[worker]:
        raise ValueError("worker branch ownership violation")
    if not isinstance(job["base_sha"], str) or not SHA.fullmatch(job["base_sha"]):
        raise ValueError("exact base SHA required")
    expected = "#45" if worker == "W01" else "#39"
    if job["issue"] != expected or not TASK.fullmatch(job["issue"]):
        raise ValueError("governing issue mismatch")
    if job["mode"] != "inspect":
        raise ValueError("execution disabled: only inspect mode is approved")
    if type(job["max_minutes"]) is not int or not 1 <= job["max_minutes"] <= 10:
        raise ValueError("invalid time budget")
    if type(job["attempt"]) is not int or job["attempt"] != 1:
        raise ValueError("retry requires a separately reviewed policy")
    return job

if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as fh:
        print(json.dumps(validate(json.load(fh)), sort_keys=True))
