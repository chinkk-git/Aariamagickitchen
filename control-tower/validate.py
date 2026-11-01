#!/usr/bin/env python3
"""Deterministic GitHub task/release validation. No external dependencies."""
import json, pathlib, sys
p=pathlib.Path(__file__).with_name("tasks.json")
d=json.loads(p.read_text(encoding="utf-8"))
errors=[]
statuses={"BACKLOG","READY","CLAIMED","IN_PROGRESS","BLOCKED","REVIEW","VERIFIED"}
ids={t["id"] for t in d["tasks"]}
if len(ids)!=len(d["tasks"]): errors.append("Duplicate task IDs")
for t in d["tasks"]:
    if t["status"] not in statuses: errors.append(f'{t["id"]}: invalid status')
    if t["owner"] not in d["workers"]: errors.append(f'{t["id"]}: unknown owner')
    if any(x not in ids for x in t["depends_on"]): errors.append(f'{t["id"]}: unknown dependency')
    if t["status"]=="VERIFIED" and not t["evidence"]: errors.append(f'{t["id"]}: VERIFIED without evidence')
    if t["status"] in {"CLAIMED","IN_PROGRESS"} and d["workers"][t["owner"]]["session_state"]=="STOPPED":
        errors.append(f'{t["id"]}: stopped worker cannot claim task')
for worker, config in d["workers"].items():
    if config["session_state"]=="STOPPED" and config["writer"] is not None: errors.append(f"{worker}: stopped worker has writer")
release=d["release"]
if release["original_recipes_required"]!=95: errors.append("Original recipe requirement must remain 95")
if not release["strict_complete_only"]: errors.append("Complete-only gate cannot be disabled")
decisions={"INCLUDE","EXCLUDE","BLOCKED"}
for item in release["items"]:
    if item["decision"] not in decisions: errors.append(f'{item["id"]}: invalid decision')
    if item["decision"]=="INCLUDE" and (item["state"]!="VERIFIED" or not item["evidence"]):
        errors.append(f'{item["id"]}: unverified inclusion')
if release["status"]=="VERIFIED":
    if any(t["status"]!="VERIFIED" for t in d["tasks"] if t["id"].startswith("INT-")):
        errors.append("Release cannot be VERIFIED while integration gates are open")
print(json.dumps({"valid":not errors,"errors":errors,"task_count":len(ids),"release_status":release["status"]},indent=2))
sys.exit(bool(errors))
