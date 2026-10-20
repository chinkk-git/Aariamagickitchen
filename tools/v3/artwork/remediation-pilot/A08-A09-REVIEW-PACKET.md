# W01 independent artwork acceptance packet — five priority atlases

**Status: REVIEW REQUESTED; NOT APPROVED; DO NOT INTEGRATE INTO RUNTIME.**

Scope: recipe IDs **27, 39, 40, 51, 63**, six panels each (30 draft panels). Source catalog remains 95 recipes. This packet does not authorize a release, merge, user-data reset, or replacement of currently installed artwork.

## Reproducible source and provenance

- Source archive SHA-256: `30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab`.
- Source and revised hashes, ingredients, steps, panel-specific adult cues and rights concerns: [pilot-manifest.json](pilot-manifest.json).
- Thirty individual panel decisions and A08/A09 statuses: [panel-change-ledger.json](panel-change-ledger.json).
- Full 55-atlas readiness inventory: [remaining-artwork-completion-matrix.csv](remaining-artwork-completion-matrix.csv).
- Original and revised contact sheets: `before-contact-sheet.jpg`, `after-contact-sheet.jpg`; six-panel SVGs: `recipe-{id}-remediation-draft.svg`.
- Deterministic checks: `node tools/v3/artwork/remediation-pilot/audit-readiness.mjs`; integrated into the W01 Android CI. Checks provenance, six-panel IDs, inventory, pending gate status and prevents unapproved promotion.

## A08 — independent child-safety acceptance (must be performed independently)

| ID | Recipe | Specific acceptance questions |
|---|---|---|
| 27 | Chicken & Carrot Nuggets | Are raw chicken handling, mixing and shaping adult-only? Is fully cooked chicken/74°C (165°F) and cross-contamination prevention clear? |
| 39 | Chicken & Corn Mini Pancakes | Are cooked chicken and raw egg/flour distinguished? Are hot-pan handling and thorough cooking adult-only? |
| 40 | Apple Sandwich Smiles | Is knife work adult-assisted? Is peanut/sunflower seed butter substitution and allergen warning explicit? |
| 51 | Masala Cheese Toast | Are air fryer/toaster and hot tray adult-only, with a clear visual and accessible safety cue? |
| 63 | Coconut Ladoo | Is the condensed-milk dairy allergen prominent? Is refrigerator-shelf help conditional rather than an invented mandatory heat warning? |

A08 reviewer must record for each panel: PASS / FAIL, evidence image reference, hazard/mitigation, locale EN/PT, reviewer identity, review date, and any correction required. Do not infer approval from an automated lint PASS.

## A09 — independent 8–10-year-old usability and visual acceptance

For each panel: compare source recipe step to depicted action; verify ingredient and tool fidelity; check 3×2 atlas crop, 1536×1024 source, child-facing English/Portuguese, contrast, no stretched imagery, one-step-at-a-time phone portrait and tablet landscape, 200% text scaling, TalkBack reading order, adult-assist comprehension, and character consistency. Review before/after contact sheets **and** screenshots captured from an Android APK containing approved candidate art.

A09 reviewer must record PASS / FAIL with screenshot evidence and issues per recipe. Static PNG render or successful Android build alone is insufficient.

## Required release-gate evidence

1. Independent A08 and A09 signed decisions for all 30 panels; rights/author provenance clearance; no open safety or severe usability defects.
2. Explicit authorization to promote specific reviewed SHA-256 assets, not blanket approval of the draft folder.
3. W01 integrates only approved immutable artwork into the unified runtime and tests source-asset hashes.
4. Exact-head Android emulator screenshots for each changed recipe in portrait and landscape; accessibility and offline checks; compare against approved renders.
5. A08/A09 re-review of installed result and verified production-package signer/data-preserving upgrade before release.

**Current decision: HOLD.** W01 may improve drafts and checks, but must not claim independent approval or integrate unapproved assets.
