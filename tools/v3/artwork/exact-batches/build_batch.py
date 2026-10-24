#!/usr/bin/env python3
"""Build deterministic, draft-only evidence packages for W01's exact five-recipe batches.

Source atlas artwork is copied from the already recovered, hash-checked W01 draft
atlases. This script does not create or claim independent approvals.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
ART = REPO / "tools/v3/artwork"
OUT_ROOT = ART / "exact-batches"
EXPECTED_ARCHIVE_SHA256 = "30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab"
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)

BATCHES = {
    "B01": [11, 12, 13, 14, 15],
    "B02": [16, 17, 18, 19, 20],
    "B03": [21, 22, 23, 24, 25],
    "B04": [26, 28, 29, 30, 31],
    "B05": [32, 33, 34, 35, 36],
    "B06": [37, 38, 41, 42, 43],
    "B07": [44, 45, 46, 47, 48],
    "B08": [49, 50, 52, 53, 54],
    "B09": [55, 56, 57, 58, 59],
    "B10": [60, 61, 62, 64, 65],
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def tag(local: str) -> str:
    return f"{{{NS}}}{local}"


def load_catalog() -> tuple[dict[int, dict], dict[int, Path]]:
    records: dict[int, dict] = {}
    batch_dirs = sorted((ART / "batches").glob("batch-*"))
    for batch_dir in batch_dirs:
        manifest_path = batch_dir / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("sourceArchiveSha256") != EXPECTED_ARCHIVE_SHA256:
            raise SystemExit(f"Unexpected source archive digest in {manifest_path}")
        for recipe in manifest.get("recipes", []):
            recipe = dict(recipe)
            recipe["_atlasPath"] = batch_dir / recipe["outputPath"]
            records[int(recipe["id"])] = recipe
    source_paths = {}
    for batch_dir in batch_dirs:
        source_manifest = json.loads((batch_dir / "source-manifest.json").read_text(encoding="utf-8"))
        if source_manifest.get("sourceArchiveSha256") != EXPECTED_ARCHIVE_SHA256:
            raise SystemExit(f"Unexpected source archive digest in {batch_dir}/source-manifest.json")
        for recipe in source_manifest.get("recipes", []):
            source_paths[int(recipe["id"])] = batch_dir / "source" / recipe["sourceFile"]
    return records, source_paths


def render(svg: Path, png: Path, width: int, height: int) -> None:
    subprocess.run(
        ["inkscape", str(svg), f"--export-filename={png}", f"--export-width={width}", f"--export-height={height}"],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    if not png.is_file() or png.stat().st_size < 1000:
        raise SystemExit(f"Missing or unexpectedly small PNG render: {png}")


def panel_preview(atlas: Path, panel_number: int, destination: Path, recipe_id: int) -> None:
    source_root = ET.parse(atlas).getroot()
    defs = source_root.find(tag("defs"))
    panel = source_root.find(f".//{tag('g')}[@id='panel-{panel_number}']")
    if panel is None:
        raise SystemExit(f"Recipe {recipe_id} is missing panel {panel_number}")
    col = (panel_number - 1) % 3
    row = (panel_number - 1) // 3
    root = ET.Element(tag("svg"), {
        "width": "512", "height": "512",
        "viewBox": f"{col * 512} {row * 512} 512 512",
        "role": "img",
        "aria-labelledby": f"preview-r{recipe_id}-p{panel_number}-title preview-r{recipe_id}-p{panel_number}-desc",
    })
    title = ET.SubElement(root, tag("title"), {"id": f"preview-r{recipe_id}-p{panel_number}-title"})
    title.text = f"Recipe {recipe_id}, panel {panel_number} draft preview"
    desc = ET.SubElement(root, tag("desc"), {"id": f"preview-r{recipe_id}-p{panel_number}-desc"})
    desc.text = "A crop of an unapproved source atlas panel. Independent review and rights clearance are pending."
    if defs is not None:
        root.append(defs)
    root.append(panel)
    destination.write_bytes(ET.tostring(root, encoding="utf-8", xml_declaration=True))


def contact_sheet(batch: str, manifest_recipes: list[dict], dest: Path) -> None:
    width, cell_w, cell_h, header_h = 1440, 240, 300, 64
    height = header_h + 5 * cell_h
    root = ET.Element(tag("svg"), {"width": str(width), "height": str(height), "viewBox": f"0 0 {width} {height}"})
    ET.SubElement(root, tag("rect"), {"width": str(width), "height": str(height), "fill": "#f8f1fb"})
    heading = ET.SubElement(root, tag("text"), {"x": "24", "y": "42", "font-family": "Arial,sans-serif", "font-size": "28", "font-weight": "700", "fill": "#342344"})
    heading.text = f"{batch} • Draft panel previews • Independent review only"
    for recipe_index, recipe in enumerate(manifest_recipes):
        for panel in recipe["panels"]:
            linear = recipe_index * 6 + panel["panel"] - 1
            col, row = linear % 6, linear // 6
            x, y = col * cell_w, header_h + row * cell_h
            ET.SubElement(root, tag("rect"), {"x": str(x + 4), "y": str(y + 4), "width": str(cell_w - 8), "height": str(cell_h - 8), "rx": "12", "fill": "#fff", "stroke": "#dfcfe8", "stroke-width": "2"})
            image = ET.SubElement(root, tag("image"), {"x": str(x + 20), "y": str(y + 12), "width": "200", "height": "200", "preserveAspectRatio": "xMidYMid meet", "href": panel["previewPng"]})
            image.set("{http://www.w3.org/1999/xlink}href", panel["previewPng"])
            label = ET.SubElement(root, tag("text"), {"x": str(x + 120), "y": str(y + 238), "text-anchor": "middle", "font-family": "Arial,sans-serif", "font-size": "15", "font-weight": "700", "fill": "#342344"})
            label.text = f"Recipe {recipe['id']} • Panel {panel['panel']}"
            if panel["adultOnlyCue"]:
                cue = ET.SubElement(root, tag("text"), {"x": str(x + 120), "y": str(y + 262), "text-anchor": "middle", "font-family": "Arial,sans-serif", "font-size": "12", "font-weight": "700", "fill": "#8f3434"})
                cue.text = "ADULT ONLY • SÓ ADULTO"
    ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")
    dest.write_bytes(ET.tostring(root, encoding="utf-8", xml_declaration=True))


def build(batch: str, verify_only: bool = False) -> None:
    if batch not in BATCHES:
        raise SystemExit(f"Unknown batch {batch}; expected one of {', '.join(BATCHES)}")
    expected_ids = BATCHES[batch]
    records, source_paths = load_catalog()
    out = OUT_ROOT / batch
    if verify_only:
        manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
        if manifest["recipeIds"] != expected_ids or len(manifest["recipes"]) != 5:
            raise SystemExit(f"{batch} does not contain the exact requested five recipes")
        if sum(len(r["panels"]) for r in manifest["recipes"]) != 30:
            raise SystemExit(f"{batch} is not a six-panel x five-recipe batch")
        if batch == "B01":
            panels = [p for recipe in manifest["recipes"] for p in recipe["panels"]]
            if len({p.get("actionKey") for p in panels}) != 30:
                raise SystemExit("B01 action panels must all be distinct")
            if not all(p.get("instructionEn") and p.get("instructionPtBr") and p.get("actor") for p in panels):
                raise SystemExit("B01 panels require English, Português-BR, and original-character metadata")
            if manifest.get("artworkRights", {}).get("status") != "UNRESOLVED" or manifest.get("releaseStatus") != "HOLD":
                raise SystemExit("B01 must retain the unresolved-rights and release HOLD")
            for character in manifest.get("characters", {}).values():
                original = REPO / character["sourcePath"]
                packaged = out / character["packagePath"]
                expected_hash = character["sha256"]
                if not original.is_file() or sha(original.read_bytes()) != expected_hash:
                    raise SystemExit(f"Original character source changed or missing: {original}")
                if not packaged.is_file() or sha(packaged.read_bytes()) != expected_hash:
                    raise SystemExit(f"Packaged character hash mismatch: {packaged}")
            expected_adult_only = {(11, 2), (11, 6), (12, 1), (12, 3), (12, 4), (12, 5), (12, 6), (13, 3), (13, 4), (13, 5), (14, 5), (14, 6), (15, 1), (15, 3), (15, 5), (15, 6)}
            actual_adult_only = {(recipe["id"], panel["panel"]) for recipe in manifest["recipes"] for panel in recipe["panels"] if panel["adultOnlyCue"]}
            if actual_adult_only != expected_adult_only:
                raise SystemExit(f"B01 adult-only cue map mismatch: {sorted(actual_adult_only)}")
        for record in manifest["files"]:
            target = out / record["path"]
            if not target.is_file() or sha(target.read_bytes()) != record["sha256"]:
                raise SystemExit(f"Missing or changed artifact: {target}")
        for line in (out / "SHA256SUMS.txt").read_text(encoding="utf-8").splitlines():
            digest, relative = line.split("  ", 1)
            target = out / relative
            if not target.is_file() or sha(target.read_bytes()) != digest:
                raise SystemExit(f"SHA-256 list mismatch: {relative}")
        print(json.dumps({"batch": batch, "state": manifest["state"], "verifiedFileHashes": len(manifest["files"])}))
        return

    if batch == "B01":
        from b01_remediation import write_b01

        write_b01(REPO, out, records, source_paths, render)
        return

    shutil.rmtree(out, ignore_errors=True)
    for name in ("atlases", "sources", "previews/svg", "previews/png"):
        (out / name).mkdir(parents=True, exist_ok=True)

    recipes = []
    for recipe_id in expected_ids:
        if recipe_id not in records or recipe_id not in source_paths:
            raise SystemExit(f"Missing source or prior draft for recipe {recipe_id}")
        record = records[recipe_id]
        atlas_source = Path(record["_atlasPath"])
        source_svg = source_paths[recipe_id]
        source_bytes = source_svg.read_bytes()
        if sha(source_bytes) != record["sourceSha256"]:
            raise SystemExit(f"Source SVG hash mismatch for recipe {recipe_id}")
        atlas_bytes = atlas_source.read_bytes()
        if sha(atlas_bytes) != record["outputSha256"]:
            raise SystemExit(f"Draft atlas hash mismatch for recipe {recipe_id}")
        copied_source = out / "sources" / f"recipe-{recipe_id:02d}-source.svg"
        copied_atlas = out / "atlases" / f"recipe-{recipe_id:02d}-draft.svg"
        copied_source.write_bytes(source_bytes)
        copied_atlas.write_bytes(atlas_bytes)
        panels = []
        for p in record["panels"]:
            number = int(p["panel"])
            stem = f"recipe-{recipe_id:02d}-panel-{number:02d}"
            svg_path = out / "previews/svg" / f"{stem}.svg"
            png_path = out / "previews/png" / f"{stem}.png"
            panel_preview(copied_atlas, number, svg_path, recipe_id)
            render(svg_path, png_path, 480, 480)
            panels.append({
                "panel": number,
                "sourceStep": p["sourceStep"],
                "sourceStepText": p["sourceStepText"],
                "adultOnlyCue": bool(p["adultOnlyCue"]),
                "sourceSha256": p["originalSha256"],
                "previewSvg": str(svg_path.relative_to(out)),
                "previewPng": str(png_path.relative_to(out)),
                "previewPngSha256": sha(png_path.read_bytes()),
            })
        recipes.append({
            "id": recipe_id,
            "title": record["title"],
            "sourcePath": record["sourcePath"],
            "sourceSha256": record["sourceSha256"],
            "sourceCopy": str(copied_source.relative_to(out)),
            "sourceCopySha256": sha(source_bytes),
            "draftAtlas": str(copied_atlas.relative_to(out)),
            "draftAtlasSha256": sha(atlas_bytes),
            "dimensions": record["dimensions"],
            "panels": panels,
        })

    sheet_svg = out / "contact-sheet.svg"
    sheet_png = out / "contact-sheet.png"
    contact_sheet(batch, recipes, sheet_svg)
    render(sheet_svg, sheet_png, 1440, 1564)
    review_input = OUT_ROOT / "review-records" / f"{batch}.json"
    if review_input.is_file():
        review = json.loads(review_input.read_text(encoding="utf-8"))
        if review.get("batch") != batch:
            raise SystemExit(f"Review evidence does not match requested batch {batch}")
    else:
        review = {
            "batch": batch,
            "status": "PENDING_INDEPENDENT_REVIEW",
            "A08": {"status": "PENDING", "reviewer": None, "evidence": None},
            "A09": {"status": "PENDING", "reviewer": None, "evidence": None},
            "artworkRights": {"status": "UNRESOLVED", "evidence": None},
            "note": "No review approval or rights clearance is inferred from automated checks.",
        }
    review_states = {review.get("A08", {}).get("status"), review.get("A09", {}).get("status")}
    if "CHANGES_REQUESTED" in review_states:
        verified_state = "BLOCKED_REVIEW_FINDINGS"
    elif review_states == {"APPROVED"} and review.get("artworkRights", {}).get("status") == "CLEARED":
        verified_state = "DONE"
    else:
        verified_state = "PENDING_INDEPENDENT_REVIEW_AND_RIGHTS"
    (out / "review-evidence.json").write_text(json.dumps(review, indent=2) + "\n", encoding="utf-8")
    if review_input.is_file():
        for review_name in ("A08-review.md", "A09-review.md"):
            source_report = review_input.parent / f"{batch}-{review_name}"
            if source_report.is_file():
                shutil.copyfile(source_report, out / review_name)
    manifest = {
        "schema": "w01-exact-artwork-batch-v1",
        "batch": batch,
        "recipeIds": expected_ids,
        "panelsPerAtlas": 6,
        "panelCount": 30,
        "sourceArchiveSha256": EXPECTED_ARCHIVE_SHA256,
        "state": {"DRAFTED": "DONE", "STAGED": "DONE", "INTEGRATED": "DEBUG_REVIEW_ONLY", "VERIFIED": verified_state},
        "productionRuntime": "NOT_INTEGRATED",
        "originalCharacters": "UNCHANGED",
        "originalRecipeCatalog": {"count": 95, "changed": False},
        "languageCoverage": ["en-GB", "pt-BR"],
        "contactSheet": {"svg": "contact-sheet.svg", "png": "contact-sheet.png"},
        "approvalEvidence": "review-evidence.json",
        "recipes": recipes,
    }
    file_records = []
    for path in sorted(p for p in out.rglob("*") if p.is_file() and p.name != "SHA256SUMS.txt"):
        file_records.append({"path": str(path.relative_to(out)), "sha256": sha(path.read_bytes()), "bytes": path.stat().st_size})
    (out / "SHA256SUMS.txt").write_text("".join(f"{item['sha256']}  {item['path']}\n" for item in file_records), encoding="utf-8")
    manifest["files"] = file_records
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    # The sums file covers the final manifest and every deliverable except itself.
    sums = []
    for path in sorted(p for p in out.rglob("*") if p.is_file() and p.name != "SHA256SUMS.txt"):
        sums.append(f"{sha(path.read_bytes())}  {path.relative_to(out)}\n")
    (out / "SHA256SUMS.txt").write_text("".join(sums), encoding="utf-8")
    print(json.dumps({"batch": batch, "recipeIds": expected_ids, "atlases": len(recipes), "panels": sum(len(r['panels']) for r in recipes), "panelPngs": sum(len(r['panels']) for r in recipes), "state": manifest['state'], "review": review}, indent=2))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: build_batch.py B01 [--verify-only]")
    build(sys.argv[1], "--verify-only" in sys.argv[2:])
