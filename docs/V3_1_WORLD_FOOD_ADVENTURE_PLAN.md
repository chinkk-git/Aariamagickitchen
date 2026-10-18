# V3.1 — Around the World: Food Adventure
Status: PROPOSED, not implemented
Scope: New child-safe interactive world-map segment in Android APK; no-cost policy applies.

## Product vision
Children aged 8–10 explore countries via a geographically accurate, zoomable/tappable world map, learn short culturally respectful food facts and make easy recipes in two lanes: NO-COOK and AIR FRYER. Cooking is the primary activity; geography is a playful discovery layer. Entry point on redesigned home: Explore the World. Must preserve existing 95 recipes and V3 functionality.

## Core requirements
- WORLD-01: World map with correct country boundaries, touch zoom/pan, country search, accessible list fallback, tablet/phone and portrait/landscape.
- WORLD-02: Country panel: name, flag, location, short verified food fact, curated recipes and optional pronunciation in EN-GB/pt-BR.
- WORLD-03: Filter by no-cook, air fryer, prep time, allergens, available ingredients; recipes must be genuine no-cook from scratch or clearly labelled no-cook assembly with pre-cooked ingredients.
- WORLD-04: Child-friendly instructions, correct quantities, tools, nutrition/allergens, adult assist for hot air fryer, sharp utensils and food safety; A08 mandatory.
- WORLD-05: Passport stamps on completed recipes, optional progress and accessible reset; no deceptive completion claims.
- WORLD-06: Reuse approved Aaria, Mommy, Daddy and Friends visual identities and step-art style.
- WORLD-07: Integrate with favourites, recent, shopping list, planner and profile persistence, with no regression.
- WORLD-08: Offline-first map and recipe assets; no tracking, ads, paid APIs, external map tiles or geolocation permission.
- WORLD-09: Bilingual British English and pt-BR; A09 age 8–10 usability and accessibility.
- WORLD-10: No subscription, API fees, expiring free trials, or mandatory cloud hosting; verify license and attribution for offline country geography, flags and imagery.

## Initial recipe candidates — NOT APPROVED
Italy: air fryer mini pizza bites (Italian-inspired); Mexico: no-cook guacamole; Japan: onigiri assembled from safely cooled pre-cooked rice (not from-scratch no-cook); India: mango lassi; Brazil: air fryer mini pão de queijo. Validate authenticity, naming, food safety, nutritional values, allergens and cook times in controlled kitchen testing before release. Avoid equating one recipe with an entire country's cuisine.

## Map implementation
Prefer bundled, simplified GeoJSON/vector geometry from a source with verified redistribution rights and provenance. Render locally (SVG/Canvas or native Android map component) with accessible country list alternative. Use region clustering/zoom for small countries; do not place inaccurate flags on countries in production. Map does not require online maps, location permission or third-party map APIs.

## Release plan
1. Audit V3.1 home navigation and establish new segment entry point.
2. Build isolated HTML map prototype with accurate offline geography, filter, country detail and recipe card; avoid modifying production index.html.
3. Curate pilot: 5 countries and 10 recipes (at least one no-cook and one air-fryer option per country where feasible). Mark adaptations.
4. Run A08 safety/nutrition/allergen and A09 usability/cultural review.
5. Implement in APK, integrate planner/shopping/favourites and offline data.
6. Test country selection, zoom/pan, orientation, screen readers, offline, persistence and regressions.
7. Expand country coverage only after per-recipe verification and performance review.

## Acceptance
No invented recipes or nutritional claims; accurate geography; all recipe links work; no paid dependencies; no broken existing flows; verified child safety, age suitability, content provenance and signed release evidence. No claim of implementation until tested.
