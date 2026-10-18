# V3.1 Home Experience Redesign — Master Plan
Status: PROPOSED; prototype concepts only; not implemented in APK
Date: 2026-10-18
Branch: feature/v3.1-home-redesign
Base: codex/v3-completion-core-20261017

## Objective
Redesign the Android APK home for ages 8–10. Preserve V3 security, profiles, 95 recipes, navigation and all existing functions. Deliver a magical kitchen atmosphere with efficient Pinterest-like recipe discovery. No paid subscriptions, APIs, artwork, or runtime services (R$0 mandatory). V3.1 must not block V3 completion.

## Concept directions
A — My Magical Kitchen: illustrated kitchen hero, central cook action, discoverable stations.
B — Recipe Discovery Studio: editorial, large dish imagery, card-led discovery, fast navigation.
C — Kitchen Adventure: interactive kitchen destinations and subtle quests.
Recommended: Hybrid A+B, with C reserved for later progressive enhancement.

## Screen hierarchy (portrait)
1. Compact branded header: approved Aaria character and greeting, language/profile/settings access.
2. Immersive illustrated kitchen hero (responsive, not oversized); no decorative icons that displace content.
3. Two primary actions: 'Let's Cook' and 'Surprise Me' (Spin My Week remains accessible).
4. Featured recipe with accurate final-dish art; no ingredient-only thumbnail substitution.
5. Horizontal recipe collections: Quick & Fun, Air Fryer, Cook with Family, Cook with Friends; dynamically use existing data.
6. Continue Cooking / Recent and Favourites if data exists; never fabricate progress.
7. Persistent bottom navigation: Home, Recipes, Planner, My Creations (final labels subject to UX validation).
8. Shopping list, Pantry, quizzes, achievements and settings remain discoverable, without flooding home with buttons.

## Landscape/tablet
Use two-column responsive composition: kitchen hero/actions on one side and recipe discovery on the other. Maintain safe areas, touch target sizing, Android back handling and persistent navigation. Never stretch artwork; use crop/contain appropriately. No locked orientation.

## Visual system
Warm cream, lilac, mint, peach and restrained gold accents; exact palette to be validated against approved visual bible. Rounded but not babyish, restrained depth/shadows, legible hierarchy, large food illustrations. Ingredient/utensil art must match the approved cartoon language. Use approved Aaria/Mommy/Daddy/Friends; no unapproved avatar replacement.

## Accessibility and safety
Age 8–10 usability gate A09, child protection A08, reduced motion, contrast, screen reader labels, touch sizes, bilingual British English/pt-BR, no timer. No autoplay sound. Privacy: do not expose child images or personal information in external generation prompts.

## Implementation stages
0. Snapshot and regression-test existing V3 home and navigation.
1. Audit existing approved art and home UX defects.
2. Produce 3 responsive clickable/static HTML prototypes on isolated branch, using local placeholders only until original art is safely accessible; avoid changing production index.html.
3. A08/A09 and cross-device review; select hybrid or another concept.
4. Implement home redesign in APK using existing app architecture; preserve functions.
5. Test Android phone/tablet portrait/landscape, navigation, performance, accessibility, both locales, offline and update compatibility.
6. Release V3.1 only with evidence, signed APK continuity and rollback plan.

## Acceptance criteria
- Both primary actions work; all existing entry points remain accessible.
- 95 recipes remain searchable/browsable with correct artwork and categorisation.
- Featured recipe and all recipe cards use final dish imagery.
- Bottom navigation remains visible and device back works.
- Responsive layouts are reviewed in portrait and landscape, phone and tablet.
- No clipping, stretched art, missing images, fake actions or giant buttons.
- No paid tool, dependency or required service.
- A08 and A09 pass; automated regression and screenshots stored as evidence.
- No claim of completed APK or approved design until verified.

## Suggested prototype variants
- Prototype A: kitchen-first with large illustrated hero and compact recipe shelf.
- Prototype B: discovery-first with featured dish and editorial card grid.
- Prototype C: adventure-first with illustrated stations and visible cooking CTA.
Use self-contained HTML/CSS mockups in a dedicated prototypes/ folder, not production index.html. Mockups are design demonstrations, not working recipe data integrations.

## New V3.1 segment — World Food Adventure (approved concept 2026-10-18)
- Dedicated home entry point and accessible, touch-friendly interactive world map, country navigation, country flags, short culturally accurate food facts and an optional food explorer passport with local collectible stamps.
- Only easy, quick, kid-safe no-cook and air-fryer recipes. Label 'no-cook assembly' distinctly when ingredients require pre-cooking. No raw unsafe ingredients, no misleading cultural claims, and adult-assist gates for hot appliances, blades and allergen risks.
- Initial destination candidates: India (Mango Lassi Magic), Italy (Mini Pizza Bites), Mexico (Guacamole Fiesta), Japan (Onigiri Rice Shapes using pre-cooked safely handled rice), Brazil (Mini Pão de Queijo). These are drafts; each requires independent recipe, nutrition, allergen, safety and cultural review before publication.
- Each recipe must have unique ID, accurate ingredient amounts, yield, cooking/prep duration, EN-GB and pt-BR copy, child steps, adult-assist flags, allergens, validated nutrition sources, approved character and dish artwork, geographic provenance, and audit evidence.
- New World Food Adventure recipes are additional records; never silently overwrite the original 95. Check duplicates and maintain compatibility with search, favourites, shopping list, weekly planner, offline packs, quizzes, camera sharing and profile migration.
- World map must use properly licensed accurate boundaries in production, accessible country list as fallback, responsive landscape/portrait, low-bandwidth/offline behaviour and no paid APIs.
- Pilot acceptance: map selection, filters, country fact, recipe detail, stamp reward, offline operation, accessibility and Android back behaviour work without breaking V3 functionality. A08/A09 release-blocking gates apply.
- An independent self-contained HTML concept prototype was generated for user review on 2026-10-18 (Aaria_V3_1_Home_World_Prototype.html). It uses schematic illustrations and sample data, and is not a production APK or approved final art. Integrate prototype into repository only after source transfer and verification.
