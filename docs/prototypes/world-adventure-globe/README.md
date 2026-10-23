# Magical Spinning Globe — W03 module and W02 host handoff

Status: **host-contract adapted; Android integration and device evidence remain owned by W02**.

## Owner-approved behavior

The owner-approved design and landscape addendum in Issue #50 govern the globe, flags, Surprise Me, same-page recipe panel, Aaria avatar, orientation and accessibility. The existing approved avatar asset is reused; no new Aaria likeness is generated.

## W02 host API

Load `world-adventure-globe.css` and `world-adventure-globe.js` inside the existing app shell. W03 exports:

```js
const controller = AariaWorldAdventureGlobe.mount(root, hostContext, restoredState);
const savedState = controller.serialize();
controller.restore(savedState);
controller.setOrientation("portrait" | "landscape");
controller.handleBack(); // true when a country/pending selection was closed
controller.dispose();
```

The third argument restores state during initial mount. `hostContext` is the W02 `createWorldAdventureHost(...)` result:

- `contractVersion`, `locale`, `countries`, `getCountry(code)`
- `openRecipe(id)`, `back(scope)`, `openPassport()`, `getPassportSnapshot()`
- Optional `avatarSrc` pointing to the approved existing Aaria asset.

W03 maps W02 country codes `IND/ITA/CHN/JPN/MEX/VNM` to globe destinations. Available, canonical recipes receive an enabled card only when W02 supplies `canonical: true`; every tap still routes through `hostContext.openRecipe(id)`, which remains the fail-closed authority. Review-only countries remain visible/selectable as previews but cannot open recipe routes and are excluded from Surprise Me destinations. Surprise Me spins to an available destination, then waits for the child to tap its flag. Country selection and recipe cards stay in the same page.

`serialize/restore` preserve rotation, selected country and pending Surprise Me state across Android recreation and orientation changes. `setOrientation` triggers a layout refresh; CSS handles the portrait/landscape geometry. `handleBack()` closes local globe state first and returns false when W02 should leave the route. W02 retains app history, Android Back dispatch, bottom navigation, locale/offline wiring, canonical recipe lookup, Passport persistence and lifecycle/disposal ownership.

The previous two-argument preview API remains supported by the local `index.html` demo. This compatibility path is not Android evidence.

## Integration evidence and gates

This W03 handoff proves the module export contract and source boundary only. W03 does not claim W02 Android mounting, phone/tablet screenshots, orientation recreation smoke, offline/navigation acceptance, or APK evidence. W02 must capture and report those against its exact integration commit in Issue #39. A08, A09, artwork rights, independent nutrition/allergen and translation/cultural reviews, security and owner visual review remain separate gates. No merge or release is authorized.

## Land projection update (W03 module version 0.3.0)

The previous ten hand-authored coarse land silhouettes have been replaced by a locally embedded orthographic projection of Natural Earth 1:110m Land polygons (dataset version 4.0.0). The source is public domain under the [Natural Earth terms of use](https://www.naturalearthdata.com/about/terms-of-use/) and is credited as “Made with Natural Earth.” The archived source zip is `data/ne_110m_land.zip` (SHA-256 `1926c621afd6ac67c3f36639bb1236134a48d82226dc675d3e3df53d02d2a3de`).

The build script simplifies paths by at most 0.3 degrees, wraps the date line, projects land orthographically on the same 1000×1000 sphere as the flags, and clips the far hemisphere. Country latitude/longitude values and flag semantics are unchanged; the same projection radius is used for land and flags. The map is embedded in `world-adventure-globe.js`, so it is available offline without a new runtime request. No external character art was introduced.

The host API remains `mount(root, hostContext, restoredState)` with the same controller methods. W02 should consume the updated module JS and CSS from the exact W03 module commit separately from its host-owned viewport/flag-containment fix.
