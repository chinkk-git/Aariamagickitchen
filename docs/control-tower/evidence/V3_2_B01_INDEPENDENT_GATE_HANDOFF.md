# W01 B01 independent gate handoff

**Status date:** 2026-10-22  
**Repository / branch:** `chinkk-git/Aariamagickitchen` / `feature/v3.2-magical-cookbook`  
**Reconciled HEAD:** `b003099d990121297af18e116c69a71f71a688ff` (docs-only; parent `92fd62d180f5a349d1aad76ad437ce5377d9f903`)  
**Owner approval:** Issue #40 comment [6339371106](https://github.com/chinkk-git/Aariamagickitchen/issues/40#issuecomment-6339371106) approves the #12 pilot APK and freezes its visual template; B01 scope is IDs 1–10.  
**Disposition:** B01 runtime integration and exact-head Android QA remain on hold until the applicable independent gates below pass. No B02, merge, release, or new build was started.

## Published review materials

- [B01 per-recipe blocker matrix](V3_2_B01_BLOCKER_MATRIX.md)
- [Canonical text, source inputs, artwork channels and hashes](V3_2_B01_SOURCE_EVIDENCE.json)
- [PT-BR safety-copy drafts](V3_2_B01_PT_BR_SAFETY_DRAFTS.json)
- Approved #12 [Android run #39765718773](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39765718773) and [evidence artifact 12421066354](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39765718773/artifacts/12421066354)
- B01 draft-art [manifest](../../../tools/v3/artwork/recipe-dishes-draft/manifest.json) and [source sheet](../../../tools/v3/artwork/recipe-dishes-draft/source/recipe-dishes-13-source-sheet.png)

Issue #40 and the repository do not name individual independent gate reviewers. Until named reviewers are assigned, each accountable slot below is **UNASSIGNED**. W01 is the evidence preparer and source writer, not a gate approver.

## Reviewer packets and decisions

