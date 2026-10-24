# International Recipe Content Factory — Authoritative Contract

Owner-approved scope (2026-10-23): **15 new recipes**, three each for Italy, China, Japan, Mexico and Vietnam; **reuse existing India recipes** without duplicating IDs. Existing 95 are provisionally acceptable. Governing issue: [#50](https://github.com/chinkk-git/Aariamagickitchen/issues/50). This is a **content-only branch**, not owned by W01 or W02.

## Principle
**Content first; app integration second.** The content worker produces complete, independently reviewable recipe bundles. W01/W02 only adapt the existing approved renderer and World Map to consume validated bundles. Do not ask W01/W02 to author recipe text, source nutrition, invent ingredients, select art or decide equipment.

## Required bundle structure
```
content/international/
  README.md
  manifest.json
  schema/recipe.schema.json
  countries/
    india/existing-recipe-mapping.json
    italy/096-tomato-basil-pasta/
      recipe.md
      recipe.json
      artwork/
        finished-dish.png
        ingredients/<ingredient-id>.png
        steps/step-01.png
    china/
    japan/
    mexico/
    vietnam/
  qa/
    completeness.csv
    artwork-provenance.csv
    safety-and-allergens.csv
    nutrition-sources.csv
    translations.csv
```
The numbered directory and IDs are **provisional** until checked against the live canonical catalogue. The existing repository schema and artwork conventions take precedence; document any migration.

## Mandatory per-recipe `recipe.md`
1. Identity: stable ID, country, original cultural context, category, EN-GB/PT-BR titles, servings, total/active time, age suitability, review state.
2. Ingredients: stable ingredient ID, exact metric quantity, unit, substitutions, serving-scaling policy, allergens and ingredient-art path; no pork/ham.
3. You'll Need: precise localized equipment checklist and child/adult role. The approved Magic Recipe Prep Board displays localized equipment names as text chips; equipment icons are neither required nor generated.
4. Steps: ordered step ID; EN-GB/PT-BR instruction; single visible action; exact ingredients and equipment used; step image path; adult-assist/heat/knife/cross-contamination cues; no timers.
5. Finished dish and artwork accessibility: exact hero path; concise localized descriptions grounded in the finished-dish source; localized alt-text for ingredient and step assets, with its source field and review state. Equipment artwork is not rendered: the approved Prep Board presents localized equipment names as pastel text chips.
6. Nutrition: values per serving, calculation method, primary source citations and unknown/pending fields (never fabricate).
7. Allergens: ingredient-specific and cross-contact notes, A08 review status.
8. QA: A09 age 8–10 usability, cultural review, translation review, rights, art consistency and evidence.

## Artwork production rules
Produce **one finished-dish illustration per recipe, ingredient illustrations as needed, and one accurate action illustration for EVERY step**. Equipment illustrations are not part of the approved Prep Board; retain actual equipment names and adult-assistance metadata as localized text. Save each image as an actual separate asset (not a collage). Use the approved phone/tablet Ingredients & Steps prototype as visual baseline; preserve approved original characters/identities and do not invent lookalikes. Step illustrations must show the specific cooking action, utensils and food state; no unrelated generic art. Include exact asset filenames, dimensions, SHA-256, generation/source details, licensing/rights and review state. Previously displayed food search images were **style references**, not production assets.

## Mandatory quality gates
Deterministic validation: manifest completeness; unique IDs and no collision with canonical 1–95; ingredient amounts and equipment referenced by steps; EN-GB/PT-BR parity; step numbering and image existence; asset provenance; correct country routing; no fake nutrition; all allergen and adult-assist fields. Record separate independent A08/A09, rights, nutrition and security gates. Never mark pending as passed.

## Execution batches
- INT-00: India existing ID inventory and mapping + approved prototype adaptation mapping.
- INT-01: Italy/China six fully authored, illustrated, validated bundles.
- INT-02: Japan/Mexico six bundles.
- INT-03: Vietnam three bundles.
- INT-04: app integration handoff: manifest + import adapter contract + screenshots and Android QA.

Each recipe must be COMPLETE before handed to W01/W02: `recipe.md`, machine-readable data, finished dish, ingredient/equipment/step images, mapping, source evidence and validation report. Missing or unreviewed items stay explicitly DRAFT. **Do not merge/release.**
