# V3 Character Bible and Artwork Contract
Status: approved **concept direction**; production reference assets and exact pixel consistency require verification.

## Fixed cast
| ID | Role | Approved concept | Notes |
|---|---|---|---|
| CHEF_A | Main chef | G1 girl chef | Selected by child, fixed design |
| CHEF_B | Main chef | B1 boy chef | Selected by child, fixed design |
| MOM_M1 | Mommy | M1 | Warm, supportive, encouraging |
| DAD_D1 | Daddy | D1 | Friendly, engaged, playful |
| FRIEND_F1 | Friend 1 | F1 | Creative, cheerful |
| FRIEND_F2 | Friend 2 | F2 | Playful, adventurous |
| FRIEND_F3 | Friend 3 | F3 | Kind, fun |
| FRIEND_F4 | Friend 4 | F4 | Curious, energetic |

All are recurring fictional characters, culturally inclusive and non-stereotyped. Fixed appearance; no gender data collected. Both main chefs wear coordinated star-themed purple hats and teal/purple aprons. Maintain consistency in hair, face, proportions, outfit and palette; no arbitrary changes between recipe panels.

## Asset registry contract
`scene_id`, `recipe_id`, `step_id`, `role_ids`, `chef_variant` (`CHEF_A`/`CHEF_B`/`NONE`), `asset_path`, `aspect_ratio`, `sha256`, `content_version`, `review_status`, `alt_text`, `safety_tag`.

## Generation and QA
1. Establish production master sheets (front/side/three-quarter, expressions, full-body, action poses) from approved G1/B1/M1/D1/F1–F4 concepts.
2. For each recipe step, specify actual ingredient, action, tool, adult supervision and characters before creating artwork.
3. Produce two main-chef variants for scenes containing the child; character-free ingredients/dishes can be shared.
4. Review visual match to reference, character continuity, action fidelity, safe cooking behavior, landscape readability, and final dish match.
5. Never use an incorrect variant or substitute a generic emoji as an approved ingredient illustration.
6. Maintain a versioned approval/evidence manifest; fail QA on missing required variants.
7. The concept sheets generated in conversation are not necessarily in the repository. Locate or request their files if inaccessible; never invent exact asset paths.

## Example pilot scenes
- Fruit yogurt parfait: two chef variants, wash, adult-supervised cutting, yogurt layering, fruit/granola, final dish.
- Banana roll-ups: chosen chef + MOM_M1.
- Veggie nachos: chosen chef + DAD_D1; adult manages hot appliance.
- Fruit smoothie: chosen chef + selected FRIEND_F1–F4; adult handles/supervises blender.
