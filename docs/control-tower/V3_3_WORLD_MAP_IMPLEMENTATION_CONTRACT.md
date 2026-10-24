# V3.3 World Map — W02 Implementation Contract

Status: W03 globe module integrated on W02 branch; Android exact-head evidence pending
Owner: W02
Tracking: [Issue #39](https://github.com/chinkk-git/Aariamagickitchen/issues/39)
Branch: `feature/v3.3-world-map-explorer`
Baseline reconciled for this update: `f2907c9e7fc184ce8806ebe595dff15290f658f3`

## Current owner decision — Magical Spinning Globe (supersedes the fixed-map direction below)

The owner approved Option 1 Magical Spinning Globe and assigned its visual/interaction module to W03. W02 now integrates the immutable W03 module at `fec1214f664706ca9be35d4bdb45711a94d80d3c` on the exclusive W02 branch. W03 owns globe visuals, flags, rotation, Surprise Me and country recipe cards. W02 owns Android/WebView mounting, `world` route, bottom navigation, Back/history, dynamic catalogue adapter, India 18 links, Passport persistence, offline/localization and orientation lifecycle. W01 remains the sole owner of Android recipe registration and Italy/China recipe integration.

See [W02 ↔ W03 Magical Globe Android Integration Handoff](W02_W03_MAGICAL_GLOBE_ANDROID_HANDOFF.md) for the implemented module binding, catalogue metadata contract, tests, evidence and readiness. Current status: Android build and phone smoke pending; owner visual review and independent gates remain open.

## Historical fixed-map direction — superseded by the approved globe

The following fixed-map requirements are retained as historical project context only. They do not govern the W03 globe implementation. W02 remains the only writer on this branch; W01 and W03 retain their exclusive branches. No merge, production deployment or release is authorized.

- Use the existing owner-approved illustrated World Map image `docs/design/approved-v31-world-map-crop.webp` (SHA-256 `5296a636c86f2d0f8a12c60406fa366723cb442c292cc2d3bd6b3f1b90afa353`) as a fixed background. Preserve its 717×389 aspect ratio and bytes. Do not generate or substitute map art.
- Show only destinations with validated canonical recipe links. India is the only live destination now and links exactly to IDs 51–65, 69, 72 and 74. Italy, China, Japan, Mexico and Vietnam remain review-only concepts; they are not live recipe routes or rewards.
- A country tap opens that country’s recipe cards directly over the map. A recipe card uses the existing recipe detail, ingredients and steps route. Android Back returns to the same country cards. The Food Passport remains reachable with a compact in-map control.
- Remove pan, pinch, zoom buttons, globe reset, travel animation and unnecessary intermediate preview/game mechanics. The fixed route does not parse or draw full-world geographic polygons.
- Work offline, in EN-GB and PT-BR, on phones/tablets and portrait/landscape. Keep the viewport visually dominant and its rendered occupancy measurable; preserve the full illustration without stretching or essential-geography cropping. Country targets are at least 48 CSS px in the Android smoke. Maintain Android Back, keyboard/TalkBack names, focus, text scaling and reduced motion.
- Food Passport state comes only from completed canonical recipe events. Viewing a country or opening the passport grants nothing. Preserve profile data and offline/restart persistence.
- Keep all 95 canonical records, IDs and existing routes unchanged. G1 → W02 sample → G2 → G3 and all 95 G3 recipe checks remain mandatory. A08 child protection, A09 child experience, artwork rights, nutrition/culture and Android security are distinct gates. Owner visual approval is still required.

## Historical fixed-map implementation notes — superseded

The implementation continues to reuse the existing production HTML/JavaScript transformer, `world` route and Android WebView app. The fixed-map details in this historical section no longer describe the active screen.

The fixed route uses one image element and one India button positioned in the approved art’s normalized local frame. It renders only the 18 allowlisted canonical India records in a scrollable country sheet. Recipe cards call the existing `openRecipe` route. Country/passport sheets use the existing browser history so system Back closes them in the expected order. The route omits the 177-feature GeoJSON payload and SVG polygon generation, which is not needed for a fixed illustrated background and is under investigation as a contributor to the previous slow/stale framebuffer capture.

Profile progress remains in the existing profile store. The UI reads India stamps from saved profile state, while the completion listener remains restricted to completed IDs in `V31_APPROVED_INDIA_RECIPE_IDS`. No schema migration or automatic reward is introduced.

## W03 import adapter

W03’s branch and content remain W03-owned. W02 provides `tools/v3/international-recipe-adapter.mjs` and the initial contract; no unapproved W03 content is imported into the app.

The adapter requires an exact immutable source commit and a `content/international/manifest.json` at that snapshot. It fails closed unless the manifest is `schema_version: 1.0`, `integration_status: READY_FOR_INTEGRATION`, has `source_commit` equal to the pinned commit, preserves the 95-record base and validated India mapping, and records owner artwork approval. Each entry must have a unique final ID above 95, a supported country slug, `READY_FOR_INTEGRATION`, recipe JSON/Markdown paths, artwork readiness, separate explicit review states, and local artwork paths with matching SHA-256 hashes.

Recipe JSON must include matching ID/country, EN-GB and PT-BR title/instructions, ingredients, equipment, ordered steps, allergens, bilingual adult-assistance guidance, and sourced per-serving nutrition or explicitly sourced unknowns. Each separate image asset is hash-checked and packaged as an offline data URI. A08/A09, nutrition, culture, duplicate and security statuses are returned as-is; the adapter never marks a pending review passed. Current W03 draft manifests are expected to be rejected. W02 consumes an immutable validated pair only after W03 posts it and the owner approves the first-artwork gate.

W02 posted the proposed manifest/path contract to Issue #50 comment `6366700295`; any W03 schema incompatibility is an integration blocker, not permission to alter W03 files.

## Acceptance and test strategy

| Area | Required evidence |
|---|---|
| Globe module and touch | Verify the exact W03 module is mounted; spin and Surprise Me stop for explicit flag tap; tap India to show 18 unique canonical IDs and open recipe 51. |
| Phone Android sample | Clean install/launch; real Android touch Home → Globe → India; capture actual framebuffer/logs; Android Back returns to the selected country; capture portrait and landscape, country cards, recipe and Passport. |
| Tablet G2 | Capture globe in portrait and landscape; preserve recipe #12 EN-GB/PT-BR detail, ingredients, steps, completion and accessibility checks. |
| Dynamic catalogue | Exercise 95/97/110 entry fixtures; discover only active W01-validated records by explicit country metadata; reject duplicate IDs, incomplete approvals, unsupported countries, drafts and missing art/safety/bilingual validation. |
| G3 | Preserve the full 95 canonical recipe-route sweep, language/safety checks, screenshot manifest, Home/World screenshots and Passport completion behavior. |
| Food Passport | Opening country/Passport grants no stamp. Existing completed progress survives process death and airplane-mode restart. |
| W03 adapter | Unit tests reject drafts, wrong pinned commit, ID collisions, missing bilingual fields/files/assets and tampered hashes; a complete pinned fixture becomes a local offline bundle while review states remain independent. |
| Regression/security | `npm test --prefix phase2-pilot`, V3.1 canonical validator, V3.3 draft validator, production transform, JS/shell syntax, workflow YAML, Android package/signing checks and `git diff --check`. Exact-head CI only; do not cancel active runs or weaken gates. |

## Dependencies, evidence and escalation

Available dependencies are the existing canonical catalogue, approved image, production transformer, WebView application, offline profile persistence, Gradle build and Android CI. The existing five-country draft registry remains separately validated and outside map runtime.

Every Issue #39 update must include source commit, CI run link and per-gate result, artifact links, APK package/SHA when available, actual Android screenshots/geometry/logs, canonical 95 and India 18 evidence, adapter snapshot when integrated, limitations, and independent A08/A09/rights/security status. Historical screenshots/CI remain diagnostic and must not be described as approval for the redesigned map.

Escalate only when required owner-approved artwork is missing/ambiguous, the owner’s visual direction is contradictory, a W03 handoff does not meet its posted contract, or an independent reviewer/owner decision is required. Engineering failures are diagnosed and fixed on W02’s branch without waiting for routine documentation approval.
