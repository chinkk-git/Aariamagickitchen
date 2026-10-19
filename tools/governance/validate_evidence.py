#!/usr/bin/env python3
"""Offline governance evidence validator. Stdlib only; no GitHub calls or secrets."""
import json
import re
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
        if not isinstance(record.get("head_sha"), str) or not re.fullmatch(r"[a-fA-F0-9]{40}", record["head_sha"]):
            errors.append("verified requires full commit SHA")
        if record.get("ci_conclusion") != "success" or not record.get("ci_url"):
            errors.append("verified requires successful linked CI")
        if record.get("device_test") != "pass":
            errors.append("verified requires device pass")
        if not record.get("apk_artifact"):
            errors.append("verified requires APK artifact")
        if record.get("apk_signer_class") not in ("debug", "production"):
            errors.append("verified requires known signer class")
        if record.get("regression") != "pass":
            errors.append("verified requires regression pass")
        for k in ("a08", "a09", "security_gates"):
            if record.get(k) != "pass":
                errors.append("verified requires explicit " + k + " pass")
        if record.get("visual_review") not in ("pass", "not-applicable"):
            errors.append("verified requires visual review pass or justified nonapplicability")
        if record.get("visual_review") == "not-applicable" and not record.get("visual_na_rationale"):
            errors.append("visual nonapplicability requires rationale")
        if record.get("blockers"):
            errors.append("verified cannot have blockers")
        if record.get("production_release"):
            if record.get("apk_signer_class") != "production":
                errors.append("production release requires production signer")
            for k in ("signing_continuity", "upgrade_test", "rollback_test", "parent_update_confirmation"):
                if record.get(k) != "pass":
                    errors.append("production release requires " + k + " pass")
    return errors

def selftest():
    base = dict(issue=4, owner="V3", branch="v3", head_sha="a"*40,
                ci_url="https://github.com/example/actions/runs/1",
                ci_conclusion="success", apk_artifact="debug-apk",
                apk_signer_class="debug", device_test="pass", regression="pass",
                visual_review="not-applicable", visual_na_rationale="No visual changes", a08="pass", a09="pass",
                security_gates="pass", blockers="", next="handoff", status="verified")
    assert not validate(base)
    for changes in ({"device_test":"not-run"},{"a08":"pending"},
                    {"ci_conclusion":"failure"},{"blockers":"missing approval"},
                    {"production_release":True}, {"a09":"not-applicable"},
                    {"security_gates":"not-applicable"}, {"visual_na_rationale":""},
                    {"apk_artifact":""}, {"head_sha":"invalid"}, {"regression":"not-run"}):
        assert validate({**base, **changes}), changes
    assert not validate({**base, "status":"review", "device_test":"not-run"})
    release = {**base, "production_release":True, "apk_signer_class":"production",
               "signing_continuity":"pass", "upgrade_test":"pass",
               "rollback_test":"pass", "parent_update_confirmation":"pass"}
    assert not validate(release)
    print("PASS: 14 offline evidence-validation scenarios")

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
