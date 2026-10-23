# V3.3 World Map P0 — W02 progress

Tracking: [Issue #39](https://github.com/chinkk-git/Aariamagickitchen/issues/39)  
Branch: `feature/v3.3-world-map-explorer`  
Status: implementation in progress; no external gate is claimed passed.

## 2026-10-23 owner redesign — current checkpoint

- **Presentation status:** the previous World Map sample is **rejected** for its small framed map and unintuitive zoom controls. The successful historical Home → World Map → recipe #51 → Android Back trace, APK, byte hash and screenshots remain linked below as diagnostic history only. They do not approve the old visual design.
- **Reconciled branch head:** `8a54dbf6bdac5e8bf7917743cf19a90e6dadfc45`; W01 remains isolated on `feature/v3.2-magical-cookbook`.
- **Prior exact-head CI:** Android [#39948915089](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39948915089) was active at redesign kickoff. Its G1 and phone sample passed so far; tablet G2 was still running. It tests the rejected presentation and will be preserved without interruption. No redesign change is pushed until that run completes and is reconciled.
- **Current implementation contract:** use an 85–95% measured Android map viewport with the unchanged approved art; aspect-locked shared camera for art/geography/pins; natural pinch/drag; one globe reset; compact in-map country preview and Food Passport; only the 18 existing canonical India links. Portrait begins focused near India for horizontal exploration; landscape fits the world. No draft country links or viewing rewards.
- **Acceptance evidence planned:** phone/tablet portrait and landscape geometry plus real screenshots; zoomed continent, country preview, canonical recipe and Passport; CDP two-touch pinch, Android one-finger swipe, bounded/reset/marker-anchor assertions; EN-GB/PT-BR; recipe Back position restoration; full 95-recipe gates unchanged.
- **No redesign APK or screenshot is accepted yet.** A08 child protection, A09 child experience, artwork rights and Android security remain independent gates; owner visual approval is required. No merge or release.

## Completed on W02

- Read the consolidated Issue #39 P0 contract, historical Issue #6, current World Map architecture and prior Android evidence.
- Preserved the owner-approved map image and source notes with SHA-256 provenance under `docs/design/references/v3.3/`.
- Wired that exact approved composite reference into the V3.3 map art layer using a CSS viewport crop; the reference bytes are embedded unchanged by the production transform. Android visual comparison is still required to verify crop positioning on phones and tablets.
- Recovered the five-country generated concept board from project Library and recorded its identity and SHA-256 without promoting or copying generated art into runtime/repository artwork assets.
- Registered the five requested concepts in `tools/v3/data/v3.3-world-map-country-drafts.json`, EN-GB/PT-BR localized, no canonical IDs, and with independent review gates pending.
- Historical pre-redesign prototype had zoom-in, zoom-out and drag-mode controls; the owner rejected that presentation. The redesign removes these controls and keeps only natural pinch/drag plus the globe reset. Earlier gesture/unit evidence remains useful but does not validate the replacement screen.
- Changed the passport counter to report earned stamps only. The existing stamp award remains tied to actual completion of an allowlisted canonical India recipe; no draft concept can create a stamp.
- Added registry/gesture/passport regression checks and updated the Android phone/tablet smoke expectations to exercise the controls and one real map drag.
- Added W02 to the existing Android CI branch trigger and included the V3.3 data validator in G1.
- Reconciled Android run `39882408447` against W01's later run `39882586213`: the W02 failure was the tablet smoke comparing a 788.66 px ingredient grid to 68% of the full 1280 px viewport. W01's tablet run passed after its smoke harness measured the actual ingredient panel; this W02 change ports that evidence-based **test-only** measurement and leaves recipe layout untouched.
- Added a distinct debug-only W02 package suffix (`.v33map<run>`) and sample APK artifact name. This prevents the first World Map sample from colliding with V3.1/V3.2 review installs and gives it a clearly identified sample label.
- Reconciled runs `39890152088` and `39891777820` on W02 heads `076024c…` and `204493e…`. Both passed build/G1 then exited G2 with code 124 in the full tablet recipe-image audit. The Node audit was hard-limited to 1,080 seconds; run 136 reached tablet-landscape recipe 90/95 before termination. Extended the bounded Node limit to 2,520 seconds, G2 to 50 minutes and the job to 90 minutes. The two-orientation 95-recipe audit and G3's full phone 95/95 checks remain intact.
- Added a W02-only clean Pixel 3a API 35 sample step ahead of G2. Run `39940928305` built and verified package `com.aaria.magickitchen.pilot.v33map139`, installed/launched it, and archived APK SHA-256 `534571d8b43ac18a914d983e667873271d2e8579dea5f9db1b0932421509e924`. The first harness attempt did not reach route validation: the fresh emulator showed a Quickstep ANR overlay and the Home selector was stale. Failure screenshot/logs are in artifact `12496371620`. The stable-launcher/one-reboot preflight and corrected Home selector were verified on exact head `d9b82c9` by run `39941675559`: the clean install reached World Map and exposed all 18 canonical India links. That run stopped before recipe/Back because the approved image assertion failed.
- Run `39942460923` on `169b541…` repeated the successful launcher and World route, then diagnosed the separate rendering issue: Android WebView dropped the 3.58 MB approved PNG embedded in an inline CSS custom-property URL (`backgroundImage: none`). The captured phone frame showed only simplified geography. Changed the map to assign the unchanged approved PNG as an `img` source and retain the same viewport crop/pan transform; the next exact-head smoke must verify `complete`, natural width and source-byte identity before accepting screenshots. G2/G3 were skipped because sample acceptance failed.
- Run `39944001971` on `f3b6f3b…` passed build, G1 and the 95-record package audit. The stable-launcher path recovered from the Quickstep ANR; the exact source/image check passed and the sample reached World-map screenshot capture. It failed there with `spawnSync adb ENOBUFS` because Node's default child-process pipe buffer was too small for the approved high-detail PNG; no recipe/Back or accepted screenshot was recorded, and G2/G3 were skipped. Increased only the sample ADB pipe buffer and added a regression assertion. Rerun exact head before accepting the sample; the APK and incomplete smoke artifacts from this run are diagnostic only.
- Run `39944765865` on `6dafcb0…` passed build, G1, the sample Home → World → recipe #51 → Android Back flow, and G2's tablet portrait/landscape 95-recipe image loops (logs reached 90/95 in both orientations and then advanced past the loops). It stopped in G2's follow-up PT-BR #12 detail check because the smoke assertion compared full `textContent` including each decorative navigation icon against labels-only expected text. The actual six `data-nav` IDs, localized title and ingredient were correct. This is a harness assertion mismatch, not recipe geometry or a timeout; G3 was skipped. The tablet smoke now reads each tab's final label text node while retaining the same six-ID check; an exact-head rerun is required.

## Local evidence

- `npm test --prefix phase2-pilot`: 58/58 passed after the approved-reference and Food Passport checks.
- `node tools/v3/validate-v33-world-map-drafts.mjs`: passed.
- `node tools/v3/validate-v31.mjs`: passed; 95 original recipes, 177 offline countries, existing India links preserved.
- `node tools/v3/verify-v32-reference-assets.mjs`: passed.
- `node --check` and `bash -n` passed for W02/Android smoke scripts; workflow YAML parses; `git diff --check` passed.
- Production transform completed and emitted map zoom controls. A scan of that transformed output confirmed none of the five new concept recipe names leaked into runtime.
- Local Android Gradle/SDK/ADB are unavailable. Exact-head run `39944765865` produced the accepted phone sample artifacts and matching APK-byte hash; tablet 95-recipe images ran in both orientations, but the PT-BR #12 navigation-label assertion failed after those loops, so G3 did not run. Android persistence-on-restart and full G3 evidence remain outstanding.

## Remaining evidence and independent gates

1. Run exact W02-head GitHub Actions Android build and phone/tablet smoke. Confirm the uniquely identified V3.3 sample package installs and launches; verify real map navigation and gestures, offline/local persistence, language, screenshots and APK checksum.
2. Review all four phone/tablet portrait/landscape captures against the approved map and note visual deviations.
3. Confirm passport durability through app process death/restart and app upgrade on Android; verify it does not award from draft IDs or arbitrary state.
4. Obtain separate A03, A08, A09, artwork-rights/provenance and Android-security decisions. These are not implementation self-approvals.
5. Review country geography/cultural associations, duplicate risk, nutrition/allergens and complete recipe requirements before any of the five concepts receives a canonical recipe ID or runtime route.
6. Verify no accidental permissions, remote map calls or unsafe WebView bridge changes.

The existing `feature/v3.2-magical-cookbook` branch remains W01-owned and unchanged. No merge, release or deployment was performed.
