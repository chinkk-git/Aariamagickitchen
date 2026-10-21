# V3.2 Closure Package — W01 session rotation

**Disposition: NOT READY / HOLD.** This package consolidates the exact-head evidence and open gates. It is not a release approval.

## Checkpoint

- Branch: `feature/v3.2-magical-cookbook`
- Visual calibration commit: `8e78a5159fc529a2d66426872f7313e0d0872e88` (`tools/v3/home-world-visual.css`); ledger/package documentation updated after it.
- Last completed Android CI: [run 39620830609](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39620830609), success at older app code head `9251a388c3b634c613b06d0570db7de216d204f4`. No exact-head run is currently visible for `8e78a51`; those screenshots and APK are not evidence for the latest visual edit.
- Acceptance ledger: [V3_2_CLOSURE_ACCEPTANCE_LEDGER.md](V3_2_CLOSURE_ACCEPTANCE_LEDGER.md), **5 PASS / 2 FAIL / 106 BLOCKED / 2 NOT TESTED** (115 rows). Recipe content rows remain individually blocked pending content, media, rights and independent review.

## 95-recipe audit and Android regression

- Static validation reported all 95 original recipe records preserved unchanged; theme mapping covered all 95 original IDs.
- Android smoke verified 95/95 detail routes with theme, ingredient and cooking-step content, catalogue restoration, and partial-source notices for recipes 91 and 94.
- Null USDA nutrient payloads for recipes 91 and 94 remain unavailable; renderer now safely preserves missing values without inventing nutrition.
- Build, unit tests, phone route sweep, tablet portrait/landscape capture, and isolated Classic/V3.2 coexistence checks passed in the exact-head run.
- CI evidence artifact: [12356076974](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39620830609/artifacts/12356076974), ZIP SHA-256 `e09704a985c0f32d8cd50b82901b55ace769aae7e6c9a5323f4da8532ea9724c`.
- Diagnostic route coverage and screenshots are in that artifact under `artifacts/v32-diagnostics/` and `artifacts/v32-android-screenshots/`.

## APK and checksums

- Isolated debug APK artifact: [12356555237](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39620830609/artifacts/12356555237).
- Artifact ZIP SHA-256: `6794bf793f92f7e54749778c32b41ed51ba7d07967eeccef8d0d3c5dfbd19605` (matches the Actions artifact digest).
- APK SHA-256: `172922fd3e145e89a8f35b81a2e645062d0454cf93d2cb32220b614eddfa0ef2`.
- The APK is the isolated debug package. This evidence does not establish production signing or same-package upgrade safety.

## Design comparisons

Approved reference: `docs/design/approved-v31-home-world-reference.png`; reference SHA-256 `6934745614144a6100cbceee8140b4dc54b18a4fd4cac55835dda2ad41eaa5b8`.

Visual calibration commit `8e78a5159fc529a2d66426872f7313e0d0872e88` reduces the Home hero wash, reshapes the welcome card, enlarges the canonical character group on portrait phones, and increases portrait map viewport height while preserving the full source map image and embedded destination marker positions. Exact-head Android CI and fresh four-orientation comparison evidence are still pending. The connected browser exposed Actions only after GitHub sign-in; the secure authentication request was declined, so no manual dispatch or login was performed.

Run 39620830609 captured the app and generated reference comparison images in the evidence artifact. Mean absolute luminance difference (0–255) remains high:

| Screen | Phone | Tablet |
|---|---:|---:|
| Home | 59.252 | 56.476 |
| World | 56.724 | 56.514 |

These are diagnostics, not visual acceptance. Home/World acceptance remains FAIL pending correction and independent design review. The approved identity and template standards are in `docs/design/V3_2_VISUAL_IDENTITY_STANDARD.md`, `docs/design/V3_2_RECIPE_TEMPLATE_STANDARDS.md`, and `docs/design/V3_2_SCREEN_CONTRACTS.md`.

## Artwork and avatars inventory

- Reference and asset provenance index: `docs/design/references/V3_2_REFERENCE_ASSET_MANIFEST.json`.
- Avatar identity contract: `docs/design/V3_2_AVATAR_IDENTITY_REGISTRY.md`.
- Draft recipe-dish manifest: `tools/v3/artwork/recipe-dishes-draft/manifest.json`. The 13 requested finished-dish images are review-only drafts; they are not cleared for runtime. Tasty Tacos approved source remains unavailable and BLOCKED.
- Batch manifests and source manifests: `tools/v3/artwork/batches/batch-01/` through `batch-05/`. Automated readiness audit reports 330 draft panels, zero formally approved atlases, zero runtime-integrated atlases, and independent approval still required.
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

1. Validate commit `8e78a51` in exact-head Android CI; inspect fresh phone/tablet Home and World portrait/landscape screenshots against the approved reference, then continue any needed correction and independent visual review.
2. Complete and review all three reusable recipe templates.
3. Obtain artwork rights and A08/A09 approval; audit 82 existing images and cooking-step art; clear or replace the 13 draft dishes through approved provenance.
4. Obtain the owner-approved Tasty Tacos reference or keep that item BLOCKED.
5. Complete all per-recipe content, cooking-flow, media and accessibility acceptance.
6. Obtain independent A08, A09, artwork-rights, Android security/signing/upgrade and Classic recovery decisions.

Until every mandatory gate is evidenced and the acceptance ledger is updated by the responsible independent reviewers, overall status remains **NOT READY / HOLD**.