| Gate | Accountable reviewer | Required explicit decision | Evidence available | Missing evidence | Independently actionable remediation |
|---|---|---|---|---|---|
| **A08 child safety** | Independent A08 Child Protection & Precautions reviewer — **UNASSIGNED** | For every ID 1–10, record `PASS` or `HOLD` on hazards, adult-assist placement, per-step precautions, cook-through/cool wording, and EN/PT-BR safety text. Identify each step needing correction. | Canonical EN/PT steps and source references in the source evidence JSON; canonical EN safety strings; PT-BR safety drafts; method/time text as present at source. | No independent per-step classification; all mapping adult-assist/safety fields are review-required. PT-BR safety text has not been reviewed. No signed A08 decision for IDs 1–10. | A08 reviewer fills a per-recipe/per-step worksheet, cites the source step, supplies corrections where needed, then records reviewer identity, date, evidence hash and final decision. Do not infer classifications from recipe method alone. |
| **A09 and native PT-BR** | Independent A09 Child Experience reviewer (ages 8–10) **and** native PT-BR reviewer — both **UNASSIGNED**; do not assume one person covers both qualifications. | A09 returns `PASS` or `HOLD` per recipe for child comprehension, reading load and action clarity. Native reviewer returns `PASS` or corrections for titles, ingredients, steps and safety drafts. | Existing PT-BR ingredient/step arrays and matching EN source arrays for IDs 1–10; draft safety ledger; approved #12 template reference. | No independent A09 or native-language approval for B01. The #12 screenshot bundle is not visually valid for its labeled PT-BR steps/completion; see screenshot audit below. | Review bilingual records side by side. Return marked corrections and independent sign-off per ID. Screenshot capture requires a corrected, state-accurate Android run; filenames or DOM assertions alone are insufficient visual evidence. |
| **Nutrition** | Qualified nutrition reviewer and accountable nutrition-source/data owner — both **UNASSIGNED** | For every recipe, approve source-backed nutrient values per stated serving/yield or mark `HOLD`; state calculation method, ingredient sources/brands, serving basis and source references. | Canonical `NUTRITION_PLANS[1–10]` include yield, serving labels and ingredient gram inputs; exact inputs are preserved in the JSON evidence. | No calculated per-serving panel, nutrition source-note citation, product/brand data, or independent review. Some gram values are null/ranged and some yields are ranges. | Source owner supplies the actual product/brand and quantity choices, fills unresolved weights, confirms the intended yield/portion; qualified reviewer calculates and signs. Do not substitute generic nutrition values without documenting the source and ingredient match. |
| **Allergens** | Accountable ingredient/product source owner and independent allergen reviewer — both **UNASSIGNED** | Per recipe and optional substitution, approve a source-backed allergen declaration or explicitly document that no declaration can be made; record source labels and cross-contact evidence. | Canonical ingredient lists and substitutions are captured with source references. | Structured allergen fields are null for IDs 1–10. No packaging/brand labels, substitution-specific evidence or cross-contact source records are attached. | Provide exact product labels/specifications for bread, cheese choices, pastry, sauces, etc. Reviewer maps evidence to the exact recipe inputs and signs each record. Do not treat ingredient-name guesses as an allergen assessment. |
| **Artwork identity and rights** | Asset/source custodian plus independent artwork-fidelity reviewer and independent rights reviewer — all **UNASSIGNED** | Per selected asset, approve exact recipe match and visual suitability; separately approve provenance and permitted usage, or reject and request a cleared replacement. A hash is not a rights approval. | Canonical embedded source channels and decoded-image hashes are inventoried. Catalogue lists IDs 1 and 4–10 as `MISSING`, IDs 2–3 as `REALISTIC`. Draft dish assets exist for IDs 1 and 4–10; their actual file hashes match the repository manifest. | IDs 2–3 lack identified original paths/license records. Drafts 1,4–10 have no independent fidelity or rights clearance. No creator/source documentation or signed permissions are attached for the embedded existing images. | Custodian supplies source/creator, asset identity, license/permission and scope. Fidelity reviewer compares each source/draft image with the canonical dish. Rights reviewer records `APPROVED` or `REJECTED` per asset. If evidence is unavailable, supply a cleared replacement and its provenance instead. |
| **APK signing / Android security** | Independent Android security/signing reviewer and authorized signing owner — both **UNASSIGNED** | Approve the review-only signing policy and package identity before a B01 APK; after build, verify actual package/version, signer certificate, artifact SHA-256, co-install behavior and non-destructive Classic/data handling. Mark production/release signing separately as `NOT AUTHORIZED`. | Pilot APK evidence records package `com.aaria.magickitchen.pilot.v32review101`, versionCode 8 / versionName 1.0.4, and Android Debug signer SHA-256 `ab3c820ea1eead62181299a41ee9870bcada130883bd8688eb1beebf585d9cb2`. Gradle app config uses a run-specific debug suffix; release signing requires all four protected inputs and fails closed if partially configured. | No B01 APK exists, so there is no B01 signer fingerprint, APK hash or exact-head install result. The pilot debug certificate must not be presumed to be the B01 certificate. No independent signing-policy decision is recorded. Earlier Issue #40 comment [6327020160](https://github.com/chinkk-git/Aariamagickitchen/issues/40#issuecomment-6327020160) specifies an in-place same-package/signer update, while the current issue text permits a distinct co-installable preview identity and the approved #12 APK is `v32review101`. The applicable B01 review identity therefore needs an explicit security/owner decision before packaging. | Security/signing owner documents whether a review-only debug APK and run-specific package are acceptable, or whether the earlier in-place update requirement applies; verify the B01 artifact’s actual signature and package in CI after other gates pass. Keep private keystore/password material out of review artifacts. Do not build a release APK. |

### Nutrition inputs needing source-owner completion

The following unresolved inputs are visible in the existing plans; the list does not assign replacement amounts:

| ID | Existing plan gaps |
|---:|---|
| 1 | Butter and salt have null gram values. |
| 2 | Lettuce/thin tomato optional input has null grams; nugget quantity is 4–8 and ketchup is 1–2 tbsp. |
| 3 | Optional cinnamon has null grams. |
| 4 | Mashed potato has null grams; yield is 10–12. |
| 5 | No null gram entry in the current plan; branded ingredient nutrient sources and review are still absent. |
| 6 | No null gram entry in the current plan; yield is 8–10 and source/brand inputs remain unreviewed. |
| 7 | Salt has null grams; yield is 4–6. |
| 8 | Optional salt/pepper has null grams; yield is 10–12. |
| 9 | Optional oregano has null grams. |
| 10 | Salt has null grams. |

All ten plans remain source inputs only. These inputs are not nutrient calculations.

### Artwork inventory clarification

The `recipe-dishes-draft` manifest is version `1.0.0-draft`; its source sheet SHA-256 is `76ef0ad3a0c56a0a9786bba8f8faec672ae4e6a31a970c9719a7e92a47760539`. Local byte verification matched that sheet and all eight B01 draft WebP hashes to the manifest. The manifest describes them as an image-generation contact sheet cropped without semantic editing and marks each `DRAFT — rights/A08/A09 review required`. This verifies the files against the manifest only; it does not verify recipe fidelity, creator/license rights, A08, A09, or permission to ship. Draft assets must stay in the review-only path until each applicable reviewer signs off.

