#!/usr/bin/env python3
"""Inventory the existing finished-dish images embedded in production index.html."""

from __future__ import annotations

import argparse
import ast
import base64
import csv
import hashlib
import io
import json
import re
from pathlib import Path

from PIL import Image, ImageOps
from reportlab.lib import colors
from reportlab.lib.pagesizes import TABLOID, landscape
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from pypdf import PdfReader


HEADER = ["recipe_id", "recipe_name", "image_source", "image_type", "quality_status", "sha256"]
PAGE_RANGES = [(1, 32), (33, 64), (65, 95)]
PAGE_SIZE = landscape(TABLOID)
FONT_PATHS = [
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
]


def parse_json_constant(source: str, name: str):
    prefix = f"const {name}="
    line = next((line for line in source.splitlines() if line.startswith(prefix)), None)
    if line is None:
        raise ValueError(f"Production index.html is missing {name}")
    return json.loads(line[len(prefix) :].rstrip(";"))


def parse_js_literal(source: str, name: str):
    prefix = f"const {name}="
    line = next((line for line in source.splitlines() if line.startswith(prefix)), None)
    if line is None:
        raise ValueError(f"Production index.html is missing {name}")
    return ast.literal_eval(line[len(prefix) :].rstrip(";"))


def parse_recipes(source: str):
    match = re.search(r"const RECIPES=(\[.*?\]);", source, re.S)
    if not match:
        raise ValueError("Could not parse the production RECIPES array")
    return json.loads(match.group(1))


def data_uri_bytes(value: str) -> bytes:
    if not value.startswith("data:image/") or "," not in value:
        raise ValueError("Expected an embedded image data URI")
    header, payload = value.split(",", 1)
    if ";base64" not in header:
        raise ValueError("Expected a base64 image data URI")
    return base64.b64decode(payload, validate=True)


def data_uri_mime(value: str) -> str:
    return value.split(";", 1)[0].removeprefix("data:")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_inventory(source_path: Path):
    source = source_path.read_text(encoding="utf-8")
    recipes = parse_recipes(source)
    if len(recipes) != 95 or [int(r["id"]) for r in recipes] != list(range(1, 96)):
        raise ValueError("Production source must contain recipe IDs 1 through 95 exactly once")

    inline_photos = parse_json_constant(source, "INLINE_DISH_PHOTOS")
    home_photos = parse_json_constant(source, "HOME_RECIPE_THUMBS")
    new_art = parse_json_constant(source, "NEW_RECIPE_ART")
    step_atlases = parse_json_constant(source, "BATCH_ATLASES")
    missing_panels = parse_js_literal(source, "HOME_MISSING_RECIPE_INDEX")
    missing_sprite_line = next(
        line for line in source.splitlines() if line.startswith("const HOME_MISSING_DISH_SPRITE=")
    )
    missing_sprite_uri = missing_sprite_line.split("='", 1)[1].rstrip("';")
    missing_sprite_bytes = data_uri_bytes(missing_sprite_uri)
    rows = []
    images = {}

    for recipe in recipes:
        recipe_id = int(recipe["id"])
        key = str(recipe_id)
        if key in inline_photos:
            uri = inline_photos[key]
            source_ref = f"index.html:INLINE_DISH_PHOTOS[{recipe_id}]"
            image_type = f"Photographic {data_uri_mime(uri)} finished-dish image"
            image_bytes = data_uri_bytes(uri)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            status = "REALISTIC"
        elif key in home_photos:
            uri = home_photos[key]
            source_ref = f"index.html:HOME_RECIPE_THUMBS[{recipe_id}]"
            image_type = f"Photographic {data_uri_mime(uri)} finished-dish image"
            image_bytes = data_uri_bytes(uri)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            status = "REALISTIC"
        elif key in new_art and new_art[key].get("dish"):
            uri = new_art[key]["dish"]
            source_ref = f"index.html:NEW_RECIPE_ART[{recipe_id}].dish"
            image_type = f"Photo-style rendered {data_uri_mime(uri)} finished-dish image"
            image_bytes = data_uri_bytes(uri)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            status = "REALISTIC"
        else:
            image = None
            status = "MISSING"
            if key in step_atlases:
                atlas_bytes = data_uri_bytes(step_atlases[key])
                source_ref = (
                    f"index.html:BATCH_ATLASES[{recipe_id}] - step/storyboard atlas only; "
                    "not used as a finished-dish substitute"
                )
                image_type = "Composite step atlas; no finished-dish image"
                image_hash = sha256(atlas_bytes)
            elif recipe_id in missing_panels:
                panel = int(missing_panels[recipe_id])
                source_ref = (
                    f"index.html:HOME_MISSING_DISH_SPRITE panel {panel} - placeholder only; "
                    "finished-dish source is missing"
                )
                image_type = "Missing finished-dish image; placeholder sprite only"
                image_hash = sha256(missing_sprite_bytes)
            else:
                source_ref = "No finished-dish image reference in production index.html"
                image_type = "No finished-dish image"
                image_hash = ""
            rows.append(
                {
                    "recipe_id": recipe_id,
                    "recipe_name": recipe["title"],
                    "image_source": source_ref,
                    "image_type": image_type,
                    "quality_status": status,
                    "sha256": image_hash,
                }
            )
            images[recipe_id] = None
            continue

        rows.append(
            {
                "recipe_id": recipe_id,
                "recipe_name": recipe["title"],
                "image_source": source_ref,
                "image_type": image_type,
                "quality_status": status,
                "sha256": sha256(image_bytes),
            }
        )
        images[recipe_id] = image

    if len(rows) != 95 or len({row["recipe_id"] for row in rows}) != 95:
        raise ValueError("Inventory must contain exactly 95 unique recipe IDs")
    if [row["recipe_id"] for row in rows if row["quality_status"] == "MISSING"] != [
        1, 4, 5, 6, 7, 8, 9, 10, 16, 26, 33, 51, 57
    ]:
        raise ValueError("Unexpected missing-art map; inspect production image references before publishing")
    return rows, images


