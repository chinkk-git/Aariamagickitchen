# V3.3 World Map Explorer — W02 Implementation Contract

Status: implementation active; acceptance and independent gates not claimed
Owner: W02  
Tracking: [Issue #39](https://github.com/chinkk-git/Aariamagickitchen/issues/39)  
Branch: `feature/v3.3-world-map-explorer`  
Baseline reviewed: `31bd397914b931688ef34b34882cf389d00715ac`

## Owner redesign override — 2026-10-23

This directive supersedes earlier V3.3 layout and control details in this contract. The previous sample presentation is rejected; its historical APK, hash and successful phone navigation trace are retained as diagnostics only. The replacement must be an immersive Adventure Explorer, and owner visual approval is mandatory before acceptance.

- The actual Android map viewport must occupy 85–95% of usable content area after system insets and persistent navigation are excluded. Measure rendered bounds on device. Remove the framed card, capped map height, redundant headings and unused page sections.
- Keep the verified owner-approved World Map source image unchanged. Preserve its intrinsic aspect ratio. Portrait begins at a useful India/Asia-adjacent focus and supports natural horizontal exploration; the entire map remains reachable by bounded pan. Landscape defaults to a near edge-to-edge world overview.
- Use a single uniform camera transform for approved art, geographic overlay and country markers. Support one-finger drag, pointer-centred two-finger pinch and one floating globe reset only; remove plus/minus and pan-mode controls. Clamp camera translation to rendered map bounds and retain marker/map alignment.
- Destination taps open a compact, localized preview over the map. India exposes exactly the existing 18 canonical IDs. Italy, China, Japan, Mexico and Vietnam are review-only; they have no recipe links, rewards or canonical count contribution.
- Food Passport reads existing profile progress and completion state. Viewing a country never grants a stamp. Offline/restart behavior and map restoration across preview, recipe Back and orientation remain required.
- Capture actual app screenshots for phone/tablet in portrait/landscape, zoomed map, preview, recipe and passport. G1/G2/G3 and full canonical 95-route coverage remain unchanged. A08, A09, artwork rights and Android security are separate evidence gates.

### V3.3 camera and view-state strategy

The map viewport is a clipped `data-v33-map-viewport`; a shared `v31-map-world-space` provides the aspect-locked base dimensions and uniform camera transform. Portrait base width is derived from usable map height at the unchanged crop's 717:389 aspect; this makes horizontal exploration intentional without shrinking the map. Landscape fits the full map into the viewport. Pan bounds derive from the transformed map-space dimensions and viewport rectangle, not the outer screen or fixed zoom multipliers. Country marker hit geometry is counter-scaled to remain readable while its geographic anchor follows the same world-space transform.

The country preview and Food Passport are dismissible overlays recorded in browser history. This lets Android Back close the top-level panel first. Recipe navigation adds a route entry above that panel, so Back returns to the selected country and the exact camera. Orientation resize recalculates the orientation-appropriate default and keeps preview state; returning from a recipe does not reset the map.

### Redesign evidence thresholds

Phone and tablet Android smoke must calculate `mapRect.width * mapRect.height / (usableScreenRect.width * usableScreenRect.height)` from rendered bounds and require 0.85–0.95. It also checks zero frame/border, the map-space aspect, the approved source image's natural and rendered ratios, country marker anchors before/after camera motion, and actual landscape/portrait viewport dimensions. The phone smoke injects two-pointer touch through WebView DevTools and one-finger `adb` swipe; it verifies zoom/pan change, bounds, globe reset, PT-BR and EN-GB preview, canonical recipe #51, Android Back restoration and a non-rewarding Passport view. Tablet smoke captures both real orientations while its full 95-recipe artwork audit continues unchanged.

## Governing decisions

Issue #39's 2026-10-22 owner override authorizes isolated W02 development in parallel with W01. W01 continues to own `feature/v3.2-magical-cookbook`; W02 owns only this branch. No merge, release or production change is authorized.

The owner-approved visual reference is `WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED.png`, supplied in `Aaria_World_Map_Approved_Design_Package.zip`. The local package SHA-256 is `46233d2b615cbacf6ea664413a9cac9e5a3b590dbbddf09bff58326aebd686c0`; the image SHA-256 is `1ab670c7a4e36f29a3275b2043c7edb9e85c65491ff82679e51074194dc985dc`, matching the checksum stated in the owner-supplied design brief. Commit the reference/design sources with provenance. Do not substitute invented/generated artwork. The concept board is design direction only. Runtime uses the existing protected World Map illustration `docs/design/approved-v31-world-map-crop.webp` (SHA-256 `5296a636c86f2d0f8a12c60406fa366723cb442c292cc2d3bd6b3f1b90afa353`) unchanged. Its 717×389 aspect ratio sets the map-space projection; the image is rendered with `object-fit: contain`. The concept board itself is not placed in the runtime map layer; its artwork rights remain an independent gate.

Issue #39 supersedes the older package text that said implementation was deferred. The approved image and canonical data govern appearance and content; the mockup's sample recipes, country counts and passport states are not production data.

## Architecture strategy

### Reuse first

- Preserve the single offline HTML/JavaScript experience transformed from `index.html` by `tools/v3/transform-production.mjs` and rendered by the existing Android WebView app in `phase2-pilot/apps/aaria-android`.
- Extend the existing V3.1 World route and styles/data in `tools/v3/runtime.js`, existing geography and world-adventure records, and the profile persistence contract. Do not create a second Android app shell or replace WebView with Compose.
- Keep the repository's existing Gradle, Node validation, Android test and GitHub Actions conventions. Pin all evidence to the exact source SHA.
- Reuse current map/geography data and approved art only after verifying source, country association and rights. Keep geospatial marker coordinates normalized to the authored map coordinate system and apply one bounded uniform transform to both geography and markers.

### State and input model

Implement a deterministic World Explorer state with overview, selected-country preview/list, landmark fact and passport views. A single state owner controls selection, zoom/pan, scroll, current panel and language. Opening and closing a panel or changing orientation must restore the map camera and prior selection.

Use pointer/touch gestures with movement threshold and pointer-cancel handling: taps select; one-finger drags pan; two-pointer pinch zooms around the gesture centre; the globe control resets to the orientation default. Do not add separate zoom controls or pan mode. Bound translation so the full map remains discoverable, clamp zoom, and keep marker targets large at every scale. No GPS is needed or permitted.

Passport stamps derive only from durable, verified recipe-completion events already present in the child profile. Do not manufacture completion state or progress counts. Add migration-safe fields only if the existing persisted model lacks the needed relationship; preserve existing profile data and test old-profile upgrade.

### Data and content model

- The 95 canonical recipe records are the sole production recipe catalogue. Preserve IDs, routes, names, warnings, images and existing functionality.
- Map each destination to a validated ISO country code and one or more original recipe IDs only where repository data supports that relationship. No mockup filler. Empty destinations must be omitted or show an honest localized empty state.
- Country and landmark copy, flags, geography and artwork require a source/provenance record and factual review. Keep EN-GB and PT-BR strings in the existing localization pattern.
- All required content is bundled; no runtime network, map tiles, account, remote persistence or paid API is allowed.

## Acceptance criteria

### Visual and responsive
- Actual map viewport area is 85–95% of usable content area in each phone/tablet orientation, measured from rendered Android geometry; no small frame or excessive margin.
- Phone portrait begins with a large map view that supports natural horizontal exploration; phone landscape and both tablet orientations remain near edge-to-edge and usable.
- Country preview remains compact/dismissible and does not destroy the map camera. Food Passport is reachable without displacing the map or covering persistent navigation.
- Keep the approved source ratio, full-map reachability and marker anchors; no stretching or inaccessible geography. Capture all four form factors and document any approved-reference deviation.

### Interaction, data, storage, offline and accessibility
- One-finger drag, two-finger pinch and globe reset work within bounds; drag never opens a marker; selected anchors remain aligned to the approved map.
- Country preview, recipe list, landmark fact, passport and system Back follow the approved state transitions; closing detail restores camera and selection.
- All 95 original recipe routes remain reachable; displayed country recipes use canonical IDs and data. No mockup-only recipe or unsupported country mapping appears.
- Passport earns a country stamp only after a mapped recipe is genuinely completed; progress survives process death, restart, offline use and app upgrade without profile loss.
- Map, facts, previews, recipe route and passport work in airplane mode.
- EN-GB and PT-BR copy exists for all new labels, facts and empty states and fits each layout.
- Country destinations are keyboard/TalkBack actionable; markers and floating controls meet 44 CSS px target sizing where applicable. Pinch has bounded movement and a globe recovery/reset action; focus, text scaling and reduced motion are checked.
- No timer, geolocation, tracking, ads, public sharing, chat, leaderboards or child-risk external navigation.

### Independent gates and delivery
- A03 technical review, A08 safety, A09 age 8–10 experience, artwork rights/provenance and Android security/update are separately recorded as PASS or BLOCKED with evidence.
- Exact-head CI, emulator interaction/offline/state tests, four-form-factor screenshots, APK metadata/hash and known limitations are attached to Issue #39.
- No merge, production deployment or release occurs under this contract.

## Test plan

| Layer | Required proof |
|---|---|
| Source/data contracts | Canonical 95/95 IDs and route preservation; ISO code validity; recipe ID/name/art association; no unsupported or mockup-only recipe; locale completeness; asset checksums/provenance. |
| Unit/model | Camera transform, pointer threshold/cancel, pinch centre, pan/zoom bounds, map selection, state transitions, stamp derivation, migration and persistence. Deterministic inputs; no timing-based tests. |
| UI/interaction | Tap, one-finger drag, two-finger pinch, globe reset, country preview, recipe launch/return, passport, Android Back, orientation and language switch. |
| Visual | Compare actual Android screenshots with the approved reference for phone portrait/landscape and tablet portrait/landscape. Verify no distortion, clipped actions, overlapped navigation or unreadable copy. |
| Offline/regression | Airplane-mode map flow and existing 95 recipe routes, favourites, planner, shopping, home, profile, navigation, Classic coexistence and app Back. |
| Accessibility | TalkBack names/roles, focus order, destination keyboard access, reset/recovery, target size, font scaling, contrast and reduced motion. A09 assesses whether pinch/drag discoverability is sufficient for ages 8–10. |
| Performance/security | Smooth map pan/zoom on supported emulator/device tiers; bounded memory/asset size; no accidental network/GPS permissions or unsafe WebView bridge access. Signing/update checks remain the existing Android security gate. |
| Independent review | A03, A08, A09, rights/provenance and Android security each produce separate evidence and decision. |

## Dependencies and escalation

### Available
- Current W02 branch head and existing offline WebView/JS architecture.
- Canonical production catalogue and current world/geography data.
- Owner-approved image/design package, checksum-verified in the source workspace.
- Existing Android build and CI conventions.

### Open dependencies
- The owner-supplied approved image and source design notes are now versioned under `docs/design/references/v3.3/`; comparison still requires exact-head Android screenshots and independent visual review.
- The newly supplied five-country concept board is model-generated and kept only as a hashed provenance note; it is not cleared runtime artwork.
- Runtime asset use requires the independent artwork-rights/provenance review; approval of a visual reference alone does not close that gate.
- Exact country-to-recipe relations and reviewed landmark copy must be supported by canonical repository records and verified sources.
- A08, A09 and Android security are independent reviewers, not implementer self-checks.

### Escalate only when
- An essential design decision cannot be read from the approved reference or current owner directives.
- The canonical 95 records do not support a proposed mapping/content relationship.
- A mandatory asset, provenance record, localization review or platform input is unavailable and blocks that specific work.
- A safety, privacy, licensing or Android security finding requires an owner decision or halts a potentially unsafe path.
- The authorized branch is no longer isolated or a write collision is detected.

While an independent gate is pending, continue implementation and non-gated tests with approved/cleared assets; mark the affected acceptance item blocked. Never report a gate as passed without its reviewer evidence.

## Initial checkpoint

- W02 and W01 branch refs were read at `31bd397914b931688ef34b34882cf389d00715ac`; no W01-only branch edits are part of this profile commit.
- Profile/contract are planning artifacts. They are not evidence that the map feature, Android QA, independent gates or release acceptance have passed.
