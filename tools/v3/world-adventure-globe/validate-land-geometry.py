#!/usr/bin/env python3
"""Static regression checks for W03's offline orthographic map layer."""
from pathlib import Path
import hashlib, json, re, subprocess, sys
HERE=Path(__file__).resolve().parent
JS=HERE/'world-adventure-globe.js'
ZIP=HERE/'data/ne_110m_land.zip'
text=JS.read_text()
match=re.search(r'var LAND_POLYGONS = (.*?); // END NATURAL EARTH LAND DATA',text)
assert match, 'embedded Natural Earth dataset marker missing'
polygons=json.loads(match.group(1))
assert len(polygons)==117, f'Expected 117 source polygon features, got {len(polygons)}'
assert sum(map(len,polygons))==118, 'unexpected ring count'
points=[p for feature in polygons for ring in feature for p in ring]
assert len(points)==2406, f'Expected 2406 simplified points, got {len(points)}'
assert all(-540<=p[0]<=540 and -90<=p[1]<=90 for p in points), 'coordinate outside wrapped WGS84 range'
assert hashlib.sha256(ZIP.read_bytes()).hexdigest()=='1926c621afd6ac67c3f36639bb1236134a48d82226dc675d3e3df53d02d2a3de'
assert 'width * 0.46' in text and 'height * 0.46' in text and 'Math.sin(theta) * 460' in text and 'Math.sin(phi) * 460' in text, 'land and flag orthographic radii must match'
assert 'var GEO = {' in text and all(f'{lat}' in text and f'{lon}' in text for lat,lon in [(21,78),(42.5,12.5),(35,105),(36,138),(23,-102),(16,108)]), 'country coordinates changed'
assert 'version: "0.3.0-natural-earth-orthographic"' in text
assert re.search(r'function mount\(root, hostContext, restoredState\)',text), 'host mount signature changed'
# Verify that the module still exposes the agreed controller calls.
for method in ['serialize:', 'restore:', 'setOrientation:', 'handleBack:', 'refresh:', 'dispose:']:
 assert method in text, f'host controller method missing: {method}'
subprocess.run(['node','--check',str(JS)],check=True)
print(json.dumps({'polygon_features':len(polygons),'rings':sum(map(len,polygons)),'simplified_points':len(points),'source_sha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),'host_api':'UNCHANGED','flags':'same WGS84 coordinates and orthographic radius as land','status':'PASS'},indent=2))
