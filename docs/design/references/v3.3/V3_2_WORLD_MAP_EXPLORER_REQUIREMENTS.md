<!-- Source file: V3_2_WORLD_MAP_EXPLORER_REQUIREMENTS.md from owner-provided package Aaria_World_Map_Approved_Design_Package.zip. Retained verbatim for provenance. Current execution authority: Issue #39 owner override (2026-10-22) and W02 profile/contract. -->
# Aaria's Magical Kitchen — World Map Explorer Game
## Product Requirements v1.0 — Owner-selected, deferred
Date: 2026-10-21 | Repository: chinkk-git/Aariamagickitchen | Tracking: Issue #38

**State: DESIGN BASELINE REQUESTED; IMPLEMENTATION ON HOLD.** The owner selected Option C (Explorer Game) and requested visual fidelity to the supplied image. This document defines the future enhancement, not authorization to interrupt W01's existing closure sprint. The original V3.2 approved World Map remains in use until a separately approved implementation change.

## Source of truth and precedence
1. Safety, privacy, independent A08/A09, security and release gates are mandatory and cannot be overridden by visual mockups.
2. Canonical production recipe data: IDs 1–95, existing names, ingredients, dietary warnings, country associations, artwork provenance and approved characters. Mockup recipes such as Margherita Pizza, Creamy Pasta and Tiramisu Cups are *illustrative only* and MUST NOT be invented, substituted or renumbered.
3. Owner's latest World Map reference image: `WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED.png` (provided with this specification). The final appearance must match its visual composition, proportions, cartoon treatment, existing app palette, existing app typography, ocean/landmark aesthetic, buttons, card treatment and passport treatment as closely as the real device geometry allows.
4. Existing approved source artwork and licensing/provenance rules: reuse where consistent; any mismatch between old approved artwork and new image requires an explicit art-decision record and owner sign-off before replacement.
5. Existing V3.2 closure acceptance ledger and prior owner directives remain binding for work in progress.

## Functional requirements
| ID | Requirement | Acceptance |
|---|---|---|
| WM-01 | World Map occupies dominant visible area | On tablet landscape map at left and detail panel at right; on phone portrait map-first with collapsible bottom sheet. No whole-desktop-image shrinking. |
| WM-02 | Aspect-ratio-safe world artwork | No stretching, clipped essential geography or unintended distortion in tested orientations. |
| WM-03 | Zoom and pan | Two-finger pinch, drag, +/− buttons, reset-to-world; bounded movement and minimum/maximum zoom; no accidental country selection while dragging. |
| WM-04 | Country/region markers | Large touch targets, selection highlight, labels that declutter as zoom changes; select only valid existing mappings. |
| WM-05 | Country preview | Flag/name, kid-friendly intro and canonical finished-dish preview; close restores map position. |
| WM-06 | Recipe list | Expandable bottom sheet on phone, right-side panel on tablet; canonical recipes only, no dead-end destinations. |
| WM-07 | Landmark discovery | Optional hotspot opens short verified, culturally respectful facts; no unreviewed claims. |
| WM-08 | Food Passport | Locally persisted stamps based on actual recipe completion; no invented completed states; preserve existing child progress. |
| WM-09 | Navigation | Back closes fact/detail first, then country panel, then returns to prior screen. Map position preserved while browsing. |
| WM-10 | Offline | Map, approved facts, country-to-recipe navigation and saved progress usable without internet. |
| WM-11 | Accessibility | Non-gesture equivalents, minimum 44×44 CSS px target where applicable, focus/screen-reader labels, readable copy, reduced-motion mode. |
| WM-12 | Privacy and child protection | No GPS, tracking, chat, public profiles, ads, external links, leaderboards or social pressure. |
| WM-13 | Language | British English and PT-BR for all labels, facts, instructions and empty states; native review required. |
| WM-14 | Device support | Android phone/tablet portrait and landscape; small-screen safe areas, system back and bottom navigation respected. |
| WM-15 | Regression | Preserve Classic/V3.2 isolation, all 95 recipe routes, existing favourites/planner/other functionality. |

## Child interaction and gamification
- Map is exploratory, not a timed game. No timer or countdown.
- Stamp reward is supportive and noncompetitive, earned after verified completion; no negative feedback for incomplete countries.
- First-use hint shows tap/drag/zoom with a dismiss control; it does not obscure essential content.
- Passport contains country cards and earned/not-yet-earned states; never claim all 24 or another fixed count without verified data.
- If a country has no canonical recipes, either omit its recipe marker or show an honest non-deceptive empty state; never add recipes to fill the mockup.

## Implementation sequencing
**Now:** W01 completes existing C1–C8 backlog and independent gates, including current map crop/stretch fixes. **Later:** W01 prepares the detailed design comparison and prototype against the reference; owner approves exact scope and art; then implement, test and obtain independent approvals. Coordinate with deferred Home Family/Friends visibility. No merge/release by this directive.

## Definition of done (future)
- Approved screen-by-screen design for phone portrait, phone landscape, tablet portrait and tablet landscape.
- Measured screenshot comparisons with reference and documented unavoidable geometry/content deviations; owner sign-off on each exception.
- Working interactions verified on Android emulator and physical phone/tablet, including accessibility, offline, EN/PT-BR, data migration and Back behaviour.
- A08, A09, artwork rights/provenance, security and release gates independently passed with evidence and exact commit SHA.


### Owner-approved final reference update (2026-10-21)
The attached `WORLD_MAP_EXPLORER_VISUAL_REFERENCE_APPROVED.png` supersedes earlier generated Explorer Game mockups. SHA-256: `1ab670c7a4e36f29a3275b2043c7edb9e85c65491ff82679e51074194dc985dc`. Follow the approved existing V3.2 Homepage visual system, not an independent game skin. This is a deferred design package only; finish closure first. Example Italy recipes and passport states in the mockup are not canonical data.
