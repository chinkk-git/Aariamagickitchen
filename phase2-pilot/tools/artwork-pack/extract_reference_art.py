"""Extract the individual approved artwork panels from the supplied style board."""
from pathlib import Path
from PIL import Image
import hashlib, json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "packages/assets/visual-reference.jpg"
OUT = ROOT / "packages/assets/reference-pack"
OUT.mkdir(parents=True, exist_ok=True)
im = Image.open(SRC).convert("RGB")

# Crop bounds follow the image panels in Visual Identity & Artwork Manifest v1.0.
assets = {
    "pose-happy": (1126, 141, 1219, 243, "Aaria, happy"),
    "pose-wink": (1228, 141, 1321, 243, "Aaria, wink"),
    "pose-thinking": (1329, 141, 1421, 243, "Aaria, thinking"),
    "pose-excited": (1428, 141, 1518, 243, "Aaria, excited"),
    "pose-cooking": (1126, 277, 1219, 389, "Aaria, cooking"),
    "pose-tasting": (1228, 277, 1321, 389, "Aaria, tasting"),
    "pose-thumbs-up": (1329, 277, 1421, 389, "Aaria, thumbs up"),
    "pose-with-friends": (1428, 277, 1518, 389, "Aaria with friends"),
    "kitchen-evening": (145, 617, 273, 701, "Main kitchen, evening"),
    "kitchen-prep-station": (280, 617, 413, 701, "Kitchen prep station"),
    "kitchen-dining-table": (419, 617, 499, 701, "Kitchen dining table"),
    "dish-pizza": (523, 488, 634, 598, "Finished tomato pizza"),
    "dish-salad": (641, 488, 754, 598, "Finished colorful salad"),
    "dish-parfait": (759, 488, 862, 598, "Finished berry yogurt parfait"),
    "dish-nachos": (869, 488, 983, 598, "Finished nachos"),
    "dish-chicken-bites": (523, 603, 634, 710, "Finished chicken bites"),
    "dish-cookies": (641, 603, 754, 710, "Finished cookies"),
    "dish-pasta": (759, 603, 862, 710, "Finished pasta"),
    "dish-pancakes": (869, 603, 983, 710, "Finished pancakes"),
    "step-wash-tomatoes": (1010, 494, 1132, 610, "Step 1: wash tomatoes"),
    "step-cut-tomatoes": (1141, 494, 1258, 610, "Step 2: cut tomatoes"),
    "step-add-cheese": (1266, 494, 1392, 610, "Step 3: add cheese"),
    "step-finished-pizza": (1400, 494, 1518, 610, "Step 4: finished pizza"),
    "celebration-made-it": (1074, 794, 1257, 1008, "You made it celebration"),
    "mystery-ingredient": (1265, 794, 1518, 1008, "Kitchen mystery: missing ingredient"),
}

manifest = []
for name, (x1, y1, x2, y2, purpose) in assets.items():
    path = OUT / f"{name}.jpg"
    crop = im.crop((x1, y1, x2, y2))
    crop.save(path, "JPEG", quality=94, optimize=True)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    manifest.append({"id": f"reference.{name}.v1", "version": "1.0.0", "purpose": purpose,
                     "path": str(path.relative_to(ROOT)), "dimensions": f"{crop.width}x{crop.height}",
                     "format": "JPEG", "identity": "Aaria" if name.startswith("pose-") else None,
                     "recipeOrStep": name if name.startswith(("dish-", "step-")) else None,
                     "sha256": digest, "reviewStatus": "APPROVED_REFERENCE_ARTWORK — CROPPED, UNMODIFIED"})

print(json.dumps(manifest, indent=2))
