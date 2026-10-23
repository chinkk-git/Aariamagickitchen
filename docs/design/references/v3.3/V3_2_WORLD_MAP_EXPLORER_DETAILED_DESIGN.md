<!-- Source file: V3_2_WORLD_MAP_EXPLORER_DETAILED_DESIGN.md from owner-provided package Aaria_World_Map_Approved_Design_Package.zip. Retained verbatim for provenance. Current execution authority: Issue #39 owner override (2026-10-22) and W02 profile/contract. -->
# Aaria's Magical Kitchen — World Map Explorer Game
## Detailed UX/UI, Layout and Interaction Design v1.0
Date: 2026-10-21 | Owner-selected Option C | **Deferred / not for immediate implementation**

### 1. Pixel-reference and fidelity policy
**Visual target:** `WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED.png` (latest owner-approved concept board). The main upper composition is a **landscape tablet** view with a large bright world illustration on the left, an Italy country/recipe panel on the right, and a vertical white toolbar on the far right. The five small panels along the bottom are **instructional examples**, not a permanent navigation bar or content to squeeze into the live app. The mockup is not a final asset atlas; obtain exportable rights-cleared artwork before coding.

Visual elements to match: illustrated blue ocean; richly layered green continents; playful landmark illustrations; existing Aaria’s Magical Kitchen purple title branding; rounded cream panels consistent with the existing app; purple gradient primary CTA; existing app heart/arrow controls; approved original Aaria character used where the reference shows her; gold compass; floating food/location pins; friendly rounded typography; Food Passport as an illustrated booklet. Avoid replacing the cartoon with a real-world satellite/flat vector map. Existing approved original Aaria/avatar artwork takes precedence over generated generic characters.

**Content deviations are mandatory:** The example Italy dishes and arbitrary country counts/stamps are placeholders. Display only real canonical recipes, actual flags/countries, verified completion states and approved dish art. Record any material visual discrepancy, its cause, and owner decision. No automatic claim of exact pixel equivalence across different aspect ratios.

### 2. Responsive layout rules
| Device | Map | Country panel | Controls | Bottom navigation |
|---|---|---|---|---|
| Tablet landscape ≥900 CSS px wide | Map left, approximately 65–75% of content width; full map available at overview | Right, 25–35% width, independent scrolling | Floating vertical controls at far right or map edge; no overlap with panel | Existing app nav retained |
| Tablet portrait | Full-width map upper ~65–75% of usable content height | Collapsible bottom panel; expanded list scrolls independently | Right edge over map | Retained |
| Phone landscape | Map fills majority of width/height; compact header | Right overlay/slide-over panel, dismissible | Compact +/− and reset; avoid overlapping system cutouts | Retained if existing layout requires |
| Phone portrait 320–430 CSS px | Full-width, map-first viewport ~60–75% of usable height; world overview initially fits; user zooms for country detail | Bottom sheet: collapsed peek ~20–30% screen, expanded ~65–80%; never shrink entire landscape composition | Small right-side stack; 44px targets; compass/reset accessible | Existing persistent nav retained and never covered when collapsed |

All percentages are **targets**, not rigid CSS values. Measure actual safe area, top/bottom bars, aspect ratio and keyboard. Use responsive containers, safe-area insets, `object-fit:contain`/equivalent for overview, zoom transform for exploration, clipping only at intentional map viewport boundaries. Do not stretch the original illustration. Maintain touch targets, text legibility and panel scrolling at 200% font scaling where feasible.

### 3. Screen anatomy and z-order
1. App shell: existing system status/safe area and back navigation.
2. Map viewport: illustrated world and ocean background, aspect-preserving, pan/zoom transform.
3. Map markers: geographically anchored to illustration coordinates (normalised 0..1), transformed with map, with collision/clustering at overview zoom; labels only when readable.
4. Floating title: existing app title/header at top; compact in phone portrait so it does not cover landmarks.
5. Controls: compass/reset, +, −, Passport; fixed to viewport (do not scale with map), anchored outside touch-conflicting regions.
6. Aaria guide: bottom-left only if enough space; collapse to small icon on narrow phones; use canonical character art.
7. Country panel: right rail on wide landscape, bottom sheet on portrait; overlay does not destroy map state.
8. Modal fact card / Passport: dismissible, focus-trapped when modal, restore focus and map state on close.

### 4. State machine
`WORLD_OVERVIEW` → tap country → `COUNTRY_PEEK` → expand → `COUNTRY_RECIPES` → tap recipe → `RECIPE_DETAIL`; Back returns to previous panel with camera/map transform retained.
`WORLD_OVERVIEW`/`COUNTRY_PEEK` → tap landmark → `LANDMARK_FACT`; dismiss returns to previous state.
Any map state → Passport → `PASSPORT`; close returns to exact prior state.
Map pan/zoom never triggers a recipe; tap targets require movement threshold and gesture cancellation. Reset returns zoom=1 and centred overview; selection may be cleared. Preserve selection and scroll position on orientation change where feasible.

