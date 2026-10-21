# V3.2 Closure Package — W01 session rotation

**Disposition: NOT READY / HOLD.** This package consolidates the exact-head evidence and open gates. It is not a release approval.

## Current W01 checkpoint — app code SHA fc3dfe7

- Branch application/test head: `fc3dfe796b5a55ce55656e83e42b4b9cbd50a805`. The latest docs update records the coordinated 95-recipe content and artwork matrix. Overall disposition remains **NOT READY / HOLD**.
- [Android run 39640274275](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39640274275) is the authorized push-triggered run for this exact app/test head; it is pending behind an earlier queued run. No APK, screenshots, or current-head pass is claimed yet.
- Run [39638099422](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39638099422) passed the 95/95 English route sweep but failed the PT-BR safety assertion because the harness did not open the collapsed Kitchen safety disclosure. The smoke now opens it and validates exact translated warning text. Run [39637991420](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39637991420) failed before emulator tests due to hosted Android Emulator SDK archive corruption.
- Family/Friends Portuguese role copy now flows from the explicitly review-pending content files through `transform-production.mjs` into the shared recipe-detail header. The Android harness checks it on IDs 66–95; the validator asserts both role strings. Local validator passed 95 canonical IDs, 30 translated drafts, 207 translated ingredient entries, 120 translated steps, preserved numeric quantities/adult cues, and both role records. The offline production transform, V3.1 validator (95 original recipes and 177 offline countries), V3 validator, and 19/19 unit tests pass.
- The [95-recipe matrix](V3_2_95_RECIPE_AUDIT_MATRIX.json) and [reproducible generator](build-95-recipe-audit.mjs) enumerate IDs 1–95, step counts, EN/PT-BR text and quantities, deterministic themes, nutrition-plan and artwork source presence, route baseline, rights and per-recipe evidence gaps. All recipe rows remain BLOCKED; no content or rights approval is inferred.
- Current artwork source inventory records 2 inline dish photos, 50 Home thumbnails, 9 atlas registrations, 30 new-recipe records, and 5 explicit missing placeholders. The 13 owner-listed missing dishes remain 1,4,5,6,7,8,9,10,16,26,33,51,57. Read-only artwork readiness audit passed 55 atlases/330 panels and 330 draft panels, with 0 formal approvals and 0 runtime-integrated review atlases. No review-only asset was promoted.
- Acceptance ledger totals remain **5 PASS / 2 FAIL / 106 BLOCKED / 2 NOT TESTED**. Home/World visual rows remain FAIL pending current-code screenshot review and independent sign-off. The three-theme acceptance and all 95 individual recipe rows remain open.

## Current W01 checkpoint — branch HEAD 5159a01; app/test SHA 9bf66d2

- Live branch HEAD: `5159a01e6d1bebae8453f3b84814fd3cbca92a8f` (closure documentation and contact-sheet checkpoint). Latest app/test code parent: `9bf66d2545c2bf2bd58834bff882f2c32693d846`; this docs commit adds no app code.
- Android run [39640274275](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39640274275) remains in progress at prior app/test SHA `fc3dfe7`; its build, recipe/asset/theme contracts, package checks and emulator setup passed, and phone evidence capture is still active. Exact app/test-head run [39641229641](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39641229641) is pending at `9bf66d2`. Neither has produced artifacts yet. Do not treat the earlier successful run #39632118408 at `857b3e0` as current-code evidence.
- The `9bf66d2` smoke harness retains all 95 recipe route checks, opens the Kitchen safety disclosure before validating translated warnings, validates Family/Friends role copy for draft PT-BR recipes, exercises Air fryer/category filtering and verifies Surprise Me returns a canonical ID. These are pending exact-head Android execution.
- The runtime integration of PT-BR drafts for IDs 66–95 and Family/Friends role copy remains review-pending. Local checks reported 95 unchanged canonical IDs, 30 translated drafts, preserved quantities/adult cues, 19/19 unit tests, V3.1/V3 source validators, and a successful offline transform. Independent native Portuguese, A08 and A09 review is still required before acceptance.
- The 95-row recipe matrix and generator are committed. All 95 acceptance rows remain BLOCKED for individual content, nutrition/allergen, safety, artwork rights/provenance, visual and independent evidence.
- C4 review-only contact sheet `docs/control-tower/V3_2_13_MISSING_DISH_REVIEW_CONTACT.jpg` is committed at SHA-256 `09e1374ee5024c1e42596d38efcb977a8f95eaabb87155f45734dd00f94b710b` (896×1000). It indexes the 13 missing-dish drafts only; no draft art was promoted. Rights/A08/A09 and fidelity remain open.
- Ledger remains **5 PASS / 2 FAIL / 106 BLOCKED / 2 NOT TESTED** (115 rows), overall **NOT READY / HOLD**. Home and World remain FAIL pending fresh current-code phone/tablet portrait+landscape evidence and independent visual review; three-template acceptance remains blocked pending step/completion captures and independent review. Preserve Classic; no merge/release.


