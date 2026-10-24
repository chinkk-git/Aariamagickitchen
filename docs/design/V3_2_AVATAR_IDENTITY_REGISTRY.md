# V3.2 Canonical Avatar Identity Registry
Status: **BLOCKED ON EXACT SOURCE-ASSET EXTRACTION AND RIGHTS VERIFICATION**. No character design is approved by this file alone.

## Mandatory identity entries
| Identity key | Source | Required lock |
|---|---|---|
| aaria | Original production index.html Aaria cartoon | Approved asset path, SHA-256, face/hair/skin/outfit/proportions/linework and allowed poses |
| mommy | Original production index.html Mommy cartoon | Same |
| daddy | Original production index.html Daddy cartoon | Same |
| friend-<stable-id> | Each distinct original approved Friend | Individual ID and reference; no generic replacement |

For each canonical asset record: stable identity key, source commit and original embedded path/reference, SHA-256, provenance/rights status, approved contexts, transparent/background variants, image dimensions, crop rules, permitted expressions/poses, A08/A09 review status. Do not infer exact physical appearance without inspecting original pixels. Do not generate a new face or lookalike when a pose is missing; use the existing approved portrait or a neutral icon fallback.

## Allowed placement
Aaria on Home/brand, family and friends introduction, celebrations and achievements as already established. Mommy/Daddy in family contexts; friends in friends contexts. NO people in recipe cooking-step artwork.

## Enforcement
Central registry only; prohibit duplicate inline copies and ad-hoc regenerated portraits. Hash verification in CI, screenshot comparisons for identity consistency, rights checks and fail-closed missing asset references. Until canonical source assets and rights are verified, status HOLD, not PASS.
