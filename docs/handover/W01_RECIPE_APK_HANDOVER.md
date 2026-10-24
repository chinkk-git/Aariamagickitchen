# W01 Recipe APK Handover

Updated: 2026-10-24 (UTC)

## Mission and acceptance

- Repository: chinkk-git/Aariamagickitchen
- Branch: feature/v3.2-magical-cookbook
- Governing issue: [#45](https://github.com/chinkk-git/Aariamagickitchen/issues/45)
- Control Tower: [#51](https://github.com/chinkk-git/Aariamagickitchen/issues/51)
- Owner requires a new installable 97-recipe Android review APK with #096 Italy and #099 China complete, compared with approved original recipe #12. Preserve original recipes 1–95, artwork, user data, offline operation, navigation and Android Back. Do not integrate the remaining 13.
- Required recipe UI: compact horizontal Home carousel with thumbnail, complete localized title and NEW/NOVA badge; three-column ingredient checklist with ingredient-specific icons and quantities; simple original-template equipment SVG icons, names and adult roles; allergen and per-serving nutrition information; one active illustrated step; portrait and side-by-side landscape; step navigation/completion; adult help and safety; EN-GB/PT-BR.
- No merge to main or production release. OWNER_APPROVED=NO, REVIEW_READY=NO, RELEASE_READY=NO as of this handover.

## Live state and ownership

- Last verified live code branch HEAD: e3078bd1cf6c48f59d5513de6506c5f8919e26da (localized carousel title wrapping correction). Verified via GitHub branch ref; full build/test run #277 is queued on this exact SHA.
- Current local clone is /tmp/aaria-w01-clone, clean at local commit 274748badcf73f8dd9b52526e299b399c0f41fab, whose tree 466b396e293bde9cbe0912a72328e30a62e8433e matches live remote commit e3078bd1cf6c48f59d5513de6506c5f8919e26da. GitHub API-created commits have different commit metadata/SHA from local equivalents; tree contents match.
- One W01 writer (this session) has written the branch. No second W01 writer was identified when work began. Confirm the prior writer has stopped and reconcile the remote branch again before future edits.
- Local Git HTTPS push lacked credentials; changes were committed to the branch with GitHub Git Data API using expected-head checks. Do not force-update or overwrite newer commits.

## Completed implementation

- a16f199c12b21b085b95dc1051dbc34f7020eaaf: compact horizontal Home carousel; NEW/NOVA badges and localized labels; ingredient-specific pictograms for ingredients lacking canonical art; maps ingredient additions only to #096/#099 and preserves original 95 icon routing; restores original TOOL_VECTORS equipment SVGs and removes W03 photos; adds phone/tablet Android assertions and screenshot coverage.
- 477ec186ad8ea633f0ba1f3b9ea6407ac97322f4: tablet checks and genuine PT-BR Home carousel screenshots in both orientations.
- e3078bd1cf6c48f59d5513de6506c5f8919e26da: fixes title clipping seen in run #276 G2 by wrapping titles to two lines; adds Android assertions that complete localized titles fit.
- Focused local suite after the latest correction: node --test phase2-pilot/tests/v32-feature-contract.test.mjs passed 22/22; node --check tools/v3/runtime.js, node --check phase2-pilot/tests/v32-feature-contract.test.mjs, bash -n .github/scripts/v32-android-tablet-smoke.sh, and git diff --check passed.
- Before the second regression test addition, full local npm test passed 71/71 and recipe, artwork, rollout, and V3.1 validators passed; V3.1 validation confirmed all original 95 recipes unchanged. Latest exact-head CI will run the full suite again.
- Packaged renderer build locally succeeded at code head a16f199 (30,775,857 bytes). Latest title-wrap change has not yet been built on Android.

## Android CI results and artifacts

- [Run #274](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40062314655), head f81ad0aed5184ce7e10d8326d3ef434cca1a2d5d: failed the World Adventure G2 audit with guide:false; exact measured fields and failure are in its job log. It predates the reconciled base branch and is not the current code.
- [Run #275](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40097964169), head a16f199c12b21b085b95dc1051dbc34f7020eaaf: G1 and G2 passed. G3 tablet failed immediately after launching its fresh emulator: DevTools socket closed with code 1006 before the 95-route sweep began; phone G3 was skipped by workflow dependency behavior. [Failure job log](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40097964169/job/120884079656). G2 artifacts exist but are superseded.
- [Run #276](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40098578853), head 477ec186ad8ea633f0ba1f3b9ea6407ac97322f4: G1/G2 passed, including PT-BR Home layout checks and screenshots in both tablet orientations. At handover update, full tablet G3 is still in progress; phone G3 is pending. G2 APK and evidence are intermediate: visual review found the PT-BR #096 Home title displayed as Massa com tomate e ma….
  - Intermediate APK artifact: https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40098578853/artifacts/12562307258. ZIP size 51,277,387 bytes; ZIP SHA-256 b2a88e54619c80e51d6ac8159803dc24cd4b242160a6f789476e2622355b59fd.
  - Intermediate genuine Android G2 evidence: https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40098578853/artifacts/12562247629. ZIP size 173,871,400 bytes; SHA-256 d5d8eab776ca6574fda350efc75f8c498696a1ba7118f76fed9d0493965f1b99.
  - Visual findings: compact Home carousel and recipe ingredient/equipment icon corrections look right; #096/#099 landscape keeps the large illustration beside instructions; #12 original comparison remains unchanged. Do not deliver run #276 because the Italy title was truncated and full regressions were not yet complete.
- [Run #277](https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40099744125), exact code head e3078bd1cf6c48f59d5513de6506c5f8919e26da: pending in the full-branch concurrency queue behind run #276. This run must produce the final Android build, repeat G1/G2 with full-title checks, and pass tablet and phone G3. Follow it until completion.
- Before-correction genuine Android screenshot archive from run #273: https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40062161458/artifacts/12547848363. It visibly shows stacked full-size Home cards, generic square ingredient icons, and W03 equipment photos. Run #273 APK is rejected and must not be reused.

## Exact next actions

1. Poll run #276 until tablet G3 completes; record exact conclusion and failure logs. Then run #277 should leave the queue and build e3078bd.
2. If run #277 fails, inspect its exact failed step and logs. Fix implementation or retry only if evidence shows a transient infrastructure failure; never relax assertions. Rerun on the new exact code head.
3. After a passing run #277, list its artifacts and download both APK ZIP and Android evidence ZIP. Extract APK, verify package/application ID, versionCode/versionName, byte size and SHA-256 against workflow diagnostics. Confirm APK source SHA exactly e3078bd (or final later corrected head).
4. Visually inspect genuine Android screenshots from that same run: #096/#099 Home and recipe screens, EN-GB/PT-BR, portrait/landscape, ingredients/equipment, cooking step, completion, and #12 comparison. Confirm full PT-BR titles are visible.
5. Update this handover with final branch/doc HEAD, exact run conclusions, artifact links, APK metadata/hash, screenshot findings, known limitations and readiness states.
6. Publish to Issue #45: direct artifact download, APK source SHA, package ID, version/size/SHA-256, CI links/results, screenshots and comparison evidence. Notify #51. Keep owner approval NO until explicit approval; do not merge or release.

## Commands and guardrails

- git fetch origin feature/v3.2-magical-cookbook
- git status --short --branch
- git rev-parse HEAD
- node --test phase2-pilot/tests/v32-feature-contract.test.mjs
- npm test
- npm run validate:recipes
- npm run validate:artwork
- npm run validate:rollout
- npm run validate:v31

- Workflow: .github/workflows/v32-android.yml; it checks out its exact event SHA. Run #277 is queued because full runs share the branch concurrency group. Keep exactly one implementation writer. Do not uninstall installed versions or clear application data.
- Existing review identity policy: isolated package com.aaria.magickitchen.pilot.v32review<run-number>; versionCode 8; versionName 1.0.4. Preserve co-installation and signing behavior.
- Known current review limitation: title-wrap change is not yet proven on a genuine Android run; run #277 is pending. Run #276 artifacts are not final. No APK is review-ready yet.

## Handover states

- Owner approval: **NO**
- Review ready: **NO** (final title fix and full exact-head Android gates are still pending)
- Release ready: **NO**
