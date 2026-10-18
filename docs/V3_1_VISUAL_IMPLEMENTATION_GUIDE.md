# V3.1 — Visual Implementation Guide: Home + World Food Adventure
Status: Design target and engineering guidance; NOT an implemented or verified APK.
Date: 2026-10-18
Branch: feature/v3.1-home-redesign

## Approved direction
The user selected the generated two-screen concept as the desired V3.1 look and feel: left = Aaria's Magical Kitchen home, right = World Food Adventure map and India / Mango Lassi Magic. Treat this as a visual reference for layout, visual hierarchy, colour, card design and destination flow, **not** a source of code, accurate geographic borders, licensed production assets or automatically approved character likeness. Reference image filename: `V3_1_Home_World_Visual_Reference.png` (image to be attached in repository under `docs/assets/` before visual implementation is signed off).

## Screen 1 — Home
- Header with branded logo, approved Aaria illustration, compact profile and settings access.
- Rich but readable kitchen hero; keep main content visible above fold on a phone. Replace generated dog/unapproved character details with approved character bible assets; do not invent permanent new characters.
- Four visual entry tiles shown in the reference: Let's Cook, World Adventure, Surprise Me, My Planner. Preserve two visually dominant primary actions if usability testing shows four equal tiles overwhelm users.
- Featured Recipe panel with large correct final-dish artwork, time, difficulty, servings, favourite.
- World Food Adventure shelf with illustrated country/recipe cards.
- Persistent bottom navigation, working Android back, correct state restoration, safe areas and touch targets.
- Home sections must bind to real data; do not hardcode false counts, achievements or cooking progress.

## Screen 2 — World Food Adventure
- Header, country explorer map, destination hotspots, country list alternative for accessibility.
- Country detail card with flag, country name, cultural fact, accurate final-dish image, no-cook/air-fryer classification, duration, servings and adult-assist indicators.
- India / Mango Lassi Magic is the initial content pilot. The recipe remains draft pending A08 safety, nutrition, allergens and cultural QA; standard recipe includes milk and requires adult blender supervision.
- Passport stamp rewards stored locally per profile; no external child data transmission.
- Discover more destinations/recipes by continent, with EN-GB and pt-BR copy.
- Illustrated map artwork must be re-created as geographically sensible, legally redistributable layers; do not use the generated map as a precise boundary dataset.
- Country pins/markers must have accessible labels and be selectable via keyboard/screen reader and a list view.

## Technical build approach (APK-first)
1. Inspect the actual V3 Android project before selecting UI technology. **Do not assume Jetpack Compose is already used**; implement in the existing supported architecture, or document and approve a migration. Avoid replacing a stable native implementation with WebView-only delivery.
2. Break image into implementation specifications and independently recreated assets: kitchen background, Aaria hero, brand treatment, tile icons, featured dish, map landmasses, country pins, passport, Mango Lassi card, regional recipe cards, navigation icons.
3. Prefer editable, layered SVG/vector for UI/map hotspots and separate raster artwork for painterly backgrounds/food; avoid screenshot-as-background with invisible click targets.
4. Implement adaptive portrait/landscape/tablet constraints, density-independent spacing, accessible text scaling, edge-to-edge insets, image aspect-ratio preservation, memory-safe image decoding and offline fallbacks.
5. Use locally bundled assets and on-device data for core experience; no paid map API or runtime AI inference. If map engine is required, evaluate open-source MapLibre + offline data/licensing, but a custom vector interactive map is preferable for this illustrated concept.
6. Preserve V3 routes, 95 existing recipes, favourites, shopping list, planner, Spin My Week, camera, quizzes, profile migration, security, secure updates, signing and rollback protection.
7. Add world recipes as unique audited records, not replacements of the existing 95. Reuse recipe rendering and shopping-list infrastructure.
8. Keep new assets traceable: source, prompt/reference, rights, owner, review status, file size, aspect ratio, locale, recipe ID, content hash.
9. CI: screenshot tests for home/map/detail on reference phone and tablet resolutions, portrait/landscape; contrast/touch/accessibility; offline; navigation; functional regression; no broken images; A08/A09 gates.
10. Build a small end-to-end APK pilot (home, map, India detail, Mango Lassi recipe, passport reward), then expand only after visual/functional evidence. Do not claim pixel-perfect across all device aspect ratios.

## Zero-cost mandate
Use only free/open-source development and production tools (Android Studio, existing app stack, Inkscape, Krita, GIMP, optional Lottie). No required subscriptions, paid API credits, paid map tiles, cloud inference or unverified free trials. Verify redistribution licences of every image, map dataset, font and sound. GitHub Actions free-tier limits must be respected; no automatic billable overages.

## Definition of done
- Side-by-side screenshot comparisons against visual reference, with a documented list of deliberate device adaptations.
- All pictured controls are functional or explicitly removed/replaced before release.
- Approved Aaria/Mommy/Daddy/Friends visual identity, no character drift.
- Verified recipes, allergens, cultural descriptions and child-safety guidance.
- Both languages, phone/tablet and orientation support, reduced-motion/accessibility and offline operation.
- V3 regression, security/signing continuity, A08 and A09 release gates passed with evidence.
- No cost required to run the delivered APK.

## Delivery boundaries
This guide is committed independently of production code. The PNG must be added to `docs/assets/V3_1_Home_World_Visual_Reference.png` and linked here once the actual binary upload is verified. Do not mark the image uploaded merely because this document names it.
