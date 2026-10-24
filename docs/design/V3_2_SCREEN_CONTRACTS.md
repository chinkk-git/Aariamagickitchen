# V3.2 Screen Contracts
Status: draft implementation contract; cross-reference V3_2_VISUAL_IDENTITY_STANDARD.md. Layout dimensions are proposed pending reference calibration.

| Screen | Required visual structure | Required preserved behaviour |
|---|---|---|
| Home | EXACT existing owner-approved hierarchy, Aaria identity, tiles and featured recipe | Existing navigation and destinations; no redesign |
| World Food Adventure | EXACT approved map/passport/region visual and real destination markers | Interactive map, country selection, recipe deep links, back navigation |
| Recipe catalogue | Photo-first card, title, badges, favourite; theme accent | Categories, filters, Airfryer, favourites, family/friends entries |
| Recipe detail | 16:9 dish hero, metadata, ingredients, adult-help safety, CTA | Servings, recipe data, translations, safety and allergens |
| Cooking step | Progress, single step, accurate photo/icon fallback, safety tip, Previous/Next | Preserve ordering, family/friends roles, back state, one step per screen |
| Nutrition/allergens | Per-serving labelled table, distinct warnings | Never fabricate missing values; preserve sources and alerts |
| Quiz | Question, accessible answers, feedback | Existing quiz scoring/progress |
| Completion | Dish photo, rewards, camera-only sharing | My Creations, achievements, share flow |
| Planner / Surprise | Preserve existing layouts unless separately approved | Same algorithm, plans, favourites, deep links |
| Shopping | Preserve existing flow | Consolidated quantities, WhatsApp, EN/PT-BR |
| Settings / What's New | Preserve existing structure | Accessibility, sound, language, child-friendly tour, secure updates |

## Responsive acceptance
Fixed screenshots for 3 themes x phone portrait/landscape x tablet portrait/landscape. Capture reference and actual device sizes/density/font scale. Visual diffs are diagnostics, not automatic owner approval. Test back gestures, orientation persistence, navigation insets, minimum 48dp touch targets and large text.

## Pilot
At least three recipe IDs covering (a) fully illustrated standard recipe, (b) missing hero image / verified fallback, and (c) family/friends roles. Test each in all three themes through QA override; never change production assignment to exercise variants.
