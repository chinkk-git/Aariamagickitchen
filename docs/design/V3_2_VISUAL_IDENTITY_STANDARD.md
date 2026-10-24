# V3.2 Magical Cookbook — Visual Identity Standard
Status: **DESIGN CONTRACT DRAFT / owner-approved direction; numeric tokens provisional until reference calibration**. Scope: recipe presentation only. Parent: Issue #38. No production/release approval.

## Source-of-truth and precedence
1. Owner-approved Home and World Food Adventure reference designs are protected and unchanged by recipe theming.
2. Last owner-approved Tasty Tacos recipe flow defines visual hierarchy and food-photography style.
3. Owner-approved three-template comparison: Playful Purple, Fresh Green, Sunny Orange; same components and interactions, alternate decoration/palette.
4. This standard defines implementable constraints. Values marked PROPOSED must be compared with original approved pixels and explicitly locked before visual acceptance. Never represent approximate recreation as pixel-exact.
5. Original canonical character assets from production index.html are the identity source. Artwork rights, A08 child-safety and A09 child-experience are mandatory independent gates.

## Colour tokens — PROPOSED; not extracted or approved pixel values
| Token | Purple | Green | Orange |
|---|---|---|---|
| primary | #8B5CF6 | #34A853 | #F97316 |
| soft | #E9D5FF | #D9F5DE | #FED7AA |
| accent | #FBCFE8 | #A7DDA9 | #FDE68A |
| canvas | #FFF7ED | #FFFBF0 | #FFF7ED |
| ink | #4C1D95 | #22543D | #7C2D12 |
| card | #FFFFFF | #FFFFFF | #FFFFFF |
| error | #B42318 | #B42318 | #B42318 |
Do not use ink/primary indiscriminately; validate text/icon contrast for every actual pairing (WCAG AA target 4.5:1 normal text, 3:1 large text and meaningful graphics). Preserve semantic colours and warning severity across themes. Use accessible text and shape, not colour alone.

## Spacing, size and type — PROPOSED dp/sp
Spacing scale: 4, 8, 12, 16, 24, 32 dp. Phone horizontal inset 16 dp; tablet responsive insets >=24 dp. Cards 20 dp radius; inner panels 16 dp; primary button >=52 dp height and >=48x48 dp hit area; progress track 8 dp; grid gap 12–16 dp; card padding 16 dp. Step text 18–22 sp; body >=16 sp where practicable; labels >=14 sp. Respect system font scaling, safe areas, status/navigation bars and fold/landscape constraints. Use adaptive layouts rather than fixed pixel coordinates. Recipe hero images aspect ratio 16:9 with center-crop/contain chosen by subject; NEVER stretch. Respect focal points, and keep controls clear of imagery.

## Screen anatomy (same across themes)
Catalogue: dish hero -> recipe name -> relevant badges/metadata -> favourite/action. Detail: navigation/back -> hero -> title/metadata -> ingredients/servings -> adult-assist cue -> Let's Cook. Step: back/title -> numbered progress -> step image or accurate icon fallback -> concise instruction -> safety cue when needed -> Previous/Next. Completion: dish photo -> celebration/reward -> camera-only/share -> quiz/next actions. Quiz, nutrition, allergens and translations remain intact. Keep one step per screen and 8–10-year-old reading density.
No girl-chef art inside cooking-step panels; approved Aaria/Family/Friends avatars only in their established contexts. Never use unrelated step photography or stock art as if it depicts a recipe. Missing image -> purposeful branded icon/card fallback, not broken image.

## Theme assignment
One stable recipe-ID-to-theme mapping across sessions, devices and languages. Prefer explicit versioned manifest or a documented deterministic hash with fixed seed. Do NOT call runtime random during render. Store only theme assignment in presentation layer, not recipe IDs or business logic. QA can force a theme for screenshots without mutating recipe state.

## Feature preservation
No functional rewrites of Home, World map interactions/deep links, Cook with Mommy/Daddy, Cook with Friends, Surprise/Spin My Week, weekly planner, favourites/recents, shopping consolidation/WhatsApp, camera-only My Creations/share, Airfryer/categories, Magic Pantry, quizzes/rewards, EN-GB/PT-BR, music/narration, update security/What's New, Android Back, persistence, portrait/landscape. No timer reintroduction. Keep pre-existing defects in separate ledger, not silently accepted.

## Asset rules
95 finished-dish hero images required; 82 catalogued candidates need dish/rights/quality review, 13 missing IDs: 1,4,5,6,7,8,9,10,16,26,33,51,57. Preserve original source/provenance, SHA-256, rights, recipe-match review, status and fallback. B01 HOLD remains HOLD. Never promote unapproved art.

## Release-blocking acceptance
- Exact approved references and SHA-256 recorded in provenance manifest; no unverified recreation.
- Pixel comparison with fixed emulator device profiles + human design review for Home/World and each theme (phone portrait, phone landscape, tablet portrait/landscape).
- No clipped text, distorted photos, inaccessible controls, or missing navigation; A08/A09 independent PASS, rights PASS, all 95 recipes mapped, no regressions to preserved functionality.
- Separate V3.2 test APK; Classic checkpoint remains recoverable. No merge/release without explicit approval.