## Prior C1 checkpoint (run 39632118408)


- Branch: `feature/v3.2-magical-cookbook`; latest app-code commit `8cf79f0a31a910d5e0ec6287a0c4aae9d4cf5cd9` adjusts the World Map to preserve its approved source aspect and avoid portrait/landscape stretching. CI/test changes are committed at `dd2ff7e`, `7ae9392`, and workflow path update `2e62c0e`.
- Reconciled branch head before this fix: `20e69a7f3364950474af23f187f18ad0f2a39f76`. Compare confirms 11 commits after the CI-tested app SHA `857b3e002b25135a702d05cdf00471a20fcdada8` contained only the acceptance ledger and this closure package.
- Latest completed Android CI: [run 39632118408](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39632118408), SUCCESS at app-code SHA `857b3e002b25135a702d05cdf00471a20fcdada8`. The job passed recipe/assets/theme-map checks, unit tests, isolated APK/package checks, 95/95 Android recipe routes, phone and Pixel Tablet portrait/landscape captures, Home/World diagnostics, and nondestructive Classic/V3.2 co-install. It does not test the newer map fit correction `8cf79f0`; current-code exact-head CI and after screenshots remain pending.
- APK artifact [12360242415](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39632118408/artifacts/12360242415): ZIP SHA-256 `dcb6bd3a0da4bdaab56ea795c5c95a92e1e879357535fdafabac40acddb7bf23`; extracted APK SHA-256 `55e3b015049f30079b16ad93514d6de99bd15e7fa86a9870442867e78d4affd5`. Evidence artifact [12360102633](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39632118408/artifacts/12360102633): ZIP SHA-256 `3c744dc11737d63f3cb72fd789edbd79c7f75f05c28df30f9d904a21323e90e1`.
- Screenshot review confirmed Home canonical recipe #12 and India #51 are mapped without fallback. It also exposed a distorted/cropped World Map: orientation rules forced height independently from the 1.7 source-art ratio and stretched the background. Commit `8cf79f0` removes those overrides, fits the entire source image, and retains the image’s embedded destination art. This correction awaits fresh Android screenshots.
- Issue #38 owner directives: [#6318469211](https://github.com/chinkk-git/Aariamagickitchen/issues/38#issuecomment-6318469211), [#6319583656](https://github.com/chinkk-git/Aariamagickitchen/issues/38#issuecomment-6319583656), [#6320464441](https://github.com/chinkk-git/Aariamagickitchen/issues/38#issuecomment-6320464441), [#6321082783](https://github.com/chinkk-git/Aariamagickitchen/issues/38#issuecomment-6321082783).
- The tablet smoke now asserts the map’s computed 1.7 aspect and `contain` fit, captures all three themes’ detail screens plus first/second steps and completion in tablet portrait/landscape, and requires exactly one active step. Workflow path filters now include `.github/scripts/v32-android-tablet-smoke.sh`, so branch pushes that change this test request the configured Android CI. The new CI result is not yet visible in connected run/status tools; no authentication bypass or unauthenticated trigger was used.
- Acceptance ledger: [V3_2_CLOSURE_ACCEPTANCE_LEDGER.md](V3_2_CLOSURE_ACCEPTANCE_LEDGER.md), **5 PASS / 2 FAIL / 106 BLOCKED / 2 NOT TESTED** (115 rows). Overall disposition remains **NOT READY / HOLD**.

## 95-recipe audit and Android regression

