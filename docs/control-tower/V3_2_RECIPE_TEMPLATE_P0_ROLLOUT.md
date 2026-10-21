# V3.2 P0 Universal Recipe Template — Strict Approval-Gated Rollout
**Authority:** owner directive 2026-10-21; [Issue #40](https://github.com/chinkk-git/Aariamagickitchen/issues/40) overrides older recipe-template sequencing in #38. **Implementation remains on hold until W01 resumes as sole writer.**
## Stage 0: source-of-truth
Reconcile live HEAD, CI and writer exclusivity. Confirm approved reference PNG committed and hash verified. Finalise source-derived homepage tokens, six-button nav contract and actual recipe data mapping. Supersede previous active recipe-step definition; retain historical evidence.
## Pilot: recipe #12 only
Implement Cheesy Corn Pancakes across every canonical step and relevant detail/ingredients/quiz/nutrition/allergen/completion view, EN-GB/PT-BR with missing-review states explicit. All responsive variants, adult-only heat warnings, real screenshots, no big step images. Preserve other recipes unchanged. Test, produce **exact-head uniquely installable APK**, verify package ID/version/signature/SHA-256, co-install without removing any app. Post screenshots, artifact and acceptance ledger to #40 and #38. **STOP for explicit owner approval.**
## Batch ledger — after pilot approval ONLY
| Batch | IDs | Count | Status |
|---|---|---:|---|
| B01 | 1–10 | 10 | WAITING |
| B02 | 11, 13–21 | 10 | WAITING |
| B03 | 22–31 | 10 | WAITING |
| B04 | 32–41 | 10 | WAITING |
| B05 | 42–51 | 10 | WAITING |
| B06 | 52–61 | 10 | WAITING |
| B07 | 62–71 | 10 | WAITING |
| B08 | 72–81 | 10 | WAITING |
| B09 | 82–91 | 10 | WAITING |
| B10 | 92–95 | 4 | WAITING |
**Invariant:** 1 pilot + 94 batch IDs = all 95 unique IDs, no duplicates. Never auto-advance.
## Definition of 100% for a pilot/batch
1. All specified canonical recipe IDs and all real steps rendered without placeholders, content invention or route regression.
2. EN-GB/PT-BR verified or explicit blocker documented (cannot call 100% with missing required translation).
3. Correct method icons, sourced metadata, safety per step and independent A08 review status.
4. Actual Home design tokens and unchanged six-button nav, responsive phone/tablet portrait/landscape, accessible text/targets, no obscured controls.
5. Functional regression and data preservation; exact-head CI with Android 16/coexistence checks where feasible.
6. APK link, actual package ID/version/signature and SHA-256, screenshots and visual reference comparison published.
7. External A08/A09/rights/security gates listed separately; engineering PASS never substitutes external approval.
8. **STOP** after artifact delivery and await affirmative owner approval for next batch.
## Batch operating protocol
Open batch -> adapt only batch IDs -> tests/screenshot diff -> remediate -> exact-head build -> publish evidence and SHA -> mark `AWAITING_OWNER_APPROVAL` -> STOP. If rejected, fix only current batch and retest; approved earlier batches stay under regression. If CR modifies shared template, run regression across all previously approved recipes.
## Deferred backlog
Do not resume other #38 C1–C8 items until all 95 recipe adaptations receive owner approvals. Preserve independently required gates and all security controls. V3.3 #39 deferred. No merge/release.
## Cost
$0 additional spend; eligible free public GitHub runners only, no paid services, minimise builds/polling. Current billing cannot be verified from repository.
## Image caveat
Owner-approved PNG is in Control Tower conversation but **not committed here by this text-only document upload**. Image attachment/commit is a P0 prerequisite for pixel-accurate W01 visual acceptance.

## P0 owner review convenience — cumulative Featured Recipes rail
**Required in pilot and every batch review APK** (Issue #40 owner addendum). On the existing homepage, expose a horizontally swipeable/scrollable Featured Recipes rail showing **only fully adapted, internally tested recipes**: pilot #12 (1); B01 #12 + 1–10 (11); then cumulative counts 21,31,41,51,61,71,81,91,95. Stable ordering and no duplicate IDs; tapping any card navigates directly to its recipe. Use actual canonical finished-dish artwork, existing approved Home styling and shared six-button nav; preserve the normal 95-recipe catalogue and production Featured Recipes behaviour. Prefer review-build-scoped configuration. Label current unapproved batch as available for review, NOT owner-approved. Test horizontal touch scrolling, navigation, orientation, EN/PT and cumulative IDs/counts; capture screenshot in every APK acceptance report. This is part of the same mandatory per-APK STOP/owner approval gate, not a new batch or feature-release permission.
