# Aaria’s Magical Kitchen V3.1 — implementation status

Date: 2026-10-18  
Branch: `feature/v3.1-home-redesign`

## Implemented

- Added a bilingual responsive magical home screen that retains the V3 recipe data, favourites, planner, family/friends areas, rewards, stories, shopping, and existing approved Aaria artwork.
- Added an offline Natural Earth map with seven destinations: India, Italy, China, Japan, Mexico, Vietnam, and Greece. Destination country paths are keyboard-selectable; zoom/reset, search and accessible list/select alternatives, focus restoration, and disputed-boundary/non-navigation caveats are included. Page scrolling and pinch zoom work by default; an explicit Move Map toggle enables bounded two-axis panning.
- India links to 18 original Indian recipes by their existing IDs: 51–65, 69, 72, and 74. They open through the original recipe flow. No recipe records are copied, renumbered, or changed.
- Italy and China currently show pending-review cards; no new recipe candidate, ingredients, steps, nutrition/allergen claims, or passport rewards are imported into the APK. This means the requested Italy/China recipe pilot is not complete yet. Existing candidate overlap screening is recorded in `content/world-adventures/PRODUCTION_95_DUPLICATE_AUDIT.md`.
- Added original inline SVG destination-card art, a persistent World tab, Android back-route support, and `npm run validate:v31` checks.
- Added a branch-specific GitHub Actions workflow for regression tests, production HTML generation, Android unit tests, debug APK packaging, packaged offline-map checks, and an emulator smoke run. The smoke run creates a test profile, asserts Home and World routes through WebView DevTools, captures Home/World portrait plus World landscape screenshots, and uploads APK/HTML/screenshot artifacts. No CI run has completed for this commit yet.

## Release gates and remaining work

- The latest request prioritises the first Italy/China recipe pilot: non-duplicate Italian recipes and Chinese noodles, including air-fryer/no-cook choices. Those recipes are not yet integrated because the draft candidates do not meet the required duplicate, nutrition/allergen, child-safety/cultural, bilingual schema, final-dish/step-art and review gates. The provisional `world-recipes-096-100.draft.json` remains blocked and is not imported. This is the primary remaining product gap.
- Task-scoped A08 review confirmed no cooking instructions or reward bypass in the locked destination UI and verified the visible map caveat. It does not approve any new recipe for publication.
- Task-scoped A09 reviews drove focus, accessible selection state, full-page India list scrolling, and explicit two-axis map pan mode. The latest static re-review flags device verification as outstanding; Android/TalkBack interaction and portrait/landscape screenshots are not verified until CI completes.
- The approved V3.1 visual reference image described in the plan was not in the checked-out `docs/` tree; no pixel comparison is claimed.
- No Android SDK, Gradle, emulator, or `adb` is available locally. The branch workflow is the APK and screenshot verification gate. A debug APK is not a signed production release.

## Local verification

- `npm --prefix phase2-pilot test` — 12/12 passed.
- `npm --prefix phase2-pilot run validate:recipes` — passed.
- `npm --prefix phase2-pilot run validate:v31` — passed: 95 original recipes, 177 offline country features, seven mapped destinations, 18 Indian recipe links, and six locked new-country shelves.
- `node --check tools/v3/runtime.js` and `node --check tools/v3/transform-production.mjs` — passed.
- Production transform plus `validate-v3.mjs`, `test-approved-chef-art.mjs`, `test-csp-policy.mjs`, and `test-profile-isolation.mjs` — passed against generated HTML.
- `git diff --check` — passed.

The repository governance notes that a persistent nine-role agent runtime is not installed. Independent A08/A09 and code reviews for this work were task-scoped; they do not imply continuous agent operation. V3 branches were not modified.
