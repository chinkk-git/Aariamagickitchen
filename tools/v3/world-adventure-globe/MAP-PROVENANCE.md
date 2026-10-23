# World Adventure land-data provenance

- **Dataset:** Natural Earth 1:110m Physical Vectors, Land polygons, version 4.0.0.
- **Official dataset page:** https://www.naturalearthdata.com/download/downloads/110m-physical-vectors/
- **Download:** https://naturalearth.s3.amazonaws.com/110m_physical/ne_110m_land.zip
- **Source archive SHA-256:** `1926c621afd6ac67c3f36639bb1236134a48d82226dc675d3e3df53d02d2a3de`
- **Rights:** Natural Earth states that its vector and raster map data are in the public domain and may be modified and used for commercial and educational purposes. It suggests the credit “Made with Natural Earth.” See https://www.naturalearthdata.com/about/terms-of-use/.
- **Transformation:** Douglas–Peucker simplification at 0.3 degrees; date-line wrapping; custom orthographic projection and far-hemisphere clipping at runtime. The source archive is retained here and the generated coordinates are embedded in `world-adventure-globe.js` for offline use.
- **Module:** `AariaWorldAdventureGlobe` version `0.3.0-natural-earth-orthographic`. The W02 host API is unchanged.
