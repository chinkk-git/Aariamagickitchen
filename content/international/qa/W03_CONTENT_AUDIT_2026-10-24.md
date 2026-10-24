# W03 content audit and handoff status — 2026-10-24

## Scope and evidence

This audit covers source bundles #096–#110 on `feature/international-recipe-content`, starting from branch HEAD `4a9871fdbb8fa5c3929e118f5492f847c0e049d5`. It is a content-source audit. It does not certify an Android build or replace an independent reviewer.

Executed checks:

- `python3 content/international/qa/validate_bundles.py --canonical-index index.html --canonical-commit 4e8e629c80c68d64c28b7dbc8f07d0f40fc40344` — 15 recipes; current India mapping checked; 0 structural errors; the security-pattern scan and finished-dish artwork metadata consistency checks passed; 1 explicit warning for #096 sodium.
- `python3 content/international/qa/build_audit.py` — 15 recipes; 324 referenced asset paths; 0 missing assets; 0 SHA-256 mismatches; 15 duplicate groups overall and among the remaining 13, all from shared equipment artwork; 0 non-equipment duplicate groups among the remaining 13.
- Checked all 15 English cooking-step sequences against their recorded adult-assistance and safety cues. The local audit covers hazard presence and readable instructions; A08/A09 review remains pending.
- Reviewed the recipe records for bilingual JSON and Markdown locale markers, ingredient IDs/quantities/units, exact allergen declaration parity with ingredient flags, equipment names, step references, nutrition fields, explicit review statuses, unsafe-content patterns and finished-dish artwork path/provenance consistency.

The preview renderer regenerated all 15 source-content layouts after the text edits. I visually inspected the updated #096, #099, #102 and #103 full previews; the refreshed contact sheets are linked below. These are source-content previews, not Android screenshots. Artwork-rights clearance remains pending.

## Recipe inventory

| ID | Recipe | Ingredients / instructions | EN-GB / PT-BR | Artwork | Child-safety and adult assistance | Remaining item |
|---:|---|---|---|---|---|---|
| 096 | Italy — Tomato Basil Pasta | Complete; 7 ingredients; 5 steps | Present; structural parity checked | Present | Adult and step cues present; independent A08/A09 pending | Sodium is null pending a defensible retention calculation or label-specific source; nutrition review pending |
| 097 | Italy — Mini Caprese Skewers | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; independent A08/A09 pending | Independent review gates pending |
| 098 | Italy — Air-Fryer Courgette Bites | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; raw egg role clarified in this update; independent A08/A09 pending | Independent review gates pending |
| 099 | China — Vegetable Fried Rice | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; rice/egg/hot wok warnings present; independent A08/A09 pending | Independent review gates pending |
| 100 | China — Rainbow Vegetable Noodles | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; boiling water, knives and wok warnings present | Independent review gates pending |
| 101 | China — Cucumber Sesame Salad | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; knife/allergen/cooling warnings present | Independent review gates pending |
| 102 | Japan — Veggie Sushi Rolls | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; cooked-rice cooling/refrigeration warnings present | Independent review gates pending |
| 103 | Japan — Onigiri Rice Balls | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; cooked-rice cooling/refrigeration warnings present | Independent review gates pending |
| 104 | Japan — Japanese Cucumber Salad | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; knife and refrigeration warnings present | Independent review gates pending |
| 105 | Mexico — Rainbow Veggie Tacos | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; knives, cans and heat warnings present | Independent review gates pending |
| 106 | Mexico — Black Bean Quesadillas | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; hot skillet/cutting warnings present | Independent review gates pending |
| 107 | Mexico — Mexican Sweetcorn Cups | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; boiling water and hot-food warnings present | Independent review gates pending |
| 108 | Vietnam — Fresh Spring Rolls | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; heat, knife, peanut and refrigeration warnings present | Corrected water ingredient label; 2,030 mL total retained because it matches 1,500 + 30 + 500 mL use |
| 109 | Vietnam — Rice Noodle Salad | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; boiling water, fish and peanut warnings present | Independent review gates pending |
| 110 | Vietnam — Vietnamese Mango Salad | Complete; 5 steps | Present; structural parity checked | Present | Adult and step cues present; knife, fish and peanut warnings present | Independent review gates pending |

