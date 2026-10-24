# Magical World artwork handoff

Owner-approved visual reference: repository-root `a_vibrant_colorful_cartoon_3d_illustration_style-1.png`, source commit `8440862262d7114f25616f7432e3f2ab79849253` (Issue #50 comments #6378006707, #6378063993, and #6378128690).

## Assets

- `aaria-pointing-approved.png`: transparent 1024×1536 RGBA cutout for the Aaria character. It preserves the approved chef-hat, pink-and-white outfit, friendly face, pointing pose and spoon. The world background, globe, flags, dog and controls are excluded.
- `magic-sparkle-trail.png`: optional transparent 1536×1024 RGBA golden star / glitter-trail decoration. Keep it as a separate composited layer so W02 can position or animate it independently.
- `ARTWORK-PROVENANCE.json`: source commit/hash, output dimensions, file sizes, SHA-256 digests, prompts, generation method, owner approval references and rights note.

## Android integration notes

Both assets are transparent PNGs suitable for Android drawable-nodpi or equivalent density-independent asset packaging. Preserve aspect ratio; avoid stretching. Aaria is portrait-oriented and should be scaled to available scene height while remaining within the safe area. The sparkle asset is optional and may be reused at different scales/rotations. Keep W02's existing spinning globe, accepted Natural Earth geometry, functional flags, buttons and navigation controls as independent interactive elements; these exports do not replace them.

These are visual assets for W02 integration. They do not assert Android runtime acceptance or release approval.
