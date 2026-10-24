# V3.2 Recipe Template Reference Priority — Issue #40

**Current state:** owner-rejected #12 pilot is being reworked. The replacement visual design is PROPOSED / NOT APPROVED until the owner tests the new APK and explicitly approves it.

## Active owner-provided references

1. [Full recipe-page reference](1000072735-owner-recipe-page.png) — SHA-256 `e452103dc8c12a88633190dcc30f3d230bdb120cc3e8bc453d41fc02adc51bcc`.
2. [Cooking-step replacement](1000072737-owner-step-panel.png) — SHA-256 `630861cf27c2bcb0a06e57958b86c2f71a5118d844d38c0efda6508ecfde4f07`.

Use the first image for the whole recipe page. Use the second image in place of **only** the cooking-step section. Retain all other sections and existing app navigation. Both files are the exact W01-supplied PNG bytes, retained for review; their hashes were verified locally before implementation.

## Content, navigation, and historical references

Canonical recipe data and current state logic supply every ingredient, step, translation, safety message, allergen, nutrition value, interaction, and completion state. Do not treat screenshot example copy as canonical recipe data or invent missing content. Distinguish child-safe mixing from adult-only hot-pan work. The existing six-button navigation is unchanged.

The earlier `wide_clean_modern_ui_mockups_three_smartphone_s.png` and `v3.2-three-recipe-templates.png` remain available as historical references only; neither overrides the two latest owner images for this #12 rework. Preserve all historical files and evidence.

Canonical spec: [V3_2_UNIVERSAL_RECIPE_TEMPLATE_V1.md](../V3_2_UNIVERSAL_RECIPE_TEMPLATE_V1.md). Architecture: [V3_2_RECIPE_TEMPLATE_REPLICATION_FRAMEWORK.md](../../architecture/V3_2_RECIPE_TEMPLATE_REPLICATION_FRAMEWORK.md). Rollout: [V3_2_RECIPE_TEMPLATE_P0_ROLLOUT.md](../../control-tower/V3_2_RECIPE_TEMPLATE_P0_ROLLOUT.md).

No later batch starts until the owner explicitly approves the replacement #12 APK. No merge or release.