The two W01 pilot recipes are #096 Italy and #099 China. The other thirteen remain isolated on W03: #097–#098 and #100–#110.

## Findings and changes

- **Cooked-rice handling (#099, #102, #103):** aligned storage instructions with the UK Food Standards Agency Home Food Fact Checker: cool rice quickly, ideally refrigerate within one hour, keep it refrigerated and use within 24 hours; for reheated rice, reheat only once until steaming hot throughout. The updates preserve step-specific raw-egg, hot-pan, knife, and allergen warnings. Source: https://www.gov.uk/government/publications/home-food-fact-checker/home-food-fact-checker.
- **#096/#099 artwork metadata:** corrected finished-dish `artworkPath` and provenance to match the actual referenced file. This records provenance only; rights clearance remains pending.
- **#102 PT-BR wording:** changed an unclear directional phrase to `borda oposta`; the full translation and cultural-authenticity review remains pending.

- **#096 sodium:** the current recipe adds 2 g salt to 2 L pasta water and drains that water. Ingredient-level sodium from the pasta and other packaged products also varies by product. Salt retention is not measured, so a recipe-specific sodium value cannot be derived from the files without assumptions. `sodiumMg` stays null and remains a nutrition hold. The explanation was corrected in JSON and Markdown so it accurately describes the uncertainty.
- **#098 raw egg:** the English and Brazilian Portuguese steps now say an adult cracks/beats the egg and coats the courgette. Children can assist with clean utensils without touching raw egg. Existing handwashing, cross-contact, air-fryer and hot-basket warnings remain.
- **#108 water total:** 2,030 mL reconciles exactly to 1,500 mL noodle-cooking water, 30 mL dip water, and 500 mL wrapper water. The localized ingredient name now covers noodles, dip and wrappers. No quantity was changed.
- **Equipment:** the exact named-equipment records and localized labels remain. The content README now documents the approved text-chip Prep Board. No equipment SVGs or other new equipment art were created.

## Review state and blockers

- All 15 packages have structured ingredients, steps, equipment, bilingual recipe fields, per-step adult/safety data, declared allergens and source-linked nutrition estimates.
- No missing-asset or hash-integrity failures were found. The asset checker reports duplicate equipment-art references; these do not affect the text-chip equipment design.
- Numerical nutrition estimates remain estimates and are marked for review. #096 additionally lacks a defensible sodium value.
- Independent A08 child-safety, A09 age 8–10 usability, nutrition/allergen, translation/cultural, artwork-rights and security gates remain pending. Field presence and a source audit do not equal independent approval.
- India mapping was revalidated against current `main` at `4e8e629c80c68d64c28b7dbc8f07d0f40fc40344` by fetching and parsing the actual `index.html` RECIPES array: 95 recipes, contiguous IDs 1–95, and 15 India-category entries. IDs 51–65 and their titles match the branch’s 15-row reference mapping exactly. No IDs were duplicated or renumbered; the mapping remains reference-only.
- At the start of this audit, the most recent Control Tower evidence still said W01/W02 integration was not merged. Recheck Issue #51 before any post-merge work. No integration or APK build was started. Post-merge baseline reconciliation and Android acceptance remain blocked on explicit merge confirmation.

## Scope estimate

No recipe drafting or new food-illustration production is currently required. Remaining W03 work is the #096 sodium source/retention resolution, independent review gates for 15 packages, and after Control Tower merge confirmation, a safe baseline reconciliation plus integration QA. Review turnaround is external, so a duration estimate is not reliable yet.
