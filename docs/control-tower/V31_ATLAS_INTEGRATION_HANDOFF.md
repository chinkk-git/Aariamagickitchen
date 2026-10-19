# V3.1 step-atlas integration handoff (blocked on staged package)
Date: 2026-10-18
Sources: https://github.com/chinkk-git/Aariamagickitchen/issues/6#issuecomment-6257853194
Technical Android baseline: https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39185550947

## Source-of-truth counts
- Original recipe IDs 1–95, immutable.
- Finished-dish images reported 95/95 (not equivalent to independent A09 approval).
- Runtime integrated step atlases: 40/95.
- Staged six-panel SVG sets for IDs 11–65: 55/55, 330 panels; NOT committed, NOT integrated, NOT A09-approved.
- Staged ZIP expected: `v31-step-atlas-drafts-recipes-11-65.zip`, SHA-256 `30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab`.
- Do not count draft recipes 96+ as original coverage.

## Execution sequence for V3.1 delivery
1. Retrieve ZIP from originating staging session; if unavailable, report SOURCE_MISSING rather than reconstructing/claiming approval. Verify exact SHA-256, file inventory, manifests, SVG parsing and each 6-panel source match.
2. Review sampled and risk-weighted scenes (all knife/heat/allergen/adult-assist scenes mandatory) against approved character bible, ingredient/tool specificity, readability at portrait/landscape and TalkBack. Record A08 and A09 independently per asset.
3. Integrate verified assets in isolated V3.1 branch in small traceable batches. Keep IDs, original recipe records and existing 40 atlases immutable. Add manifest provenance and deterministic validation; no auto-promotion.
4. Run offline catalogue tests, Android emulator install/startup, Home/World/Recipe routes, per-step atlas loading, orientation, screenshot uniqueness, visual screenshots and regression. Attach SHA, CI URL, APK and screenshot artifact IDs to Issue #5/#6.
5. Only advance coverage stage from staged to integrated after runtime verification, and to approved after independent A08/A09 review. Block merge/release if incomplete.

## Governance CI
The isolated workflow `.github/workflows/governance-evidence.yml` is committed on governance branch. No successful GitHub Actions run was observable at the last check; do not merge PR #8 solely on local self-test claims. If branch workflows are not dispatched by GitHub, check repository Actions permissions and run workflow_dispatch after the workflow is recognized on default branch, without weakening protections.

## Branch safety
No direct edits to V3. No merge of V3.1 into main. No release signer/key changes. Do not modify production index.html for this handoff.
