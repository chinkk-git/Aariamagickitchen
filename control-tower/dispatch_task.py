#!/usr/bin/env python3
"""Parse GitHub issue-form markdown into canonical dispatcher fields. Stdlib only."""
import re,sys
body=sys.stdin.read()
fields={}
for key in ("Task owner","Target branch","Acceptance criteria"):
    match=re.search(r"^### "+re.escape(key)+r"\s*\n+(.+?)(?=\n### |\Z)",body,re.M|re.S)
    if match: fields[key]=match.group(1).strip()
missing=[k for k in ("Task owner","Target branch","Acceptance criteria") if not fields.get(k) or fields[k]=="_No response_"]
if missing: raise SystemExit("Missing issue form fields: "+", ".join(missing))
for key,value in fields.items():
    print(key+": "+value.replace("\n"," " if key!="Acceptance criteria" else " | "))
