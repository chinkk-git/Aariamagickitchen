# V3.2 P0 Universal Recipe Template — Strict Approval-Gated Rollout
**Authority:** owner directives and corrections in [Issue #40](https://github.com/chinkk-git/Aariamagickitchen/issues/40). **Previous #12 pilot rejected. Replacement #12 is in progress and remains NOT APPROVED until explicit owner approval. No later recipe batch is authorised before approval.**
## Stage 0: source-of-truth
Reconcile live HEAD, CI and writer exclusivity. Verify and retain both actual owner PNG attachments: full-page `docs/design/references/1000072735-owner-recipe-page.png` (SHA-256 `e452103dc8c12a88633190dcc30f3d230bdb120cc3e8bc453d41fc02adc51bcc`) and step-only `docs/design/references/1000072737-owner-step-panel.png` (SHA-256 `630861cf27c2bcb0a06e57958b86c2f71a5118d844d38c0efda6508ecfde4f07`). The second replaces only the cooking-step section. Preserve prior template references as historical evidence and keep shared six-button navigation unchanged.
## Pilot: recipe #12 only
Implement Cheesy Corn Pancakes across every canonical step and relevant detail/ingredients/quiz/nutrition/allergen/completion view, EN-GB/PT-BR with missing-review states explicit. Match the full-page reference except use the step-panel-only image for the cooking flow; preserve canonical content and all unrelated page sections. Verify responsive phone/tablet portrait/landscape, adult-only heat warnings and real screenshots. Preserve other recipes unchanged. Test, produce **exact-head review APK**, verify package ID/version/signature/SHA-256 and safe installation without removing or clearing any app. Post screenshots, artifact and acceptance ledger to #40 and #38. **STOP for explicit owner approval.**
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
## Reference image verification
The active rejected-pilot rework references are the two owner images above. Their exact attachment bytes and SHA-256 values are recorded in the canonical design spec and committed under `docs/design/references/`. The full-page screenshot controls all page sections; the newer screenshot replaces only cooking steps. The previous three-phone and three-theme designs are retained as history, not current recipe-page authority. Reuse the exact six-destination homepage navigation.

## P0 owner APK delivery override — upgrade existing installed V3.2
Every pilot and batch APK must be downloadable and **update the owner's currently installed V3.2 in place**, without uninstall, app-data reset, package identity change, or unapproved signing changes. This overrides earlier co-installable-only pilot language where incompatible. W01 must first verify existing installed V3.2 package ID, signer fingerprint, versionCode and persistence. Use same package/signature and strictly increasing versionCode. Prove a seeded-data Android upgrade over existing V3.2 without uninstall and verify retained favourites/progress/data; attach adb result, package/version/signing evidence, exact-head APK SHA-256, direct download artifact and phone/tablet screenshots to Issue #40. If existing signer/identity cannot be safely matched, mark BLOCKED with evidence; never claim update compatibility or request destructive uninstall. Keep V3.1 Classic unaffected, $0 spend, no merge/release and STOP after every APK for owner approval. See Issue #40 owner update requirement.
