# V3.1 — active work checkpoint
Snapshot: 2026-10-19 00:04 UTC | Owner: V3.1 | Issues: [#5](https://github.com/chinkk-git/Aariamagickitchen/issues/5), [#6](https://github.com/chinkk-git/Aariamagickitchen/issues/6)

## Read first
[Session protocol](SESSION_PROTOCOL.md) · [Control Tower contract](../CONTROL_TOWER_PROTOCOL.md) · [Integration #7](https://github.com/chinkk-git/Aariamagickitchen/issues/7).

## Source of truth
- Repository: `chinkk-git/Aariamagickitchen`
- Implementation branch: `feature/v3.1-home-redesign`
- Latest remote HEAD: `0bfb48850af9feb1693322b72a555fa0bfc53dfa`
- Session: `v31-20261018-P0-ANDROID-04`
- V3 branch and merge: untouched.
- Local tree is clean except 12 untracked working artwork files under `tools/v3/artwork/world-adventures/`; these are not pushed or accepted production art and must not be treated as evidence.

## CI / Android
- Run 9 [39177916296](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39177916296), SHA `33ed9f6`: recipe/offline/unit/APK/package gates passed; emulator screenshot step 12 remains in progress with stale update time (last update 2026-10-18 23:51:40 UTC). It uses the older 60-second CDP idle. Artifacts cannot be downloaded while job remains in progress.
- Runs 10–12 were superseded/cancelled while pending as new V3.1 commits arrived.
- Run 13 [39178958044](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39178958044), exact HEAD, is pending behind run 9; no artifacts yet.
- No current-head APK or accepted Android screenshot evidence exists. Android UI route, portrait/landscape, offline/touch/TalkBack and recipe→quiz→passport flow remain NOT VERIFIED.
- P0 run 3 [39173861388](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/39173861388), SHA `56e7a5a`, artifacts: APK `12153876307`, HTML `12153547657`, diagnostics `12153751847`. Logcat shows early boot ADB `offline` recovered by `sys.boot_completed=1`; later Chromium WebView renderer SIGTRAP crashed the app. The exact smoke failure was the first profile readiness `Runtime.evaluate`, leaving unsettled Node top-level await and workflow `/usr/bin/sh` exit 13. No positive screenshot.
- Latest P0 fixes: `f19f3a6` adds bounded ADB device/boot checks with reconnect, emulator hardware acceleration + 4GiB/4 cores, short CDP settle, and a required recipe portrait screenshot. `cbe9caa` restores portrait before recipe capture; all four strict screenshot size/orientation checks remain. Re-run 13 contains these changes.
- Local gates at latest HEAD: `bash -n .github/scripts/v31-android-smoke.sh`, `node tools/v3/validate-v31.mjs`, `node --check tools/v3/validate-v31.mjs`, `node --check tools/v3/runtime.js`, and `git diff --check` passed. Phase2 tests passed 12/12; production transform, 95-recipe V3 validator, chef art checksums, CSP, profile isolation passed before latest content-only update.

## Product and review gates
- V3.1 homepage and offline world map are implemented. India links 18 original recipe IDs `51–65, 69, 72, 74`; all 95 records unchanged. Passport integration is in code but not Android-verified.
- Runtime audit finds all 95 recipes have a dish thumbnail/fallback mapping, including placeholders for IDs 16, 26, 33, 51, 57. This is not scene-art acceptance: 37 IDs have structured hero/atlas bundles; IDs 89, 93, 94 are blocked missing-art entries. Full 95-scene artwork and final A09 approval remain open.
- Italy #96 Caprese Cup Layers and China #97 Mushroom & Pak Choi Egg Noodle Soup / #98 Ginger-Garlic Air-Fryer Tofu Bites remain draft-only. Pizza absent; production transformer fails closed until A08/A09, duplicate, artwork and schema gates all approve.
- Twelve USDA FDC ingredient IDs/descriptions have been checked against the official API. A follow-on nutrient query was rate-limited; nutrient-level source review and independent exact duplicate verdict against all 95 are still pending. #97 references reachable official Suzhou noodle soup information and clearly says this family formula is an adaptation, not a traditional Suzhou recipe. #98 is framed as a global adaptation in en-GB and pt-BR.
- A08: BLOCKED/PENDING (nutrition values/source review; independent duplicate review; final cultural placement). A09: source storyboard safety staging passed only; final art approval and Android/TalkBack runtime review NOT DONE.

## Next actions
1. Inspect run 9 terminal state; when concurrency releases, inspect run 13 full CI, APK, diagnostics and all actual screenshots.
2. Fix any emulator/WebView failure while preserving every route, screenshot size/orientation and content assertion; checkpoint exact SHA/artifact IDs on #5.
3. Continue all-95 scene-art production and independent A08/A09 checks. Keep #96–98 out of production until gates pass; update #6.
