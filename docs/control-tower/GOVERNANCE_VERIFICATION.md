# GOV-01–05 verification register
Status: partial validation, 2026-10-18. Do not mistake this for full production acceptance.

## Verified from repository
- Existing docs/CONTROL_TOWER_PROTOCOL.md, docs/control-tower/SESSION_PROTOCOL.md, ADAPTIVE_SESSION_LIFECYCLE.md and A10_RECOVERY.md exist and have overlapping coordination rules; reuse, do not replace.
- Existing #4 V3, #5 V3.1, #6 World, #7 integration are the issue queue; integration depends on upstream verification.
- V3.1 workflow .github/workflows/v31-android.yml on feature/v3.1-home-redesign already runs npm test, validate:recipes, validate:v31, transform-production, validate-v3, art/CSP/profile tests and Android APK work. No duplicate workflow added.
- V3.1 tools/v3/validate-v31.mjs explicitly checks original catalogue count 95 and uniqueness/range of IDs. This verifies catalogue invariants, not approved artwork coverage.
- Existing hourly A10 ChatGPT automation is enabled and its saved prompt already demands 1–3-line heartbeat, exception-only alerts and full dashboard only on explicit A10 status. No schedule or prompt change required.

## Validation scenarios — static policy review
| Scenario | Required result | Status |
|---|---|---|
| Green CI, no Android device test | REVIEW, not VERIFIED | Policy and validator implemented; execution pending |
| Generated/mapped art, no APK render/A09 | Not APPROVED | Policy documented; manifest reconciliation pending |
| V3.1 writes V3 security branch | Block/escalate | Policy documented; automated guard not established |
| Screenshot assertion fails | Not eligible for A10 retry | Existing A10 policy verified |
| Transient emulator failure | Retry only with evidence/ledger/budget | Existing A10 policy verified |
| GitHub silent 60 min | SUSPECTED STALLED only | Existing A10 policy verified |
| Integration before upstream gates | BLOCKED | Existing Control Tower policy verified |
| Hourly vs A10 status | Short heartbeat vs requested dashboard | Saved automation prompt verified; runtime behavior not observed |

## Outstanding operational acceptance
1. Execute `python3 tools/governance/validate_evidence.py --selftest` on a checked-out governance branch and capture stdout/exit code.
2. Enumerate live V3.1 asset manifest and screenshots, count each of 95 original IDs by asset role/stage, then record verified source SHA and reviewer links on #5/#6. Never infer from placeholders or local untracked files.
3. Verify applicable V3 CI and Android device acceptance separately; do not interpret workflow success as release-signing proof.
4. Dry-run the governance scenarios using issue checkpoints without triggering paid CI, automatic merges or branch edits.
5. After review, merge this governance-only branch to main; update Control Tower bootstrap references if needed.

No V3/V3.1 branch or application source edits. A08/A09 and A10 retry constraints remain authoritative.
