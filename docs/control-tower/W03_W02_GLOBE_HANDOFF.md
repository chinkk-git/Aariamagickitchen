# W03 → W02 Magical Globe immutable source handoff

- W03 branch: `feature/international-recipe-content`
- W02 branch: `feature/v3.3-world-map-explorer`
- W03 module: `docs/prototypes/world-adventure-globe/world-adventure-globe.js` and `world-adventure-globe.css`
- API: `AariaWorldAdventureGlobe.mount(root, hostContext, restoredState)`; controller provides `serialize`, `restore`, `setOrientation`, `handleBack`, `dispose`.
- Host integration: W02 supplies `createWorldAdventureHost(...)`; W03 consumes `countries/getCountry/openRecipe/openPassport/locale` and optional `avatarSrc`.
- ID mapping: W02 ISO codes `IND/ITA/CHN/JPN/MEX/VNM` map to module destination IDs. Only W02-provided available canonical records (`canonical: true`) get a route-enabled card, and clicks always use W02's guarded `openRecipe(id)`. Review-only countries can display as previews but remain unroutable and are not Surprise Me targets.
- Android screen, lifecycle/history, Back, bottom nav, Passport persistence, offline/locales, canonical recipe runtime, Android build, real phone/tablet screenshots and orientation smoke remain W02-owned. They are not evidenced by a standalone module preview.
- W03 content handoff for 15 packages is audited separately in `content/international/manifest.json`; this globe module does not import draft package records or create recipes.
- Separate A08/A09, nutrition/allergen, translation/cultural, rights, security and owner visual review gates remain pending unless independently evidenced.

This contract narrows the prior proposed parameter/controller naming mismatch while preserving W02's ownership. W02 can mount the module without copying or rewriting W03's globe visuals; W02 owns its integration commit and Android acceptance evidence.
