#!/usr/bin/env python3
"""Deterministic structural and cross-field checks for W03 recipe bundles.

This validates source files only. It does not substitute for independent A08/A09,
rights, translation, nutrition/allergen, cultural, or security review.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ("en-GB", "pt-BR")
errors: list[str] = []
warnings: list[str] = []

def fail(where: str, message: str) -> None:
    errors.append(f"{where}: {message}")

def bilingual(value, where: str) -> None:
    if not isinstance(value, dict):
        fail(where, "expected localized object")
        return
    for locale in LOCALES:
        if not isinstance(value.get(locale), str) or not value[locale].strip():
            fail(where, f"missing {locale} text")

manifest = json.loads((ROOT / "manifest.json").read_text())
entries = manifest.get("recipes", [])
if len(entries) != 15:
    fail("manifest", f"expected 15 recipes, found {len(entries)}")
ids = [entry.get("proposed_id") for entry in entries]
if sorted(ids) != list(range(96, 111)):
    fail("manifest", f"IDs are not exactly 96–110: {ids}")
if len(set(ids)) != len(ids):
    fail("manifest", "duplicate recipe IDs")

for entry in entries:
    rid = entry.get("proposed_id")
    where = f"#{rid}"
    json_path = ROOT / entry.get("recipe_json", "")
    md_path = ROOT / entry.get("recipe_md", "")
    if not json_path.is_file() or not md_path.is_file():
        fail(where, "recipe JSON or Markdown file is missing")
        continue
    try:
        recipe = json.loads(json_path.read_text())
    except Exception as exc:
        fail(where, f"invalid JSON: {exc}")
        continue
    if recipe.get("id") != rid:
        fail(where, f"JSON ID {recipe.get('id')} does not match manifest")
    if recipe.get("country", "").lower() != entry.get("country", "").lower():
        fail(where, "country does not match manifest")
    bilingual(recipe.get("title"), f"{where} title")
    for key in ("description", "cultural_context"):
        bilingual(recipe.get(key), f"{where} {key}")
    ingredients = recipe.get("ingredientItems", [])
    ingredient_ids = [item.get("id") for item in ingredients]
    if not ingredients or len(set(ingredient_ids)) != len(ingredient_ids):
        fail(where, "ingredient list is empty or has duplicate/missing IDs")
    declared_allergens = set(recipe.get("allergens", []))
    used_allergens = set()
    for item in ingredients:
        iw = f"{where} ingredient {item.get('id')}"
        bilingual(item.get("name"), iw)
        qty = item.get("quantity")
        if not isinstance(qty, (int, float)) or isinstance(qty, bool) or qty <= 0:
            fail(iw, f"quantity is not a positive number: {qty!r}")
        if not isinstance(item.get("unit"), str) or not item["unit"].strip():
            fail(iw, "unit is missing")
        used_allergens.update(item.get("allergens", []))
    if not used_allergens.issubset(declared_allergens):
        fail(where, f"ingredient allergens missing from recipe declaration: {sorted(used_allergens-declared_allergens)}")
    for locale in LOCALES:
        cross_contact = recipe.get("allergen_notes", {}).get("cross_contact", recipe.get("allergen_notes", {}).get("crossContact", {}))
        if not isinstance(cross_contact, dict) or not cross_contact.get(locale):
            fail(where, f"missing allergen/cross-contact note in {locale}")

    equipment = recipe.get("equipment", [])
    equipment_items = recipe.get("equipmentItems", [])
    if not equipment or not equipment_items:
        fail(where, "equipment names/items missing")
    for item in equipment_items:
        bilingual(item.get("name"), f"{where} equipment {item.get('id')}")
    if not recipe.get("adult_assistance"):
        fail(where, "recipe-level adult-assistance metadata missing")
    else:
        bilingual(recipe["adult_assistance"], f"{where} adult assistance")

    steps = recipe.get("steps", [])
    if len(steps) < 1:
        fail(where, "no cooking steps")
    ingredient_set = set(ingredient_ids)
    equipment_ids = {item.get("id") for item in equipment_items}
    for index, step in enumerate(steps, 1):
        sw = f"{where} {step.get('id', f'step-{index:02d}')}"
        if step.get("id") != f"step-{index:02d}":
            fail(sw, "step IDs are not sequential")
        bilingual(step.get("title"), f"{sw} title")
        bilingual(step.get("instruction"), f"{sw} instruction")
        bilingual(step.get("adultAssist"), f"{sw} adult-assistance")
        safety = step.get("safety")
        if isinstance(safety, dict):
            bilingual(safety, f"{sw} safety")
        elif not isinstance(safety, str) or not safety.strip():
            fail(sw, "safety cue missing")
        missing_ingredients = set(step.get("ingredientIds", [])) - ingredient_set
        if missing_ingredients:
            fail(sw, f"unknown ingredient references: {sorted(missing_ingredients)}")
        missing_equipment = set(step.get("equipmentIds", [])) - equipment_ids
        if missing_equipment:
            fail(sw, f"unknown equipment references: {sorted(missing_equipment)}")

    nutrition = recipe.get("nutrition", {})
    values = nutrition.get("per_serving", {})
    required = ("energyKcal", "proteinG", "carbohydrateG", "fatG", "fibreG", "saturatedFatG", "sodiumMg")
    for key in required:
        value = values.get(key)
        if key == "sodiumMg" and rid == 96 and value is None:
            warnings.append("#096 sodiumMg remains null: salt retention in discarded pasta water is unknown; nutrition hold retained")
        elif not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
            fail(where, f"nutrition {key} is missing or invalid: {value!r}")
    if not nutrition.get("sources") or not nutrition.get("method") or not nutrition.get("status"):
        fail(where, "nutrition sources/method/status are incomplete")
    if nutrition.get("status") != "ESTIMATE_REVIEW_PENDING":
        warnings.append(f"{where} nutrition status differs from pending estimate: {nutrition.get('status')}")

    reviews = recipe.get("reviews", {})
    aliases = {
        "A08": ("A08", "A08ChildProtection"),
        "A09": ("A09", "A09ChildExperience"),
        "nutrition_allergen": ("nutrition_allergen", "nutrition"),
        "translation_cultural": ("translation_cultural", "translation", "cultural"),
        "artwork_rights": ("artwork_rights", "artworkRights"),
        "security": ("security",),
    }
    for gate, names in aliases.items():
        if not any(reviews.get(name) for name in names):
            fail(where, f"review gate {gate} lacks explicit status")

print(f"Recipes checked: {len(entries)} (IDs 096–110)")
print("Checks: identity/country, bilingual fields, ingredient quantities/units, allergen coverage, equipment names, adult-assistance, step references/safety, nutrition fields and review gate status")
print(f"Errors: {len(errors)}")
for item in errors:
    print(f"ERROR {item}")
print(f"Warnings: {len(warnings)}")
for item in warnings:
    print(f"WARNING {item}")
if errors:
    sys.exit(1)
