# Aaria V3.5 Web Edition

The Web target is built from pinned application sources. V3.5 recipes, country navigation, translations and the underlying application runtime come from the Android V3.5 source commit `c54704fc4b181727ca18e9f3463c0d76c777b5fe`. The approved V3.4 Welcome and dual-Home UI adapter/artwork come from `7ab11cc917b144a643fb30b6cc1dfed132ab45fb`. The builder verifies the unmodified Android transformer output against the HTML SHA-256 recorded in its handoff before applying the Web adapter. See `reports/shared-source-contract.json` for the input/output contract and limitations.

## Build

From the repository root, run:

```sh
node web-v3.5/scripts/build.mjs
```

Outputs are `dist/web-v3.5/`, `dist/web-v3.5/aaria-v3.5-standalone.html`, and `Aaria_V3_5_Web_Edition.zip`. The structured target serves artwork from sibling paths. The standalone file inlines the recipe artwork. `SHA256SUMS.json` covers the files in the structured Web package.

## Home experiences

Magical Adventure is the default on first launch. Settings offers Classic Kitchen and saves the selected style in `aaria.v34.homeStyle`. The approved Welcome screen retains fixed artwork, moving magical particles and its glowing entry arrow. Both Home modes use the 116-recipe catalogue; World links country-mapped recipes through the canonical V3.5 registry. Recipe details retain the avatar-classic layout.

## Acceptance state

Real Chrome rendering verified Welcome, both Home modes, World, All Recipes (116), and recipe #116; screenshots are included under `screenshots/`. The structured HTML externalizes embedded art into hash-addressed files to reduce startup load; missing image references were not observed in browser. The actual Android handoff source reports 116 unique recipes, validated country mappings/artwork, and successful APK assembly. Android screenshot/UI validation failed under Android system responsiveness issues; Android visual acceptance therefore remains HOLD. The Android handoff commit does not contain the approved V3.4 dual-Home component, so Android/Web visual parity remains HOLD and no Android branch changes are made here. Browser camera/photo/share fallbacks and state persistence outside Home selection remain unverified. Independent A08/A09, accessibility, security, nutrition/allergen and artwork-rights release gates remain HOLD. The preview site is separate from production `main/index.html` and GitHub Pages; it is a review build.

For an Android Chrome preview, open the separate HTTPS review URL posted in Issue #56. No merge, production cutover, or GitHub Pages deployment is included.
