#!/usr/bin/env python3
"""Create image-based Android/reference comparison evidence for the approved V3.1 design."""
from hashlib import sha256
from json import dumps
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[2]
reference_path = root / "docs/design/approved-v31-home-world-reference.png"
shots = root / "artifacts/v31-android-screenshots"
diagnostics = root / "artifacts/v31-diagnostics"
diagnostics.mkdir(parents=True, exist_ok=True)
ref = Image.open(reference_path).convert("RGB")
expected = "6934745614144a6100cbceee8140b4dc54b18a4fd4cac55835dda2ad41eaa5b8"
ref_hash = sha256(reference_path.read_bytes()).hexdigest()
if ref.size != (1536, 1024) or ref_hash != expected:
    raise SystemExit(f"Approved visual baseline changed: {ref.size=} {ref_hash=}")

# The source is a two-device reference. Crop the device interiors, then compare
# those compositions beside real Android emulator captures at a shared scale.
panels = {
    "home": ref.crop((34, 18, 751, 1006)),
    "world": ref.crop((785, 18, 1502, 1006)),
}
files = {
    "home": shots / "v31-home-portrait.png",
    "world": shots / "v31-world-portrait.png",
}
if any(not path.is_file() for path in files.values()):
    raise SystemExit("Android home/world screenshot evidence is missing")

def app_crop(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    width, height = image.size
    # Emulator image has Android status and system-navigation bars; retain the
    # actual installed app viewport, including the in-app six-tab navigation.
    top = max(0, round(height * 0.028))
    bottom = max(top + 1, round(height * 0.966))
    return image.crop((0, top, width, bottom))

thumb_w, thumb_h = 480, 660
tile_w, tile_h = 500, 700
canvas = Image.new("RGB", (tile_w * 2, (tile_h + 54) * 2), "#f4eef8")
draw = ImageDraw.Draw(canvas)
scores = {}
for row, name in enumerate(("home", "world")):
    reference = panels[name]
    actual = app_crop(files[name])
    for col, (label, image) in enumerate((("APPROVED REFERENCE", reference), ("ANDROID EMULATOR", actual))):
        x, y = col * tile_w, row * (tile_h + 54)
        draw.text((x + 10, y + 8), f"{name.upper()} — {label}", fill="#41285f")
        fitted = ImageOps.contain(image, (thumb_w, thumb_h), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (thumb_w, thumb_h), "#ffffff")
        tile.paste(fitted, ((thumb_w - fitted.width) // 2, (thumb_h - fitted.height) // 2))
        canvas.paste(tile, (x + (tile_w - thumb_w) // 2, y + 34))
    # Low-resolution colour/structure score is recorded as a diagnostic only;
    # final visual acceptance still requires human inspection of this sheet.
    a = ImageOps.fit(reference, (128, 176), method=Image.Resampling.LANCZOS).convert("L")
    b = ImageOps.fit(actual, (128, 176), method=Image.Resampling.LANCZOS).convert("L")
    diff = ImageChops.difference(a, b)
    scores[name] = {
        "reference_size": list(reference.size),
        "android_size": list(Image.open(files[name]).size),
        "android_sha256": sha256(files[name].read_bytes()).hexdigest(),
        "mean_absolute_luminance_difference_0_255": round(ImageStat.Stat(diff).mean[0], 3),
    }

comparison = diagnostics / "home-world-reference-comparison.png"
canvas.save(comparison, optimize=True)
report = {
    "baseline": str(reference_path.relative_to(root)),
    "baseline_sha256": ref_hash,
    "actual_android_screenshots": scores,
    "comparison_image": str(comparison.relative_to(root)),
    "metric_note": "Luminance difference is a coarse diagnostic; it does not establish visual acceptance. Human review of the side-by-side image is required.",
}
(diagnostics / "home-world-reference-comparison.json").write_text(dumps(report, indent=2) + "\n")
print(dumps(report, indent=2))
