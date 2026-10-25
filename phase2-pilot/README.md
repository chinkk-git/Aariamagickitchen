# Aaria's Magical Kitchen — Phase 2 Pilot

This is an isolated two-recipe pilot workspace under `phase2-pilot/` on `feature/platform-v2`. It does not replace or edit the legacy production app.

## Start the web pilot

1. Install Node.js 20 or newer and Python 3.
2. From this directory, run `npm run build:preview` to create `dist/Aaria_Phase2_Pilot_Web_Preview.html`. That file embeds the complete supplied reference artwork pack and works without a network connection.
3. Or run `npm run serve` and open `http://localhost:4173/apps/aaria-kitchen/` for the multi-file development preview.

## Android shell

The Android project is `apps/aaria-android`. It bundles the standalone HTML page into a WebView and does not declare the Android Internet permission. Its CI workflow builds an installable debug APK and uploads it as a workflow artifact. GitHub Actions builds an installable debug APK from the feature branch. This workspace has no Android SDK, Gradle installation or emulator, so local APK/device testing is unavailable.

## Checks

```sh
npm test
npm run validate:recipes
npm run build:preview
node --check dist/bundle-check.mjs
```

## Release status

The web pilot is functionally implemented for the two pilot recipes. The full supplied visual reference pack is available in the app and embedded in the standalone bundle. Nutrition values and independent nutrition, allergy, food-safety, child-protection, child-experience and final pilot artwork reviews remain release blockers. See `docs/release-evidence/release-dossier.md`.