- Local canonical-catalog validation reported all 95 original V3.1 recipe records unchanged, 177 offline countries retained, and 18 original India recipes linked. The 19/19 unit suite also passed, including deterministic theme assignment for all 95 IDs and theme text/button contrast checks. These are local source checks, not exact-head Android evidence.
- Read-only inventory of canonical `index.html` source found 95 unique contiguous IDs (1–95); all 95 have ingredient lists, step lists, and top-level safety text across 318 steps. This is field-presence evidence only. Only 65 PT-BR translation records exist; IDs 66–95 (30 recipes) have no PT-BR record and remain blocked pending reviewed translation.
- Android smoke in run #39632118408 verified 95/95 detail routes with theme, ingredient and cooking-step content, catalogue restoration, partial-source notices for recipes 91 and 94, and Classic/V3.2 coexistence at older app code head `9251a388c3b634c613b06d0570db7de216d204f4`. It does not test CSS commits `8e78a51`, `b13dabd` or current mapping commit `857b3e0`.
- Null USDA nutrient payloads for recipes 91 and 94 remain unavailable; renderer now safely preserves missing values without inventing nutrition.
- All 95 per-recipe acceptance rows remain BLOCKED pending bilingual content, quantities, nutrition/allergens, safety/cooking-flow review, correct cleared dish/step art, provenance/rights, item-specific screenshots and independent A08/A09/artwork decisions. Route coverage and theme mapping do not establish full content acceptance.
- The `phase2-pilot` rollout validator is scoped to two pilot recipes; its `--mode full` attempt reports “expected 95 recipes; found 2” and pilot artwork-group mismatches. It cannot be used as the canonical 95-catalog acceptance validator.
- Build, unit tests, phone route sweep, tablet portrait/landscape capture, and isolated Classic/V3.2 coexistence checks passed in the exact-head run.
- CI evidence artifact: [12360102633](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39632118408/artifacts/12360102633), ZIP SHA-256 `3c744dc11737d63f3cb72fd789edbd79c7f75f05c28df30f9d904a21323e90e1`.
- Diagnostic route coverage and screenshots are in that artifact under `artifacts/v32-diagnostics/` and `artifacts/v32-android-screenshots/`.

## APK and checksums

- Isolated debug APK artifact: [12360242415](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39632118408/artifacts/12360242415).
- Artifact ZIP SHA-256: `dcb6bd3a0da4bdaab56ea795c5c95a92e1e879357535fdafabac40acddb7bf23` (matches the Actions artifact digest).
- APK SHA-256: `55e3b015049f30079b16ad93514d6de99bd15e7fa86a9870442867e78d4affd5`.
- The APK is the isolated debug package. This evidence does not establish production signing or same-package upgrade safety.

## Design comparisons