def register_fonts():
    font_path = next((path for path in FONT_PATHS if path.exists()), None)
    if font_path is None:
        raise FileNotFoundError("A Unicode TrueType font is required to preserve exact recipe names")
    pdfmetrics.registerFont(TTFont("Catalogue", str(font_path)))
    return "Catalogue"


def draw_missing_placeholder(pdf: canvas.Canvas, x: float, y: float, w: float, h: float):
    pdf.setFillColor(colors.HexColor("#F7F1F8"))
    pdf.setStrokeColor(colors.HexColor("#D8CADD"))
    pdf.setDash(3, 2)
    pdf.roundRect(x, y, w, h, 5, fill=1, stroke=1)
    pdf.setDash()
    pdf.setFillColor(colors.HexColor("#6D5B78"))
    pdf.setFont("Catalogue", 7)
    pdf.drawCentredString(x + w / 2, y + h / 2 + 3, "No finished-dish image")
    pdf.setFont("Catalogue", 5.8)
    pdf.drawCentredString(x + w / 2, y + h / 2 - 8, "Step art is listed in the CSV only")


def generate_pdf(rows, images, pdf_path: Path, source_head: str):
    font = register_fonts()
    page_w, page_h = PAGE_SIZE
    margin_x, margin_y = 22, 20
    header_h, footer_h, gap_x, gap_y = 50, 24, 7, 7
    cols, rows_per_page = 8, 4
    card_w = (page_w - 2 * margin_x - (cols - 1) * gap_x) / cols
    card_h = (page_h - margin_y - header_h - footer_h - (rows_per_page - 1) * gap_y) / rows_per_page
    pdf = canvas.Canvas(str(pdf_path), pagesize=PAGE_SIZE, pageCompression=1)
    pdf.setTitle("Aaria's Magical Kitchen - 95 recipe artwork catalogue")
    pdf.setAuthor("W01 - production index.html artwork inventory")
    pdf.setSubject("Existing finished-dish image inventory; no generated or replacement images")

    realistic_count = sum(row["quality_status"] == "REALISTIC" for row in rows)
    missing_count = sum(row["quality_status"] == "MISSING" for row in rows)

    for page_index, (first_id, last_id) in enumerate(PAGE_RANGES):
        subset = rows[first_id - 1 : last_id]
        top_y = page_h - margin_y
        pdf.setFillColor(colors.HexColor("#37234F"))
        pdf.setFont(font, 16)
        pdf.drawString(margin_x, top_y - 17, "Aaria's Magical Kitchen | Recipe Artwork Catalogue")
        pdf.setFillColor(colors.HexColor("#6D5A7B"))
        pdf.setFont(font, 8)
        pdf.drawString(
            margin_x,
            top_y - 34,
            f"Recipes {first_id}-{last_id} | {len(subset)} records | {realistic_count} realistic images | {missing_count} missing",
        )
        pdf.drawRightString(
            page_w - margin_x,
            top_y - 34,
            "Production source: index.html | Not a rights or release approval",
        )

        grid_top = page_h - margin_y - header_h
        for index, row in enumerate(subset):
            col = index % cols
            row_num = index // cols
            x = margin_x + col * (card_w + gap_x)
            y = grid_top - (row_num + 1) * card_h - row_num * gap_y
            pdf.setFillColor(colors.white)
            pdf.setStrokeColor(colors.HexColor("#E4DCE9"))
            pdf.roundRect(x, y, card_w, card_h, 7, fill=1, stroke=1)

            pdf.setFillColor(colors.HexColor("#EFE3F6"))
            pdf.roundRect(x + 7, y + card_h - 20, 27, 13, 5, fill=1, stroke=0)
            pdf.setFillColor(colors.HexColor("#4D3265"))
            pdf.setFont(font, 7)
            pdf.drawCentredString(x + 20.5, y + card_h - 16, f"#{row['recipe_id']}")

            status_fill = "#E2F1DA" if row["quality_status"] == "REALISTIC" else "#F6E6E8"
            status_text = "#3E7043" if row["quality_status"] == "REALISTIC" else "#8B4350"
            pill_w = 58 if row["quality_status"] == "REALISTIC" else 48
            pdf.setFillColor(colors.HexColor(status_fill))
            pdf.roundRect(x + card_w - pill_w - 7, y + card_h - 20, pill_w, 13, 5, fill=1, stroke=0)
            pdf.setFillColor(colors.HexColor(status_text))
            pdf.setFont(font, 6.4)
            pdf.drawCentredString(x + card_w - pill_w / 2 - 7, y + card_h - 16, row["quality_status"])

            title_size = 7.1
            title_width = card_w - 14
            title_lines = simpleSplit(row["recipe_name"], font, title_size, title_width)
            while len(title_lines) > 2 and title_size > 5.8:
                title_size -= 0.25
                title_lines = simpleSplit(row["recipe_name"], font, title_size, title_width)
            title_baseline = y + card_h - 34
            pdf.setFillColor(colors.HexColor("#322348"))
            pdf.setFont(font, title_size)
            for line_no, line in enumerate(title_lines[:3]):
                pdf.drawString(x + 7, title_baseline - line_no * (title_size + 1.2), line)

            image_x, image_y = x + 8, y + 33
            image_w, image_h = card_w - 16, card_h - 96
            image = images[row["recipe_id"]]
            if image is None:
                draw_missing_placeholder(pdf, image_x, image_y, image_w, image_h)
            else:
                fitted = ImageOps.contain(image, (int(image_w * 3), int(image_h * 3)), Image.Resampling.LANCZOS)
                png_stream = io.BytesIO()
                fitted.save(png_stream, format="PNG", optimize=True)
                png_stream.seek(0)
                pdf.setFillColor(colors.HexColor("#FAF7FB"))
                pdf.roundRect(image_x, image_y, image_w, image_h, 4, fill=1, stroke=0)
                pdf.drawImage(
                    ImageReader(png_stream),
                    image_x + (image_w - fitted.width / 3) / 2,
                    image_y + (image_h - fitted.height / 3) / 2,
                    width=fitted.width / 3,
                    height=fitted.height / 3,
                    preserveAspectRatio=True,
                    anchor="c",
                    mask="auto",
                )

        pdf.setStrokeColor(colors.HexColor("#E7DDEA"))
        pdf.line(margin_x, 17, page_w - margin_x, 17)
        pdf.setFillColor(colors.HexColor("#6D5A7B"))
        pdf.setFont(font, 6.8)
        pdf.drawString(
            margin_x,
            7,
            "REALISTIC = existing photo-style dish image | MISSING = no finished-dish image; step art is not substituted",
        )
        pdf.drawRightString(page_w - margin_x, 7, f"Page {page_index + 1} of 3 | Source HEAD {source_head[:12]}")
        pdf.showPage()
    pdf.save()


