# Existing renderer schema mapping — verified against canonical source

- Source commit: `4e8e629c80c68d64c28b7dbc8f07d0f40fc40344`
- `index.html` blob SHA: `ece8232e8b76e24ac0e46a0e02df4b86577c6c28`
- Parsed `RECIPES`: 95 records, IDs 1–95, unique and contiguous. New IDs 96 and 99 do not collide.
- Existing English record fields: `id`, `title`, `emoji`, `category`, `method`, `time`, `yieldText`, `ingredients`, `steps`, `extras`, `fact`, `safety`.
- Existing Portuguese catalogue: `PT_RECIPES`, keyed by ID, with localized title, steps and ingredients.
- Bundle JSON uses the existing English envelope and a `pt-BR` object, then nests normalized bilingual content and QA evidence under `content`. W01/W02 still need to verify their import adapters against this shape before integration.
- No recipe in IDs 1–95 is modified.
