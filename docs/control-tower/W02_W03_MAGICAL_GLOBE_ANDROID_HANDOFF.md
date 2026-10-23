# W02 ↔ W03 Magical Globe Android Integration Handoff

Status: **W02 host boundary prepared; W03 module handoff pending**  
Owner: W02 Android integration  
Tracking: [Issue #39](https://github.com/chinkk-git/Aariamagickitchen/issues/39) · [Issue #50](https://github.com/chinkk-git/Aariamagickitchen/issues/50)  
W02 branch: `feature/v3.3-world-map-explorer`  
W03 branch: `feature/international-recipe-content`

## Ownership and design source

The owner selected **Option 1 Magical Spinning Globe** and assigned globe implementation to W03. W03 owns the globe renderer, visual assets within its approved scope, flags and hit testing, rotation/spin and Surprise Me behaviour, selected-country state, and the recipe-card presentation. W02 does not create a second globe, flags, animation or card UI.

The owner-approved layout reference is `docs/design/a_bright_colorful_kid_friendly_app_ui_concept_il.png` at W03 commit `c480567e699b3c1bb94bec4d115e96f7173ceafd`; verified PNG SHA-256: `04316eea71478e030168b704013198e2cf12db03d40a7ded04c1e412c046d9b0`. It is a layout reference. The depicted character is not an approved replacement asset; use the existing approved Aaria avatar. W03's design contract at `docs/design/world-adventure-globe-approved-2026-10-23.md` and the owner landscape addendum govern behavior and geometry.

W02 owns the Android/WebView screen host, `world` route and app chrome, bottom navigation, Android Back/history, locale/offline wiring, canonical recipe lookup/navigation, Food Passport reads and existing completion persistence, and phone/tablet orientation lifecycle. W01 alone owns its V3.2 branch and Italy/China recipe-template integration. No W01 branch or file is changed by this contract.

## Existing host architecture

The current app is the production HTML/JavaScript runtime transformed by `tools/v3/transform-production.mjs` and loaded in the existing Android WebView/Gradle shell. `tools/v3/runtime.js` enters `view === 'world'` through the existing `goto('world')` route. The host retains app routing, browser history, profile storage (`aariaPrivateKitchenV4`), locale, Android lifecycle and bottom navigation. The W02 fixed-map screen remains the active implementation until the owner accepts a W03-backed replacement; its old screenshot/APK evidence is not approval for the globe design.

The JavaScript data/navigation boundary is implemented in `tools/v3/world-adventure-host.mjs`. It is intentionally presentation-free. It exposes the existing India recipe descriptors and host navigation callbacks, fails closed when the 18-link mapping is incomplete, marks other recognized destinations review-only/unavailable, and returns Food Passport as a read-only snapshot. It does not award stamps. The live app's canonical completion handler remains the only writer and continues to require an actually completed approved recipe.

## Proposed W03 module API — awaiting W03 acknowledgement

This is the concrete W02 proposal responding to W03's Issue #39 handoff request. It is not permission for W02 to implement W03 visuals. If W03's module export format differs, reconcile the adapter at the branch boundary before any screen integration.

```js
const controller = mount(root, hostContext, restoredState);
const savedState = controller.serialize();
controller.restore(savedState);
controller.setOrientation('portrait' | 'landscape');
controller.dispose();
```

`hostContext` is the result of `createWorldAdventureHost(...)` and provides:

- `contractVersion`, `locale` (`en-GB` or `pt-BR`) and available country codes.
- `getCountry(code)` → `{ code, available, reviewOnly, label, recipes }`.
- `openRecipe(id)` → routes only validated active canonical links through the W02 host.
- `back(scope)` → delegates `country`, `passport` or `screen` Back to the W02 route/history owner.
- `openPassport()` → opens the existing W02 Food Passport route.
- `getPassportSnapshot()` → read-only saved stamp list; viewing a country or Passport never grants a stamp.

For the initial boundary, **only India is active**, and its cards are exactly canonical IDs `[51–65, 69, 72, 74]`. Italy, China, Japan, Mexico and Vietnam are represented as unavailable/review-only metadata with no recipe routes. W02 does not recreate or import W01's Italy/China integration. A later content bundle must be immutable, pass the existing adapter and duplicate/ID checks, retain all 95 original records and India links, identify separate review states, and be explicitly assigned to the correct integration owner before its route can become active.

The module owns its globe spin/flag selection state. It must expose serialization so W02 can preserve that state around recipe navigation, Android activity recreation and orientation changes. W02 owns Android Back and route transitions: Back from a recipe returns to the same World Adventure state; a module request to leave the screen is delegated to the host; bottom navigation remains available and app-owned. The module must not register competing global Back listeners or replace the application's history.

## Integration and test sequence

1. W03 publishes the self-contained module and export/lifecycle notes to its own branch, then replies to the handoff request on Issue #39. No W03 files are copied or edited before that immutable handoff.
2. W02 validates the module's export shape and assets, mounts it only within the existing `world` route, injects the host context and tests disposal/re-entry. Existing production shell, bottom navigation, profile schema and canonical recipe renderer remain the owners of those functions.
3. Verify canonical India IDs against live catalog data before enabling India. Keep W01-owned Italy/China integration outside W02 changes; keep draft content inaccessible until its owner and review gates authorize exposure.
4. Run targeted JavaScript/contract tests first, then the fast Android build/install/launch lane. Capture actual Android phone/tablet portrait and landscape screenshots, orientation recreation, map-to-country-to-recipe-to-Back, bottom navigation, EN-GB/PT-BR, offline startup and Passport persistence. Full 95-recipe regression and separate A08/A09, artwork-rights and Android-security gates remain mandatory before merge/release.

## Evidence and readiness

For every integration commit, publish exact W02/W03 source SHAs, artifact and APK SHA-256 when built, package ID, actual Android screenshot/log artifacts, orientation/device matrix, mapping/95-recipe test results, offline/Back/Passport results, and independent gate states to Issues #39/#50.

- **Current globe integration: BLOCKED_FOR_W03_HANDOFF.** The current W02 branch has no W03 module mounted; the fixed-map screen is still active pending owner-approved cutover.
- **REVIEW_READY: PENDING** for the globe. This documentation and data boundary are not an owner-review globe APK.
- **RELEASE_READY: NO.** Full regression, owner visual acceptance, and independent A08/A09, artwork-rights and Android-security gates remain separate requirements.
- Escalate only if the owner-approved design/reference or approved avatar cannot be resolved, W03 cannot meet the proposed API without a material ownership conflict, canonical recipe mappings conflict, or an independent reviewer finds a safety/rights/security issue requiring a decision.
