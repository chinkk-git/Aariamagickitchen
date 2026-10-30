# Food Wonderland layered asset audit

Audit baseline: branch `feature/v3.5-web-parity`, starting HEAD `1d2e6dddf41e50de720e2e09f119ff7466670744`; approved isolated Site build v47.

## Approved scenery

The active renderer selects these existing scene files:

| Source file | Pixels | Alpha | Current use |
|---|---:|---|---|
| `web-v3.5/assets/food-wonderland-portrait-clean.webp` | 828×1900 | RGB, opaque | Portrait scene |
| `web-v3.5/assets/food-wonderland-landscape-standard-clean.webp` | 1536×1024 | RGB, opaque | Tablet / standard landscape |
| `web-v3.5/assets/food-wonderland-landscape-clean.webp` | 1860×845 | RGB, opaque | Wide landscape |

Visual inspection confirms the “clean” images still contain the attractions, characters, and wooden labels. They are flattened scene backgrounds, not object-free backgrounds. No source layer file or approved cutout set is present in the branch or existing Site package.

## Component inventory

Dimensions below describe a separately packaged existing overlay only when one is identified. Baked elements have no independent pixel dimensions or alpha channel.

| Component | Existing source and size | Transparency / animation | Rendering or navigation reference |
|---|---|---|---|
| Aaria | Baked into each approved scene above | Opaque scene pixels; no separate animation | `food-wonderland.js` scene `<picture>`; no independent asset |
| Kitten | Baked into each approved scene above | Opaque scene pixels; no separate animation | Same scene image; no independent asset |
| Recipes Around the World globe | Reuses the V3.4 approved home image `assets/embedded/f9cb26ab944e5a56cbcfa56c89d08f6836adc31088f9fba2c82ce905457157aa.png` (1024×1536 RGB) through `.v34-hero-globe`. A separate `food-wonderland-globe.webp` (216×216 RGB) exists but is not the active globe source. | Shared CSS globe float, rotation/orbit, and golden light effects; no alpha on either source image | `food-wonderland.js` `.fw-globe-frame.v34-hero-globe`; shared `.v34-globe-orbit`; route invokes `v34EnterGlobeFirst(true)` or `goto('world')` |
| Spin My Week wheel | `food-wonderland-wheel.webp`, 252×252 | RGBA with transparent pixels; spins on activation | `.fw-wheel`; `data-fw="week"` proxies to existing `open-week-wheel` action; existing wheel timing/sound retained |
| All Recipes cookbook | Baked into scene; no independent approved image | Opaque scene pixels; CSS page-flip overlay only | `.fw-book-page`; `data-fw="recipes"` → existing library route |
| Surprise Me treasure chest | Chest baked into scene. `food-wonderland-chest-lid.png` is 209×105 RGBA but fully opaque (alpha 255 throughout); not a clean cutout. | CSS lid/light opening overlays; existing chest sound and coin effects | `.fw-chest-lid`, `.fw-chest-light`; `data-fw="surprise"` → existing `open-wheel` action |
| My Creations camera | Camera body baked into scene. `food-wonderland-dish-photo.png` is 154×110 RGBA but fully opaque; not a clean cutout. | CSS flash and photo-pop overlays | `.fw-camera-flash`, `.fw-polaroid`; `data-fw="creations"` → existing creations navigation |
| Cook with Family cottage | Cottage baked into scene | CSS door/window glow overlays only | `.fw-door-family`; `data-fw="family"` → existing family navigation |
| Cook with Friends cottage | Cottage baked into scene | CSS door/window glow overlays only | `.fw-door-friends`; `data-fw="friends"` → existing friends navigation |
| Planner calendar | Calendar baked into scene | CSS calendar-flip overlay only | `.fw-calendar-flip`; `data-fw="planner"` → existing week/planner navigation |
| Wooden navigation labels | All labels are baked into each scene background; no separate source files | Opaque scene pixels | Existing localized `.fw-hotspot` buttons cover scene destinations and expose keyboard/accessibility labels; settings/favorites/tools keep their current actions |

The existing globe and wheel implementations are identifiable and reusable. The chest lid and dish-photo overlay files are not valid transparent object cutouts. No independent approved Aaria, kitten, cookbook, chest body, camera, cottages, planner, or wooden-label source exists in the inspected package.

## Review status and blocker

The previous kit is owner-rejected and is removed from the branch. Its renderer and build hook are reverted to the state at `1d1a526151dd9dba3cdd0ddd6179776c3cc89232`. The normal Food Wonderland Home remains the default; the Magical Adventure Home, Settings Home selector, Welcome flow, recipe data, and saved user data are not changed by this audit.

A corrected object-free pair of backgrounds and independent transparent components cannot be produced faithfully from these flattened images: removing objects requires reconstructing scenery hidden behind them. No generated or approximate art was substituted. An approved layered source (or owner-approved clean cutouts and backgrounds) is required before the requested layered renderer, component manifest, and review deployment can be completed.

## Isolated preview recovery

The prior “Unable to prepare the Site” occurred because the helper treated a non-empty scratch folder as a Site checkout, but that folder lacked `.openai/hosting.json`. Reopening the same existing Site from an empty checkout directory succeeded. The deployed Site remains at its existing v47 URL; no new candidate version was published.
