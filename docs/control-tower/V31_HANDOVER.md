# V3.1 — Verified recovery handover
Snapshot: 2026-10-18 UTC | Owner: V3.1 | Issues: [#5](https://github.com/chinkk-git/Aariamagickitchen/issues/5), [#6](https://github.com/chinkk-git/Aariamagickitchen/issues/6)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7). Verify latest head, CI and issue comments on start.

## Repository state (observed)
- Repo: `chinkk-git/Aariamagickitchen`
- Implementation branch: `feature/v3.1-home-redesign`
- Latest observed head: `3801ccb98bfbdaef3de95bfcfc2fe8973bd10cdb`
- Commit: `Implement V3.1 home and offline world explorer (#5 #6)` (2026-10-18 22:04 UTC).
- Relative to V3 branch: 12 commits ahead, 0 behind at snapshot; comparison includes runtime and production transform changes, Android preview workflow, offline geojson, and docs. Recompare on resumption.
- [Android preview run 39170636354](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39170636354): **IN PROGRESS** at snapshot; do not assert APK artifact or device result. [Run 39170636282](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39170636282): completed **success**; inspect job and artifact type before asserting Android installability.
- Issue #5 and #6 each contain ACK and PROGRESS comments as of 22:05 UTC; active Work session may still be writing. **Do not start a concurrent writer on the same branch.**

## Implemented or reported
- Source commit includes magical homepage and offline world explorer. Issue #5 reports responsive home, offline country search/destination list, India mapping to 18 existing recipe IDs, and 95 original recipes unchanged.
- Issue #5 reports local gates: 12/12 phase2 tests, recipe validator, V3.1 validator, production/art/CSP/profile checks. These are **workstream-reported**, not independently reproduced by Control Tower.
- Issue #6 reports preliminary catalogue audit in `content/world-adventures/PRODUCTION_95_DUPLICATE_AUDIT.md`.
- New Italy/China production recipes NOT implemented. Provisional recipe draft must not ship; no pizza; audit duplicates against original 95.
- Approved character and production recipe-scene artwork remains incomplete; offline Android map -> recipe -> passport and device QA pending.
- A08/A09 are source-only reviews; emulator/physical-device validation pending.

## Immediate next steps (one at a time)
1. First check issue #5/#6 comments and branch head to determine whether existing V3.1 worker is still active; if so, **do not start another writer**. If frozen, retire old writer before replacement.
2. Confirm conclusion and artifacts of preview run 39170636354, run emulator/install/screenshot tests; post evidence on issue #5.
3. Implement and validate approved recipe-scene/character artwork, preserving 95 originals; checkpoint.
4. Audit and implement Italy/China recipes only after duplicate, nutrition, allergen, safety, bilingual, art and production-schema gates; checkpoint issue #6.
5. Provide V3.1 stable SHA to integration issue #7 after gates. Never modify V3 branch.

## Checkpoint fields to replace each rotation
Session ID: EXISTING SESSION ACKED / Branch head: `3801ccb98bfbdaef3de95bfcfc2fe8973bd10cdb` / Issues: #5, #6 / CI: preview in progress at snapshot / APK device: NOT VERIFIED / A08/A09: PENDING / Blockers: device evidence, artwork, Italy/China content / Next: check worker and CI.
