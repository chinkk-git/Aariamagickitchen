# V3.2 Recipe Template Standards and Responsive Layout

**Governing issue:** #40 · **Status:** PROPOSED / OWNER APPROVAL PENDING. The prior #12 pilot was rejected. Neither a passing build nor delivery constitutes design approval.

## Reference priority

| Priority | Reference | Controls | SHA-256 | Status |
|---|---|---|---|---|
| 1 | [`1000072735-owner-recipe-page.png`](references/1000072735-owner-recipe-page.png) | Full recipe-page hierarchy, section order, character, dish image, ingredients, equipment, health and photo/share areas, surrounding navigation | `e452103dc8c12a88633190dcc30f3d230bdb120cc3e8bc453d41fc02adc51bcc` | Owner source bytes verified; proposed |
| 2 | [`1000072737-owner-step-panel.png`](references/1000072737-owner-step-panel.png) | Replaces only the cooking-step section in reference 1 | `630861cf27c2bcb0a06e57958b86c2f71a5118d844d38c0efda6508ecfde4f07` | Owner source bytes verified; proposed |
| Historical | [`v3.2-three-recipe-templates.png`](references/v3.2-three-recipe-templates.png) | Historical visual record only | `d2f6a18845657e85ec94db76ea35d269ea14a82a4f697ead5eaf6098fb8fbf7e` | Not authoritative for this rework |

The full-page image controls every section except the cooking-step panel. The newer step image overrides that section alone. Preserve both exact image files and checksums; do not crop, recolour or replace them. Example copy in reference images is visual guidance, never canonical recipe content. The existing six-destination bottom navigation remains unchanged.

## Shared page hierarchy

Use the existing app shell and shared six-button navigation. Render one scrollable recipe page in this order:

1. Brand/avatar strip and six kitchen shortcut buttons.
2. Special-recipe/favourite eyebrow and recipe title, canonical description when present, method, time, yield and existing grocery/favourite actions.
3. Existing finished-dish artwork, cropped without distortion, followed by the original Aaria avatar/fact panel.
4. Ingredient heading and serving context, responsive ingredient cards with original small ingredient illustrations and persistent checkboxes, plus optional-ingredient note.
5. Equipment heading and reusable illustrated tool cards.
6. The replacement active-step panel, with one canonical step visible at a time.
7. Expandable Kitchen Safety disclosure.
8. Existing allergen check and sourced nutrition panels, preserving uncertainty and source disclosures.
9. Existing cooking-photo, local preview and parent-mediated sharing controls.
10. Persistent shared bottom navigation: Home, Recipes, World Adventure, Magic Pantry, Planner, My Creations.

Do not omit existing features to simplify the design. Do not invent descriptions, serving quantities, nutrition, allergens, safety guidance, recipe imagery, translations or characters. Missing source content remains visibly absent or review-blocked.

## Cooking-step panel

The second image controls this component: a large cream outer panel with rounded corners; `STEP n OF total` at upper left and `n / total` at upper right; a segmented progress bar; a softly tinted rounded card; a circular method illustration; a `STEP n` label and prominent step title; large canonical instruction; orange step-specific safety/adult-help notice; and Previous / count / Next-or-Finish controls. Place the expandable Kitchen Safety disclosure immediately below and expanded on initial entry, as shown in the owner image.

All displayed content and state derive from canonical English/Portuguese recipe records and shared progress logic. Keep one active step. Do not copy the sample instruction, step count, cooking method or warning text into other records. Do not add timers or replace canonical steps. The orange panel is always visible, but its heading and wording must accurately describe the current hazard: child-safe mixing is not labelled an adult-only task; hot hob, oven, pan, knife or other restricted work identifies the adult's role. Keep the persistent Kitchen Safety section available in both locales.

## Responsive layout rules

