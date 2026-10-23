# APPROVED DESIGN — World Adventure / Magical Spinning Globe (Option 1)

Owner approval: 2026-10-23. Status: DESIGN_APPROVED; NOT IMPLEMENTED; NOT RELEASE_APPROVED.

## Approved reference and asset limitation
Owner-approved concept illustration was supplied in the ChatGPT project conversation on 2026-10-23. **The image binary has not yet been committed to GitHub.** Do not claim otherwise. Attach that approved image to this design folder before pixel-accurate visual implementation. The concept's chef character is illustrative only: use the **original owner-approved Aaria avatar from the existing repository design documents/assets**, retaining likeness, colours, outfit and established cartoon style. Do not substitute a newly invented Aaria.

## Interaction contract
1. Portrait-first, tablet-responsive, landscape supported. The globe must be large, centred and visually dominant, without the huge blank margins of the rejected fixed-map screen. Preserve persistent bottom navigation and Android Back semantics.
2. A child can swipe/drag the globe horizontally in either direction, with smooth inertia and no runaway spinning. Country flags are accessible interactive targets anchored correctly to globe positions; hidden/back-facing flags are not tappable. Tap a visible flag to select its country.
3. One prominent **Surprise Me!** button initiates a playful, short, interrupt-safe globe spin and lands on a random available destination. Bring its flag clearly to the front. **Do not auto-open recipes**: the child must tap the selected flag to reveal them. Avoid timers or countdown controls.
4. After tapping a flag, show the country name, flag and **its recipes on the same page**, with illustrated finished-dish thumbnails, short names and large touch targets. The globe remains accessible above/alongside the recipe panel. Tapping a recipe uses the existing canonical recipe flow; do not invent new recipes or alter recipe IDs.
5. India retains its 18 existing canonical links and Food Passport rules. Italy #096, China #099 and other international destinations must use only W03's verified packages and W01's approved Android integration contract; preview/locked state until independently accepted. No unapproved route exposure.
6. Show Food Passport/stamp count; stamps are earned only after actual recipe completion, not by viewing countries. Preserve local/offline persistence. EN-GB/PT-BR labels, accessibility semantics, reduced-motion fallback and low-end Android performance are mandatory.
7. Maintain the original 95 recipes, offline Android packaging, child safety, artwork rights, and independent A08/A09, nutrition/allergen, security and translation/cultural gates.

## Visual guidance
Approved concept: colourful three-dimensional illustrated Earth, bright blue ocean and raised green continents, playful small landmarks, floating country flag badges, Aaria on left introducing exploration, friendly wooden World Adventure title, visible Surprise Me! button, a country recipe panel with large illustrated cards, minimal visual clutter. This is **a design reference, not literal map geography**: flag coordinates must be geographically sensible and dynamically anchored during rotation. Avoid inaccurate flag/country pairings and avoid using generated recipe images as final canonical artwork.

## Worker ownership and handoff
Owner requested **W03** to implement this design. W03 may implement a self-contained Globe World Adventure module **only on its exclusive branch** `feature/international-recipe-content` and must first coordinate with W02 (#39) for the map-screen integration contract and sole-writer handoff. W02 must not concurrently rewrite the same screen. W01 remains sole owner of Italy/China APK integration and its branch. W03 must not edit W01/W02 branches or duplicate their recipe/Android work. If ownership transfer cannot be established, W03 should prepare the module/spec and report BLOCKED_FOR_HANDOFF, rather than independently altering the active W02 screen.

## Acceptance evidence
Provide interactive phone/tablet portrait/landscape screenshots and recordings, globe drag and flag-visibility test, Surprise Me spin-to-flag-to-tap-to-recipes test, India 18 routes, offline and back navigation, performance and accessibility checks, source commit, APK integration instructions and explicit REVIEW_READY vs RELEASE_READY statuses. Fast smoke permits owner review; full regression and independent gates required before release. No merge/release without explicit owner approval.
