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

## Additional validation checkpoint — 2026-10-18
- Validator strengthened on governance branch at commit `e37e5865a493233c9f1fcc83f2b6df36427ef088`: explicit A08/A09/security PASS, device PASS, known signer class, artwork visual nonapplicability rationale and production signer/upgrade/rollback/parent-confirmation gates. An independently constructed equivalent local validator passed 14 scenarios; the exact committed script has not been executed in GitHub CI. Do not represent this as CI green.
- V3.1 branch source `tools/v3/validate-v31.mjs` confirms exactly 95 original recipe IDs and uniqueness are asserted. This is a catalogue invariant, not 95 approved art bundles.
- V3.1 `tools/v3/data/world-adventure-pilot.json` identifies new recipe IDs 96+ as review-pilot; its artwork metadata says independent final scene approval pending. Keep draft IDs outside the original 95 coverage denominator.
- Full per-ID/per-asset inventory, integrated APK render, screenshot comparison and independent A08/A09 approval remain NOT VERIFIED. No fabricated coverage counts or production promotion.

## Reconciled artwork evidence — Issue #6 latest checkpoint
Source: https://github.com/chinkk-git/Aariamagickitchen/issues/6#issuecomment-6257853194 and https://github.com/chinkk-git/Aariamagickitchen/issues/6#issuecomment-6257798948

| Metric | Count | Evidence classification |
|---|---:|---|
| Original recipe catalogue | 95/95 | CI validator assertion, not art approval |
| Finished-dish imagery | 95/95 | Reported in Issue #6; individual A09 approval not established |
| Existing runtime step atlases | 40/95 | Integrated/mapped runtime coverage as reported by delivery issue |
| Missing IDs 11–65 drafted | 55/55 | Isolated local staging ZIP; 330 SVG panels; not committed, not runtime integrated, not A09 approved |
| Step atlases A09-approved among staged 55 | 0/55 confirmed | Review pending, not evidence of rejection |
| Missing runtime step atlases | 55/95 | Must be reviewed, integrated and retested |

Do not add 40 runtime and 55 staged to claim 95 runtime or 95 approved. The staging ZIP is not accessible in repository evidence and its per-file manifest was not independently reverified here. No IDs 96+ count toward the original 95. Latest V3.1 Android technical run reported green: https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39185550947 (commit 723d511); A09 visual concerns remain.

## CI wiring
Governance-only GitHub Actions workflow `.github/workflows/governance-evidence.yml` added on governance branch (commit `9836a28`). It runs Python compile and the committed validator's `--selftest` on push and manual dispatch. A successful GitHub run has not yet been independently observed; keep the CI acceptance gate pending.
