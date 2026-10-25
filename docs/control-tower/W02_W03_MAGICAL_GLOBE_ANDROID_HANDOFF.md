# W02/W03 Magical Globe — Android Handoff Contract

Status: durable implementation contract and evidence pointer. This document does not restart W02 or W03 and does not change the locked 97-recipe baseline.

## Scope and source

The Android globe host connects the approved map to the canonical recipe catalogue while preserving the existing app screen and navigation ownership. The map is a navigation surface; it does not replace the home screen or the recipe screen.

The approved 97-recipe baseline is 95 original recipes plus #096 Italy and #099 China. The map retains India's 18 existing recipe descriptors. International destinations are available only when their recipe records meet the repository's validated bilingual, artwork, safety and navigation gates.

The Natural Earth globe geometry and projection handoff is recorded at commit [dc1bd7d45f643a939936fb8c95ac6c424b3f012d](https://github.com/chinkk-git/Aariamagickitchen/commit/dc1bd7d45f643a939936fb8c95ac6c424b3f012d), “fix(globe): project sourced land geometry onto sphere”.

## Android host contract

- Android Back returns from a country list or recipe to the prior globe state without replacing the app's top-level screen.
- The persistent bottom navigation remains owned by the existing Android host.
- Food Passport data is read-only in the globe host; map browsing must not add or remove stamps.
- The globe and country panel support portrait and landscape layouts while keeping touch targets inside the visible globe and stage.
- Country recipe selection delegates to the canonical recipe screen. Unvalidated destinations remain unavailable.

## Artwork provenance

The approved pointing-Aaria and sparkle artwork remain separate transparent PNG assets from the W03 immutable handoff. Their expected SHA-256 values are:

- Pointing Aaria: `6f4efb16e9c790cdae64957089639ccfd41c66b932e7e7d8147477bac60f4afb`
- Magic sparkle trail: `46f3c19aad266913a42af9eeab5df4ec5c9c6074ac54a1f902f41243bf0d9f51`

The host layers the approved artwork behind the Natural Earth globe geometry and interactive country flags. It preserves the map's circular projection, respects reduced-motion preferences, and keeps decorative effects separate from interactive controls.

## Acceptance references

The focused globe host contract test checks that the handoff, runtime, Android smoke, artwork and production transform retain these behaviors. Device-level G2/G3 coverage is recorded separately; this document is not a claim that any unrun device test passed.
