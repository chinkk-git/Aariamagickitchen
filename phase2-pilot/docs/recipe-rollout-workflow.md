# Recipe rollout workflow

This workflow scales the APK pilot to the 95-recipe catalog without editing the legacy production HTML.

## One source of truth

Keep recipe title, ingredients, method, concise step instructions, safety notes, nutrition status and artwork IDs together in `domains/cooking/recipes/catalog.json`. Store image paths, checksums and review state in `packages/assets/manifest.json`. The APK and its offline bundle are built from these files.

## Repeat for each recipe batch

1. Import the recipe record and preserve its ingredients, quantities, allergens, method and adult-help requirements.
2. Keep step instructions short (22 words maximum) while leaving non-obvious safety directions in the step safety field.
3. Assign one artwork group: `aaria`, `family` or `friends`. The full catalog must finish at 65, 15 and 15 recipes respectively.
4. Create a hero scene and one action-matched scene for every cooking step. Use varied, recipe-specific actions; do not reuse one generic scene across unrelated steps.
5. Add every asset to the manifest with dimensions, SHA-256 and review status; reference it from the recipe record.
6. Run `npm run validate:rollout -- --mode full`, `npm run plan:artwork`, `npm test`, `npm run validate:recipes`, `npm run validate:artwork`, and `npm run build:preview`.
7. Review the batch in portrait and landscape, then build the APK from the same commit. Keep nutrition, allergy, food-safety and child-experience approvals as release gates.
8. Add three optional recipe-linked quiz questions and check that the recipe's completion screen offers dish-photo capture, a finished post preview, local save and adult-confirmed sharing.

## Recipe quiz requirements

- Each recipe has three short multiple-choice questions about its actual ingredients, cooking steps or a related food fact. Store question text, answer choices, correct answer and a one-sentence explanation with the recipe content.
- Keep questions optional, untimed and easy to skip or retry. Give supportive feedback; do not use streaks, penalties or leaderboards.
- Review every question against the recipe record. Do not let quiz copy override ingredient, allergy, food-safety or adult-help guidance.

## Finished-dish photo post requirements

- On recipe completion, let Aaria take or choose a photo of the finished dish and preview a decorative recipe card with the dish photo, recipe name, “I made it!” message and app artwork.
- Compose the card on-device. Keep the photo private unless a parent confirms sharing; never upload it to the app or add location, account or contact details to the card.
- Save the card locally in My Creations. Sharing opens Android's system share chooser for compatible apps such as Instagram, Facebook and WhatsApp. The app does not sign in to those services or publish automatically.
- Include a clear preview, cancel/back action and parent confirmation immediately before sharing. Verify the camera/file picker and share chooser in the APK on Android; browser-only preview is insufficient.

## Combined grocery list requirements

- Let the parent or child select multiple recipes from the catalog or weekly plan, then build one combined list grouped by ingredient.
- Add quantities only when ingredient identity and units are compatible (for example, grams with grams or millilitres with millilitres). Convert only explicit, validated unit pairs; keep count, slices, spoon measures and weight separate when no safe conversion exists.
- Keep optional ingredients marked optional and preserve recipe-specific notes such as package-label checks. Let the user review the totals, then open WhatsApp with the complete list as a prefilled message. Aaria chooses Mommy or Daddy in WhatsApp and confirms sending there. Do not hard-code or upload phone numbers, and do not send automatically.

## Weekly meal planner requirements

- Make the planner adult-controlled and editable. It may suggest a varied weekly set of meals at random, but it must respect declared allergies and avoid repeating the same recipe unnecessarily.
- The planner cannot claim to meet Aaria's full nutritional needs until each eligible recipe has complete, verified nutrition data and the weekly selection logic has been independently reviewed by a qualified nutrition professional for the intended age and meal pattern.
- Until those release gates pass, show the planner as a collection of fun meal ideas, not a complete or prescribed diet. The two pilot recipes have unverified nutrition and cannot power a nutrition-based weekly plan.

## Product features tracked alongside recipes

The feature matrix at `tools/recipe-pipeline/feature-matrix.json` separates working pilot features from planned additions. The pilot already includes browse/search, ingredient matching, recipe customization, illustrated guided cooking, adult safety checks, private local creations, Kitchen Crew, accessibility controls, offline use and app branding. Planned additions include optional recipe quizzes, finished-dish photo cards with adult-confirmed sharing, combined grocery lists and a nutrition-gated weekly planner, plus an optional kitchen mystery, richer food customization, an optional video-style step view and optional light music/celebrations. Cooking remains the main activity; automatic timers stay out of scope.

## Batch sizing

Work in batches of 10 recipes. The artwork plan CSV lists the hero and step slots that need assets. A batch is complete only when its recipe copy, character assignment, artwork links and validators all pass. The full release check remains locked until the catalog has exactly 95 recipes and the 65/15/15 artwork count is met.

## Commands

```sh
npm run validate:rollout -- --mode pilot
npm run plan:artwork
npm run validate:rollout -- --mode full
```

`pilot` mode verifies the two-recipe APK sample. `full` mode enforces the complete 95-recipe and character-allocation targets.