| ID | Draft file | SHA-256 |
|---:|---|---|
| 1 | `recipe-1-cheesy-egg-bread-cups.webp` | `a8d4ba7c464529eba6b80acf3df70b91599ae739c065509b300896c18063953c` |
| 4 | `recipe-4-cheesy-potato-balls.webp` | `da27182c603bf848cb4565674151c98f218452d217b07ef3369103673bb63b74` |
| 5 | `recipe-5-mini-pizza-bread-cups.webp` | `d968adbc97831b58342d0404d9be42fd04dcda2e8263feb6fb66a4dea648da04` |
| 6 | `recipe-6-cheesy-corn-pinwheels.webp` | `0862cbd22bc26e53b7aa69d797b8da3e77bd59086dc9a136a57eaa77afb203d8` |
| 7 | `recipe-7-rainbow-veggie-cheese-muffins.webp` | `3de549c70947c16ced73583ed4d968da4d98ce3970f61a50fdddea2c7c68f25c` |
| 8 | `recipe-8-broccoli-cheese-nuggets.webp` | `202c4a61ef79c25374cca427519d4bcaee829bc51f3bf3d356e527e3b37b7497` |
| 9 | `recipe-9-rainbow-veggie-mini-pizzas.webp` | `3f8cb35b6470d94c2468f5ab6035867265bc11bce16e7c2671d99b42557e8e94` |
| 10 | `recipe-10-sweet-potato-smiley-fries.webp` | `1de28372c68c0ed0b705e7557073c6eaf3b58e68855473300d03af8d9fa42088` |

## Approved #12 PT-BR screenshot re-audit

Evidence artifact [12421066354](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39765718773/artifacts/12421066354) contains files named as PT-BR step 1–4 and completion. Direct visual inspection shows those filenames do **not** establish valid captures:

- No PT-BR recipe-detail screenshot file is present.
- `v32-recipe-12-pt-br-step-1-portrait.png` shows the recipe-detail page, not the active cooking step.
- The files named step 2 and step 3 also show recipe-detail content rather than an active step; the step 4 file is a blank/black WebView capture.
- `v32-recipe-12-pt-br-completion-portrait.png` shows the recipe-detail page with a transient celebration toast, not the completion screen.
- No PT-BR phone-landscape or tablet portrait/landscape detail, step or completion captures are in the artifact.

The diagnostic `recipe-12-pt-br-evidence.json` reports DOM/content checks, but those checks do not validate the pixels captured. Therefore the earlier Issue #40 statement that PT-BR steps 1–4 and completion were visually evidenced is corrected: the filenames/metadata exist, but visual acceptance is **NOT MET**. Do not use the affected files as screenshot evidence or weaken screenshot assertions.

Fresh captures cannot be completed in this workspace: no `adb`, Android emulator, or `gh` CLI is installed, and the connected GitHub tool exposes artifact retrieval but no workflow-dispatch operation. No new CI run was started. The unblocked remediation is to correct the capture harness so each capture scrolls the intended active panel into view and rejects blank/wrong-state screenshots, then run the approved #12 screenshot matrix in authorized Android CI and visually inspect the resulting artifacts. Keep the #12 visual template frozen while correcting only capture/test behavior.

## Decision record format for each reviewer

Return one signed record per applicable recipe or asset containing:

- Reviewer name, role/qualification and independence declaration.
- Evidence paths and hashes reviewed.
- Recipe ID / step number or asset ID.
- Decision: `PASS`, `HOLD`, or `REJECT`; no silent/implicit approval.
- Rationale, required corrections, and any limits on approval.
- Review date and signature/record URL.

A gate is not satisfied by W01 preparation, automated route coverage, an artifact filename, a source hash, or another reviewer’s decision.

## Next actions and stop conditions

1. Project owner assigns named independent A08, A09, native PT-BR, nutrition, allergen, artwork-fidelity, artwork-rights and Android signing/security reviewers. If one person covers multiple roles, record qualifications and independence separately for each decision.
2. Source owners provide missing product/brand, quantity, nutrient and allergen-label evidence; artwork custodians provide provenance and rights records or cleared replacements.
3. Reviewers return itemized decisions against the packages above. W01 applies only the corrections they approve and preserves all 95 canonical IDs.
4. After all B01 content/safety/nutrition/allergen/artwork gates applicable to runtime are satisfied, resume B01 integration and run exact-head phone/tablet QA plus the 95-route regression. Then verify the actual B01 APK package, signer, SHA-256 and screenshots.
5. Stop after B01 APK delivery for explicit owner approval. Do not begin B02 until that approval is recorded.

Preserve V3.1 Classic and user data. No merge or release is authorized. No additional spend or CI run is included in this handoff.