### 5. Component specifications
**Country marker:** dish/location marker anchored to country coordinates; minimum 44px hit area; label when zoom permits; no fictional cuisine mappings. Tap animates gentle selection ring (respect reduced motion). Selected marker stays visible when panel opens.

**Country panel:** wood flag/name header, close button, hero region/landmark art, one or more approved dish thumbnails, optional brief country fact, 'See all recipes' CTA. The example Italy card is the *visual treatment reference*, not the actual menu. Empty mapping uses neutral 'No recipes here yet' and no fake food.

**Recipe list:** 1-column vertically scrolling cards on phones; optional 2-column within wide tablet rail if legible; finished-dish art, canonical name, actual supported metadata; no fabricated cook time. Category chips only when real metadata supports them. Selection routes to canonical ID.

**Passport:** illustrated open booklet; earned country stamps after persisted completion, unearned outlines; screen reader announces progress using actual count; no fake '5/24'. No purchase or share requirement.

**Landmark fact:** small popover or panel with approved landmark image, location name and 1–2 short reviewed facts. Explicit close; optional audio only if existing approved sound architecture supports it; no new background narration requirement.

**Tutorial:** optional three-card first-use overlay: 'Tap a country', 'Pinch or use +/−', 'Collect stamps by cooking'. Skip and replay available. No timer.

### 6. Map geometry and artwork pipeline
- Derive exact map image bounds, continent anchor points and existing source assets from repository. Store marker coordinates normalised to *map content*, not viewport pixels.
- Export master artwork at sufficient resolution for tablet zoom, plus optional region tiles/LOD where performance requires; record source, SHA-256, rights, author/approval and asset manifest.
- No runtime network dependency; no uncontrolled stock/image search substitution.
- Use a transform matrix (translate + uniform scale), bounded to viewport; pointer-centred pinch zoom; mouse wheel optional on web; explicit +/- buttons for touch and accessibility.
- Render markers in map-space with size clamping so hit targets stay usable; cluster when too dense. Preserve keyboard/focus order separately from visual pan position.
- Budget memory, frame time and APK size; document tested emulator/device performance and fallback for lower-end Android.

### 7. Deterministic acceptance tests
| Test | Pass condition |
|---|---|
| VIS-01 | Screenshot reference comparison for wide landscape matches composition, colors, illustrated art treatment, title, controls and right panel; documented differences only for canonical content/approved assets. |
| VIS-02 | Phone portrait at 360×800 and 393×873: no horizontal page scroll, tiny whole-world text, clipped controls or obscured bottom navigation. |
| VIS-03 | Tablet portrait/landscape and phone landscape: map aspect preserved, panels usable, no content under cutouts. |
| INT-01 | Pinch zooms about gesture centre; drag pans; +/− and reset work; pan bounded. |
| INT-02 | Dragging across markers never opens a country accidentally; tapping a valid marker opens correct canonical country. |
| INT-03 | Country peek/list/dismiss/back returns to correct state and map camera. |
| DATA-01 | Every displayed recipe ID/title/artwork comes from canonical 1–95 data; no mockup placeholder recipes in APK. |
| DATA-02 | Stamp earned only for verified recipe completion and persists after process death/app restart/upgrade. |
| OFF-01 | Airplane mode: map, panels, passport and existing recipe routes work. |
| A11Y-01 | All actions accessible without pinch; focus labels/targets and reduced motion checked. |
| LANG-01 | EN-GB and PT-BR copy fits all four layouts; no untranslated new strings. |
| SAFE-01 | A08 verifies no geolocation, external chat, tracking, ads, public sharing or child-risk features. |
| UX-01 | A09 independent age 8–10 test verifies country discovery, recipe navigation and passport comprehension without adult coaching. |
| REG-01 | Existing 95/95 route, Classic coexistence, app back, planner, favourites and other V3.2 checks remain passing at exact-head CI. |

### 8. Review and work order
**Do not implement now.** Finish C1–C8 closure, independently verify the baseline, then: (1) audit original assets and canonical map/country data; (2) produce exportable high-resolution screen designs and annotated layouts for all four form factors; (3) create an interactive prototype isolated from production; (4) compare to reference with screenshots and discrepancy register; (5) request owner sign-off on exact art and interaction scope; (6) only then code on authorized W01 branch with regression and independent A08/A09/rights checks. Coordinate final Home Family/Friends discoverability as separate change. Preserve Classic and release HOLD.


### Owner-approved final reference update (2026-10-21)
The attached `WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED.png` supersedes earlier generated Explorer Game mockups. SHA-256: `1ab670c7a4e36f29a3275b2043c7edb9e85c65491ff82679e51074194dc985dc`. Follow the approved existing V3.2 Homepage visual system, not an independent game skin. This is a deferred design package only; finish closure first. Example Italy recipes and passport states in the mockup are not canonical data.
