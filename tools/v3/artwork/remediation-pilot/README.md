# W03 step-atlas remediation pilot

**Status: draft for independent review; not A08/A09 approved and not integrated into V3.1 runtime.**

This isolated branch contains revised vector atlases for recipes 27, 39, 40, 51 and 63 (30 panels). It was created from V3.1 base `a115fc00e2a516df1e819e97ec737bc55e7b2cfc`; it does not modify `feature/v3.1-home-redesign` or recipe data. The recovered original ZIP remains unchanged outside this worktree and has SHA-256 `30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab`.

## Pilot conventions

- Six numbered panels in the existing 3 × 2, 1536 × 1024 atlas shape, with stable SVG group IDs (`recipe-{id}-panel-{n}`).
- Distinct, step-specific vector action scenes; bilingual English and Brazilian Portuguese child-facing short labels.
- Larger ingredient focus tags with English and Portuguese labels.
- The same source-approved CHEF_A portrait appears only in non-hot, non-sharp child-safe scenes. Adult-only scenes use a high-contrast bilingual text cue and show no child operating hot/sharp equipment.
- Each panel group has its own title and accessible description; the companion manifest carries source step text, adult cue, kid instruction and review status. Live runtime/TalkBack association remains unverified.
- Recipe 63’s listed steps contain no heat, sharp tool or raw animal-food handling. No mandatory adult-assist cue is inferred from those steps; panel 5 calls for conditional help only if the refrigerator shelf is high. The condensed-milk dairy allergen is called out.

## Provenance and gates

The archive digest and catalog digest support byte-level traceability. The recovered source manifests omit per-file digests for IDs 48–65; this pilot records original and revised file hashes independently. Hashes do not prove authorship or rights. The original artwork’s author/rights chain remains unresolved. The approved CHEF_A source and PNG derivative hashes are recorded in `pilot-manifest.json`.

All 30 panel decisions remain `PENDING` in `panel-change-ledger.json`. W07/A08 and W08/A09 must review independently. Do not copy these drafts into runtime artwork, change the strict recipe 51 screenshot assertion, or treat rendering/checksum success as approval.

## Render evidence

- `before-contact-sheet.jpg` and `after-contact-sheet.jpg` compare all five atlases. Before and after PNGs use Inkscape exports at 1536 × 1024 for a common renderer.
- `before/recipe-*-before.png` and `recipe-*-after.png` are full-size 1536 × 1024 renders.
- `panel-change-ledger.json` records source/revised SVG digests and before/after atlas render digests for each panel entry.

The source recipe records and all 95 recipes are unchanged. Runtime integration, Android CI, portrait/landscape screenshot acceptance and offline APK testing have not been performed from this isolated draft branch.

## Remaining-artwork completion matrix

`remaining-artwork-completion-matrix.csv` tracks all 55 source recipes (11–65), drafted and reviewed panel counts, runtime integration, and CI state. The five pilot recipes have 30 draft panels with static review passes; formal A08/A09 approval and runtime integration remain pending. The other 50 recipes (300 panels) are not started.
