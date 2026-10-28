# Aaria V3.5 Web Edition

The Web target uses the Android V3.5 source at `6addb187f4563a4d00d69a9cf89bd4adf4f41de8` plus the approved V3.4 Welcome and Magical Adventure UI source at `7ab11cc917b144a643fb30b6cc1dfed132ab45fb`. The builder checks the unmodified Android transformer output against its recorded SHA-256 before applying the Web adapter.

## Build

From the repository root, run:

```sh
node web-v3.5/scripts/build.mjs
```

Outputs are `dist/web-v3.5/`, `dist/web-v3.5/aaria-v3.5-standalone.html`, and `Aaria_V3_5_Web_Edition.zip`. The structured target serves artwork from sibling paths. The standalone file inlines recipe artwork. `SHA256SUMS.json` covers the structured package.

## Home experience

Magical Adventure is the only active Home. The approved animated Welcome appears first, and its glowing arrow opens the adventure. Classic Home source and artwork remain preserved but inaccessible. Legacy Classic Home preferences are ignored without deleting them. Settings remains available without a Home selector. The World and Home country cards use the canonical registry and recipe IDs; All Recipes contains all 116 records. Recipe details retain the avatar-classic template.

## Acceptance state

Source build and country/catalog validators pass. Android CI-LITE run #228 is checking install, launch, WebView readiness and critical routes; screenshots are not an acceptance gate. The focused browser checks and update of the isolated HTTPS preview remain pending. No production GitHub Pages files were changed.

A08, A09, accessibility, security, nutrition/allergens, artwork rights, and upgrade/data preservation remain NOT VERIFIED pending evidence and independent review. No production merge or release is included.
