#!/usr/bin/env python3
"""Offline governance evidence validator. Stdlib only; no GitHub calls or secrets."""
import json
import sys

STATES = {"queued", "in-progress", "blocked", "review", "verified"}
RESULTS = {"pass", "fail", "not-run", "not-applicable", "pending"}
REQUIRED = ("issue", "owner", "branch", "head_sha", "ci_url", "ci_conclusion",
            "apk_artifact", "apk_signer_class", "device_test", "regression",
            "visual_review", "a08", "a09", "security_gates", "blockers", "next")
def validate(record):
    errors = []
    missing = [k for k in REQUIRED if k not in record]
    if missing:
        errors.append("missing fields: " + ", ".join(missing))
    if record.get("status") not in STATES:
        errors.append("invalid status")
    for k in ("device_test", "regression", "visual_review", "a08", "a09", "security_gates"):
        if k in record and record[k] not in RESULTS:
            errors.append("invalid " + k)
    if record.get("status") == "verified":
        if not record.get("head_sha") or len(record["head_sha"]) != 40:
            errors.append("verified requires full commit SHA")
        if record.get("ci_conclusion") != "success" or not record.get("ci_url"):
            errors.append("verified requires successful linked CI")
        if record.get("regression") != "pass":
            errors.append("verified requires regression pass")
        for k in ("device_test", "visual_review", "a08", "a09", "security_gates"):
            if record.get(k) in ("fail", "not-run", "pending", None):
                errors.append("verified blocked by " + k)
        if record.get("blockers"):
            errors.append("verified cannot have blockers")
        if record.get("apk_signer_class") == "debug" and record.get("production_release"):
            errors.append("debug signer cannot verify production release")
    return errors

def selftest():
    base = dict(issue=4, owner="V3", branch="v3", head_sha="a"*40,
                ci_url="https://github.com/example/actions/runs/1",
                ci_conclusion="success", apk_artifact="debug-apk",
                apk_signer_class="debug", device_test="pass", regression="pass",
                visual_review="not-applicable", a08="pass", a09="pass",
                security_gates="pass", blockers="", next="handoff", status="verified")
    assert not validate(base)
    for changes in ({"device_test":"not-run"},{"a08":"pending"},
                    {"ci_conclusion":"failure"},{"blockers":"missing approval"},
                    {"production_release":True}):
        assert validate({**base, **changes}), changes
    assert not validate({**base, "status":"review", "device_test":"not-run"})
    print("PASS: 7 offline evidence-validation scenarios")

if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--selftest":
        selftest()
    elif len(sys.argv) == 2:
        with open(sys.argv[1], encoding="utf-8") as f:
            record = json.load(f)
        errors = validate(record)
        print(json.dumps({"valid": not errors, "errors": errors}, indent=2))
        sys.exit(1 if errors else 0)
    else:
        print("usage: python3 tools/governance/validate_evidence.py <record.json>|--selftest")
        sys.exit(2)
