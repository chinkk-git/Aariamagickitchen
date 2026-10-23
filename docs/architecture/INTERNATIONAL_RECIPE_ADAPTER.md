# W03 International Recipe Adapter — W01 preparation

Status: adapter prepared for review-only integration. No international recipes or artwork are imported into the 95-recipe catalog by this change.

## Source and current readiness

The W03 content branch is `feature/international-recipe-content`. At commit `6186c7d7999f72438c526d938f8363bf83ef9c17`, its manifest contains 15 proposed candidates, but each recipe is marked `DRAFT_CONTENT_NOT_YET_AUTHORED`; `recipe.json` paths are null and production artwork is unapproved. That commit is a schema-development reference only, not an integration package.

The adapter follows the package requirements in Issue #50 and maps fields into the existing recipe detail, Ingredients and Guided Steps renderer shape. It is build-time code and is not connected to `catalog.json`, the Android route table, or user storage.

## Bundle contract consumed by the adapter

- The manifest has a non-draft `schema_version`, `status: READY_FOR_INTEGRATION`, `source_commit`, exactly the ready pair, and `package_files` entries binding every package file by path and SHA-256.
- The immutable handoff supplies the exact source commit, manifest path and byte SHA-256, and a pair SHA-256 computed from sorted `path<TAB>sha256` entries in `package_files`.
- Each recipe manifest entry binds its stable ID, `recipe.json`, `recipe.md`, their byte hashes, `READY_FOR_INTEGRATION`, and `artwork_ready: true`.
- Recipe fields include EN-GB/PT-BR title, description, ingredient/equipment names, adult help, cross-contact text and step title/instruction/safety/adult-assist; exact quantities, units, serving count, age range, cultural context and estimated hands-on time; explicit ingredient/equipment references for every step; allergens; nutrition values or `null` with a non-verified status; and a distinct image reference for the finished dish, each ingredient, each equipment item and every step.
- Every image reference includes a repository-relative path under `content/international/`, SHA-256 and provenance/license/rights review state. The importer verifies the actual offline bytes against the reference and manifest hashes.
- Equipment role is explicit (`child`, `adult` or `shared`) for the Ingredients template’s “You’ll Need” section. Step image, concise action, safety cue, progress order and referenced equipment/ingredients are preserved for Guided Steps.

## Gates and renderer mapping

`prepareInternationalRecipeImport()` validates the immutable handoff and maps package fields to the renderer’s current `title`, `ingredients`, `equipment`, `steps`, `finishedDish`, `artworkIds`, and localization fields. It rejects draft/incomplete bundles, collisions with existing recipe IDs, invalid language pairs, missing files, hash mismatches, unsafe asset paths, step-reference errors, and incomplete nutrition status. It has no filesystem or catalog writes.

`authorizeInternationalRecipeImport()` additionally requires an explicit owner `APPROVED` decision bound to the exact W03 commit, the first step-artwork SHA-256 and the phone/tablet template screenshot SHA-256. Until then, no import records are produced. Even after that one-time artwork gate, output remains `REVIEW_ONLY`; A08/A09, nutrition/allergen review, rights, security, Android acceptance and release are separate gates.

The approved design reference is the owner-approved Ingredients and Guided Steps phone/tablet prototype recorded in Issue #44. The image binary is still pending repository upload; the adapter does not claim pixel-level parity or treat this reference as production artwork.

## Safety boundaries

- W01 does not author W03 recipe content, nutrition, translation or artwork.
- W01 does not write W03 or W02 branches.
- The adapter does not alter the 95 canonical recipes, V3.1 Classic, application behavior or user data.
- Wave 1 recipes are integrated only from a complete validated immutable pair and after owner approval of the first step-artwork screenshot.
- No merge or release is authorized.
