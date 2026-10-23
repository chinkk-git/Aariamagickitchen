# V3.3 World Map P0 — W02 progress

Tracking: [Issue #39](https://github.com/chinkk-git/Aariamagickitchen/issues/39)  
Branch: `feature/v3.3-world-map-explorer`  
Status: implementation in progress; no external gate is claimed passed.

## Completed on W02

- Read the consolidated Issue #39 P0 contract, historical Issue #6, current World Map architecture and prior Android evidence.
- Preserved the owner-approved map image and source notes with SHA-256 provenance under `docs/design/references/v3.3/`.
- Wired that exact approved composite reference into the V3.3 map art layer using a CSS viewport crop; the reference bytes are embedded unchanged by the production transform. Android visual comparison is still required to verify crop positioning on phones and tablets.
- Recovered the five-country generated concept board from project Library and recorded its identity and SHA-256 without promoting or copying generated art into runtime/repository artwork assets.
- Registered the five requested concepts in `tools/v3/data/v3.3-world-map-country-drafts.json`, EN-GB/PT-BR localized, no canonical IDs, and with independent review gates pending.
- Added visible zoom-in, zoom-out, reset and drag-mode controls; bounded single-pointer pan; two-pointer pinch that preserves its focal point; and a single transform for both approved map art and geographic overlay.
- Changed the passport counter to report earned stamps only. The existing stamp award remains tied to actual completion of an allowlisted canonical India recipe; no draft concept can create a stamp.
- Added registry/gesture/passport regression checks and updated the Android phone/tablet smoke expectations to exercise the controls and one real map drag.
- Added W02 to the existing Android CI branch trigger and included the V3.3 data validator in G1.
- Reconciled Android run `39882408447` against W01's later run `39882586213`: the W02 failure was the tablet smoke comparing a 788.66 px ingredient grid to 68% of the full 1280 px viewport. W01's tablet run passed after its smoke harness measured the actual ingredient panel; this W02 change ports that evidence-based **test-only** measurement and leaves recipe layout untouched.
- Added a distinct debug-only W02 package suffix (`.v33map<run>`) and sample APK artifact name. This prevents the first World Map sample from colliding with V3.1/V3.2 review installs and gives it a clearly identified sample label.

## Local evidence

- `npm test --prefix phase2-pilot`: 56/56 passed after the W02 geometry-harness and APK-identity changes.
- `node tools/v3/validate-v33-world-map-drafts.mjs`: passed.
- `node tools/v3/validate-v31.mjs`: passed; 95 original recipes, 177 offline countries, existing India links preserved.
- `bash -n` passed for the Android phone/tablet smoke scripts; `git diff --check` passed.
- Production transform completed and emitted map zoom controls. A scan of that transformed output confirmed none of the five new concept recipe names leaked into runtime.
- `git diff --check` passed before the latest documentation and localization edits; rerun required before commit.
- Android Gradle/SDK is not installed in the local execution environment. Exact-head CI and emulator evidence are still required; no APK or Android screenshot acceptance is claimed.

## Remaining evidence and independent gates

1. Run exact W02-head GitHub Actions Android build and phone/tablet smoke. Confirm the uniquely identified V3.3 sample package installs and launches; verify real map navigation and gestures, offline/local persistence, language, screenshots and APK checksum.
2. Review all four phone/tablet portrait/landscape captures against the approved map and note visual deviations.
3. Confirm passport durability through app process death/restart and app upgrade on Android; verify it does not award from draft IDs or arbitrary state.
4. Obtain separate A03, A08, A09, artwork-rights/provenance and Android-security decisions. These are not implementation self-approvals.
5. Review country geography/cultural associations, duplicate risk, nutrition/allergens and complete recipe requirements before any of the five concepts receives a canonical recipe ID or runtime route.
6. Verify no accidental permissions, remote map calls or unsafe WebView bridge changes.

The existing `feature/v3.2-magical-cookbook` branch remains W01-owned and unchanged. No merge, release or deployment was performed.
