# V3.3 World Map Explorer — W02 Implementation Contract

Status: initial architecture and test strategy  
Owner: W02  
Tracking: [Issue #39](https://github.com/chinkk-git/Aariamagickitchen/issues/39)  
Branch: `feature/v3.3-world-map-explorer`  
Baseline reviewed: `31bd397914b931688ef34b34882cf389d00715ac`

## Governing decisions

Issue #39's 2026-10-22 owner override authorizes isolated W02 development in parallel with W01. W01 continues to own `feature/v3.2-magical-cookbook`; W02 owns only this branch. No merge, release or production change is authorized.

The owner-approved visual reference is `WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED.png`, supplied in `Aaria_World_Map_Approved_Design_Package.zip`. The local package SHA-256 is `46233d2b615cbacf6ea664413a9cac9e5a3b590dbbddf09bff58326aebd686c0`; the image SHA-256 is `1ab670c7a4e36f29a3275b2043c7edb9e85c65491ff82679e51074194dc985dc`, matching the checksum stated in the owner-supplied design brief. Commit the reference/design sources with provenance. Do not substitute invented/generated artwork. The approved concept board is a design reference; artwork rights and suitability for use as runtime content remain an independent gate.

Issue #39 supersedes the older package text that said implementation was deferred. The approved image and canonical data govern appearance and content; the mockup's sample recipes, country counts and passport states are not production data.

## Architecture strategy

### Reuse first

- Preserve the single offline HTML/JavaScript experience transformed from `index.html` by `tools/v3/transform-production.mjs` and rendered by the existing Android WebView app in `phase2-pilot/apps/aaria-android`.
- Extend the existing V3.1 World route and styles/data in `tools/v3/runtime.js`, existing geography and world-adventure records, and the profile persistence contract. Do not create a second Android app shell or replace WebView with Compose.
- Keep the repository's existing Gradle, Node validation, Android test and GitHub Actions conventions. Pin all evidence to the exact source SHA.
- Reuse current map/geography data and approved art only after verifying source, country association and rights. Keep geospatial marker coordinates normalized to the authored map coordinate system and apply one bounded uniform transform to both geography and markers.

### State and input model

Implement a deterministic World Explorer state with overview, selected-country preview/list, landmark fact and passport views. A single state owner controls selection, zoom/pan, scroll, current panel and language. Opening and closing a panel or changing orientation must restore the map camera and prior selection.

Use pointer/touch gestures with movement threshold and pointer-cancel handling: taps select; drags pan; two-pointer pinch zooms around the gesture center; explicit zoom/reset and a country list provide accessible alternatives. Bound translation so the map remains discoverable, clamp zoom, and keep marker targets large at every scale. No GPS is needed or permitted.

Passport stamps derive only from durable, verified recipe-completion events already present in the child profile. Do not manufacture completion state or progress counts. Add migration-safe fields only if the existing persisted model lacks the needed relationship; preserve existing profile data and test old-profile upgrade.

### Data and content model

- The 95 canonical recipe records are the sole production recipe catalogue. Preserve IDs, routes, names, warnings, images and existing functionality.
- Map each destination to a validated ISO country code and one or more original recipe IDs only where repository data supports that relationship. No mockup filler. Empty destinations must be omitted or show an honest localized empty state.
- Country and landmark copy, flags, geography and artwork require a source/provenance record and factual review. Keep EN-GB and PT-BR strings in the existing localization pattern.
- All required content is bundled; no runtime network, map tiles, account, remote persistence or paid API is allowed.

## Acceptance criteria

### Visual and responsive
- Reproduce the approved reference's map-first composition, illustrated treatment, header, country panel, controls and passport hierarchy using approved/rights-cleared app assets.
- Phone portrait: map-first viewport, collapsible country sheet and bottom navigation that remains visible.
- Phone landscape: map remains dominant with compact, dismissible details and safe-area-aware controls.
- Tablet portrait: map and expandable detail panel remain usable without shrinking the map to a desktop thumbnail.
- Tablet landscape: map on the left and scrollable country detail rail on the right; no overlap with fixed controls or navigation.
- Keep source aspect ratios; do not distort or hide essential map content. Capture all four form factors and document any approved-reference deviation.

### Interaction, data, storage, offline and accessibility
- Drag/pinch/zoom controls/reset work within bounds; drag never opens a marker; tap/list selections resolve to the same verified country.
- Country preview, recipe list, landmark fact, passport and system Back follow the approved state transitions; closing detail restores camera and selection.
- All 95 original recipe routes remain reachable; displayed country recipes use canonical IDs and data. No mockup-only recipe or unsupported country mapping appears.
- Passport earns a country stamp only after a mapped recipe is genuinely completed; progress survives process death, restart, offline use and app upgrade without profile loss.
- Map, facts, previews, recipe route and passport work in airplane mode.
- EN-GB and PT-BR copy exists for all new labels, facts and empty states and fits each layout.
- Gesture operations have button/list equivalents; touch targets meet the design requirement (44 CSS px where applicable); labels, focus order, TalkBack, text scaling and reduced-motion behavior are checked.
- No timer, geolocation, tracking, ads, public sharing, chat, leaderboards or child-risk external navigation.

### Independent gates and delivery
- A03 technical review, A08 safety, A09 age 8–10 experience, artwork rights/provenance and Android security/update are separately recorded as PASS or BLOCKED with evidence.
- Exact-head CI, emulator interaction/offline/state tests, four-form-factor screenshots, APK metadata/hash and known limitations are attached to Issue #39.
- No merge, production deployment or release occurs under this contract.

## Test plan

| Layer | Required proof |
|---|---|
| Source/data contracts | Canonical 95/95 IDs and route preservation; ISO code validity; recipe ID/name/art association; no unsupported or mockup-only recipe; locale completeness; asset checksums/provenance. |
| Unit/model | Camera transform, pointer threshold/cancel, pinch center, pan/zoom bounds, map selection, state transitions, stamp derivation, migration and persistence. Deterministic inputs; no timing-based tests. |
| UI/interaction | Tap, drag, pinch, zoom buttons, reset, destination list, country preview, recipe launch/return, landmark fact, passport, Back, orientation and language switch. |
| Visual | Compare actual Android screenshots with the approved reference for phone portrait/landscape and tablet portrait/landscape. Verify no distortion, clipped actions, overlapped navigation or unreadable copy. |
| Offline/regression | Airplane-mode map flow and existing 95 recipe routes, favourites, planner, shopping, home, profile, navigation, Classic coexistence and app Back. |
| Accessibility | TalkBack names/roles, focus order, non-gesture alternative, target size, font scaling, contrast and reduced motion. |
| Performance/security | Smooth map pan/zoom on supported emulator/device tiers; bounded memory/asset size; no accidental network/GPS permissions or unsafe WebView bridge access. Signing/update checks remain the existing Android security gate. |
| Independent review | A03, A08, A09, rights/provenance and Android security each produce separate evidence and decision. |

## Dependencies and escalation

### Available
- Current W02 branch head and existing offline WebView/JS architecture.
- Canonical production catalogue and current world/geography data.
- Owner-approved image/design package, checksum-verified in the source workspace.
- Existing Android build and CI conventions.

### Open dependencies
- The owner-supplied approved image is not yet versioned in this repository; add it and the original design notes with provenance before claiming comparison or visual parity.
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
