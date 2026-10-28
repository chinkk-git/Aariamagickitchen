# V3.5 Web validation record

## Source and package checks

- Android source HEAD: `6addb187f4563a4d00d69a9cf89bd4adf4f41de8`.
- Web build completed and generated the structured package and standalone HTML.
- `validate-v35-international-review.mjs` passed: 21 international records #096–116 retain bilingual data and artwork integrity; six Vietnam entries remain review drafts.
- `validate-v35-country-navigation.mjs` passed: 13-country registry and 116 unique recipe IDs matched; mapped recipe routes, artwork paths/hashes, and empty-country handling checked.
- Build-source assertions force `homeStyle()` to Magical Adventure, omit the Settings Home-style panel, and ignore legacy Classic selection without clearing storage. Classic source/assets remain in the preserved V3.4 component.
- The Web adapter uses the approved V3.4 Welcome scene and only one Welcome presentation.
- Protected production `main/index.html` and GitHub Pages were not changed.

## Pending verification

- The isolated HTTPS preview still needs the new source version and focused live checks for Welcome, single Home, Settings, New Recipes, World, country thumbnails, representative recipes and All Recipes.
- No local Chrome/Playwright browser is available in this workspace; no live visual acceptance is claimed.
- Android CI-LITE run #228 has completed all content, packaging, unit-test and APK assembly steps; its install/launch/WebView/route smoke is in progress.
- Independent A08/A09, accessibility, security, nutrition/allergen, artwork-rights and user-data upgrade gates remain NOT VERIFIED until evidence and independent review.
