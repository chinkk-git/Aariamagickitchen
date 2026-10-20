"""Fail-closed, side-effect-free worker registry checks. No runtime activation."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TYPES = {"coding", "assurance", "release", "governance"}
ROLES = {f"W{i:02d}" for i in range(1, 11)}
BRANCH = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")


def validate_registry(data):
    errors = []
    if data.get("schema_version") != 1:
        errors.append("unsupported schema")
    if data.get("activation") != "DISABLED":
        errors.append("global activation must remain DISABLED")
    if data.get("cost_policy") != "NO_ADDITIONAL_CHARGES":
        errors.append("cost policy mismatch")
    workers = data.get("workers")
    if not isinstance(workers, list):
        return errors + ["workers must be a list"]
    ids = [w.get("id") for w in workers if isinstance(w, dict)]
    if len(workers) != 10 or set(ids) != ROLES or len(set(ids)) != len(ids):
        errors.append("worker IDs must be exactly W01-W10 without duplicates")
    branches = []
    for w in workers:
        if not isinstance(w, dict):
            errors.append("worker entry must be an object")
            continue
        wid = w.get("id", "?")
        if w.get("type") not in TYPES:
            errors.append(f"{wid}: invalid type")
        if w.get("activation") != "DISABLED" or w.get("runtime") != "UNASSIGNED":
            errors.append(f"{wid}: activation/runtime is not authorized")
        if w.get("can_self_approve") is not False:
            errors.append(f"{wid}: self-approval forbidden")
        branch = w.get("branch")
        if branch is not None:
            if w.get("type") != "coding" or not isinstance(branch, str) or not BRANCH.fullmatch(branch) or ".." in branch or "//" in branch:
                errors.append(f"{wid}: invalid branch ownership")
            else:
                branches.append(branch)
    if len(branches) != len(set(branches)):
        errors.append("duplicate branch writer")
    return errors


def main():
    data = json.loads((ROOT / "workers.json").read_text(encoding="utf-8"))
    errors = validate_registry(data)
    if errors:
        raise SystemExit("\n".join(errors))
    print("Worker registry: PASS (10 disabled roles, unique branch writers)")


if __name__ == "__main__":
    main()
