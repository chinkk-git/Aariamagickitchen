# Magical Spinning Globe — W03 isolated module

Status: interactive review module; not integrated into the Android app; not owner-review-ready until W02 completes the adapter and real-device screenshot handoff.

## Owner-approved references

- Layout reference: `docs/design/a_bright_colorful_kid_friendly_app_ui_concept_il.png` (owner verified it in Issue #50 comment 6371540230).
- Binding interaction, safety, orientation and handoff requirements: `docs/design/world-adventure-globe-approved-2026-10-23.md` and Issue #50 comments 6371417876 / 6371427172 / 6371540230.
- Existing Aaria art is an exact copy of `tools/v3/artwork/characters/reference-derived/aaria-portrait.webp` from W02 commit `40ba0c998cf3ef85e5bcc5a641fc0f6aba49825f`. SHA-256 `0268a8739595178a6e6ed0eb130a4bfc96c65d559130c3fea686239bd664a8d9`; original Git blob `f69dae4a61cff264c559564721265700356c38f0`. It is reused unchanged; no new character likeness was generated.

## Module API

Load `world-adventure-globe.css` and `world-adventure-globe.js` inside the existing app shell, then mount into a host element:

    const screen = AariaWorldAdventureGlobe.mount(host, {
      locale: state.language,
      avatarSrc: "content/.../aaria-portrait.webp",
      destinations: getApprovedDestinations(),
      onOpenRecipe: id => openRecipe(id),
      onOpenPassport: () => openFoodPassport(),
      onCountrySelect: countryId => trackLocalScreenState(countryId)
    });

Destination records use `{ id, name: { "en-GB", "pt-BR" }, flag, latitude, longitude, available, recipes, note }`. Each recipe contains `{ id, title, finishedDish, routeEnabled }`. All recipe data and artwork are host-provided; this module does not copy, renumber, invent, or mutate recipe records. A recipe opens only when the host explicitly sets `routeEnabled: true` and provides `onOpenRecipe`; review-only international assets therefore stay locked. India’s canonical routes must be supplied by W02’s existing allowlist, including all 18 current links. Missing data fails closed to an empty-state message.

The returned controller exposes `handleBack()`, `getState()`, `restoreState(state)`, `setLocale(locale)`, `setDestinations(data)` and `destroy()`. W02 retains ownership of the Android shell, route/history, bottom navigation, Passport persistence, canonical recipe data and native Back dispatch. Call `handleBack()` before leaving the globe route; it closes an open country panel or a pending Surprise Me selection, then returns false when the globe has no child state to close. Selection, scrollable panel and globe rotation remain in one component/page; resize does not clear state.

## Interaction behavior

- Drag horizontally to rotate the globe; only front-facing flag targets are rendered and tappable.
- Surprise Me chooses an available destination, spins to bring that flag forward and stops with a prompt. It never selects the country or reveals recipes. The child must tap the highlighted flag.
- Tapping a visible flag opens its country’s provider-supplied cards in the same panel. Locked review-only cards cannot invoke recipe navigation.
- Portrait uses a map-first stacked layout with an independently scrollable country panel; landscape reserves about 60% of content width for the globe and the right rail for country cards.
- EN-GB/PT-BR labels, touch targets, focusable controls, screen-reader names, safe-area padding and reduced-motion behavior are included.

## Remaining integration and acceptance

W02 has not yet supplied a confirmed screen host/API handoff. Do not patch W02 files or the fixed-map screen from this branch. The module does not contain the Android app shell or Passport store, and the local/browser demo is not evidence of Android behavior. W02 must import this module into its existing runtime after the interface handoff, preserve the fixed-map rollback baseline until owner cutover, supply the canonical India 18-route data, and capture real Android phone/tablet portrait and landscape screenshots plus orientation/state-preservation smoke evidence.

Independent A08/A09, artwork rights, cultural/translation, nutrition/allergen and security gates remain separately pending. No merge or release is authorized.
