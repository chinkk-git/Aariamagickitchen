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


## Live CI update — 2026-10-24 UTC

- Reconciled branch ref currently includes this document at the prior handover commit; the latest implementation code remains e3078bd1cf6c48f59d5513de6506c5f8919e26da. The local clone at /tmp/aaria-w01-clone is clean; its code tree matches the e3078bd tree.
- Run #276 (intermediate source 477ec186ad8ea633f0ba1f3b9ea6407ac97322f4): G1/G2 passed and the all-95 tablet G3 completed successfully. Full phone/bilingual G3 is in progress with no failure reported as of this update. This run is not final because its Home screenshot predates the localized two-line title correction.
- Run #277 (corrected source e3078bd1cf6c48f59d5513de6506c5f8919e26da) remains queued behind run #276. It has not yet produced an APK or evidence artifacts.
- Status comments posted to #45 comment 6385378100 and #51 comment 6385378273. Next: monitor #276 phone G3, then run #277; inspect exact-head logs, APK and genuine Android evidence; publish only after gates pass.
- Owner approval: NO. Review ready: NO. Release ready: NO.


## Live CI update 2 — 2026-10-24 UTC

- Run #276, intermediate source 477ec186ad8ea633f0ba1f3b9ea6407ac97322f4: G1/G2 passed; tablet G3 passed all 95 recipes; phone route coverage passed 95/95. The phone G3 then failed while checking PT-BR recipe #12 safety: step text matched canonical PT-BR, but the harness queried .ref-safety details p and found no node. The approved #12 renderer actually renders its recipe-wide guidance in details.storybook-safety > p (runtime.js, lines 839–842), so this is a stale test selector, not missing recipe safety. Failure log: https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40098578853.
- Corrective harness change is prepared on temporary branch w01/recipe-safety-harness-fix: phone/tablet safety queries now support both .storybook-safety p and .ref-safety details p; contract tests assert both variants while still comparing rendered text to canonical translated safety. No recipe records were modified and no assertions were relaxed.
- Run #277 started on exact pre-fix code e3078bd1cf6c48f59d5513de6506c5f8919e26da and is in G1. Its G3 is expected to expose the same stale selector until the corrected harness commit is fast-forwarded to W01; it is retained as exact evidence.
- Next: review the staging diff and local/C1 validation when the workspace is available; fast-forward the corrected three-file commit to feature/v3.2-magical-cookbook with an expected-head check against 55fe0be540e453b9de9bbfa1b4b73c2756099e98; wait for exact-head CI; verify APK and screenshots; update Issues #45/#51.
- Owner approval: NO. Review ready: NO. Release ready: NO.


## Live CI update 3 — 2026-10-24 UTC

- Run #276 failure is confirmed as a harness selector mismatch, not missing recipe content: full phone route coverage logged 95/95 PASS. It then failed PT-BR recipe #12 because it queried only .ref-safety details p while the original approved #12 template has an open .storybook-safety disclosure with the canonical translated safety paragraph. Tablet G3 passed.
- G3 artifact from run #276: https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40098578853/artifacts/12563748752 (3,706,913,407-byte ZIP; SHA-256 a0e2f1abda824b0b2c96add87ca824471fd8de0197388fe6c38d754c8bf80417). Intermediate screenshots only; do not deliver the run276 APK.
- Corrected selectors and a regression contract were fast-forwarded to W01 at commit b16ad540b2a63c1bc0d579a0cc8648b93b3db5ac. The assertions still compare the rendered recipe safety copy to canonical translated safety. No recipe data or original artwork changed.
- Run #277 (e3078bd, pre-harness correction) is in G2; it may encounter the same G3 selector issue. A new exact-head run for b16 is pending/queued behind #277 and is the required final validation.
- Latest progress comments: #45 comment 6385662148; #51 comment 6385662319. Readiness: OWNER_APPROVED=NO, REVIEW_READY=NO, RELEASE_READY=NO.


## Live CI update 4 — 2026-10-24 UTC

- Run #277 on e3078bd1cf6c48f59d5513de6506c5f8919e26da failed the G2 tablet smoke at PT-BR recipe #096. Logged checks show title, first instruction, adult help and safety text are present. The actual failure is that two of 68 visible img elements in the international-active app view were not loaded (array positions 63 and 64). The prior smoke log returned only booleans, so the failing src paths are not yet identifiable. Run #277 evidence artifact: https://github.com/chinkk-git/Aariamagickitchen/actions/runs/40099744125/artifacts/12563164835 (61,741,995-byte ZIP; SHA-256 c2550aada9562c6a9f91c08d02413957b1304370a4901b1816e7ddb19302e2b7). No APK artifact was uploaded because G2 failed.
- Added diagnostics to tablet smoke so each visible image failure reports its source, alt text, completion state and intrinsic dimensions. The assertion still requires every visible image to load. Added a contract test for the detailed failure check. Also corrected literal escaped newlines inadvertently introduced in the previous contract-test update; new file text now has real JS line breaks.
- Current corrective work is prepared on temporary branch w01/international-image-diagnostics. The live W01 branch has not yet been advanced to this diagnostic commit. After review, fast-forward it with expected-head a74c5f5a6d178a1b17316349956e65ff6a6023fb so exact-head CI runs the diagnostics and safety-selector correction together.
- Run #277 is terminal and its G2 failure is a genuine Android image load defect (exact asset path remains unknown). Next: exact-head run must expose the two paths; fix the local asset routing/bundling or source path based on evidence, then rerun G2 and full tablet/phone G3. Do not report APK readiness until G1/G2/G3 pass and screenshots are visually checked.
- Owner approval: NO. Review ready: NO. Release ready: NO.


## Live CI update 5 — 2026-10-24 UTC

- The reviewed diagnostic/test commit chain has now been fast-forwarded to feature/v3.2-magical-cookbook; resulting branch head: ba2e7e1939f6670005af72dba3a00ceadb621599. It contains the dual-selector recipe-safety fix, visible-image source diagnostics, the non-weakened image-load assertion, regression coverage, and this handover update.
- Run #277 is terminal G2 failure on e3078bd1cf6c48f59d5513de6506c5f8919e26da (two visible PT-BR #096 images missing). Run #278 for ba2e7e1 is expected from the branch push; no job/status ID was visible through GitHub commit-status API at the instant of this update. Reconcile GitHub Actions again before any further branch write.
- Environment note: workspace execution is unavailable in this session. GitHub operations remain available. Therefore local Node/shell validation could not be rerun after the diagnostics change; exact-head CI must validate syntax and contract tests.
- Next: inspect the new run's G2 logs for both image src paths; identify asset routing or bundling defect, fix source/runtime on the single W01 writer branch, and rerun exact-head G1/G2/G3. Inspect real screenshots and APK only from the verified final head.
- Owner approval: NO. Review ready: NO. Release ready: NO.