Owner content/data authority: [Issue #38 directive #6320464441](https://github.com/chinkk-git/Aariamagickitchen/issues/38#issuecomment-6320464441). Canonical titles, IDs and links take precedence over conflicting recipe names shown in approved mockups; visual style and composition remain the baseline.

Approved reference: `docs/design/approved-v31-home-world-reference.png`; reference SHA-256 `6934745614144a6100cbceee8140b4dc54b18a4fd4cac55835dda2ad41eaa5b8`.

Visual calibration commit `8e78a5159fc529a2d66426872f7313e0d0872e88` reduces the Home hero wash, reshapes the welcome card, enlarges the canonical character group on portrait phones, and increases portrait map viewport height while preserving the full source map image and embedded destination marker positions. Tablet portrait fit was adjusted in `b13dabd6`. Fail-closed data mapping is in `857b3e0`: Home uses canonical recipe #12 Cheesy Corn Pancakes; the India World feature uses canonical recipe #51 Masala Cheese Toast only. The approved Home mockup's Rainbow Pancakes and the World mockup's Mango Lassi Magic are documented content deviations, not substitutions into the canonical 95. Recipe #51's finished-dish artwork remains missing/review-only; no draft art is promoted. Exact-head Android CI and fresh four-orientation screenshots remain blocked: the connected GitHub capability has no dispatch action, and no run was returned for `857b3e0`. No authentication bypass was attempted.

Run 39632118408 captured the app and generated phone/tablet reference comparison images in the evidence artifact; the comparison JSON marks luminance as diagnostic only. Human review found the World Map distortion fixed in code commit 8cf79f0 but not yet recaptured. Mean absolute luminance difference (0–255) remains high:

| Screen | Phone | Tablet |
|---|---:|---:|
| Home | 59.252 | 56.476 |
| World | 56.724 | 56.514 |

These are diagnostics, not visual acceptance. Home/World acceptance remains FAIL pending fresh exact-head screenshots and independent design review. The content differences are now reconciled under owner directive #6320464441: the Home reference features Rainbow Pancakes, absent from the canonical 95, so the app points to canonical #12 Cheesy Corn Pancakes; the World India reference features Mango Lassi Magic, while canonical India recipe #51 is Masala Cheese Toast. The explicit fail-closed mappings are committed in `857b3e0`. The #51 finished-dish asset remains missing/review-only; no draft art is promoted. These approved-reference content differences are documented deviations, not unresolved mapping decisions. The approved identity and template standards are in `docs/design/V3_2_VISUAL_IDENTITY_STANDARD.md`, `docs/design/V3_2_RECIPE_TEMPLATE_STANDARDS.md`, and `docs/design/V3_2_SCREEN_CONTRACTS.md`.

## Three reusable recipe templates

Approved reference: `docs/design/references/v3.2-three-recipe-templates.png`, SHA-256 `d2f6a18845657e85ec94db76ea35d269ea14a82a4f697ead5eaf6098fb8fbf7e`.

The last available tablet samples are from run 39632118408 (artifact 12360102633): `tablet/theme-1-detail-portrait.png`, `theme-2-detail-portrait.png`, `theme-3-detail-portrait.png`, plus all three landscape variants. They show the shared recipe hierarchy and purple/green/orange theme mapping. Human review of all six captures is still pending. Tablet portrait review found ingredient labels and tool cards cramped by the two-column layout; calibration commit `b13dabd6dbecf96de73dacf8d3263cb57c2917b8` stacks those panels and widens cards at tablet portrait widths. The 19/19 local unit suite passed, including stable theme assignment for all 95 IDs and text/button contrast checks, but the new layout has not been captured in exact-head CI. No phone captures for all three theme templates are recorded, and steps/completion still need orientation coverage and independent A09/design review.

## Artwork and avatars inventory

- Reference and asset provenance index: `docs/design/references/V3_2_REFERENCE_ASSET_MANIFEST.json`.
- Avatar identity contract: `docs/design/V3_2_AVATAR_IDENTITY_REGISTRY.md`. Local SHA-256 verification matched the approved bearded-Daddy reference sheet and all 11 registered identity crops/poses (Aaria, Mommy, bearded Daddy and seven friends). This verifies bytes against the registry only; screen placement, consistency, rights, A08 and A09 remain independently unapproved.
- Draft recipe-dish manifest: `tools/v3/artwork/recipe-dishes-draft/manifest.json`. The 13 requested finished-dish images are review-only drafts; they are not cleared for runtime. Tasty Tacos approved source remains unavailable and BLOCKED.
- Batch manifests and source manifests: `tools/v3/artwork/batches/batch-01/` through `batch-05/`. Automated readiness audit reports 330 draft panels, zero formally approved atlases, zero runtime-integrated atlases, and independent approval still required.
- Read-only source inventory found runtime `BATCH_ATLASES` references for recipe IDs 1, 2 and 4–10. The owner-reported 13-dish missing set includes IDs 1 and 4–10; IDs 16, 26, 33, 51 and 57 use explicit missing-art placeholders. Atlas presence does not establish exact dish match, source provenance, A08/A09 approval or rights. Reconcile these embedded runtime references against the draft-only manifests; do not claim any missing dish cleared until that review is complete.
- The audit of the remaining 82 finished-dish images and cooking-step artwork is incomplete; provenance, quality and rights are not established for every item. Avatar source mapping alone does not establish consistent placement, likeness approval or rights.
- No draft or unapproved artwork is promoted by this closure package.

## Independent gates and security

- A08 Child Protection and Precautions: B01 review evidence recommends HOLD; app-wide independent approval remains BLOCKED.
- A09 Child Experience, ages 8–10: B01 review evidence recommends HOLD; app-wide independent approval remains BLOCKED.
- Artwork provenance and rights: unresolved; no independent clearance.
- Android security/signing/upgrade safety: isolated debug build and nondestructive co-install test passed. Production signer, same-package upgrade, physical-device test, and release security decision remain unverified / NOT TESTED. Signing credentials were not changed.
- Gate evidence and reviewer/action fields remain in the acceptance ledger. W01 is not an approver of independent gates.

## Classic preservation and recovery

- Exact-head CI downloaded and co-installed the Classic preview with the isolated V3.2 debug APK without replacing Classic.
- Branch: `feature/v3.1-home-redesign`, observed at `2f2409b461e097022fd6362f5c0780fe1b146795` during takeover reconciliation.
- This is not a verified immutable Classic recovery package: tag/archive immutability and production recovery procedure still require independent verification. No production installation, merge, release, or credential change occurred.

## Remaining closure blockers

1. Obtain authorized exact-head Android CI for app-code commit `857b3e0`; inspect fresh phone/tablet Home and World portrait/landscape screenshots against the approved reference, then continue any needed correction and independent visual review. Current connected GitHub capability does not expose dispatch; do not use unauthenticated or alternate-trigger bypass.
2. Validate the tablet portrait template fit calibration in exact-head CI; capture all three themes on phone/tablet in portrait/landscape including steps and completion, then complete independent design/A09 review.
3. Obtain artwork rights and A08/A09 approval; audit 82 existing images and cooking-step art; clear or replace the 13 draft dishes through approved provenance.
4. Obtain the owner-approved Tasty Tacos reference or keep that item BLOCKED.
5. Complete all per-recipe content, cooking-flow, media and accessibility acceptance.
6. Obtain independent A08, A09, artwork-rights, Android security/signing/upgrade and Classic recovery decisions.

Until every mandatory gate is evidenced and the acceptance ledger is updated by the responsible independent reviewers, overall status remains **NOT READY / HOLD**.
