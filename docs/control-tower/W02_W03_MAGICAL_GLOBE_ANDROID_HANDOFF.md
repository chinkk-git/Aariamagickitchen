# W02 ↔ W03 Magical Globe Android Integration Handoff

Status: **W03 0.3 Natural Earth module integrated locally; exact-head Android acceptance pending; pointing-Aaria source blocked**
Owner: W02 Android integration  
Tracking: [Issue #39](https://github.com/chinkk-git/Aariamagickitchen/issues/39) · [Issue #50](https://github.com/chinkk-git/Aariamagickitchen/issues/50)  
W02 branch: `feature/v3.3-world-map-explorer`  
W03 branch: `feature/international-recipe-content`

## Ownership and design source

The owner selected **Option 1 Magical Spinning Globe** and assigned globe implementation to W03. W03 owns the globe renderer, visual assets within its approved scope, flags and hit testing, rotation/spin and Surprise Me behaviour, selected-country state, and the recipe-card presentation. W02 does not create a second globe, flags, animation or card UI.

The owner-approved layout reference is `docs/design/a_bright_colorful_kid_friendly_app_ui_concept_il.png` at W03 commit `c480567e699b3c1bb94bec4d115e96f7173ceafd`; verified PNG SHA-256: `04316eea71478e030168b704013198e2cf12db03d40a7ded04c1e412c046d9b0`. It is a layout reference. The depicted character is not a replacement asset; the latest owner rejects the small portrait for this scene and requires the original approved pointing illustration. W03's design contract at `docs/design/world-adventure-globe-approved-2026-10-23.md` and the owner landscape addendum govern behavior and geometry.

W02 owns the Android/WebView screen host, `world` route and app chrome, bottom navigation, Android Back/history, locale/offline wiring, canonical recipe lookup/navigation, Food Passport reads and existing completion persistence, and phone/tablet orientation lifecycle. W01 alone owns its V3.2 branch and Italy/China recipe-template integration. No W01 branch or file is changed by this contract.

## Existing host architecture

The current app is the production HTML/JavaScript runtime transformed by `tools/v3/transform-production.mjs` and loaded in the existing Android WebView/Gradle shell. `tools/v3/runtime.js` enters `view === 'world'` through the existing `goto('world')` route. The host retains app routing, browser history, profile storage (`aariaPrivateKitchenV4`), locale, Android lifecycle and bottom navigation. The W02 fixed-map screen remains the active implementation until the owner accepts a W03-backed replacement; its old screenshot/APK evidence is not approval for the globe design.

The JavaScript data/navigation boundary is implemented in `tools/v3/world-adventure-host.mjs`. It is intentionally presentation-free. It exposes India's 18 existing recipe descriptors and host navigation callbacks, fails closed when that mapping is incomplete, marks other recognized destinations review-only/unavailable, and returns Food Passport as a read-only snapshot. It does not award stamps. The live app's canonical completion handler remains the only writer and continues to require an actually completed approved recipe.

## W03 module API and W02 host binding

W02 consumes the immutable W03 Natural Earth module at `dc1bd7d45f643a939936fb8c95ac6c424b3f012d`, copied without source edits to `tools/v3/world-adventure-globe/`. Version `0.3.0-natural-earth-orthographic` preserves the W03 0.2 host API. The module remains the sole owner of globe rendering, flags, spin/Surprise Me, and country recipe-card UI. W02 supplies a first-entry restored rotation of `-78°` to centre India (`78°E`) on the visible hemisphere; later user rotations stay in the module's serialized state. This keeps the initial India flag fully on the globe while preserving explicit flag selection.

```js
const controller = AariaWorldAdventureGlobe.mount(root, hostContext, restoredState);
const savedState = controller.serialize();
controller.restore(savedState);
controller.setOrientation('portrait');
controller.refresh();
controller.handleBack();
controller.dispose();
```

W02 passes `createWorldAdventureHost(...)` as the module host context. The context provides:

- `contractVersion`, `locale` (`en-GB` or `pt-BR`) and available country codes.
- `getCountry(code)` → `{ code, available, reviewOnly, label, flag, recipes }`.
- `openRecipe(id)` → routes only validated active canonical links through the W02 host.
- `back(scope)` → retains the app-owned `country`, `passport` or `screen` Back boundary; globe selection Back stays inside the module.
- `openPassport()` → opens the existing W02 Food Passport route.
- `getPassportSnapshot()` → read-only saved stamp list; viewing a country or Passport never grants a stamp.

India remains active through its original canonical IDs `[51–65, 69, 72, 74]`. W02 dynamically discovers international entries from the runtime `RECIPES` catalogue and groups them by explicit `worldAdventure.countryCode`. A recipe above ID 95 can become navigable only when it is present in that active catalogue with `worldAdventure.validationStatus === 'W01_VALIDATED'`, and `bilingualStatus`, `artworkStatus`, and `safetyStatus` equal `APPROVED`, `navigationStatus` equals `ACTIVE`, and ingredients/steps are present. Unknown countries, drafts, duplicates, incomplete entries, and missing approval metadata remain unavailable. W02 does not import W03 draft JSON or recreate W01's Italy/China integration.

**W01 catalogue metadata handoff:** on each W01-integrated international `RECIPES` record, set `worldAdventure` to `{ countryCode: 'ITA'|'CHN'|'JPN'|'MEX'|'VNM', validationStatus: 'W01_VALIDATED', bilingualStatus: 'APPROVED', artworkStatus: 'APPROVED', safetyStatus: 'APPROVED', navigationStatus: 'ACTIVE' }` only after the corresponding W01 catalogue/content gates pass. Keep the route inactive until then. This bounded metadata interface is what allows safe 95 → 97 → 110 growth without W02 allowlist edits.

The module owns its globe spin/flag selection state. Its host contract exposes serialization so W02 can preserve that state around recipe navigation, Android activity recreation and orientation changes. W02 provides a lifecycle facade for existing route code (`getState`/`destroy` map to module `serialize`/`dispose`) and retains Android Back and route transitions: Back from a recipe returns to the same World Adventure state; bottom navigation remains available and app-owned. The module does not register competing global Back listeners or replace the application's history. W02's Android host stylesheet keeps flag hit areas at least 48 CSS pixels without editing W03's module source. It scales the atlas and flag layer together and asserts all rendered flags stay within the stage.

## Integration and test sequence

1. W03 publishes the self-contained module and export/lifecycle notes to its own branch, then replies to the handoff request on Issue #39. W02 pins the module bytes from W03 commit `dc1bd7d` and verifies its host-context API before Android acceptance.
2. W02 validates the module's export shape and assets, mounts it only within the existing `world` route, injects the host context and tests disposal/re-entry. Existing production shell, bottom navigation, profile schema and canonical recipe renderer remain the owners of those functions.
3. Verify canonical India IDs against live catalog data before enabling India. Keep W01-owned Italy/China integration outside W02 changes; keep draft content inaccessible until its owner and review gates authorize exposure.
4. Run targeted JavaScript/contract tests first, then the fast Android build/install/launch lane. Capture actual Android phone/tablet portrait and landscape screenshots, orientation recreation, map-to-country-to-recipe-to-Back, bottom navigation, EN-GB/PT-BR, offline startup and Passport persistence. Full 95-recipe regression and separate A08/A09, artwork-rights and Android-security gates remain mandatory before merge/release.

## Evidence and readiness

For every integration commit, publish exact W02/W03 source SHAs, artifact and APK SHA-256 when built, package ID, actual Android screenshot/log artifacts, orientation/device matrix, mapping/95-recipe test results, offline/Back/Passport results, and independent gate states to Issues #39/#50.

- **Current globe integration: Android evidence pending.** W02 integrates W03 module `0.3.0-natural-earth-orthographic` and adapts its unchanged host API to the app-owned route. Country flags use a 54px base target with depth clamped at 0.8; the shared map/flag projection is verified on-device to keep rendered hit targets at least 48 CSS px and contained within the stage. The prior exact-head phone capture measured 46.77px and failed this gate, so acceptance requires a passing rerun.
- **REVIEW_READY: PENDING** until exact-head Android screenshots and smoke pass and the owner reviews the APK.
- **RELEASE_READY: NO.** Full regression, owner visual acceptance, and independent A08/A09, artwork-rights and Android-security gates remain separate requirements.
- Escalate only if the owner-approved design/reference or approved avatar cannot be resolved, W03 cannot meet the proposed API without a material ownership conflict, canonical recipe mappings conflict, or an independent reviewer finds a safety/rights/security issue requiring a decision.


## W02 P0 integration update — 2026-10-23

- W03 source module: `dc1bd7d45f643a939936fb8c95ac6c424b3f012d`, version `0.3.0-natural-earth-orthographic`. Natural Earth 1:110m land and flags use the same orthographic projection and WGS84 coordinates. Provenance and generator are under `tools/v3/world-adventure-globe/`; the offline source archive SHA-256 is `1926c621afd6ac67c3f36639bb1236134a48d82226dc675d3e3df53d02d2a3de`.
- W02 smoke records projected land path count/coverage, every flag bound, circular orbit geometry and full-width layout. Exact-head Android capture and visual inspection remain required.
- **Aaria pointing illustration remains blocked:** W03 reports no standalone approved export and requests the owner’s original layered/source file or approved transparent export. W02 hides the rejected portrait and withholds APK publication until suitable approved art is available and real Android captures are inspected.
