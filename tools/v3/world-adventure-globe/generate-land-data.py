#!/usr/bin/env python3
"""Generate the embedded Natural Earth land polygons for world-adventure-globe.js."""
from pathlib import Path
import json, struct, zipfile

HERE = Path(__file__).resolve().parent
ZIP = HERE / "data/ne_110m_land.zip"
JS = HERE / "world-adventure-globe.js"
TOLERANCE_DEGREES = 0.3

def simplify(points, tolerance):
    if len(points) <= 4:
        return points
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        ax, ay = points[first]
        bx, by = points[last]
        dx, dy = bx - ax, by - ay
        denom = dx * dx + dy * dy
        best_distance, best_index = -1.0, None
        for i in range(first + 1, last):
            px, py = points[i]
            if denom:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / denom))
                qx, qy = ax + t * dx, ay + t * dy
                dist = ((px - qx) ** 2 + (py - qy) ** 2) ** 0.5
            else:
                dist = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
            if dist > best_distance:
                best_distance, best_index = dist, i
        if best_distance > tolerance and best_index is not None:
            keep.add(best_index)
            stack.append((first, best_index))
            stack.append((best_index, last))
    return [points[i] for i in sorted(keep)]

def unwrap(points):
    if not points:
        return points
    result = [points[0]]
    last_lon = points[0][0]
    for lon, lat in points[1:]:
        while lon - last_lon > 180:
            lon -= 360
        while lon - last_lon < -180:
            lon += 360
        result.append((lon, lat))
        last_lon = lon
    return result

with zipfile.ZipFile(ZIP) as archive:
    shp_name = next(n for n in archive.namelist() if n.endswith(".shp"))
    shp = archive.read(shp_name)

polygons = []
pos = 100
while pos < len(shp):
    content_length = int.from_bytes(shp[pos + 4:pos + 8], "big") * 2
    content = shp[pos + 8:pos + 8 + content_length]
    pos += 8 + content_length
    shape_type = struct.unpack_from("<i", content, 0)[0]
    if shape_type not in (5, 15, 25):
        continue
    part_count, point_count = struct.unpack_from("<ii", content, 36)
    offset = 44
    starts = struct.unpack_from("<" + "i" * part_count, content, offset)
    offset += 4 * part_count
    points = [struct.unpack_from("<dd", content, offset + i * 16) for i in range(point_count)]
    rings = []
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < part_count else point_count
        ring = simplify(unwrap(points[start:end]), TOLERANCE_DEGREES)
        if ring and ring[0] != ring[-1]:
            ring.append(ring[0])
        ring = [[round(lon, 2), round(lat, 2)] for lon, lat in ring]
        if len(ring) >= 4:
            rings.append(ring)
    if rings:
        polygons.append(rings)

serialized = json.dumps(polygons, separators=(",", ":"), ensure_ascii=True)
source = JS.read_text()
start = source.index("  var LAND_POLYGONS = ")
end_marker = "; // END NATURAL EARTH LAND DATA"
end = source.index(end_marker, start) + len(end_marker)
source = source[:start] + "  var LAND_POLYGONS = " + serialized + end_marker + source[end:]
JS.write_text(source)
print(json.dumps({"polygon_features": len(polygons), "rings": sum(len(x) for x in polygons),
                  "points": sum(len(r) for p in polygons for r in p),
                  "embedded_json_bytes": len(serialized), "tolerance_degrees": TOLERANCE_DEGREES}))
