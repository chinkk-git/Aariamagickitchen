# V3.2 Shared Recipe Template Standard

Status: owner-approved design baseline, implementation reference only. The exact approved comparison image is `references/v3.2-three-recipe-templates.png`; its bytes are preserved from the approved Library image.

## One shared recipe template

All recipes use the same component and interaction sequence:

1. Catalogue card with the finished dish, title, category, and recipe facts.
2. Recipe details with the finished dish, ingredients and quantities, safety cues, nutrition/allergen information when verified, and quiz entry.
3. One cooking step per screen with concise age 8–10 instructions, numbered progress, Previous/Next, and a verified matching step photo or accurate reusable icon.
4. Completion with the finished dish, optional camera-only photo capture, share flow, and rewards.

The theme changes decoration only. It never changes recipe content, business logic, safety, navigation, saved plans, favourites, or feature availability. Existing Home and World Map presentation remains unchanged.

## Stable themes

| Theme key | Palette and cues | Reference recipe |
| --- | --- | --- |
| `playful-purple` | Lavender, pink, violet, rounded cards and stars | Mini Pancakes |
| `fresh-green` | Mint, leaf green, cream and natural accents | Veggie Noodles |
| `sunny-orange` | Peach, coral, orange and yellow with cheerful accents | Mini Pizza Bread Cups |

A deterministic recipe-ID map assigns one theme to each original recipe ID 1–95. It is stable across devices, app restarts, and languages; QA may override a theme without changing the recipe identity. The map is versioned at `../data/v3.2-recipe-theme-map.json`.

## Art, safety and language

- Preserve the realistic finished-dish photos and the approved original Aaria, Mommy, Daddy, and Friends assets.
- Do not use character illustrations inside individual cooking steps. Never substitute unrelated food imagery for an action.
- Keep English and Brazilian Portuguese content, large touch targets, readable contrast, short instructions, safe adult-assist cues, and the existing persistent navigation.
- Nutrition and allergen values remain source-backed; missing or invalid references fail validation rather than being invented.
- Cooking timers remain out of scope.

## Acceptance

- Exactly 95 unique IDs map to a theme, with no recipe ID, data, or feature drift.
- One renderer serves every recipe; the three palettes use the same component hierarchy and actions.
- Phone and tablet portrait/landscape snapshots cover all themes, with no clipping and readable contrast.
- A08 child-protection and A09 child-experience reviews remain independent release gates. Artwork rights and approval status must be recorded per asset; drafts stay out of release builds.
