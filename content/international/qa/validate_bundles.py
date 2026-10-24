#!/usr/bin/env python3
"""Deterministic structural and cross-field checks for W03 recipe bundles.

This validates source files only. It does not substitute for independent A08/A09,
rights, translation, nutrition/allergen, cultural, or security review.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--canonical-index", type=Path, help="optional current canonical index.html to verify India mapping")
parser.add_argument("--canonical-commit", help="commit SHA for --canonical-index")
args = parser.parse_args()
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
country_counts = {}
for entry in entries:
    country = entry.get("country")
    country_counts[country] = country_counts.get(country, 0) + 1
if country_counts != {"italy": 3, "china": 3, "japan": 3, "mexico": 3, "vietnam": 3}:
    fail("manifest", f"expected three recipes each for Italy, China, Japan, Mexico and Vietnam: {country_counts}")
country_codes = {"italy": "IT", "china": "CN", "japan": "JP", "mexico": "MX", "vietnam": "VN"}

for entry in entries:
    rid = entry.get("proposed_id")
    where = f"#{rid}"
    json_path = ROOT / entry.get("recipe_json", "")
    md_path = ROOT / entry.get("recipe_md", "")
    if not json_path.is_file() or not md_path.is_file():
        fail(where, "recipe JSON or Markdown file is missing")
        continue
    markdown = md_path.read_text()
    markdown_folded = markdown.casefold()
    if "en-gb" not in markdown_folded or "pt-br" not in markdown_folded:
        fail(where, "Markdown recipe does not identify both EN-GB and PT-BR content")
    try:
        recipe = json.loads(json_path.read_text())
    except Exception as exc:
        fail(where, f"invalid JSON: {exc}")
        continue
    raw_texts = []
    def collect_text(value):
        if isinstance(value, str):
            raw_texts.append(value)
        elif isinstance(value, dict):
            for child in value.values():
                collect_text(child)
        elif isinstance(value, list):
            for child in value:
                collect_text(child)
    collect_text(recipe)
    collect_text(markdown)
    unsafe_patterns = (r"javascript\s*:", r"<\s*script\b", r"<\s*iframe\b", r"\bon[a-z]+\s*=")
    for pattern in unsafe_patterns:
        if any(re.search(pattern, text, flags=re.IGNORECASE) for text in raw_texts):
            fail(where, f"content security scan matched {pattern}")
    if recipe.get("id") != rid:
        fail(where, f"JSON ID {recipe.get('id')} does not match manifest")
    if recipe.get("country", "").lower() != entry.get("country", "").lower():
        fail(where, "country does not match manifest")
    expected_code = country_codes.get(str(entry.get("country", "")).lower())
    if expected_code and recipe.get("country_code") != expected_code:
        fail(where, f"country code should be {expected_code}, found {recipe.get('country_code')!r}")
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
    if used_allergens != declared_allergens:
        fail(where, f"ingredient allergen set differs from recipe declaration: undeclared={sorted(used_allergens-declared_allergens)}, unsupported={sorted(declared_allergens-used_allergens)}")
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

    renderer = recipe.get("renderer", {})
    if renderer.get("steps"):
        canonical_en = [step.get("instruction", {}).get("en-GB") for step in steps]
        if renderer.get("steps") != canonical_en:
            fail(where, "legacy renderer EN-GB steps differ from canonical instructions")
        renderer_pt = renderer.get("pt-BR", {}).get("steps")
        canonical_pt = [step.get("instruction", {}).get("pt-BR") for step in steps]
        if renderer_pt != canonical_pt:
            fail(where, "legacy renderer PT-BR steps differ from canonical instructions")

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

    finished = recipe.get("finished_dish", {})
    image = finished.get("image", {}) if isinstance(finished, dict) else {}
    if image.get("path"):
        if finished.get("artworkPath") != image.get("path"):
            fail(where, "finished-dish artworkPath does not match the actual image reference")
        if finished.get("provenance") != image.get("provenance"):
            fail(where, "finished-dish provenance does not match the actual image metadata")

    for asset in recipe.get("artwork_assets", []):
        asset_path = asset.get("path", "")
        if "/artwork/equipment/" in asset_path:
            if asset.get("accessibility_role") != "NOT_RENDERED_APPROVED_TEXT_CHIP":
                fail(where, f"equipment artwork must remain unused by the approved text-chip board: {asset_path}")
            continue
        bilingual(asset.get("alt_text"), f"{where} artwork alt text {asset_path}")
        if not asset.get("alt_text_source") or not asset.get("alt_text_status"):
            fail(where, f"artwork alt text lacks source/status metadata: {asset_path}")
    bilingual(finished.get("description"), f"{where} finished-dish accessibility description")

if args.canonical_index:
    mapping_path = ROOT / "india/existing-recipe-mapping.json"
    mapping = json.loads(mapping_path.read_text())
    canonical_text = args.canonical_index.read_text()
    match = re.search(r"RECIPES=(\[.*?\]);", canonical_text, flags=re.DOTALL)
    if not match:
        fail("India mapping", "could not find canonical RECIPES array")
    else:
        try:
            canonical = json.loads(match.group(1))
            canonical_ids = [item.get("id") for item in canonical]
            if canonical_ids != list(range(1, 96)):
                fail("India mapping", "canonical catalog is not contiguous IDs 1–95")
            india = {item.get("id"): item.get("title") for item in canonical if item.get("category", "").lower() == "indian"}
            mapping_rows = mapping.get("recipes", [])
            listed = {item.get("id"): item.get("title") for item in mapping_rows}
            if len(mapping_rows) != 15 or len(listed) != len(mapping_rows):
                fail("India mapping", "mapping must contain 15 unique canonical recipes")
            if india != listed:
                fail("India mapping", "IDs/titles differ from canonical India records")
            if args.canonical_commit and mapping.get("source_commit") != args.canonical_commit:
                fail("India mapping", "mapping source_commit differs from the supplied canonical commit")
        except Exception as exc:
            fail("India mapping", f"could not validate canonical data: {exc}")

print(f"Recipes checked: {len(entries)} (IDs 096–110)")
print("Checks: identity/country, Markdown locale markers, bilingual fields, ingredient quantities/units, allergen coverage, equipment names, adult-assistance, step references/safety, unsafe-content patterns, artwork metadata/accessibility descriptions, renderer locale parity, nutrition fields and review gate status" + ("; current canonical India mapping" if args.canonical_index else ""))
print(f"Errors: {len(errors)}")
for item in errors:
    print(f"ERROR {item}")
print(f"Warnings: {len(warnings)}")
for item in warnings:
    print(f"WARNING {item}")
if errors:
    sys.exit(1)
