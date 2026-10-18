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

## Visual target and engineering guide (2026-10-18)
The user selected a detailed two-screen generated concept (home + world map) as the V3.1 visual target. See [V3.1 Visual Implementation Guide](V3_1_VISUAL_IMPLEMENTATION_GUIDE.md) for screen decomposition, artwork/character fidelity, APK-first implementation, map interactions, zero-cost tools, security and A08/A09 acceptance gates. The reference PNG is pending binary upload to `docs/assets/V3_1_Home_World_Visual_Reference.png`; do not claim it is present until verified.

## Delivery ownership — existing autonomous agents
There is no external development team. The existing project multi-agent cluster owns all V3.1 planning, visual asset creation, Android implementation, QA, remediation, A08/A09 safety and UX gates, security/release verification and continuous learning. See [Autonomous execution model](V3_1_VISUAL_IMPLEMENTATION_GUIDE.md#autonomous-project-agent-execution-model-mandatory). Preserve established agent identities and skills; do not introduce a separate team or require routine user reviews. Documentation commits do not constitute agent execution or APK completion.


## World Food Adventure — approved scope clarification (2026-10-18)

**Source of truth:** the existing 95 recipes in production `index.html` are approved and immutable for this workstream. Do not reapprove, rewrite, renumber, duplicate, or remove them. Existing Indian recipes must be identified by inspecting the production recipe records and *referenced* in World Adventure → India by their original IDs; they must remain available through original categories, search, favourites, planner and shopping list. No Indian recipe name/ID should be assumed before the full production catalogue is extracted. A metadata-only country mapping is preferred to changing source recipe records.

**New scope:** introduce 10–15 genuinely new international recipes (no pizza) from Italy, China, Japan, Mexico, Vietnam and other culturally appropriate countries. Prioritise air-fryer and no-cook recipes; include Chinese Rainbow Chow Mein because Aaria already cooks noodles, with adult supervision for heat. Draft candidates, not approved recipe records: Italy Mini Arancini and Caprese Rainbow Bites; China Rainbow Chow Mein and mild Smashed Cucumber Salad; Japan Fruit Sando and Onigiri; Mexico Cheese-and-Bean Quesadilla Pockets and Guacamole; Vietnam Rainbow Summer Rolls and an additional non-duplicate dish; Greece Tzatziki Dippers. Avoid close equivalents such as tzatziki versus cacık in the same pilot. All candidates are conditional on deduplication against the production 95 and A08 safety/cultural/allergen checks. No new Indian recipe is required while existing approved Indian dishes populate India.

**Mandatory production-template parity:** inspect actual production recipe schema, art references and UI rendering before adding records. Every new recipe must match the existing production field names, IDs, category semantics, EN-GB/pt-BR localisation, exact ingredient units and quantities, servings, step-by-step instructions, cooking method, required tools, preparation and cooking durations, final dish illustration, individual illustrated steps with approved characters, safety/adult assist, allergens, per-serving nutrition with documented credible sources, quiz, shopping list integration, planner compatibility, favourites, offline availability, photo-camera creation flow and navigation. Never invent nutritional numbers or cite unverifiable sources. Use original approved Aaria/Mommy/Daddy/Friends avatars; new countries get culturally respectful environmental details, not stereotyped character replacements. No timer.

**Artwork production requirements:** final dish art + image-first illustrated cooking steps for each new recipe; accurate ingredients/utensils and their visual continuity; 8–10-year-old appropriate framing; consistent original cartoon character bible; portrait and landscape safe composition; no stretched images; EN-GB/pt-BR copy remains UI text rather than baked into image where practical. Keep layered/editable masters when possible and optimized offline assets with manifest (recipe ID, scene, rights, source, hash, dimensions, review status). Generated moodboards are **concept art only**, never proof of production artwork approval or APK integration.

**Dependency and delivery sequence:** (1) obtain and parse complete production 95-recipe catalogue; produce exact Indian recipe ID mapping and duplicate report; (2) lock non-duplicate 10–15 recipe list and final IDs 96+; (3) create complete bilingual production-compatible records and documented nutrition/allergen sources; (4) create final-dish and per-step artwork matching existing templates; (5) integrate India mapping, new destinations, recipe detail, quiz and local passport stamps into V3.1 APK; (6) test Android offline, both locales, planner, shopping list, favourites, profiles, camera, portrait/landscape and V3 security/update/signing; (7) independent A08/A09 and release gates. The world map and all recipes must work without paid services.

**Current verified state:** the repository contains `content/world-adventures/world-recipes-096-100.draft.json` as **blocked provisional draft data**; pizza has been removed. That draft is NOT production content, does not reflect the final country allocation and must not be imported into the APK. Full original 95-recipe duplicate audit, approved final recipe artwork, nutrition source verification, A08/A09, APK integration and CI remain outstanding. Do not mark any of these complete without evidence.
