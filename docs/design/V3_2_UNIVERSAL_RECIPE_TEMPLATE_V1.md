# V3.2 Universal Recipe Template v1.0 — owner rework proposal

**Governing issue:** #40 · **Status:** PROPOSED / NOT APPROVED. The previous #12 pilot was rejected. This specification records the two owner images for the replacement #12 review APK; delivery or CI success does not constitute owner acceptance.

## Visual authority and provenance

The full-page recipe reference is [`1000072735-owner-recipe-page.png`](references/1000072735-owner-recipe-page.png), SHA-256 `e452103dc8c12a88633190dcc30f3d230bdb120cc3e8bc453d41fc02adc51bcc` (1080×11418). It controls the page composition and the appearance/order of all recipe sections.

The newer cooking-step reference is [`1000072737-owner-step-panel.png`](references/1000072737-owner-step-panel.png), SHA-256 `630861cf27c2bcb0a06e57958b86c2f71a5118d844d38c0efda6508ecfde4f07` (1080×1572). It replaces **only** the cooking-step section in the full-page reference. Both source files are retained byte-for-byte from the W01 attachments and were independently SHA-256 verified.

The previously approved three-phone mockup and the historical purple/green/orange collage are not the active visual authority for this rejected-pilot rework. Preserve their historical records. The example content visible in either image is not recipe data. The existing six-destination homepage navigation remains authoritative and unchanged.

## Full recipe-page hierarchy

Reproduce the full-page reference’s order and visual hierarchy using the existing application design tokens and current shared navigation: brand/header and kitchen shortcuts; special-recipe badge and title; sourced description only when canonical content exists; existing finished-dish image; Aaria character/fact panel; ingredient cards with persistent checklist; equipment; replacement step panel; ingredient allergy check; sourced nutrition; cooking-photo/share section; six-button bottom navigation. Do not make up a description, nutrition, allergy data, cooking time, image, or translation to fill a visual slot. Preserve existing feature behavior and data sources.

The screenshot’s six navigation destinations, order and labels must continue to come from the shared app navigation: Home, Recipes, World Adventure, Magic Pantry, Planner, My Creations. Keep the bar persistent, accessible, safe-area aware, and clear of scrollable recipe content.

## Replacement step panel (1000072737)

Use a large rounded warm-cream outer panel. Place the active `STEP n OF total` label at upper left and `n / total` at upper right, then a segmented progress indicator derived from the actual canonical step count. The inset, softly tinted rounded card contains one active step: a circular reusable illustrated method icon; `STEP n` eyebrow; prominent step title; large, legible canonical instruction; and a warm orange, step-specific safety/adult-help notice. Beneath it, place Previous / current count / prominent Next (or completion) controls. Immediately below the panel, retain an expandable Kitchen safety section.

Use the existing canonical step order, translations, progress state, navigation actions and completion logic. The title, instruction, count, icon mapping and warning come from the recipe record and shared presentation mapping, never from screenshot example text. Child-safe mixing must not be labelled an adult-only task; stove, hot-pan and other adult-only actions must state the adult’s role accurately. Keep safety visible with large text and controls. Do not add timers, extra step images, duplicated safety messages, or altered cooking instructions.

## Responsive and accessible behavior

Use one shared, data-driven renderer. At phone portrait, preserve the narrow reference hierarchy as a single scroll column above the fixed six-button bar. At phone landscape and tablet portrait/landscape, adapt width and card spacing without clipping, distorting artwork, obscuring buttons, or changing section order. Keep long EN-GB/PT-BR instructions readable, allow text wrapping and vertical scrolling, maintain safe-area insets, keyboard/Android Back behavior, focus, contrast and practical touch targets. Show one active step at a time.

## Data and preservation requirements

Do not alter canonical IDs 1–95, recipe #12 quantities/instructions, other recipe records, V3.1 Classic, user data, or shared navigation. Render English from the canonical English record and Portuguese from its localized record. Missing source content stays explicitly absent/review-only; do not fabricate or silently translate safety-critical fields. Preserve checklist, favorites, groceries, allergy/nutrition status, photo/share, quiz and completion behavior.

## Acceptance and status

The replacement #12 APK must be compared visually with both attached references using actual phone/tablet portrait/landscape screenshots. Validate canonical steps and safety, EN-GB/PT-BR, section order, no clipping, exact six-destination nav, current-batch Featured Recipes containing only #12, and relevant existing functions. Record CI SHA, APK identity/signing/hash and evidence. The proposed design remains **NOT APPROVED** until the owner tests that exact APK and explicitly approves it. No B01 before that approval. Independent A08/A09, artwork-rights and signing/update gates remain separate.
