# V3.2 Universal Recipe Template v1.0 — OWNER APPROVED
**Priority:** P0 · **Issue:** #40 · **Status:** canonical specification; approved PNG SHA-256 independently verified by W01.
**Supersedes:** all earlier V3.2 recipe-step layout definitions (retain history). Does **not** supersede approved Home, World, shared navigation or Classic.
## Visual reference and authority
Approved Control Tower image: final professional **three-phone comparison** (no-cook / hob / air-fryer), filename `wide_clean_modern_ui_mockups_three_smartphone_s.png`. Exact committed bytes SHA-256: `bc9cbef93dbe461622f7f3eb9cc344545dfd3c885e09a826623bd475e733f062`, independently verified by W01 and enforced by the CI reference verifier. **The former `v3.2-three-recipe-templates.png` is SUPERSEDED FOR RECIPE TEMPLATE UI** and must never be used for the new recipe-step design. The image's five-button footer is NOT approved. The live homepage's six-destination nav is authoritative. Do not substitute earlier cartoonish or image-heavy mockups.
## Intent
Professional, restrained, engaging age-8–10 cookbook screen, **instruction first**, one active step, small reusable method icon (not big images), cream/lavender card treatment, readable high-contrast text, subtle rounded corners/shadows, generous but efficient spacing. Reuse existing homepage design tokens; inspect actual values in source before finalising pixel numbers. Do not invent token values from an AI-rendered mockup.
## Screen hierarchy (top to bottom)
1. Shared app shell and unchanged approved header/back behaviour; compact recipe title and existing finished-dish thumbnail only where artwork is verified.
2. Step position `n of total` and segmented progress; handle arbitrary canonical step counts.
3. Dominant instruction card: small pan/bowl/air-fryer/prep/serve icon, concise step title, **largest readable action instruction**. Do not replace canonical text or invent copy.
4. Optional sourced time/temperature or equipment metadata; omit when absent.
5. Compact, unambiguous **step-specific** adult-assistance/safety notice; avoid duplicate notices. Adult-only heat/appliance/sharp-object operations stay explicit. Fail closed on missing safety-critical mapping.
6. Optional nonduplicative chef tip; no mandatory tip, mission, step-star reward or timer.
7. Previous/Next controls; first/last/completion states. Buttons remain accessible above the persistent bottom nav.
8. **Exact shared homepage navigation**: Home, Recipes, World Adventure, Magic Pantry, Planner, My Creations; same component, labels, icons, order, colours, safe-area treatment and responsive behaviour. No five-button variant.
## Variants
- No-cook: bowl/mixing icon, no heat warning unless a particular step uses a knife or another hazard.
- Hob/oven: pan/heat icon; adult-only hot-pan/hob/oven notice where relevant.
- Air fryer: small reusable air-fryer icon; adult handles controls/hot basket where relevant.
- Prep/serve/completion: small contextual icon, existing finished-dish artwork only on appropriate detail/completion screens.
Methods and safety are **per-step**; one recipe can use several.
## Responsive and accessible
Phone portrait: single column, no horizontal clipping, scroll instruction area above fixed nav. Phone landscape/tablet portrait/tablet landscape: adaptive max-width, no stretched illustrations, safe-area insets and orientation changes. EN-GB and PT-BR, long translated text, large font settings, accessible touch targets and contrast; Android Back and focus. Never hide critical safety behind navigation.
## Data fidelity
Keep canonical recipe IDs 1–95, quantities, ingredient text, steps, allergen/nutrition source status, quiz and state. AI mockup examples/times/temperatures are illustrative, NOT canonical content. No fake translations, cooking settings, safety assurances or artwork. Missing optional images/tips degrade gracefully.
## Acceptance
Compare **real emulator screenshots** against the committed approved reference at documented phone/tablet viewports; verify layout geometry, typography, colour, text dominance, six-button nav, no clipping, per-step warning and content fidelity. Test first #12 fully, STOP for owner APK approval, then #40 batches only. External A08/A09/rights/security approvals are separate. No merge/release.
