# V3.2 Visual Acceptance Matrix
Status: checklist / not yet executed. Owner-approved mockup comparison required.

| Gate | Evidence | Pass condition |
|---|---|---|
| Reference provenance | Approved image path, SHA-256, source and owner decision | Exact original files verified |
| Classic preservation | Immutable tag, APK checksum, signing/package/version, screenshots | Reinstall/rollback documented; no data-loss claims |
| Theme tokens | Versioned token file + actual computed contrast | All three themes pass |
| Theme stability | 95-ID manifest + restart/language/device tests | Same recipe theme each time |
| Catalogue/detail/step/completion | Emulator screenshots for all three themes, phone/tablet, both orientations | Contract match, no clipping/distortion |
| Home/World | Baseline screenshots and interaction tests | Existing approved appearance and map markers/deep links |
| Character registry | Original source images + hashes + identity screenshots | Aaria/Mommy/Daddy/Friends consistent |
| Dish artwork | 95 IDs, image rights/quality/recipe-match ledger | 95 verified; missing 13 completed |
| Feature regression | Existing navigation and flows test suite | No newly introduced failures |
| Child safety A08 | Independent signed evidence | PASS |
| Child experience A09 | Independent signed evidence | PASS |
| Android package | CI SHA, artifact ID, APK SHA, emulator coexistence | V3.2 separately installable |
| Release decision | Owner approval | HOLD until explicitly approved |

Unmet rows remain HOLD; CI green alone does not imply visual or release acceptance.
