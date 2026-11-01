#!/usr/bin/env python3
"""Create a measured, content-aware APK size report for an owner-review build."""
import argparse
import base64
import collections
import hashlib
import json
import re
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("apk", type=Path)
parser.add_argument("--baseline-bytes", type=int, default=69_713_378)
parser.add_argument("--baseline-sha256", default="26cbf6c8843eb2949bebc542af165c5a97ff5497b59bbe9bf0d845f70510e794")
parser.add_argument("--output", type=Path, default=Path("artifacts/v32-diagnostics/apk-size-analysis.json"))
args = parser.parse_args()

apk_bytes = args.apk.stat().st_size
digest = hashlib.sha256(args.apk.read_bytes()).hexdigest()
with zipfile.ZipFile(args.apk) as archive:
    entries = archive.infolist()
    category_prefixes = {
        "assets": "assets/", "native_libraries": "lib/", "compiled_resources": "res/",
        "dex": "classes", "metadata": "META-INF/",
    }
    categories = {}
    for name, prefix in category_prefixes.items():
        items = [entry for entry in entries if entry.filename.startswith(prefix)]
        categories[name] = {
            "files": len(items), "compressed_bytes": sum(item.compress_size for item in items),
            "uncompressed_bytes": sum(item.file_size for item in items),
        }
    assets = [entry for entry in entries if entry.filename.startswith("assets/")]
    content_hashes = collections.defaultdict(list)
    contents = {}
    for entry in assets:
        content = archive.read(entry.filename)
        contents[entry.filename] = content
        content_hashes[hashlib.sha256(content).hexdigest()].append(entry)
    duplicate_entries = []
    for same_content in content_hashes.values():
        if len(same_content) > 1:
            keeper = next((x for x in same_content if x.filename.startswith("assets/international-wave-1/")), same_content[0])
            duplicate_entries.extend(x for x in same_content if x is not keeper)
    index = contents.get("assets/index.html", b"").decode("utf-8", errors="replace")
    encoded = re.findall(r"data:image/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=\r\n]+)", index)
    decoded_payloads = []
    for payload in encoded:
        try:
            decoded_payloads.append(base64.b64decode(payload, validate=False))
        except Exception:
            continue
    entries_by_type = collections.defaultdict(lambda: {"files": 0, "compressed_bytes": 0, "uncompressed_bytes": 0})
    for entry in assets:
        if entry.filename == "assets/index.html": kind = "generated_runtime_html"
        elif entry.filename.startswith("assets/international-wave-1/"): kind = "production_international_assets"
        elif entry.filename.startswith("assets/artwork-review/"): kind = "debug_review_routes"
        elif entry.filename.startswith("assets/artwork-review-v32/"): kind = "review_reference_art"
        else: kind = "other_assets"
        bucket = entries_by_type[kind]
        bucket["files"] += 1
        bucket["compressed_bytes"] += entry.compress_size
        bucket["uncompressed_bytes"] += entry.file_size

report = {
    "apk": str(args.apk), "apk_bytes": apk_bytes, "apk_decimal_mb": round(apk_bytes / 1_000_000, 2),
    "apk_mib": round(apk_bytes / 1_048_576, 2), "sha256": digest,
    "baseline": {"source": "rejected run #40010811210 APK", "bytes": args.baseline_bytes,
                 "sha256": args.baseline_sha256, "decimal_mb": round(args.baseline_bytes / 1_000_000, 2)},
    "reduction_bytes": args.baseline_bytes - apk_bytes,
    "reduction_percent": round((args.baseline_bytes - apk_bytes) / args.baseline_bytes * 100, 2),
    "categories": categories, "asset_categories": dict(entries_by_type),
    "duplicate_asset_entries": len(duplicate_entries),
    "duplicate_asset_compressed_bytes": sum(entry.compress_size for entry in duplicate_entries),
    "embedded_base64_image_occurrences": len(encoded),
    "embedded_base64_image_payload_bytes": sum(map(len, decoded_payloads)),
    "embedded_base64_unique_payload_bytes": sum(len(x) for x in {hashlib.sha256(x).hexdigest(): x for x in decoded_payloads}.values()),
    "native_libraries_present": categories["native_libraries"]["files"] > 0,
    "static_unused_resource_status": "not inferable from APK alone; no resources removed on this basis",
    "largest_assets": [{"path": x.filename, "compressed_bytes": x.compress_size, "uncompressed_bytes": x.file_size}
                       for x in sorted(assets, key=lambda item: item.compress_size, reverse=True)[:20]],
}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2) + "\n")
markdown = [
    "# Android APK size analysis", "",
    f"- APK: {report['apk_bytes']} bytes ({report['apk_decimal_mb']} MB; {report['apk_mib']} MiB)",
    f"- SHA-256: `{report['sha256']}`",
    f"- Rejected baseline: {args.baseline_bytes} bytes ({report['baseline']['decimal_mb']} MB), SHA-256 `{args.baseline_sha256}`",
    f"- Measured reduction: {report['reduction_bytes']} bytes ({report['reduction_percent']}%)", "",
    "| APK contents | Files | Compressed bytes | Uncompressed bytes |",
    "|---|---:|---:|---:|",
]
for name, data in report["asset_categories"].items():
    markdown.append(f"| {name} | {data['files']} | {data['compressed_bytes']} | {data['uncompressed_bytes']} |")
markdown.extend([
    f"| Native libraries | {categories['native_libraries']['files']} | {categories['native_libraries']['compressed_bytes']} | {categories['native_libraries']['uncompressed_bytes']} |",
    f"| Compiled resources | {categories['compiled_resources']['files']} | {categories['compiled_resources']['compressed_bytes']} | {categories['compiled_resources']['uncompressed_bytes']} |",
    f"| DEX | {categories['dex']['files']} | {categories['dex']['compressed_bytes']} | {categories['dex']['uncompressed_bytes']} |", "",
    f"- Exact duplicate asset payloads: {report['duplicate_asset_entries']} entries / {report['duplicate_asset_compressed_bytes']} compressed bytes.",
    f"- Inline base64 artwork: {report['embedded_base64_image_occurrences']} images / {report['embedded_base64_image_payload_bytes']} decoded bytes total; unique payload bytes {report['embedded_base64_unique_payload_bytes']}.",
    f"- Static unused-resource verdict: {report['static_unused_resource_status']}.", "",
    "Largest packaged files:", "",
])
markdown.extend(f"- `{item['path']}` — {item['compressed_bytes']} bytes compressed" for item in report["largest_assets"])
args.output.with_suffix(".md").write_text("\n".join(markdown) + "\n")
print(json.dumps({"apk_bytes": apk_bytes, "sha256": digest, "reduction_bytes": report["reduction_bytes"], "reduction_percent": report["reduction_percent"], "duplicate_asset_compressed_bytes": report["duplicate_asset_compressed_bytes"], "output": str(args.output)}, indent=2))