def write_csv(rows, csv_path: Path):
    with csv_path.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=HEADER)
        writer.writeheader()
        writer.writerows(rows)


def validate_outputs(rows, pdf_path: Path, csv_path: Path):
    with csv_path.open(newline="", encoding="utf-8-sig") as stream:
        csv_rows = list(csv.DictReader(stream))
    if len(csv_rows) != 95 or [int(row["recipe_id"]) for row in csv_rows] != list(range(1, 96)):
        raise ValueError("CSV validation failed: expected exactly IDs 1-95")
    if list(csv_rows[0]) != HEADER:
        raise ValueError(f"CSV header mismatch: {list(csv_rows[0])}")

    reader = PdfReader(str(pdf_path))
    if len(reader.pages) != 3:
        raise ValueError(f"PDF page count is {len(reader.pages)}, expected 3")
    for page_index, (start, end) in enumerate(PAGE_RANGES):
        text = re.sub(r"\s+", " ", reader.pages[page_index].extract_text() or "")
        for row in rows[start - 1 : end]:
            if f"#{row['recipe_id']}" not in text:
                raise ValueError(f"PDF page {page_index + 1} is missing recipe ID {row['recipe_id']}")
            if re.sub(r"\s+", " ", row["recipe_name"]) not in text:
                raise ValueError(f"PDF page {page_index + 1} is missing recipe name {row['recipe_name']}")
    print(
        json.dumps(
            {
                "recipe_count": len(rows),
                "pdf_pages": len(reader.pages),
                "realistic": sum(row["quality_status"] == "REALISTIC" for row in rows),
                "missing": sum(row["quality_status"] == "MISSING" for row in rows),
                "pdf_sha256": sha256(pdf_path.read_bytes()),
                "csv_sha256": sha256(csv_path.read_bytes()),
            },
            indent=2,
        )
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True, help="Production index.html")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--source-head", required=True, help="Exact source commit SHA")
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    rows, images = build_inventory(args.input)
    pdf_path = args.output_dir / "95-recipe-artwork-catalogue.pdf"
    csv_path = args.output_dir / "recipe-artwork-inventory.csv"
    write_csv(rows, csv_path)
    generate_pdf(rows, images, pdf_path, args.source_head)
    validate_outputs(rows, pdf_path, csv_path)


if __name__ == "__main__":
    main()
