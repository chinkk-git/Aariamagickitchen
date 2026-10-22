#!/usr/bin/env python3
"""Create a real-device side-by-side comparison with the approved recipe #12 step reference."""
from hashlib import sha256
from json import dumps
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[2]
reference_path = root / "docs/design/references/1000072960-owner-recipe12-step-reference.png"
actual_path = root / "artifacts/v32-android-screenshots/recipe-image-12-phone-portrait-step-1.png"
output_dir = root / "artifacts/v32-diagnostics"
output_dir.mkdir(parents=True, exist_ok=True)
expected_hash = "33ef32fdb90d697d26f946b44826da6fba899ca3ed830be029fa85a4572e439d"
reference_bytes = reference_path.read_bytes()
reference = Image.open(reference_path).convert("RGB")
if reference.size != (1080, 2400) or sha256(reference_bytes).hexdigest() != expected_hash:
    raise SystemExit("Approved recipe #12 step reference changed; refusing to compare against an unapproved baseline")
if not actual_path.is_file():
    raise SystemExit("Actual phone portrait recipe #12 step screenshot is missing")

actual = Image.open(actual_path).convert("RGB")
width, height = actual.size
actual = actual.crop((0, round(height * 0.028), width, round(height * 0.966)))
panel_size = (432, 960)
reference_panel = ImageOps.fit(reference, panel_size, method=Image.Resampling.LANCZOS)
actual_panel = ImageOps.fit(actual, panel_size, method=Image.Resampling.LANCZOS)
diff = ImageChops.difference(reference_panel.convert("L"), actual_panel.convert("L"))
canvas = Image.new("RGB", (panel_size[0] * 2, panel_size[1] + 40), "#f4eef8")
draw = ImageDraw.Draw(canvas)
draw.text((12, 12), "OWNER APPROVED RECIPE #12 STEP", fill="#41285f")
draw.text((panel_size[0] + 12, 12), "ANDROID PHONE PORTRAIT", fill="#41285f")
canvas.paste(reference_panel, (0, 40))
canvas.paste(actual_panel, (panel_size[0], 40))
comparison_path = output_dir / "recipe12-step-reference-comparison.png"
canvas.save(comparison_path, optimize=True)
report = {
    "status": "DIAGNOSTIC_HUMAN_VISUAL_REVIEW_REQUIRED",
    "reference": str(reference_path.relative_to(root)),
    "reference_sha256": expected_hash,
    "android_screenshot": str(actual_path.relative_to(root)),
    "android_sha256": sha256(actual_path.read_bytes()).hexdigest(),
    "android_dimensions": [width, height],
    "mean_absolute_luminance_difference_0_255": round(ImageStat.Stat(diff).mean[0], 3),
    "comparison_image": str(comparison_path.relative_to(root)),
    "metric_note": "The pixel metric is diagnostic only. It does not establish visual acceptance; inspect the side-by-side comparison.",
}
(output_dir / "recipe12-step-reference-comparison.json").write_text(dumps(report, indent=2) + "\n")
print(dumps(report, indent=2))
