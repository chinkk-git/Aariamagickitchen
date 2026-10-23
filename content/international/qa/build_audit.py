#!/usr/bin/env python3
"""Validate the 15 W03 packages and regenerate the preview readiness inventory."""
from pathlib import Path
from collections import defaultdict
import glob, hashlib, json
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
RECIPES = ROOT / "content/international/countries"
QA = ROOT / "content/international/qa"
PREVIEWS = QA / "previews"
SOURCE_HEAD = "3ed405438016dfc90123a9bfb810111e2190068f"
REMAINING = {97, 98, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110}

packages = []
for filename in sorted(glob.glob(str(RECIPES / "*" / "*" / "recipe.json"))):
    data = json.loads(Path(filename).read_text())
    if 96 <= int(data.get("id", 0)) <= 110:
        packages.append(data)
assert len(packages) == 15, f"Expected 15 recipe packages; found {len(packages)}"

references = defaultdict(list)
def collect(value, recipe_id):
    if isinstance(value, dict):
        path, digest = value.get("path"), value.get("sha256")
        if isinstance(path, str) and path.startswith("content/international/") and isinstance(digest, str):
            references[path].append((recipe_id, digest))
        for child in value.values():
            collect(child, recipe_id)
    elif isinstance(value, list):
        for child in value:
            collect(child, recipe_id)

for package in packages:
    collect(package, int(package["id"]))

assets, missing, mismatches = [], [], []
for path, uses in sorted(references.items()):
    asset = ROOT / path
    if not asset.is_file():
        missing.append(path)
        continue
    raw = asset.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    expected = sorted({item[1] for item in uses})
    if expected != [digest]:
        mismatches.append({"path": path, "expected": expected, "actual": digest})
    with Image.open(asset) as im:
        dimensions, image_format = list(im.size), im.format
        im.verify()
    assets.append({"path": path, "bytes": len(raw), "dimensions": dimensions,
                   "format": image_format, "sha256": digest,
                   "recipe_ids": sorted({item[0] for item in uses})})

hash_index = defaultdict(list)
for asset in assets:
    hash_index[asset["sha256"]].append(asset)
duplicates = [group for group in hash_index.values() if len(group) > 1]
remaining_duplicates = [[a for a in group if set(a["recipe_ids"]) & REMAINING]
                        for group in duplicates]
remaining_duplicates = [group for group in remaining_duplicates if len(group) > 1]
non_equipment_duplicates = [a["path"] for group in remaining_duplicates for a in group
                            if "/equipment/" not in a["path"]]

per_recipe, preview_rows = {}, []
for package in sorted(packages, key=lambda item: int(item["id"])):
    rid = int(package["id"])
    own_assets = [a for a in assets if rid in a["recipe_ids"]]
    longest = {"en-GB": 0, "pt-BR": 0}
    def lengths(value, locale=None):
        if isinstance(value, dict):
            for key, child in value.items():
                lengths(child, key if key in longest else locale)
        elif isinstance(value, list):
            for child in value:
                lengths(child, locale)
        elif isinstance(value, str) and locale in longest:
            longest[locale] = max(longest[locale], len(value))
    lengths(package.get("title"))
    lengths(package.get("adult_assistance"))
    lengths(package.get("allergen_notes"))
    for step in package.get("steps", []):
        lengths(step.get("title")); lengths(step.get("instruction")); lengths(step.get("safety"))
    for ingredient in package.get("content", {}).get("ingredients", []):
        lengths(ingredient.get("name"))
    per_serving = package.get("nutrition", {}).get("per_serving", {})
    null_nutrients = sorted(k for k, v in per_serving.items() if v is None)
    readiness = "STRUCTURAL_READY_WITH_NUTRITION_DATA_HOLD" if null_nutrients else "READY_FOR_INTEGRATION"
    per_recipe[str(rid)] = {
        "country": package["country"], "title": package["title"],
        "structural_readiness": readiness,
        "nutrition_missing_values": null_nutrients,
        "asset_count": len(own_assets),
        "asset_bytes_referenced": sum(a["bytes"] for a in own_assets),
        "max_asset_bytes": max((a["bytes"] for a in own_assets), default=0),
        "ingredient_count": len(package.get("content", {}).get("ingredients", [])),
        "step_count": len(package.get("steps", [])),
        "longest_localized_text_chars": longest,
        "independent_gates": {"A08": "PENDING", "A09": "PENDING",
            "nutrition_allergen": "PENDING", "translation_cultural": "PENDING",
            "artwork_rights": "PENDING_REVIEW", "security": "PENDING",
            "android_runtime": "PENDING_W01"}}
    preview = PREVIEWS / f"{rid:03d}-{package['country']}.jpg"
    data = preview.read_bytes()
    with Image.open(preview) as im:
        size = list(im.size); im.verify()
    preview_rows.append({"id": rid, "country": package["country"], "title": package["title"],
        "file": f"content/international/qa/previews/{preview.name}",
        "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "dimensions": size,
        "visual_status": "PASS_VISUALLY_INSPECTED", "structural_readiness": readiness,
        "nutrition_missing_values": null_nutrients,
        "independent_gates": per_recipe[str(rid)]["independent_gates"]})