- **Phone portrait (320–559 CSS px):** one column in the hierarchy above. Keep the brand, quick links, title and metadata compact; ingredient cards become one column on narrow phones and two columns where labels remain readable. Preserve a full-width dish image, readable step instruction, wrapped warning copy, and all controls above/clear of the bottom navigation. The page scrolls vertically; do not shrink long instructions to force the entire page into the viewport.
- **Phone landscape:** retain the same section order and one active step. Use available width for the title and step header, allow the instruction and safety notice to wrap, and keep Previous/Next targets visible without horizontal clipping. Do not convert the whole recipe page into a horizontal carousel.
- **Tablet portrait (560–759 CSS px):** retain a readable single main column with a maximum content width. Use a two-column ingredient grid and three-column equipment grid when labels fit; keep health panels stacked if side-by-side would reduce text width.
- **Tablet landscape (760 CSS px and wider):** centre the page in a bounded content width. Use available width inside the active step card for icon/title and instruction/safety groupings while keeping the panel hierarchy clear. Recipe sections may use balanced columns only when reading order and screenshot hierarchy remain intact.
- **At every size/orientation:** respect safe-area insets; wrap long EN-GB/PT-BR copy; preserve image aspect ratio; prevent nested horizontal overflow; keep focus visible, keyboard/Android Back behavior, practical touch targets and fixed-nav clearance. Orientation changes preserve selected recipe, current step, checklist, favourites and progress.

## Visual tokens and assets

Sample the supplied images for the proposal; use existing app tokens for the implementation. The proposal uses a warm off-white/cream canvas, pale lavender and pink surfaces, purple headings/progress, dark plum text and a warm orange safety panel. Maintain contrast and readable text; do not infer exact pixel values from a rescaled screenshot. Keep the original Aaria/avatar sources and the current recipe's existing finished-dish and ingredient art. Method illustrations are small reusable icons; do not substitute character portraits or unrelated food art into a cooking step.

## Data, behaviour and preservation

- Preserve all 95 canonical IDs and every record except explicitly authorized #12 visual presentation changes; keep canonical #12 step text and order unchanged.
- English and Brazilian Portuguese use their own canonical content. Missing translation stays an explicit review state.
- Preserve checklist, favourite, grocery, photo/share, quiz, nutrition/allergen, completion, profile, navigation, orientation and local persistence behaviour.
- Keep current-batch Featured Recipes limited to #12 for this review APK; all other recipes remain available in the normal catalogue.
- Preserve V3.1 Classic, installed apps and user data. Never clear app data or uninstall to validate.
- Keep production signing/update compatibility separate: do not claim an in-place owner-phone upgrade until package identity, signer, higher version code and seeded-data retention are proven.

## QA acceptance criteria and approval state

The proposed #12 visual template is eligible for owner review only after evidence shows:

1. Exact-head Android CI identifies the tested commit and passes required tests; any failure is diagnosed before another build.
2. Actual phone and tablet screenshots cover portrait and landscape, with detail, each of four canonical steps and completion, and are visually inspected against both references.
3. Full-page section order and step-only image priority match this document; no clipping, overflow, obscured controls or missing sections.
4. All four #12 steps show unchanged canonical EN-GB/PT-BR text, accurate per-step safety, correct segmented progress, Previous/Next/Finish state and expandable Kitchen Safety.
5. Featured Recipes contains only #12; direct entry from Home and Recipes, exact six-button navigation and existing ingredient/favourite/grocery/completion functions pass.
6. APK artifact URL, package ID, version, signer fingerprint and actual APK SHA-256 are recorded. Co-installation and owner-phone in-place upgrade are reported as separate gates.
7. V3.1 Classic, all 95 recipe identities and saved data remain intact. Independent A08, A09, artwork-rights and security decisions are not self-approved.
8. The proposed layout remains **PROPOSED / OWNER APPROVAL PENDING** until the owner tests the exact APK and explicitly approves it. Only then may the shared template freeze and B01 begin. No merge, production overwrite or release is authorized.
