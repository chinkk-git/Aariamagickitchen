# Aaria's Magical Piano Kingdom — V1 draft

**Status: development only; do not merge or publish without owner approval.**

This is an isolated `/piano/` PWA prototype. It does not alter the existing Kitchen production app.

## V1
- One song: Dalmatian Cradle Song (29-measure timeline).
- Falling-note rain, interactive piano, Listen and Learn modes, measure navigation.
- Scoped PWA manifest and offline service worker.
- Android/iPhone installation requires HTTPS hosting and device verification.

## Accuracy and release blockers
1. **Music is not verified.** The 128 existing provisional note events are not a score-accurate transcription; piano accompaniment is incomplete. Never present this as a verified teaching score.
2. **Icon is temporary.** `icon-draft.svg` is a placeholder. The Kitchen avatar registry identifies `tools/v3/artwork/characters/reference-derived/aaria-portrait.webp` as the exact Aaria reference, but its registry marks artwork-rights and A08/A09 gates on HOLD. Do not repurpose or publish it until cleared.
3. **iOS icon not ready.** Produce proper 192/512 PNG, maskable and Apple touch icons after final artwork approval.
4. **Not device tested.** Validate touch targets, portrait viewport, swiping, audio gesture policy, install prompts, caching and upgrades on real Android/iPhone.
5. **No production publishing.** GitHub Pages currently publishes the default production branch; this feature branch is review-only.

## V2 (out of scope)
Parent song imports/publishing and child sheet-photo capture/OMR.

## Preview locally
Serve repository root using a local HTTP server and open `/piano/`. Service workers require localhost or HTTPS.