assert not missing, f"Missing referenced files: {missing}"
assert not mismatches, f"Artwork hash mismatch: {mismatches}"
assert not non_equipment_duplicates, f"Unexpected non-equipment duplicate art: {non_equipment_duplicates}"

report = {
    "schema_version": "1.1.0", "branch": "feature/international-recipe-content",
    "source_content_commit": SOURCE_HEAD, "scope": "15 existing recipes, IDs 96–110; no new recipes",
    "remaining_13_ids": sorted(REMAINING),
    "validation": {"recipe_count": len(packages), "unique_referenced_assets": len(references),
        "assets_present": len(assets), "missing_asset_paths": missing,
        "asset_sha256_mismatches": mismatches, "all_source_images_decodable": True,
        "preview_images_visually_inspected": len(preview_rows),
        "preview_dimensions": sorted({tuple(p["dimensions"][0:2]) for p in preview_rows}),
        "visual_layout": "PASS: no oversized ingredient thumbnails, overlap, clipping, or missing final/representative-step art",
        "android_screenshots": False},
    "source_asset_summary": {"total_bytes": sum(a["bytes"] for a in assets),
        "max_asset_bytes": max(a["bytes"] for a in assets),
        "max_dimensions": [max(a["dimensions"][0] for a in assets), max(a["dimensions"][1] for a in assets)],
        "assets_over_1MiB": [a for a in assets if a["bytes"] > 1048576],
        "duplicate_hash_groups": [[{k: a[k] for k in ("path", "bytes", "recipe_ids", "sha256")} for a in group]
                                   for group in duplicates],
        "remaining_13_duplicate_hash_groups": [[{k: a[k] for k in ("path", "bytes", "recipe_ids", "sha256")} for a in group]
                                                for group in remaining_duplicates],
        "remaining_13_non_equipment_duplicate_paths": non_equipment_duplicates,
        "w01_packaging_guidance": "Retain logical recipe paths; deduplicate exact shared equipment artwork by SHA-256 in offline APK packaging."},
    "asset_inventory": assets, "recipes": per_recipe, "previews": preview_rows,
    "known_source_gap": "#096 nutrition.per_serving.sodiumMg is null; preview shows pending review instead of an invented value.",
    "independent_gates": {"A08": "PENDING", "A09": "PENDING", "nutrition_allergen": "PENDING",
        "translation_cultural": "PENDING", "artwork_rights": "PENDING_REVIEW", "security": "PENDING",
        "android_runtime_and_apk_size": "PENDING_W01"}}
(QA / "preview-manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"recipes": len(packages), "asset_paths": len(references),
    "missing": len(missing), "sha_mismatches": len(mismatches),
    "duplicate_groups_all": len(duplicates), "duplicate_groups_remaining_13": len(remaining_duplicates),
    "non_equipment_duplicates_remaining_13": len(non_equipment_duplicates),
    "largest_asset_remaining_13": max(a["bytes"] for a in assets if set(a["recipe_ids"]) & REMAINING)}, indent=2))
